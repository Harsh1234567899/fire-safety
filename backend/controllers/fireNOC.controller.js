import { client } from '../models/client.model.js'
import { Document } from '../models/Document.model.js'
import { fireNOC } from '../models/fireNOC.model.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { monoIdIsValid } from '../utils/mongoDBid.js'
import ExcelJS from "exceljs";
import { validationResult } from 'express-validator'


const getFireNoce = asyncHandler(
    async (req, res) => {
        if (!req.user || !req.user.id) {
            throw new ApiError(401, "Unauthorized: req.user missing")
        }

        const role = String(req.user.role || "").toLowerCase();
        const isAdminOrManager = role === "admin" || role === "manager";

        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
        const skip = (page - 1) * limit;

        const filter = {};

        let clientIds = null;
        if (!isAdminOrManager) {
            const clients = await client.find({
                createdBy: mongoose.Types.ObjectId(req.user._id),
            })
                .select("_id")
                .lean();
            clientIds = clients.map((c) => c._id);
            if (clientIds.length === 0) {
                return res.json({
                    success: true,
                    total: 0,
                    page,
                    limit,
                    count: 0,
                    data: [],
                });
            }
            filter.clientId = { $in: clientIds };
        }

        if (req.query.status) filter.status = req.query.status.toLowerCase();
        if (req.query.serviceType) filter.serviceType = req.query.serviceType.toLowerCase();
        if (req.query.firmName && req.query.firmName.trim()) {
            const clientNameRegex = new RegExp(req.query.firmName.trim(), "i");
            const matchingClients = await client.find({
                firmName: clientNameRegex,
            })
                .select("_id")
                .lean();
            const clientIdsFromName = matchingClients.map((c) => c._id);
            filter.clientId = { $in: clientIdsFromName };
        }
        if (req.query.nocType && req.query.nocType !== "all") {
            filter.nocType = new mongoose.Types.ObjectId(String(req.query.nocType));
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
                    throw new ApiError(400, "Invalid startDate format. Use YYYY-MM-DD")
                }
            }

            if (endRaw) {
                endUtc = buildUtcEnd(endRaw);
                if (!endUtc) {
                    throw new ApiError(400, "Invalid endDate format. Use YYYY-MM-DD")
                }
            }

            if (startUtc && endUtc) {
                if (startUtc.getTime() > endUtc.getTime()) {
                    throw new ApiError(400, "startDate must be <= endDate")
                }
                filter.startDate = { $gte: startUtc, $lte: endUtc };
            } else if (startUtc && !endUtc) {
                filter.startDate = {
                    $gte: startUtc,
                    $lte: new Date(startUtc.getTime() + 24 * 60 * 60 * 1000 - 1),
                };
            } else if (!startUtc && endUtc) {
                filter.startDate = { $lte: endUtc };
            }
        }

        const [total, docs] = await Promise.all([
            fireNOC.countDocuments(filter),
            fireNOC.find(filter)
                .populate({
                    path: "clientId",
                    select:
                        "firmName contactNumber contactPerson email gstNumber city address",
                })
                .populate("nocType")
                .sort({ endDate: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        // --- NEW: fetch all documents for these FireNOC ids in one query
        const nocIds = docs.map((d) => d._id);
        let documentsMap = {};
        if (nocIds.length > 0) {
            const documents = await Document.find({
                referenceId: { $in: nocIds },
                serviceType: 'noc'
            })
                .select("referenceId filename url _id")
                .lean();

            // group by nocId for quick lookup
            documentsMap = documents.reduce((acc, doc) => {
                const key = String(doc.nocId);
                if (!acc[key]) acc[key] = [];
                acc[key].push({ filename: doc.filename, url: doc.url, id: doc._id, });
                return acc;
            }, {});
        }

        // attach documents array to each FireNOC doc (empty array if none)
        const docsWithFiles = docs.map((d) => {
            const key = String(d._id);
            return {
                ...d,
                documents: documentsMap[key] || [],
            };
        });

        return res.status(200).json(new ApiResponse(200, {
            success: true,
            total,
            page,
            limit,
            count: docsWithFiles.length,
            data: docsWithFiles,
        }, "all data fatced"));
    }
)

const exportFireNOCsXlsx = asyncHandler(
    async (req, res) => {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const role = String(req.user.role || "").toLowerCase();
        const isAdminOrManager = role === "admin" || role === "manager";

        const filter = {};

        // If not admin/manager restrict to user's clients
        if (!isAdminOrManager) {
            const clients = await Client.find({ createdBy: mongoose.Types.ObjectId(req.user.id) }).select("_id").lean();
            const clientIds = clients.map(c => c._id);
            if (clientIds.length === 0) {
                // return workbook with header only (no rows)
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet("NOC DATA");
                worksheet.mergeCells("A1:H1");
                const title = worksheet.getCell("A1");
                title.value = "NOC DATA";
                title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
                title.alignment = { vertical: "middle", horizontal: "center" };
                worksheet.addRow([
                    "Sr.no.",
                    "Company name",
                    "NOC START DATE",
                    "NOC EXPIRY DATE",
                    "Person name",
                    "Mobile no.",
                    "E-mail Id",
                    "Adress"
                ]);
                res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                res.setHeader("Content-Disposition", `attachment; filename="fire-nocs-${new Date().toISOString().slice(0, 10)}.xlsx"`);
                await workbook.xlsx.write(res);
                res.end();
                return;
            }
            filter.clientId = { $in: clientIds };
        }

        // Query params -> apply filters (mirrors your getFireNOCs)
        if (req.query.ids) {
            try {
                const idsArray = req.query.ids.split(',').map(id => new mongoose.Types.ObjectId(id.trim()));
                filter._id = { $in: idsArray };
            } catch (e) {
                return res.status(400).json({ success: false, message: "Invalid IDs provided" });
            }
        }

        if (req.query.status) filter.status = req.query.status.toLowerCase();
        if (req.query.serviceType) filter.serviceType = req.query.serviceType.toLowerCase();
        if (req.query.nocType && req.query.nocType !== "all") {
            try { filter.nocType = new mongoose.Types.ObjectId(String(req.query.nocType)); } catch (e) { }
        }

        if (req.query.firmName && req.query.firmName.trim()) {
            const clientNameRegex = new RegExp(req.query.firmName.trim(), "i");
            const matchingClients = await client.find({ firmName: clientNameRegex }).select("_id").lean();
            const clientIds = matchingClients.map(c => c._id);
            if (clientIds.length > 0) filter.clientId = { $in: clientIds };
            else {
                // no matches -> return empty workbook with header
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet("NOC DATA");
                worksheet.mergeCells("A1:H1");
                const title = worksheet.getCell("A1");
                title.value = "NOC DATA";
                title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
                title.alignment = { vertical: "middle", horizontal: "center" };
                worksheet.addRow([
                    "Sr.no.",
                    "Company name",
                    "NOC START DATE",
                    "NOC EXPIRY DATE",
                    "Person name",
                    "Mobile no.",
                    "E-mail Id",
                    "Adress"
                ]);
                res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                res.setHeader("Content-Disposition", `attachment; filename="fire-nocs-${new Date().toISOString().slice(0, 10)}.xlsx"`);
                await workbook.xlsx.write(res);
                res.end();
                return;
            }
        }

        // Date range parsing same as your getFireNOCs (startDate filters startDate field)
        const startRaw = req.query.startDate ? String(req.query.startDate).trim() : null;
        const endRaw = req.query.endDate ? String(req.query.endDate).trim() : null;
        const buildUtcStart = (yyyyMMdd) => {
            const parts = yyyyMMdd.split("-");
            if (parts.length !== 3) return null;
            const y = parseInt(parts[0], 10), m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
            if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
            return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
        };
        const buildUtcEnd = (yyyyMMdd) => {
            const parts = yyyyMMdd.split("-");
            if (parts.length !== 3) return null;
            const y = parseInt(parts[0], 10), m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
            if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
            return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
        };

        if (startRaw || endRaw) {
            let startUtc = null, endUtc = null;
            if (startRaw) {
                startUtc = buildUtcStart(startRaw);
                if (!startUtc) return res.status(400).json({ success: false, message: "Invalid startDate format. Use YYYY-MM-DD" });
            }
            if (endRaw) {
                endUtc = buildUtcEnd(endRaw);
                if (!endUtc) return res.status(400).json({ success: false, message: "Invalid endDate format. Use YYYY-MM-DD" });
            }

            if (startUtc && endUtc) {
                if (startUtc.getTime() > endUtc.getTime()) return res.status(400).json({ success: false, message: "startDate must be <= endDate" });
                filter.startDate = { $gte: startUtc, $lte: endUtc };
            } else if (startUtc && !endUtc) {
                filter.startDate = { $gte: startUtc, $lte: new Date(startUtc.getTime() + 24 * 60 * 60 * 1000 - 1) };
            } else if (!startUtc && endUtc) {
                filter.startDate = { $lte: endUtc };
            }
        }

        // Build workbook + worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("NOC DATA");

        // Title (merge A1:I1) and style
        worksheet.mergeCells("A1:I1");
        const titleCell = worksheet.getCell("A1");
        titleCell.value = "NOC DATA";
        titleCell.font = { name: "Arial", size: 14, bold: true };
        titleCell.alignment = { vertical: "middle", horizontal: "center" };
        titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } }; // yellow
        worksheet.getRow(1).height = 26;

        // Header row at row 2
        const headers = [
            "Sr.no.",
            "Company name",
            "Service Type",
            "NOC START DATE",
            "NOC EXPIRY DATE",
            "Person name",
            "Mobile no.",
            "E-mail Id",
            "Adress"
        ];
        worksheet.addRow(headers);
        const headerRow = worksheet.getRow(2);
        headerRow.eachCell((cell) => {
            cell.font = { bold: true };
            cell.alignment = { vertical: "middle", horizontal: "center" };
            cell.border = {
                top: { style: "thin" }, left: { style: "thin" },
                bottom: { style: "thin" }, right: { style: "thin" }
            };
        });
        worksheet.getRow(2).height = 20;

        // Set column widths similar to your template
        worksheet.columns = [
            { key: "sr", width: 6 },          // A
            { key: "company", width: 28 },    // B
            { key: "serviceType", width: 16 },// C
            { key: "startDate", width: 18 },  // D
            { key: "expiryDate", width: 18 }, // E
            { key: "person", width: 20 },     // F
            { key: "mobile", width: 16 },     // G
            { key: "email", width: 30 },      // H
            { key: "address", width: 30 }     // I
        ];

        // Stream DB cursor and append rows (start at row 3)
        const cursor = await fireNOC.find(filter)
            .populate({ path: "clientId", select: "firmName contactPerson contactNumber email address" })
            .populate("nocType")
            .sort({ endDate: 1 })
            .lean()
            .cursor();

        let idx = 0;
        const formatDate = (d) => {
            if (!d) return "";
            const dt = new Date(d);
            const dd = String(dt.getDate()).padStart(2, "0");
            const mm = String(dt.getMonth() + 1).padStart(2, "0");
            const yyyy = dt.getFullYear();
            return `${dd}-${mm}-${yyyy}`;
        };

        for await (const doc of cursor) {
            idx++;
            const person = doc.clientId?.contactPerson || doc.clientId?.firmName || "";
            const mobile = doc.clientId?.contactNumber == null ? "" : String(doc.clientId?.contactNumber);
            worksheet.addRow([
                idx,
                doc.clientId?.firmName || "",
                doc.serviceType || "new",
                formatDate(doc.startDate),
                formatDate(doc.endDate),
                person,
                mobile,
                doc.clientId?.email || "",
                doc.clientId?.address || ""
            ]);
        }

        // Style data rows (borders, alignment) and ensure mobile is text
        const lastRowNumber = worksheet.lastRow ? worksheet.lastRow.number : 2;
        for (let r = 3; r <= lastRowNumber; r++) {
            const row = worksheet.getRow(r);
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                // center Sr.no., left other columns
                cell.alignment = { vertical: "middle", horizontal: colNumber === 1 ? "center" : "left", wrapText: colNumber === 9 };
                cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
                if (colNumber === 7) { // mobile column (G)
                    cell.numFmt = "@"; // text format to avoid scientific notation
                }
            });
            // row.height removed to allow content to wrap naturally
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

        // prepare headers
        const filename = `fire-nocs-${new Date().toISOString().slice(0, 10)}.xlsx`;
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

        // write workbook to response
        await workbook.xlsx.write(res);
        res.end();

    }
)

const createFireNoc = asyncHandler(
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { clientId, entries, serviceType, nocType, nocName, startDate, endDate, notes, documents } = req.body;

        // Normalise: accept both {entries:[...]} array format AND flat single-entry format
        const normalizedEntries = Array.isArray(entries) && entries.length > 0
            ? entries
            : [{ serviceType, nocType, nocName, startDate, endDate, notes, documents }];

        if (!clientId) {
            return res.status(400).json({ success: false, message: "clientId is required" });
        }

        const now = new Date();
        const docs = [];

        for (const entry of normalizedEntries) {
            const docStartDate = new Date(entry.startDate);
            const docEndDate = new Date(entry.endDate);

            if (isNaN(docStartDate.getTime()) || isNaN(docEndDate.getTime())) {
                return res.status(400).json({ success: false, message: "Invalid startDate or endDate" });
            }

            const status = docEndDate < now ? "expired" : "ongoing";

            const resolvedNocName =
                entry.nocName && entry.nocName.trim() !== ""
                    ? entry.nocName
                    : entry.kgLtr || "Unknown";

            const resolvedNotes = entry.notes || "";

            docs.push({
                clientId,
                serviceType: entry.serviceType || 'new',
                nocType: entry.nocType,
                nocName: resolvedNocName,
                startDate: docStartDate,
                endDate: docEndDate,
                status: status.toLowerCase(),
                notes: resolvedNotes,
                documents: entry.documents || documents || [] // use entry.documents, fallback to top-level documents
            });
        }

        const docsToInsert = docs.map(({ documents, ...rest }) => rest);
        const created = await fireNOC.insertMany(docsToInsert);

        // Map any attached documents to the newly generated database IDs
        for (let i = 0; i < created.length; i++) {
            const entryDocs = docs[i].documents;
            if (entryDocs && entryDocs.length > 0) {
                await Document.updateMany(
                    { _id: { $in: entryDocs } },
                    { $set: { referenceId: created[i]._id } }
                );
            }
        }

        return res.status(201).json({
            success: true,
            message: `${created.length} FireNOC entries created`,
            data: created,
        });
    }
)

const updateFireNoc = asyncHandler(
    async (req, res) => {
        const { id } = req.params;

        // Validate ID
        monoIdIsValid(id)

        // Extract updatable fields from body
        const {
            clientId,
            serviceType,
            nocType,
            nocName,
            startDate,
            endDate,
            notes,
            documents
        } = req.body;

        // Build dynamic payload (skip undefined or empty string)
        const payload = {};

        if (clientId) payload.clientId = clientId;
        if (serviceType) payload.serviceType = serviceType;
        if (nocType) payload.nocType = nocType;
        if (nocName) payload.nocName = nocName;
        if (startDate) payload.startDate = startDate;
        if (endDate) payload.endDate = endDate;
        if (notes) payload.notes = notes;

        // Auto-update status based on expiry date
        if (endDate) {
            payload.status = new Date(endDate) < new Date() ? "expired" : "ongoing";
        }

        const updated = await fireNOC.findByIdAndUpdate(id, payload, {
            new: true,
            runValidators: true,
        }).populate("nocType clientId");

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Fire NOC record not found",
            });
        }

        if (req.body.documents && Array.isArray(req.body.documents) && req.body.documents.length > 0) {
            await Document.updateMany(
                { _id: { $in: req.body.documents } },
                { $set: { referenceId: updated._id } }
            );
        }

        res.json({
            success: true,
            message: "Fire NOC updated successfully",
            data: updated,
        });

    }
)

const createFireNOCRefilling = asyncHandler(
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        // Helper to check for a valid ObjectId
        const isValidObjectId = (id) => !!id && mongoose.Types.ObjectId.isValid(String(id));

        const now = new Date();
        const docs = [];


        // Support two payload shapes:
        // 1) { clientId, entries: [ { nocType, nocName, startDate, expiryDate }, ... ] }
        // 2) { entries: [ { clientId, entries: [...] }, ... ] }
        const payload = req.body ?? {};
        let groups = [];

        if (Array.isArray(payload.entries) && payload.entries.length > 0 && payload.entries[0].entries) {
            // shape (2): array of groups
            groups = payload.entries;
        } else {
            // shape (1): single group
            groups = [{ clientId: payload.clientId, entries: payload.entries || [] }];
        }

        // Build docs and validate each entry
        for (let gIndex = 0; gIndex < groups.length; gIndex++) {
            const group = groups[gIndex];
            const groupClientId = group.clientId;

            if (!isValidObjectId(groupClientId)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid or missing clientId for group index ${gIndex}`,
                });
            }

            if (!Array.isArray(group.entries) || group.entries.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: `No entries provided for clientId ${groupClientId} (group index ${gIndex})`,
                });
            }

            for (let eIndex = 0; eIndex < group.entries.length; eIndex++) {
                const entry = group.entries[eIndex] || {};

                if (!isValidObjectId(entry.nocType)) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid or missing nocType for group ${gIndex}, entry ${eIndex}`,
                    });
                }

                // parse dates only if provided; ensure they are valid
                let startDate = undefined;
                let expiryDate = undefined;

                if (entry.startDate !== undefined && entry.startDate !== null && entry.startDate !== "") {
                    startDate = new Date(entry.startDate);
                    if (isNaN(startDate.getTime())) {
                        return res.status(400).json({
                            success: false,
                            message: `Invalid startDate for group ${gIndex}, entry ${eIndex}: "${entry.startDate}"`,
                        });
                    }
                }

                if (entry.expiryDate !== undefined && entry.expiryDate !== null && entry.expiryDate !== "") {
                    expiryDate = new Date(entry.expiryDate);
                    if (isNaN(expiryDate.getTime())) {
                        return res.status(400).json({
                            success: false,
                            message: `Invalid expiryDate for group ${gIndex}, entry ${eIndex}: "${entry.expiryDate}"`,
                        });
                    }
                }

                // If expiryDate provided, compute status; if not provided, default to "ongoing"
                const status = expiryDate ? (expiryDate < now ? "expired" : "ongoing") : "ongoing";

                const nocName =
                    entry.nocName && String(entry.nocName).trim() !== ""
                        ? String(entry.nocName).trim()
                        : entry.kgLtr || "Unknown";

                docs.push({
                    clientId: groupClientId,
                    serviceType: "Refilling",
                    nocType: entry.nocType,
                    nocName,
                    startDate: startDate ?? undefined,
                    expiryDate: expiryDate ?? undefined,
                    status,
                });
            }
        }

        // Insert all docs
        const created = await FireNOC.insertMany(docs);

        return res.status(201).json({
            success: true,
            message: `${created.length} FireNOC (Refilling) entries created`,
            data: created,
        })
    }
)
export {
    createFireNOCRefilling,
    createFireNoc,
    getFireNoce,
    updateFireNoc,
    exportFireNOCsXlsx
}