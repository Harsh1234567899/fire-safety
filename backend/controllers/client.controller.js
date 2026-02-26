import { asyncHandler } from '../utils/asyncHandler.js'
import { param, body, validationResult } from 'express-validator'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { client } from '../models/client.model.js'
import { gasSilinder } from '../models/gasSilinder.model.js'
import { fireNOC } from '../models/fireNOC.model.js'
import { AMC } from '../models/AMC.model.js'
import { amcVisit } from '../models/AMCvisit.model.js'
import { monoIdIsValid } from '../utils/mongoDBid.js'
import mongoose from 'mongoose'
import ExcelJS from 'exceljs'

const validateCreateClient = [
    body("firmName")
        .trim()
        .notEmpty()
        .withMessage("Firm name is required"),
    body("contactPerson")
        .trim()
        .notEmpty()
        .withMessage("Contact person is required"),

    body("contactNumber")
        .trim()
        .notEmpty()
        .withMessage("Phone number is required")
        .isMobilePhone("en-IN")
        .withMessage("Invalid phone number"),

    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email address is required")
        .isEmail()
        .withMessage("Invalid email format")
        .custom(async (value) => {
            const exists = await client.findOne({ email: value });
            if (exists) throw new Error("Email already exists");
            return true;
        }),

    body("city")
        .trim()
        .notEmpty()
        .withMessage("City is required"),

    body("address")
        .trim()
        .notEmpty()
        .withMessage("Address is required"),

    body("gstNumber")
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 15, max: 15 })
        .withMessage("GST number must be 15 characters")
        .matches(/^[A-Z0-9]+$/i)
        .withMessage("GST number must be alphanumeric"),

];
const validateUpdateClient = [
    param("id")
        .custom((v) => mongoose.Types.ObjectId.isValid(String(v)))
        .withMessage("Invalid client id"),

    body("firmName").optional().trim().notEmpty().withMessage("firmName cannot be empty"),
    body("contactNumber").optional().trim().isMobilePhone("en-IN").withMessage("Invalid phone number"),
    body("email")
        .optional()
        .trim()
        .isEmail()
        .withMessage("Invalid email format")
        .bail()
        .custom(async (value, { req }) => {
            // ensure uniqueness excluding current client
            const clientId = req.params.id;
            const existing = await client.findOne({ email: value, _id: { $ne: clientId } });
            if (existing) throw new Error("Email already in use by another client");
            return true;
        }),

    body("city").optional().trim().notEmpty().withMessage("city cannot be empty"),
    body("address").optional().trim().notEmpty().withMessage("address cannot be empty"),

    body("gstNumber")
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 15, max: 15 })
        .withMessage("GST number must be 15 characters")
        .matches(/^[A-Z0-9]+$/i)
        .withMessage("GST number must be alphanumeric"),

    body("contactPerson").optional().trim().notEmpty().withMessage("Contact Person cannot be empty"),
    body("pincode").optional().trim().notEmpty().withMessage("Pincode cannot be empty"),
];

const createClient = asyncHandler(
    async (req, res) => {
        if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'godown-manager') {
            throw new ApiError(403, 'You are not allowed to create the client')
        }
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(422).json({ success: false, errors: errors.array() });
        }
        const { firmName, gstNumber, contactPerson, contactNumber, email, address, city, pincode } = req.body
        const createdBy = req.user?._id
        if (!createdBy) {
            throw new ApiError(400, 'User ID is required')
        }
        const create = await client.create(
            {
                firmName,
                gstNumber: gstNumber || undefined,
                contactPerson,
                contactNumber,
                email,
                address,
                city,
                pincode,
                createdBy
            }
        )
        if (!create) {
            throw new ApiError(400, 'Error in creating the client')
        }
        return res.status(200).json(new ApiResponse(200, create, 'Client created'))
    }
)
const updateClient = asyncHandler(async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(422, "Validation failed", errors.array());
    }

    const { id } = req.params;
    if (!id) {
        throw new ApiError(400, "Client id is required");
    }

    // 🔐 Validate Mongo ID
    monoIdIsValid(id);

    // 1️⃣ Find client first (needed for permission check)
    const existingClient = await client.findById(id);
    if (!existingClient) {
        throw new ApiError(404, "Client not found");
    }

    // 2️⃣ Authorization logic
    const user = req.user;

    if (user.role === "manager" || user.role === "godown-manager") {
        if (!existingClient.createdBy.equals(user._id)) {
            throw new ApiError(403, "Managers can update only their own clients");
        }
    }

    const { firmName, gstNumber, contactPerson, contactNumber, email, address, city, pincode } = req.body;

    const updateData = {};
    if (firmName !== undefined) updateData.firmName = firmName;
    if (gstNumber !== undefined) updateData.gstNumber = gstNumber;
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson;
    if (contactNumber !== undefined) updateData.contactNumber = contactNumber;
    if (email !== undefined) updateData.email = email;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (pincode !== undefined) updateData.pincode = pincode;

    const updatedClient = await client.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updatedClient, "Client updated successfully"));
});



const getAllClients = asyncHandler(
    async (req, res) => {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const role = String(req.user.role || "").toLowerCase();

        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(200, Number(req.query.limit) || 25);
        const skip = (page - 1) * limit;
        const filter = {};

        // optional simple search
        if (req.query.q) {
            const q = String(req.query.q).trim();
            filter.$or = [
                { firmName: { $regex: q, $options: "i" } },
                { city: { $regex: q, $options: "i" } },
                { contactNumber: { $regex: q, $options: "i" } },
                { email: { $regex: q, $options: "i" } },
                { phone: { $regex: q, $options: "i" } }
            ];
        }

        // 1. Fetch Clients
        const [total, clients] = await Promise.all([
            client.countDocuments(filter),
            client.find(filter)
                .sort({ createdAt: -1 })
                .populate("createdBy", "name role")
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        // 2. Fetch Related Data (Services)
        const clientIds = clients.map(c => c._id);

        const [cylinders, nocs, amcs, amcVisits] = await Promise.all([
            gasSilinder.find({ clientId: { $in: clientIds } })
                .populate('category', 'name')
                .sort({ endDate: -1 }).lean(),
            fireNOC.find({ clientId: { $in: clientIds } })
                .populate('nocType', 'name')
                .sort({ endDate: -1 }).lean(),
            AMC.find({ clientId: { $in: clientIds } })
                .sort({ endDate: -1 }).lean(),
            amcVisit.find({ clientId: { $in: clientIds } })
                .sort({ visitDate: -1 }).lean()
        ]);

        // 3. Map Data to Clients
        const enrichedClients = clients.map(client => {
            const clientCylinders = cylinders.filter(c => String(c.clientId) === String(client._id));
            const clientNocs = nocs.filter(n => String(n.clientId) === String(client._id));
            const clientAmcs = amcs.filter(a => String(a.clientId) === String(client._id));
            const clientAmcVisits = amcVisits.filter(av => String(av.clientId) === String(client._id));

            // Determine Active Services
            const services = [];
            if (clientCylinders.length > 0) services.push('CYLINDERS');
            if (clientNocs.length > 0) services.push('NOC');
            if (clientAmcs.length > 0 || clientAmcVisits.length > 0) services.push('AMC');

            // Build Ledger (Unified History)
            const ledger = [
                ...clientCylinders.map(c => ({
                    _id: c._id,
                    type: 'CYLINDERS',
                    category: c.category?.name || 'Unknown',
                    serialNumbers: c.serialNumber || [],
                    startDate: c.startDate,
                    expiryDate: c.endDate,
                    status: c.status,
                    notes: c.notes
                })),
                ...clientNocs.map(n => ({
                    _id: n._id,
                    type: 'NOC',
                    category: n.nocType?.name || n.nocName || 'Fire NOC',
                    startDate: n.startDate,
                    expiryDate: n.endDate,
                    status: n.status,
                    notes: n.notes
                })),
                ...clientAmcs.map(a => ({
                    _id: a._id,
                    type: 'AMC',
                    category: a.name || 'AMC Contract',
                    startDate: a.startDate,
                    expiryDate: a.endDate,
                    status: a.status,
                    notes: a.notes,
                    visits: a.visits
                })),
                ...clientAmcVisits.map(av => ({
                    _id: av._id,
                    type: 'AMC_VISIT',
                    category: 'AMC Technician Visit',
                    startDate: av.visitDate,
                    expiryDate: av.visitDate,
                    status: 'COMPLETED',
                    notes: av.notes
                }))
            ].sort((a, b) => new Date(b.createdAt || b.startDate) - new Date(a.createdAt || a.startDate)); // Sort by newest

            // Determine Status (Simple Logic: If any critical expiry < 7 days -> CRITICAL, else SECURE)
            // For now, keeping original status or defaulting to SECURE
            // Can improve this later with real date checks

            return {
                ...client,
                services,
                ledger,
                status: 'SECURE', // Placeholder, real logic can be added
                statusType: 'SECURE',
                initial: client.firmName ? client.firmName.charAt(0).toUpperCase() : '?'
            };
        });

        return res.status(200).json(
            {
                success: true,
                total,
                page,
                limit,
                count: enrichedClients.length,
                data: enrichedClients,
            }
        );
    }
)
const downloadClientDirectory = asyncHandler(async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const filter = {};
        if (req.query.q) {
            const q = String(req.query.q).trim();
            filter.$or = [
                { firmName: { $regex: q, $options: "i" } },
                { city: { $regex: q, $options: "i" } },
                { contactNumber: { $regex: q, $options: "i" } },
            ];
        }

        const clients = await client.find(filter).sort({ firmName: 1 }).lean();

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Client Directory");

        // Headers
        worksheet.columns = [
            { header: "Sr. No.", key: "sr", width: 8 },
            { header: "Firm Name", key: "firmName", width: 30 },
            { header: "Phone Number", key: "contactNumber", width: 15 },
            { header: "Email Address", key: "email", width: 30 },
            { header: "GST Number", key: "gstNumber", width: 20 },
            { header: "City", key: "city", width: 20 },
            { header: "Client Create Date", key: "createdAt", width: 20 },
        ];

        // Style Header
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).eachCell((cell) => {
            cell.alignment = { vertical: "middle", horizontal: "center" };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // Add Data
        let idx = 0;
        clients.forEach((c) => {
            idx++;
            const row = worksheet.addRow([
                idx,
                c.firmName || "",
                String(c.contactNumber || ""),
                c.email || "",
                c.gstNumber || "",
                c.city || "",
                c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-GB") : ""
            ]);

            // Style Data Rows
            row.eachCell((cell, colNumber) => {
                cell.alignment = { vertical: "middle", horizontal: colNumber === 1 ? "center" : "left", wrapText: colNumber === 8 };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        const filename = `Client_Directory_${new Date().toISOString().split('T')[0]}.xlsx`;

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Export Error:", error);
        res.status(500).json({ success: false, message: "Export failed" });
    }
});

export {
    createClient,
    updateClient,
    validateCreateClient,
    validateUpdateClient,
    getAllClients,
    downloadClientDirectory
}