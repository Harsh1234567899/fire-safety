import { AMC } from "../models/AMC.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { monoIdIsValid } from "../utils/mongoDBid.js";
import { body, validationResult } from "express-validator";
import ExcelJS from "exceljs";
import { amcVisit } from "../models/AMCvisit.model.js";
import { client } from "../models/client.model.js";

import { Document } from "../models/Document.model.js";
import mongoose from "mongoose";

const getAMCs = asyncHandler(async (req, res) => {

    const { isAdminOrManager } = resolveUserRole(req.user)

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const filter = {};

    // helper: intersection of two id arrays
    const intersect = (a = [], b = []) => {
        const setB = new Set(b.map(String));
        return a.filter(x => setB.has(String(x)));
    };

    // resolve permitted clients for non-admin users
    let clientIds = null;
    if (!isAdminOrManager) {
        clientIds = await getPermittedClientIds(req.user._id)

        if (clientIds.length === 0) {
            return res.json(new ApiResponse(200, { total: 0, page, limit, count: 0, data: [], }, "you have no client"));
        }
        filter.clientId = { $in: clientIds };
    }

    // status filter (single value)
    if (req.query.status) filter.status = String(req.query.status).trim();

    // clientName filter: resolve to clientIds and apply (intersect with existing clientId filter if present)
    if (req.query.firmName?.trim()) {
        const matchedIds = await getClientIdsByFirmName(req.query.firmName)

        if (filter.clientId && filter.clientId.$in) {
            // intersect existing allowed clientIds with matchedIds
            const newIds = intersect(filter.clientId.$in, matchedIds);
            // if no intersection, return empty quickly
            if (newIds.length === 0) {
                return res.json(new ApiResponse(200, { total: 0, page, limit, count: 0, data: [], }, "you have no client"));
            }
            filter.clientId = { $in: newIds };
        } else {
            // no pre-existing client restriction
            filter.clientId = { $in: matchedIds };
        }
    }

    // --- Date range parsing (for YYYY-MM-DD or full ISO) ---
    const startRaw = req.query.startDate ? String(req.query.startDate).trim() : null;
    const endRaw = req.query.endDate ? String(req.query.endDate).trim() : null;

    let dateRange = parseUtcDateRange(startRaw, endRaw)

    if (String(req.query.type || "").toLowerCase() === "amc-visit") {
        const visitFilter = {};

        if (!isAdminOrManager) {
            visitFilter.clientId = { $in: clientIds };
        }

        // apply clientName match for visits as well (intersect like above)
        if (req.query.firmName?.trim()) {
            const matchedIds = await getClientIdsByFirmName(req.query.firmName)
            if (visitFilter.clientId && visitFilter.clientId.$in) {
                const newIds = intersect(visitFilter.clientId.$in, matchedIds);
                if (newIds.length === 0) {
                    return res.json(new ApiResponse(200, { total: 0, page, limit, count: 0, data: [], }, "you have no client"));
                }
                visitFilter.clientId = { $in: newIds };
            } else {
                visitFilter.clientId = { $in: matchedIds };
            }
        }

        // apply date range to visit startDate if provided
        if (dateRange) {
            visitFilter.startDate = dateRange;
        }


        const allowedSortVisit = ["startDate", "endDate", "createdAt"];
        const sortByVisit = allowedSortVisit.includes(req.query.sortBy) ? req.query.sortBy : "startDate";
        const sortDirVisit = req.query.sortDir === "desc" ? -1 : 1;

        const [total, docs] = await Promise.all([
            amcVisit.countDocuments(visitFilter),
            amcVisit.find(visitFilter)
                .populate({
                    path: "clientId",
                    select: "firmName contactPerson contactNumber email gstNumber city address",
                })
                .sort({ [sortByVisit]: sortDirVisit })
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);
        const amcIds = docs.map((d) => d._id);
        let documentsMap = {};
        if (amcIds.length > 0) {
            const documents = await Document.find({
                referenceId: { $in: amcIds },
                serviceType: 'amc'
            })
                .select("referenceId filename url _id")
                .lean();

            // group by referenceId for quick lookup
            documentsMap = documents.reduce((acc, doc) => {
                const key = String(doc.referenceId);
                if (!acc[key]) acc[key] = [];
                acc[key].push({ filename: doc.filename, url: doc.url, id: doc._id, });
                return acc;
            }, {});
        }
        const docsWithFiles = docs.map((d) => {
            const key = String(d._id);
            return {
                ...d,
                documents: documentsMap[key] || [],
            };
        });
        return res.json(new ApiResponse(200, { total, page, limit, count: docsWithFiles.length, data: docsWithFiles }, "all data fatched"));
    }

    if (req.query.type) {
        const t = String(req.query.type).toLowerCase();

        if (t === "new") {
            filter.type = "new";
        } else if (t === "refilling") {
            filter.type = "refilling";
        }
    }

    if (dateRange) {
        filter.$or = [
            { startDate: dateRange },
            { endDate: dateRange },
        ];
    }

    const [total, docs] = await Promise.all([
        AMC.countDocuments(filter),
        AMC.find(filter)
            .populate({
                path: "clientId",
                select: "firmName contactPerson contactNumber email gstNumber city address",
            })
            .sort({ endDate: 1 })
            .skip(skip)
            .limit(limit)
            .lean(),
    ]);

    return res.status(200).json(new ApiResponse(200, { success: true, total, page, limit, count: docs.length, data: docs, }, "data fatched"));

})

const exportAMCsXlsx = asyncHandler(async (req, res) => {

    const { isAdminOrManager } = resolveUserRole(req.user)
    const filter = {};

    // For non-admins restrict to clients they created
    let clientIds = null;
    if (!isAdminOrManager) {
        clientIds = await getPermittedClientIds(req.user._id)
        if (clientIds.length === 0) {
            // header-only workbook (no rows)
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("AMC DATA");
            worksheet.mergeCells("A1:H1");
            const title = worksheet.getCell("A1");
            title.value = "AMC DATA";
            title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
            title.alignment = { vertical: "middle", horizontal: "center" };
            worksheet.addRow([
                "Sr.no.",
                "Company name",
                "AMC START DATE",
                "AMC END DATE",
                "Person name",
                "Mobile no.",
                "E-mail Id",
                "Address"
            ]);
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", `attachment; filename="amcs-${new Date().toISOString().slice(0, 10)}.xlsx"`);
            await workbook.xlsx.write(res);
            res.end();
            return;
        }
        filter.clientId = { $in: clientIds };
    }

    const params = { ...req.query, ...req.body };

    // Support for selection
    if (params.ids && Array.isArray(params.ids) && params.ids.length > 0) {
        filter._id = { $in: params.ids.map(id => new mongoose.Types.ObjectId(String(id))) };
    }

    // status filter
    if (params.status) filter.status = String(params.status).trim();

    // clientName filter -> resolve ids and intersect with existing filter.clientId if present
    if (params.firmName && params.firmName.trim()) {
        const matchedIds = await getClientIdsByFirmName(params.firmName)
        if (matchedIds.length === 0) {
            // no matches -> header-only workbook
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("AMC DATA");
            worksheet.mergeCells("A1:H1");
            const title = worksheet.getCell("A1");
            title.value = "AMC DATA";
            title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
            title.alignment = { vertical: "middle", horizontal: "center" };
            worksheet.addRow([
                "Sr.no.",
                "Company name",
                "AMC START DATE",
                "AMC END DATE",
                "Person name",
                "Mobile no.",
                "E-mail Id",
                "Address"
            ]);
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", `attachment; filename="amcs-${new Date().toISOString().slice(0, 10)}.xlsx"`);
            await workbook.xlsx.write(res);
            res.end();
            return;
        }
        if (filter.clientId && filter.clientId.$in) {
            const setB = new Set(matchedIds.map(String));
            const newIds = filter.clientId.$in.filter(x => setB.has(String(x)));
            if (newIds.length === 0) {
                // intersection empty -> header-only
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet("AMC DATA");
                worksheet.mergeCells("A1:H1");
                const title = worksheet.getCell("A1");
                title.value = "AMC DATA";
                title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
                title.alignment = { vertical: "middle", horizontal: "center" };
                worksheet.addRow([
                    "Sr.no.",
                    "Company name",
                    "AMC START DATE",
                    "AMC END DATE",
                    "Person name",
                    "Mobile no.",
                    "E-mail Id",
                    "Address"
                ]);
                res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                res.setHeader("Content-Disposition", `attachment; filename="amcs-${new Date().toISOString().slice(0, 10)}.xlsx"`);
                await workbook.xlsx.write(res);
                res.end();
                return;
            }
            filter.clientId = { $in: newIds };
        } else {
            filter.clientId = { $in: matchedIds };
        }
    }

    // Date parsing (YYYY-MM-DD or ISO), build UTC start/end same as getAMCs
    const startRaw = params.startDate ? String(params.startDate).trim() : null;
    const endRaw = params.endDate ? String(params.endDate).trim() : null;

    let dateRange = parseUtcDateRange(startRaw, endRaw)

    // If requesting visits -> use AmcVisitModel and different header
    const isVisit = String(params.type || "").toLowerCase() === "amc-visit";

    // If type filter provided for AMCs (new/refilling)
    if (!isVisit && params.type) {
        const t = String(params.type).toLowerCase();
        if (t === "new") filter.type = "new";
        else if (t === "refilling") filter.type = "refilling";
    }

    // Attach dateRange: for AMCs we want records that overlap range in startDate OR expiryDate
    if (!isVisit && dateRange) {
        filter.$or = [{ startDate: dateRange }, { endDate: dateRange }];
    }

    // Build workbook and sheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("AMC DATA");

    // Title row
    worksheet.mergeCells("A1:I1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = "AMC DATA";
    titleCell.font = { name: "Arial", size: 14, bold: true };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
    worksheet.getRow(1).height = 26;

    // Choose headers depending on visit or not
    const headersVisit = [
        "Sr.no.",
        "Company name",
        "Service Type",
        "AMC VISIT START DATE",
        "AMC VISIT END DATE",
        "Person name",
        "Mobile no.",
        "E-mail Id",
        "Address"
    ];
    const headersAmc = [
        "Sr.no.",
        "Company name",
        "Service Type",
        "AMC START DATE",
        "AMC END DATE",
        "Person name",
        "Mobile no.",
        "E-mail Id",
        "Address"
    ];

    // Use appropriate header and column layout
    if (isVisit) {
        // Create header row (9 columns)
        worksheet.addRow(headersVisit);
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

        worksheet.columns = [
            { key: "sr", width: 6 },           // A
            { key: "company", width: 28 },     // B
            { key: "serviceType", width: 16 }, // C
            { key: "visitStart", width: 18 },  // D
            { key: "visitEnd", width: 18 },    // E
            { key: "person", width: 20 },      // F
            { key: "mobile", width: 16 },      // G
            { key: "email", width: 30 },       // H
            { key: "address", width: 30 }      // I
        ];
    } else {
        // AMC header (8 columns)
        worksheet.addRow(headersAmc);
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

        worksheet.columns = [
            { key: "sr", width: 6 },          // A
            { key: "company", width: 28 },    // B
            { key: "serviceType", width: 16 },// C
            { key: "startDate", width: 18 },  // D
            { key: "endDate", width: 18 },    // E
            { key: "person", width: 20 },     // F
            { key: "mobile", width: 16 },     // G
            { key: "email", width: 30 },      // H
            { key: "address", width: 30 }     // I
        ];
    }

    // Prepare DB cursor and query
    let cursor;
    if (isVisit) {
        const visitFilter = {};
        if (!isAdminOrManager) visitFilter.clientId = { $in: clientIds };

        // clientName was already handled earlier; if filter.clientId exists, intersect applied
        // apply dateRange to visit's startDate if present
        if (dateRange) visitFilter.startDate = dateRange;


        const sortByVisit = ["startDate", "endDate", "createdAt"].includes(params.sortBy) ? params.sortBy : "startDate";
        const sortDir = params.sortDir === "desc" ? -1 : 1;

        cursor = amcVisit.find(visitFilter)
            .populate({ path: "clientId", select: "firmName contactPerson contactNumber email gstNumber city address" })
            .sort({ [sortByVisit]: sortDir })
            .lean()
            .cursor();
    } else {
        const sortField = "endDate";
        cursor = AMC.find(filter)
            .populate({ path: "clientId", select: "firmName contactPerson contactNumber email gstNumber city address" })
            .sort({ [sortField]: 1 })
            .lean()
            .cursor();
    }

    // date formatter
    const formatDate = (d) => {
        if (!d) return "";
        const dt = new Date(d);
        if (isNaN(dt)) return "";
        const dd = String(dt.getDate()).padStart(2, "0");
        const mm = String(dt.getMonth() + 1).padStart(2, "0");
        const yyyy = dt.getFullYear();
        return `${dd}-${mm}-${yyyy}`;
    };

    // iterate cursor and append rows
    let idx = 0;
    for await (const doc of cursor) {
        idx++;
        if (isVisit) {
            // AmcVisit fields assumed: startDate, endDate, remarks, clientId populated
            const person = doc.clientId?.contactPerson || doc.clientId?.firmName || "";
            const mobile = doc.clientId?.contactNumber == null ? "" : String(doc.clientId?.contactNumber);
            worksheet.addRow([
                idx,
                doc.clientId?.firmName || "",
                "AMC Visit",
                formatDate(doc.startDate),
                formatDate(doc.endDate),
                person,
                mobile,
                doc.clientId?.email || "",
                doc.clientId?.address || ""
            ]);
        } else {
            // AMC fields: startDate, expiryDate, name, mobile
            const person = doc.clientId?.contactPerson || doc.clientId?.firmName || "";
            const mobile = doc.mobile == null ? (doc.clientId?.contactNumber == null ? "" : String(doc.clientId?.contactNumber)) : String(doc.mobile);
            worksheet.addRow([
                idx,
                doc.clientId?.firmName || "",
                doc.serviceType || "AMC",
                formatDate(doc.startDate),
                formatDate(doc.endDate),
                person,
                mobile,
                doc.clientId?.email || "",
                doc.clientId?.address || ""
            ]);
        }
    }

    // Style data rows and ensure mobile is text to avoid scientific notation
    const lastRowNumber = worksheet.lastRow ? worksheet.lastRow.number : 2;
    for (let r = 3; r <= lastRowNumber; r++) {
        const row = worksheet.getRow(r);
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            // center Sr.no., left others (except remarks center-left)
            let horiz = "left";
            if (colNumber === 1) horiz = "center";
            cell.alignment = { vertical: "middle", horizontal: horiz, wrapText: colNumber === 9 };
            cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
            // mobile column index is now 7 for both since we added Service Type
            const mobileColIndex = 7;
            if (colNumber === mobileColIndex) {
                cell.numFmt = "@";
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

    // filename and response headers
    const typeSuffix = isVisit ? "amc-visits" : "amcs";
    const filename = `${typeSuffix}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // write and end
    await workbook.xlsx.write(res);
    res.end();

});

const createAmcValidation = [
    body("clientId")
        .exists({ checkNull: true, checkFalsy: true })
        .withMessage("clientId is required")
        .bail()
        .custom((value) => mongoose.isValidObjectId(value))
        .withMessage("clientId must be a valid MongoDB ObjectId")
        .bail()
        .custom(async (value) => {
            const Client = await client.findById(value).select("_id");
            if (!Client) {
                throw new Error("clientId does not match any client");
            }
            return true;
        }),

    // Only require name when `entries` is not provided
    body("name")
        .if((value, { req }) => !Array.isArray(req.body.entries))
        .trim()
        .notEmpty()
        .withMessage("name is required"),

    body("mobile")
        .if((value, { req }) => !Array.isArray(req.body.entries))
        .trim()
        .notEmpty()
        .withMessage("mobile is required")
        .bail()
        .isMobilePhone("any")
        .withMessage("mobile must be a valid phone number"),

    body("personDetails")
        .optional({ nullable: true })
        .trim()
        .isLength({ min: 3 })
        .withMessage("personDetails must be at least 3 characters when provided"),

    body("type")
        .optional()
        .isIn(["new", "amc-visit", 'refilling'])
        .withMessage("type must be one of: New, amc-visit ,refilling"),

    body("startDate")
        .if((value, { req }) => !Array.isArray(req.body.entries))
        .exists({ checkNull: true, checkFalsy: true })
        .withMessage("startDate is required")
        .bail()
        .isISO8601()
        .withMessage("startDate must be a valid date (ISO 8601 format)"),

    body("endDate")
        .if((value, { req }) => !Array.isArray(req.body.entries))
        .exists({ checkNull: true, checkFalsy: true })
        .withMessage("expiryDate is required")
        .bail()
        .isISO8601()
        .withMessage("expiryDate must be a valid date (ISO 8601 format)"),

    // expiry >= start
    body("endDate")
        .if((value, { req }) => !Array.isArray(req.body.entries))
        .custom((endDate, { req }) => {
            const start = new Date(req.body.startDate);
            const expiry = new Date(endDate);
            if (isNaN(start.getTime()) || isNaN(expiry.getTime())) {
                return true; // let previous validators handle invalid dates
            }
            if (expiry < start) {
                throw new Error("expiryDate must be the same or after startDate");
            }
            return true;
        }),
];

const createAmc = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const formatted = errors
            .array()
            .map((e) => ({ field: e.param, message: e.msg }));
        return res.status(400).json({ ok: false, errors: formatted });
    }

    const { clientId, entries, documents } = req.body;

    // If entries is an array -> create multiple AMCs
    if (Array.isArray(entries) && entries.length > 0) {
        const created = [];

        // create one-by-one to preserve same create semantics (validation/defaults)
        for (const e of entries) {
            const {
                type = "new",
                personDetails,
                name,
                mobile,
                startDate,
                endDate,
                status,
                visits,
                documents: entryDocs = []
            } = e;

            const amcType = type || "new";

            const newAmc = await AMC.create({
                clientId,
                type: amcType,
                personDetails,
                name,
                mobile,
                startDate,
                endDate,
                status: status || undefined,
                visits: visits || 1,
                notes: e.notes || ''
            });

            if (entryDocs.length > 0) {
                await Document.updateMany(
                    { _id: { $in: entryDocs } },
                    { $set: { referenceId: newAmc._id } }
                );
            }

            created.push(newAmc);
        }

        return res.status(201).json(new ApiResponse(201, created, `${created.length} AMC(s) created`));
    }

    // Fallback: single-create behavior (original logic)
    const {
        type = "new",
        personDetails,
        name,
        mobile,
        startDate,
        endDate,
        status,
        visits,
        notes
    } = req.body;

    const amcType = type || "new";

    const newAmc = await AMC.create({
        clientId,
        type: amcType,
        personDetails,
        name,
        mobile,
        startDate,
        endDate,
        status: status || undefined,
        visits: visits || 1,
        notes: notes || ''
    });

    if (documents && Array.isArray(documents) && documents.length > 0) {
        await Document.updateMany(
            { _id: { $in: documents } },
            { $set: { referenceId: newAmc._id } }
        );
    }

    if (documents && Array.isArray(documents) && documents.length > 0) {
        await Document.updateMany(
            { _id: { $in: documents } },
            { $set: { referenceId: newAmc._id } }
        );
    }

    return res.status(201).json(new ApiResponse(201, newAmc, `AMC created`));
};

const createRefillingAmc = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const formatted = errors
            .array()
            .map((e) => ({ field: e.param, message: e.msg }));
        throw new ApiError(400, "validation error", formatted)
    }

    const { clientId, entries } = req.body;

    // MULTIPLE Refilling AMC create
    if (Array.isArray(entries) && entries.length > 0) {
        const created = [];

        for (const e of entries) {
            const {
                personDetails,
                name,
                mobile,
                startDate,
                endDate,
                status,
            } = e;

            const newAmc = await AMC.create({
                clientId,
                type: "refilling", // FIXED ALWAYS REFILLING
                personDetails,
                name,
                mobile,
                startDate,
                endDate,
                status: status || undefined,
            });

            created.push(newAmc);
        }

        return res.status(201).json(new ApiResponse(201, created, `${created.length} AMC(s) created`));
    }

    // SINGLE Refilling AMC create
    const {
        personDetails,
        name,
        mobile,
        startDate,
        endDate,
        status,
    } = req.body;

    const newAmc = await AMC.create({
        clientId,
        type: "refilling", // FIXED ALWAYS REFILLING
        personDetails,
        name,
        mobile,
        startDate,
        endDate,
        status: status || undefined,
    });

    return res.status(201).json(new ApiResponse(201, newAmc, ` AMC created`));

};

const updateAmcById = async (req, res) => {
    const { id } = req.params;
    monoIdIsValid(id)

    // Extract fields allowed to update
    const {
        clientId,
        type,
        personDetails,
        name,
        mobile,
        startDate,
        endDate,
        status,
        visits
    } = req.body;

    const updateData = {};

    // Only add fields if they are present (avoids overwriting with empty values)
    if (clientId) updateData.clientId = clientId;
    if (type) updateData.type = type.toLowerCase();
    if (personDetails) updateData.personDetails = personDetails;
    if (name) updateData.name = name;
    if (mobile) updateData.mobile = mobile;
    if (startDate) updateData.startDate = startDate;
    if (endDate) updateData.endDate = endDate;
    if (status) updateData.status = status.toLowerCase();
    if (visits) updateData.visits = visits;

    const updatedAmc = await AMC.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
    });

    if (!updatedAmc) {
        throw new ApiError(404, "AMC record not found")
    }

    if (req.body.documents && Array.isArray(req.body.documents) && req.body.documents.length > 0) {
        await Document.updateMany(
            { _id: { $in: req.body.documents } },
            { $set: { referenceId: updatedAmc._id } }
        );
    }

    res.status(200).json(new ApiResponse(201, updatedAmc, "AMC updated successfully"));

};

const resolveUserRole = (user) => {
    if (!user || !user._id) { // Fixed .id to ._id to match common pattern
        throw new ApiError(401, "Unauthorized");
    }
    const role = String(user.role || "").toLowerCase();
    return { isAdminOrManager: role === "admin" || role === "manager" }
};

const getPermittedClientIds = async (userId) => {
    // userId is expected to be a value here based on usage
    const clients = await client
        .find({ createdBy: userId })
        .select("_id")
        .lean();
    return clients.map(c => c._id)
};

const getClientIdsByFirmName = async (firmName) => {
    if (!firmName?.trim()) return [];
    const escaped = firmName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, "i");
    const clients = await client
        .find({ firmName: regex })
        .select("_id")
        .lean();
    return clients.map(c => c._id);
};

const parseUtcDateRange = (startDate, endDate) => {
    const parseStart = (raw) => {
        const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (ymd) {
            const [_, y, m, d] = ymd;
            return new Date(Date.UTC(+y, +m - 1, +d, 0, 0, 0, 0));
        }
        const dt = new Date(raw);
        return isNaN(dt) ? null : dt;
    };

    const parseEnd = (raw) => {
        const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (ymd) {
            const [_, y, m, d] = ymd;
            return new Date(Date.UTC(+y, +m - 1, +d, 23, 59, 59, 999));
        }
        const dt = new Date(raw);
        return isNaN(dt) ? null : dt;
    };

    if (!startDate && !endDate) return null;

    const start = startDate ? parseStart(startDate) : null;
    const end = endDate ? parseEnd(endDate) : null;

    // if (startDate && !start) throw new ApiError(400, "Invalid startDate format");
    // if (endDate && !end) throw new ApiError(400, "Invalid endDate format");
    // Simplified error handling or keep it? amc controller doesn't catch these specifically but asyncHandler does.

    if (start && end && start > end) {
        throw new ApiError(400, "startDate must be <= endDate");
    }

    if (start && end) return { $gte: start, $lte: end };
    if (start) return { $gte: start, $lte: new Date(start.getTime() + 86400000 - 1) };
    return { $lte: end };
};

export {
    getAMCs,
    exportAMCsXlsx,
    createAmcValidation,
    createAmc,
    createRefillingAmc,
    updateAmcById
}