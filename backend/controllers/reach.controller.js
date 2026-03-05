import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { reach } from "../models/reach.model.js";
import { Notification } from "../models/notification.model.js";

const getAllReach = asyncHandler(async (req, res) => {
    const reaches = await reach.find().sort({ createdAt: -1 });
    return res.status(200).json(
        new ApiResponse(200, reaches, "Reach records fetched successfully")
    );
})

const createReach = asyncHandler(async (req, res) => {
    const { name, contactNumber, contactEmail, firmName, requirements } = req.body;

    if (!name || !contactNumber || !contactEmail || !firmName || !requirements) {
        throw new ApiError(400, "All fields are required");
    }

    const newReach = await reach.create({
        name,
        contactNumber,
        contactEmail,
        firmName,
        requirements
    });

    // Create a notification for the Admin Panel
    await Notification.create({
        title: "New Contact Request",
        description: `${name} from ${firmName} has submitted a new inquiry.`,
        type: "INFO"
    });

    return res.status(201).json(
        new ApiResponse(201, newReach, "Reach submitted successfully")
    );
})

const deleteReach = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const deletedReach = await reach.findByIdAndDelete(id);

    if (!deletedReach) {
        throw new ApiError(404, "Reach request not found");
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Reach request deleted successfully")
    );
})

export {
    getAllReach,
    createReach,
    deleteReach
}
