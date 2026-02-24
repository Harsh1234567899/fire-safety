import { Document } from "../models/Document.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteOnCloudinary } from '../utils/cloudinary.js'
import { monoIdIsValid } from "../utils/mongoDBid.js";

import mongoose from "mongoose";

const uploadDocument = asyncHandler(
    async (req, res) => {
        const { id, type } = req.body

        if (!["noc", "amc"].includes(type)) {
            throw new ApiError(400, "Invalid service type");
        }

        let referenceId = id;
        if (!id || id === "new" || !mongoose.Types.ObjectId.isValid(id)) {
            referenceId = new mongoose.Types.ObjectId();
        } else {
            monoIdIsValid(id);
        }

        const file = req.files?.url?.[0];
        if (!file) {
            throw new ApiError(400, "File not found to upload");
        }
        const folderName = `fire/${type}`;

        const resourceType = "auto";

        const upload = await uploadOnCloudinary(file.path, folderName, resourceType)
        if (!upload) {
            throw new ApiError(500, 'failed to upload file')
        }
        const document = await Document.create(
            {
                referenceId: referenceId,
                filename: file.originalname,
                url: upload.secure_url,
                public_id: upload.public_id,
                contentType: file.mimetype,
                serviceType: type
            }
        )
        return res.status(200).json(new ApiResponse(200, document, "file uploaded"))
    }
)
const getDocument = asyncHandler(
    async (req, res) => {
        const { id } = req.params // reference id
        monoIdIsValid(id)
        if (!id) {
            throw new ApiError(400, 'cant fild id for document')
        }

        const document = await Document.find({ referenceId: id })
        if (document.length === 0) {
            throw new ApiError(404, "cant find the document")
        }
        return res.status(200).json(new ApiResponse(200, { hasDocument: document.length > 0, document }, 'document fatched'))
    }
)
const deleteDocument = asyncHandler(
    async (req, res) => {
        const { id } = req.params // document _id 
        monoIdIsValid(id)
        const document = await Document.findById(id)
        if (!document) {
            throw new ApiError(404, "Document not found");
        }
        await deleteOnCloudinary(document.url)

        await Document.findByIdAndDelete(document._id)

        return res.status(200).json(new ApiResponse(200, {}, "document deleted"))
    }
)
export {
    deleteDocument,
    getDocument,
    uploadDocument
}