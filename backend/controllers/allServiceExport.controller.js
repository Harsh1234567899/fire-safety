import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { gasSilinder } from '../models/gasSilinder.model.js'
import { fireNOC } from '../models/fireNOC.model.js'
import { AMC } from '../models/AMC.model.js'
import { getClientIdsByFirmName, resolveUserRole, parseUtcDateRange } from "../utils/otherUtils.js";
import mongoose from 'mongoose';
import ExcelJS from 'exceljs'

/**
 * Export all-service data (Fire Extinguisher + NOC + AMC) into a single multi-sheet Excel workbook.
 * POST /api/v1/service/download-all-report
 */
const exportAllServicesXlsx = asyncHandler(async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            throw new ApiError(401, "Unauthorized: req.user missing")
        }

        const { isAdminOrManager } = resolveUserRole(req.user)
        const params = { ...req.query, ...req.body };

        // Build common filter
        const buildFilter = async () => {
            const filter = {};
            if (!isAdminOrManager) filter.createdBy = req.user._id;
            if (params.status) filter.status = String(params.status).toLowerCase();
            if (params.firmName && params.firmName.trim()) {
                const clientIds = await getClientIdsByFirmName(params.firmName);
                filter.clientId = clientIds.length > 0 ? { $in: clientIds } : { $in: [] };
            }
            const startRaw = params.startDate ? String(params.startDate).trim() : null;
            const endRaw = params.endDate ? String(params.endDate).trim() : null;
            if (startRaw || endRaw) {
                const range = parseUtcDateRange({ startDate: startRaw, endDate: endRaw });
                if (range) filter.endDate = range;
            }
            return filter;
        };

        const formatDate = (d) => {
            if (!d) return "";
            const dt = new Date(d);
            return `${String(dt.getDate()).padStart(2, "0")}-${String(dt.getMonth() + 1).padStart(2, "0")}-${dt.getFullYear()}`;
        };

        const addSheetHeaders = (worksheet, title, cols) => {
            const colCount = cols.length;
            const lastCol = String.fromCharCode(64 + colCount);
            worksheet.mergeCells(`A1:${lastCol}1`);
            const titleCell = worksheet.getCell("A1");
            titleCell.value = title;
            titleCell.alignment = { vertical: "middle", horizontal: "center" };
            titleCell.font = { name: "Arial", size: 14, bold: true };
            titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
            titleCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
            worksheet.getRow(1).height = 26;

            worksheet.addRow(cols);
            const headerRow = worksheet.getRow(2);
            headerRow.eachCell((cell) => {
                cell.font = { name: "Arial", size: 11, bold: true };
                cell.alignment = { vertical: "middle", horizontal: "center" };
                cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
            });
            worksheet.getRow(2).height = 22;
        };

        const styleDataRows = (worksheet) => {
            const lastRowNumber = worksheet.lastRow ? worksheet.lastRow.number : 2;
            for (let r = 3; r <= lastRowNumber; r++) {
                const row = worksheet.getRow(r);
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    cell.alignment = { vertical: "middle", horizontal: colNumber === 1 ? "center" : "left", wrapText: true };
                    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
                });
            }
            worksheet.columns.forEach((column) => {
                let maxLen = 10;
                column.eachCell({ includeEmpty: true }, (cell) => {
                    const len = cell.value ? cell.value.toString().length : 10;
                    if (len > maxLen) maxLen = len;
                });
                column.width = Math.min(Math.max(maxLen + 2, 10), 50);
            });
        };

        const workbook = new ExcelJS.Workbook();
        const filter = await buildFilter();

        // ── Sheet 1: Fire Extinguisher ──
        const feSheet = workbook.addWorksheet("Fire Extinguisher");
        addSheetHeaders(feSheet, "FIRE EXTINGUISHER DATA", [
            "Sr.no.", "Service Type", "Company Name", "Person Name", "Mobile No.", "E-mail Id", "Start Date", "End Date", "Qty", "Address"
        ]);
        feSheet.columns = [
            { key: "sr", width: 6 }, { key: "serviceType", width: 16 }, { key: "company", width: 28 },
            { key: "person", width: 20 }, { key: "mobile", width: 16 }, { key: "email", width: 30 },
            { key: "startDate", width: 18 }, { key: "endDate", width: 18 }, { key: "qty", width: 8 }, { key: "address", width: 45 }
        ];
        const feCursor = gasSilinder.find(filter)
            .populate({ path: "clientId", select: "firmName contactPerson contactNumber email city address" })
            .populate("category").sort({ endDate: 1 }).lean().cursor();
        let feIdx = 0;
        for await (const doc of feCursor) {
            feIdx++;
            feSheet.addRow([
                feIdx, doc.serviceType || "new",
                doc.clientId?.firmName || "", doc.clientId?.contactPerson || "",
                String(doc.clientId?.contactNumber ?? ""), doc.clientId?.email || "",
                formatDate(doc.startDate), formatDate(doc.endDate),
                doc.quantity ?? "", doc.clientId?.address || ""
            ]);
        }
        styleDataRows(feSheet);

        // ── Sheet 2: Fire NOC ──
        const nocSheet = workbook.addWorksheet("Fire NOC");
        addSheetHeaders(nocSheet, "FIRE NOC DATA", [
            "Sr.no.", "Service Type", "Company Name", "Person Name", "Mobile No.", "E-mail Id", "Start Date", "End Date", "Status"
        ]);
        nocSheet.columns = [
            { key: "sr", width: 6 }, { key: "serviceType", width: 16 }, { key: "company", width: 28 },
            { key: "person", width: 20 }, { key: "mobile", width: 16 }, { key: "email", width: 30 },
            { key: "startDate", width: 18 }, { key: "endDate", width: 18 }, { key: "status", width: 14 }
        ];

        // Remove category filter for NOC
        const nocFilter = { ...filter };
        delete nocFilter.category;
        const nocCursor = fireNOC.find(nocFilter)
            .populate({ path: "clientId", select: "firmName contactPerson contactNumber email" })
            .populate("nocType", "name").sort({ endDate: 1 }).lean().cursor();
        let nocIdx = 0;
        for await (const doc of nocCursor) {
            nocIdx++;
            nocSheet.addRow([
                nocIdx, doc.nocType?.name || doc.nocName || "Fire NOC",
                doc.clientId?.firmName || "", doc.clientId?.contactPerson || "",
                String(doc.clientId?.contactNumber ?? ""), doc.clientId?.email || "",
                formatDate(doc.startDate), formatDate(doc.endDate), doc.status || ""
            ]);
        }
        styleDataRows(nocSheet);

        // ── Sheet 3: AMC ──
        const amcSheet = workbook.addWorksheet("AMC");
        addSheetHeaders(amcSheet, "AMC CONTRACT DATA", [
            "Sr.no.", "Service Type", "Company Name", "Person Name", "Mobile No.", "E-mail Id", "Start Date", "End Date", "Status"
        ]);
        amcSheet.columns = [
            { key: "sr", width: 6 }, { key: "serviceType", width: 16 }, { key: "company", width: 28 },
            { key: "person", width: 20 }, { key: "mobile", width: 16 }, { key: "email", width: 30 },
            { key: "startDate", width: 18 }, { key: "endDate", width: 18 }, { key: "status", width: 14 }
        ];

        const amcFilter = { ...filter };
        delete amcFilter.category;
        const amcCursor = AMC.find(amcFilter)
            .populate({ path: "clientId", select: "firmName contactPerson contactNumber email" })
            .sort({ endDate: 1 }).lean().cursor();
        let amcIdx = 0;
        for await (const doc of amcCursor) {
            amcIdx++;
            amcSheet.addRow([
                amcIdx, doc.name || "AMC",
                doc.clientId?.firmName || "", doc.clientId?.contactPerson || "",
                String(doc.clientId?.contactNumber ?? ""), doc.clientId?.email || "",
                formatDate(doc.startDate), formatDate(doc.endDate), doc.status || ""
            ]);
        }
        styleDataRows(amcSheet);

        const filename = `all-services-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error("All-Service Export Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

export { exportAllServicesXlsx }
