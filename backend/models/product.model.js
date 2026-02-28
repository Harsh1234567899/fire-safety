import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'client'
    },
    productName: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    productDescription: {
        type: String,
        required: true
    },
    productCreatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    productImages: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document'
    },
    productCreatedAt: {
        type: Date,
        default: Date.now
    },
    productUpdatedAt: {
        type: Date,
        default: Date.now
    }
})

export const product = mongoose.model('product', productSchema)