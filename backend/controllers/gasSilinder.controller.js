import { body, validationResult } from 'express-validator'
import { client } from '../models/client.model.js'
import { Counter } from '../models/counter.model.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import ExcelJS from 'exceljs'
import { monoIdIsValid } from '../utils/mongoDBid.js'
import { gasSilinder } from '../models/gasSilinder.model.js'
import { getClientIdsByFirmName, getPermittedClientIds, resolveUserRole, parseUtcDateRange } from "../utils/otherUtils.js";
import mongoose from 'mongoose';

const generateSierialNumber = async (quantity, session) => {
    const date = new Date();
    const year = date.getFullYear(); // e.g. 2025
    const shortYear = String(year).slice(-2); // "25"
    const counterName = `fire_extinguisher_${year}`;

    const counter = await Counter.findOneAndUpdate(
        { name: counterName },
        { $inc: { seq: quantity } },
        { new: true, upsert: true, session }
    );

    const endSeq = counter.seq;
    const startSeq = endSeq - quantity + 1;

    const serials = [];
    for (let i = 0; i < quantity; i++) {
        const num = startSeq + i;
        const padded = String(num).padStart(4, "0");
        serials.push(`SR${shortYear}${padded}`);
    }
    return serials;
}


const addSilinder = asyncHandler(async (req, res) => {
    const clientId = req.body.clientId
    monoIdIsValid(clientId)

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(422, errors.array())
    }
    const rawEntries = Array.isArray(req.body.entries)
        ? req.body.entries
        : [
            {
                serviceType: req.body.serviceType ?? "new",
                refillingType: req.body.refillingType ?? null,
                category: req.body.category,
                kgLtr: req.body.kgLtr,
                quantity: req.body.quantity,
                startDate: req.body.startDate,
                endDate: req.body.endDate,
                serialNumber: req.body.serialNumber,
                notes: req.body.notes
            },
        ];

    // Determine how many serials actually need to be generated (if frontend didn't provide enough)
    let totalQtyToGenerate = 0;
    for (const e of rawEntries) {
        const q = Number(e.quantity);
        if (!Number.isFinite(q) || q <= 0) {
            throw new ApiError(400, "Quantity must be a positive number");
        }
        const providedLen = Array.isArray(e.serialNumber) ? e.serialNumber.length : 0;
        if (q > providedLen) {
            totalQtyToGenerate += (q - providedLen);
        }
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        let allGeneratedSerials = [];
        if (totalQtyToGenerate > 0) {
            allGeneratedSerials = await generateSierialNumber(totalQtyToGenerate, session);
        }

        const payloads = [];
        let genOffset = 0;

        for (const e of rawEntries) {
            const qty = Number(e.quantity);
            const providedSerials = Array.isArray(e.serialNumber) ? e.serialNumber : [];
            const neededGen = Math.max(0, qty - providedSerials.length);

            const generatedForThis = allGeneratedSerials.slice(genOffset, genOffset + neededGen);
            genOffset += neededGen;

            // Mix provided with generated to fulfill quantity
            const finalSerials = [...providedSerials, ...generatedForThis];

            const sType = String(e.serviceType ?? "new").toLowerCase();
            let rType = e.refillingType ? String(e.refillingType).toLowerCase() : null;

            // Handle default for 'new' service
            if (sType === 'new' && !rType) {
                rType = 'new';
            }

            // Fallback for refilling if missed (though frontend should send it)
            if (sType === 'refilling' && !rType) {
                rType = 'existing';
            }

            payloads.push({
                clientId,
                serviceType: sType,
                refillingType: rType,
                category: e.category,
                kgLtr: e.kgLtr,
                quantity: qty,
                startDate: new Date(e.startDate),
                endDate: new Date(e.endDate),
                serialNumber: finalSerials,
                notes: e.notes || ""
            });
        }
        const created = await gasSilinder.insertMany(payloads, { session });

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json(
            new ApiResponse(
                201,
                {
                    totalCreated: created.length,
                    created
                },
                "Fire extinguisher service created"
            )
        );
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw new ApiError(500, err)
    }
}
)

const updateSilinder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = req.body || {};
    monoIdIsValid(id)
    if (payload.status && payload.refillingType && payload.serviceType) {
        payload.status = payload.status.toLowerCase();
        payload.refillingType = payload.refillingType.toLowerCase();
        payload.serviceType = payload.serviceType.toLowerCase();
    }


    // If refQty provided -> perform split logic within transaction
    if (payload.refQty !== undefined && payload.refQty !== null && payload.refQty !== "") {
        const refQty = Number(payload.refQty);
        if (!Number.isFinite(refQty) || refQty <= 0) {
            throw new ApiError(400, "refQty must be a positive number")
        }

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const existing = await gasSilinder.findById(id).session(session);
            if (!existing) {
                await session.abortTransaction();
                session.endSession();
                throw new ApiError(404, "FireExtinguisher not found")
            }

            // ensure compare using numbers
            const existingQty = Number(existing.quantity || 0);
            if (refQty >= existingQty) {
                await session.abortTransaction();
                session.endSession();
                throw new ApiError(400, `refQty must be less than existing quantity ${existingQty}`)
            }

            // Handle Serial Numbers
            const selectedSerialNumbers = payload.serialNumbers; // Expecting array of strings
            let remainingSerialNumbers = existing.serialNumbers || [];
            let newSerialNumbers = [];

            // If existing has serial numbers, we MUST validate and split them
            if (remainingSerialNumbers.length > 0) {
                if (!Array.isArray(selectedSerialNumbers) || selectedSerialNumbers.length !== refQty) {
                    await session.abortTransaction();
                    session.endSession();
                    throw new ApiError(400, `You must provide exactly ${refQty} serial numbers from the existing list.`)
                }

                // Validate all selected exist in remaining
                const existingSet = new Set(remainingSerialNumbers);
                for (const sn of selectedSerialNumbers) {
                    if (!existingSet.has(sn)) {
                        await session.abortTransaction();
                        session.endSession();
                        throw new ApiError(400, `Serial number ${sn} does not belong to this record.`)
                    }
                }

                // Calculate remaining
                const selectedSet = new Set(selectedSerialNumbers);
                remainingSerialNumbers = remainingSerialNumbers.filter(sn => !selectedSet.has(sn));
                newSerialNumbers = selectedSerialNumbers;
            } else {
                if (Array.isArray(selectedSerialNumbers) && selectedSerialNumbers.length === refQty) {
                    newSerialNumbers = selectedSerialNumbers;
                }
            }

            // Compute remaining quantity for existing doc
            const remainingQty = existingQty - refQty;

            const updateForExisting = {
                quantity: remainingQty,
                serialNumbers: remainingSerialNumbers
            };

            const updatedExisting = await gasSilinder.findByIdAndUpdate(
                id,
                { $set: updateForExisting },
                { new: true, session }
            );

            const newDocData = {
                clientId: payload.clientId ?? existing.clientId,
                serviceType: payload.serviceType ?? existing.serviceType,
                refillingType: payload.refillingType ?? existing.refillingType,
                category: payload.category ?? existing.category,
                kgLtr: payload.kgLtr ?? existing.kgLtr,
                quantity: refQty,
                startDate: payload.startDate ?? existing.startDate,
                endDate: payload.endDate ?? existing.endDate,
                status: payload.status ?? existing.status,
                serialNumbers: newSerialNumbers,
                notes: payload.notes
            };

            const created = await gasSilinder.create([newDocData], { session });
            // created is an array because create([...], {session}) returns array
            const newRecord = Array.isArray(created) ? created[0] : created;

            await session.commitTransaction();
            session.endSession();

            return res.json(new ApiResponse(200, { updatedExisting, newRecord }, "Refill split performed. Existing updated and new record created."))
        } catch (errInner) {
            await session.abortTransaction();
            session.endSession();
            console.error("Transaction error:", errInner);
            throw new ApiError(500, errInner.message || "Transaction failed")
        }
    }

    // --- Normal update path (no refQty) ---
    // Build allowed update (don't allow updating clientId here for safety)
    const allowed = [
        "serviceType",
        "refillingType",
        "category",
        "kgLtr",
        "quantity",
        "startDate",
        "endDate",
        "status",
        "notes"
    ];
    const updateObj = {};
    allowed.forEach((k) => {
        if (payload[k] !== undefined) updateObj[k] = payload[k];
    });

    if (Object.keys(updateObj).length === 0) {
        throw new ApiError(400, "No updatable fields provided")
    }

    const updated = await gasSilinder.findByIdAndUpdate(id, { $set: updateObj }, { new: true });
    if (!updated) {
        throw new ApiError(404, "FireExtinguisher not found")
    }

    return res.status(201).json(new ApiResponse(201, updated, 'updated'))

}
)

const createRefilling = asyncHandler(async (req, res) => {

    let clientId = req.body.clientId;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(422, "data vaidation failed", errors.array())
    }

    let rawEntries = [];

    if (Array.isArray(req.body.entries)) {
        const arr = req.body.entries;

        // Detect grouped shape: every item has clientId + entries array
        const isGrouped = arr.every(
            (it) => it && (it.clientId || it.client_id) && Array.isArray(it.entries)
        );

        if (isGrouped) {
            // If top-level clientId not provided, we will create payloads for all groups
            // and allow multiple client groups in one request.
            // Expand groups into per-entry payloads, keeping each group's clientId.
            for (const group of arr) {
                const groupClientId = group.clientId ?? group.client_id;
                if (!groupClientId || monoIdIsValid(groupClientId)) {
                    throw new ApiError(400, "Each group must include a valid clientId.")
                }
                // append each inner entry with the group's clientId
                for (const e of group.entries) {
                    rawEntries.push({ clientId: groupClientId, ...e });
                }
            }
        } else {
            // Normal shape: entries list of entry objects; use top-level clientId
            rawEntries = arr;
        }
    } else {
        // If no entries array, check for single entry fields in body
        rawEntries = [
            {
                refillingType: req.body.refillingType ?? null,
                category: req.body.category,
                kgLtr: req.body.kgLtr,
                quantity: req.body.quantity ?? 1,
                startDate: req.body.startDate,
                endDate: req.body.endDate,
                notes: req.body.notes
            },
        ];
    }

    if (!rawEntries.length) {
        throw new ApiError(400, "No entries provided for refilling")
    }

    // If none of the groups provided top-level clientId, ensure at least one clientId exists per entry
    // We'll build final payloads that include clientId for each entry (either top-level or per-entry __clientId).
    const totalQty = rawEntries.reduce((sum, e) => {
        const q = Number(e.quantity);
        if (!Number.isFinite(q) || q <= 0) {
            throw new ApiError(400, "Quantity must be a positive number");
        }
        return sum + q;
    }, 0);
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const allSerials = await generateSierialNumber(totalQty, session);
        const payloads = [];
        let offset = 0;
        for (const e of rawEntries) {
            const entryClientId = e.__clientId ?? clientId;
            const qty = Number(e.quantity) || 1;

            const serials = allSerials.slice(offset, offset + qty);
            offset += qty;
            if (!entryClientId || !mongoose.Types.ObjectId.isValid(String(entryClientId))) {
                await session.abortTransaction();
                session.endSession();
                throw new ApiError(400, "clientId is required (either top-level req.body.clientId or per-group clientId inside entries).")
            }

            payloads.push({
                clientId: entryClientId,
                serviceType: "refilling",
                refillingType: e.refillingType ?? null,
                category: e.category,
                kgLtr: e.kgLtr,
                quantity: qty,
                startDate: e.startDate ? new Date(e.startDate) : undefined,
                endDate: e.endDate ? new Date(e.endDate) : undefined,
                serialNumbers: serials,
                notes: e.notes
            });
        }

        const created = await gasSilinder.insertMany(payloads, { session });

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json(new ApiResponse(201, { count: created.length, data: created }, "Refilling record(s) created"))
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error("createRefilling (bulk) error:", err);

        throw new ApiError(500, "server error", err.message)
    }
})

const getFireExtinguishers = asyncHandler(async (req, res) => {

    const { isAdminOrManager } = resolveUserRole(req.user)

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Number(req.query.limit) || 25);
    const skip = (page - 1) * limit;

    const filter = {};

    if (!isAdminOrManager) {
        filter.createdBy = req.user._id;
    }

    // optional filters from query string
    if (req.query.status) filter.status = req.query.status;
    if (req.query.serviceType) filter.serviceType = req.query.serviceType;
    if (req.query.firmName?.trim()) {
        // find matching clients first
        const clientIds = await getClientIdsByFirmName(req.query.firmName)
        filter.clientId = { $in: clientIds };
    }
    if (req.query.category && req.query.category) {
        filter.category = new mongoose.Types.ObjectId(String(req.query.category));
    }
    const startRaw = req.query.startDate
        ? String(req.query.startDate).trim()
        : null;
    const endRaw = req.query.endDate ? String(req.query.endDate).trim() : null;

    const buildUtcStart = (yyyyMMdd) => {
        const parts = yyyyMMdd.split("-");
        if (parts.length !== 3) return null;
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
        return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    };
    const buildUtcEnd = (yyyyMMdd) => {
        const parts = yyyyMMdd.split("-");
        if (parts.length !== 3) return null;
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
        return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
    };

    if (startRaw || endRaw) {
        let startUtc = null;
        let endUtc = null;

        if (startRaw) {
            startUtc = buildUtcStart(startRaw);
            if (!startUtc) {
                throw new ApiError(400, `Invalid startDate format. Use YYYY-MM-DD - debug : ${startRaw} , ${endRaw}`)
            }
        }

        if (endRaw) {
            endUtc = buildUtcEnd(endRaw);
            if (!endUtc) {
                throw new ApiError(400, `Invalid endDate format. Use YYYY-MM-DD - debug : ${startRaw} , ${endRaw}`)
            }
        }

        if (startUtc && endUtc && startUtc.getTime() > endUtc.getTime()) {
            throw new ApiError(400, "startDate must be <= endDate")
        }
        const range = {};
        if (startUtc) range.$gte = startUtc;
        if (endUtc) range.$lte = endUtc;

        // Use $or so either field matching the range will include the document.
        filter.$or = [{ startDate: range }, { endDate: range }];
    }

    // count + find in parallel
    const [total, docs] = await Promise.all([
        gasSilinder.countDocuments(filter),
        gasSilinder.find(filter)
            .populate("category")
            .populate("kgLtr")
            .populate({
                path: "clientId",
                select:
                    "firmName contactNumber contactPerson email gstNumber city address",
            })
            .sort({ expiryDate: 1 })
            .skip(skip)
            .limit(limit)
            .lean(),
    ]);
    return res.status(200).json(new ApiResponse(200, { total, page, limit, count: docs.length, docs }, 'all fire extiguisher get it'))

});


const exportFireExtinguishersXlsx = asyncHandler(async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            throw new ApiError(401, "Unauthorized: req.user missing")
        }

        // Build the same filters you already use (reuse code as needed)
        const { isAdminOrManager } = resolveUserRole(req.user)
        const filter = {};
        if (!isAdminOrManager) filter.createdBy = req.user._id;
        const params = { ...req.query, ...req.body };
        if (params.status) filter.status = String(params.status).toLowerCase();
        if (params.serviceType) filter.serviceType = String(params.serviceType).toLowerCase();
        if (params.category) {
            try { filter.category = new mongoose.Types.ObjectId(String(params.category)); } catch (e) { }
        }

        // Support for selection
        if (params.ids && Array.isArray(params.ids) && params.ids.length > 0) {
            filter._id = { $in: params.ids.map(id => new mongoose.Types.ObjectId(String(id))) };
        }



        if (params.firmName && params.firmName.trim()) {
            const clientIds = await getClientIdsByFirmName(params.firmName)
            if (clientIds.length > 0) filter.clientId = { $in: clientIds };
            else {
                filter._id = { $in: [] };
            }
        }

        // Date Filtering
        const startRaw = params.startDate ? String(params.startDate).trim() : null;
        const endRaw = params.endDate ? String(params.endDate).trim() : null;
        if (startRaw || endRaw) {
            const range = parseUtcDateRange({ startDate: startRaw, endDate: endRaw });
            if (range) filter.endDate = range; // Filter by endDate (Expiry) for cylinders
        }

        // Prepare workbook & worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("NEW FIRE EXTINGUISHER DATA");

        // Title row (merge across A1:J1)
        worksheet.mergeCells("A1:J1");
        const titleCell = worksheet.getCell("A1");
        titleCell.value = "NEW FIRE EXTINGUISHER DATA:";
        titleCell.alignment = { vertical: "middle", horizontal: "center" };
        titleCell.font = { name: "Arial", size: 14, bold: true };
        titleCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFFF00" } // yellow
        };
        titleCell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" }
        };
        worksheet.getRow(1).height = 26;

        // Header row (row 2)
        const headerRowValues = [
            "Sr.no.",
            "Company name",
            "Service Type",
            "Date of refilling",
            "Date of expire",
            "Quantity",
            "Person name",
            "Mobile no.",
            "E-mail Id",
            "Adress"
        ];
        worksheet.addRow(headerRowValues);

        // Style header row
        const headerRow = worksheet.getRow(2);
        headerRow.eachCell((cell) => {
            cell.font = { name: "Arial", size: 11, bold: true };
            cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false };
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" }
            };
        });
        worksheet.getRow(2).height = 22;

        // Set column widths to match your template
        worksheet.columns = [
            { key: "sr", width: 6 },           // A: Sr.no.
            { key: "company", width: 28 },     // B: Company name
            { key: "serviceType", width: 16 }, // C: Service Type
            { key: "refillDate", width: 18 },  // D: Date of refilling
            { key: "endDate", width: 18 },     // E: Date of expire
            { key: "quantity", width: 10 },    // F: Quantity
            { key: "person", width: 20 },      // G: Person name
            { key: "mobile", width: 16 },      // H: Mobile no.
            { key: "email", width: 30 },       // I: E-mail Id
            { key: "address", width: 30 }      // J: Adress
        ];

        // Stream DB cursor and append rows starting from row 3
        const cursor = gasSilinder.find(filter)
            .populate({
                path: "clientId",
                select: "firmName contactPerson contactNumber email gstNumber city address"
            })
            .populate("category")
            .populate("kgLtr")
            .sort({ endDate: 1 })
            .lean()
            .cursor();

        let idx = 0;
        for await (const doc of cursor) {
            idx++;
            // Format dates as dd-mm-yyyy (adjust if you prefer another format)
            const formatDate = (d) => {
                if (!d) return "";
                const dt = new Date(d);
                const dd = String(dt.getDate()).padStart(2, "0");
                const mm = String(dt.getMonth() + 1).padStart(2, "0");
                const yyyy = dt.getFullYear();
                return `${dd}-${mm}-${yyyy}`;
            };

            let mobileText = String(doc.clientId?.contactNumber ?? "");

            const personName = doc.clientId?.contactPerson || doc.clientId?.firmName || "";

            worksheet.addRow([
                idx,
                doc.clientId?.firmName || "",
                doc.serviceType || "refilling",
                formatDate(doc.startDate),
                formatDate(doc.endDate),
                doc.quantity ?? "",
                personName,
                mobileText,
                doc.clientId?.email || "",
                doc.clientId?.address || ""
            ]);
        }

        // Style all data rows: left alignment, borders
        const lastRowNumber = worksheet.lastRow ? worksheet.lastRow.number : 2;
        for (let r = 3; r <= lastRowNumber; r++) {
            const row = worksheet.getRow(r);
            // row.height = 18; // Removed to allow auto-height for wrapped text
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                cell.alignment = {
                    vertical: "middle",
                    horizontal: colNumber === 1 ? "center" : "left",
                    wrapText: colNumber === 10 // Wrap text for Address column
                };
                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };
                // Ensure mobile & sr.no remain text/number appropriately:
                if (colNumber === 8) {
                    // Mobile column (H) -> store as text
                    cell.numFmt = "@"; // text format
                }
            });
        }

        // Auto-fit columns based on content
        worksheet.columns.forEach((column) => {
            let maxColumnLength = 0;
            column.eachCell({ includeEmpty: true }, (cell) => {
                const columnLength = cell.value ? cell.value.toString().length : 10;
                if (columnLength > maxColumnLength) {
                    maxColumnLength = columnLength;
                }
            });
            // Cap width to max 40 to avoid extreme widening, min 10
            column.width = Math.min(Math.max(maxColumnLength + 2, 10), 40);
        });

        // Prepare filename and headers
        const filename = `fire-extinguishers-${new Date().toISOString().slice(0, 10)}.xlsx`;
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

        // Write workbook to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Export Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

const deleteSilinder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id) throw new ApiError(400, 'id is required');
    monoIdIsValid(id);
    const silinder = await gasSilinder.findByIdAndDelete(id);
    if (!silinder) throw new ApiError(404, 'Silinder not found');
    return res.status(200).json(new ApiResponse(200, 'Silinder deleted successfully'));
})
export {
    addSilinder,
    exportFireExtinguishersXlsx,
    updateSilinder,
    createRefilling,
    getFireExtinguishers,
    deleteSilinder
}