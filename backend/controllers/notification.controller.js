import { Notification } from "../models/notification.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";

// Fetch all notifications sorted by latest
const getNotifications = asyncHandler(async (req, res) => {
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(50);

    return res.status(200).json(
        new ApiResponse(200, notifications, "Notifications fetched successfully")
    );
});

// Mark all as read
const markAllRead = asyncHandler(async (req, res) => {
    await Notification.updateMany({ read: false }, { $set: { read: true } });

    return res.status(200).json(
        new ApiResponse(200, {}, "All notifications marked as read")
    );
});

export { getNotifications, markAllRead };
