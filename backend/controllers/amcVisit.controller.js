import { amcVisit } from "../models/AMCvisit.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { monoIdIsValid } from "../utils/mongoDBid.js";

const createAmcVisit = asyncHandler(async (req, res) => {
    const { clientId,visitDate, notes } = req.body;

    // --- Basic Validation ---
    if (!clientId || !visitDate || !notes) {
        throw new ApiError(400, "clientId, startDate, expiryDate and remarks are required.")
    }

    // --- Create new AMC Visit ---
    const newVisit = await amcVisit.create({
        clientId,
        visitDate,
        notes,
    });
    if (!newVisit) {
        throw new ApiError(400, "failed to add AMC visit")
    }
    return res.status(201).json(new ApiResponse(201, newVisit, "AMC Visit created successfully"));

});


const updateAmcVisitById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    monoIdIsValid(id)

    const { clientId,visitDate, notes } = req.body;

    // Build payload only with provided fields
    const payload = {};
    if (clientId) payload.clientId = clientId;
    if (visitDate) payload.visitDate = visitDate;
    if (notes) payload.notes = notes;

    // Update
    const updatedVisit = await amcVisit.findByIdAndUpdate(id, payload, {
        new: true, // return updated document
        runValidators: true,
    });

    if (!updatedVisit) {
        throw new ApiError(400, "failed to update amc visit")
    }

    return res.status(200).json(new ApiResponse(200, updatedVisit, "AMC Visit updated successfully"));

})

const deleteAmcVisitById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    monoIdIsValid(id)
    const Visit = await amcVisit.findByIdAndDelete(id);
    if (!Visit) throw new ApiError(404, 'AMC Visit not found');
    return res.status(200).json(new ApiResponse(200, Visit, 'AMC Visit deleted successfully'));
})
export {
    updateAmcVisitById,
    createAmcVisit,
    deleteAmcVisitById
}

