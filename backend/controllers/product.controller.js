import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { product } from "../models/product.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Document } from "../models/Document.model.js";
import mongoose from "mongoose";

const getAllProducts = asyncHandler(async (req, res) => {
    const products = await product.find().populate('productImages');
    return res.status(200).json(
        new ApiResponse(200, products, "Products fetched successfully")
    );
})

const createProduct = asyncHandler(async (req, res) => {
    const { productName, productDescription } = req.body;

    if (!productName || !productDescription) {
        throw new ApiError(400, "Name and description are required");
    }

    let imageDocId = null;
    const newProductId = new mongoose.Types.ObjectId();

    // Check if an image was uploaded
    if (req.file) {
        const localFilePath = req.file.path;
        console.log("Uploading file to cloudinary:", localFilePath);

        try {
            const cloudinaryResult = await uploadOnCloudinary(localFilePath);
            if (cloudinaryResult && cloudinaryResult.url) {
                // Create Document entry
                const newDoc = await Document.create({
                    referenceId: newProductId,
                    filename: req.file.originalname,
                    contentType: req.file.mimetype,
                    url: cloudinaryResult.url,
                    public_id: cloudinaryResult.public_id,
                    serviceType: "product"
                });

                imageDocId = newDoc._id;
            }
        } catch (uploadErr) {
            console.error("Cloudinary upload failed:", uploadErr);
            throw new ApiError(500, "Image upload failed");
        }
    }

    const newProduct = await product.create({
        _id: newProductId,
        productName,
        productDescription,
        productImages: imageDocId,
        productCreatedBy: req.user?._id // Assuming user is injected by auth middleware
    });

    const createdProduct = await product.findById(newProduct._id).populate('productImages');

    return res.status(201).json(
        new ApiResponse(201, createdProduct, "Product created successfully")
    );
})

const updateProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { productName, productDescription } = req.body;

    const existingProduct = await product.findById(id);
    if (!existingProduct) {
        throw new ApiError(404, "Product not found");
    }

    let imageDocId = existingProduct.productImages;

    // Check if a new image was uploaded
    if (req.file) {
        const localFilePath = req.file.path;

        try {
            const cloudinaryResult = await uploadOnCloudinary(localFilePath);
            if (cloudinaryResult && cloudinaryResult.url) {
                const newDoc = await Document.create({
                    referenceId: id,
                    filename: req.file.originalname,
                    contentType: req.file.mimetype,
                    url: cloudinaryResult.url,
                    public_id: cloudinaryResult.public_id,
                    serviceType: "product"
                });

                imageDocId = newDoc._id;
            }
        } catch (uploadErr) {
            console.error("Cloudinary upload failed:", uploadErr);
        }
    }

    const updatedProduct = await product.findByIdAndUpdate(
        id,
        {
            $set: {
                productName: productName || existingProduct.productName,
                productDescription: productDescription || existingProduct.productDescription,
                productImages: imageDocId,
                productUpdatedAt: Date.now()
            }
        },
        { new: true }
    ).populate('productImages');

    return res.status(200).json(
        new ApiResponse(200, updatedProduct, "Product updated successfully")
    );
})

const deleteProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const deletedProduct = await product.findByIdAndDelete(id);

    if (!deletedProduct) {
        throw new ApiError(404, "Product not found");
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Product deleted successfully")
    );
})

const getProductById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const foundProduct = await product.findById(id).populate('productImages');

    if (!foundProduct) {
        throw new ApiError(404, "Product not found");
    }

    return res.status(200).json(
        new ApiResponse(200, foundProduct, "Product fetched successfully")
    );
})

export { getAllProducts, createProduct, updateProduct, deleteProduct, getProductById }
