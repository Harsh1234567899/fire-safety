import { client } from "../models/client.model.js";
import { ApiError } from "./ApiError.js";
import mongoose from "mongoose";

export const resolveUserRole = (user) => {
    if (!user || !user.id) {
        throw new ApiError(401, "Unauthorized");
    }

    const role = String(user.role || "").toLowerCase();
    return { isAdminOrManager: role === "admin" || role === "manager" }

};

export const getPermittedClientIds = async ({ userId }) => {
    const clients = await client
        .find({ createdBy: mongoose.Types.ObjectId(userId) })
        .select("_id")
        .lean();

    return clients.map(c => c._id)
};

export const getClientIdsByFirmName = async (firmName) => {
    if (!firmName?.trim()) return [];

    const regex = new RegExp(firmName.trim(), "i");

    const clients = await client
        .find({ firmName: regex })
        .select("_id")
        .lean();

    return clients.map(c => c._id);
};

export const parseUtcDateRange = ({ startDate, endDate }) => {
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

    if (startDate && !start) throw new ApiError(400, "Invalid startDate format");
    if (endDate && !end) throw new ApiError(400, "Invalid endDate format");

    if (start && end && start > end) {
        throw new ApiError(400, "startDate must be <= endDate");
    }

    if (start && end) return { $gte: start, $lte: end };
    if (start) return { $gte: start, $lte: new Date(start.getTime() + 86400000 - 1) };
    return { $lte: end };
};
