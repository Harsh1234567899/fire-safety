import mongoose from "mongoose";

const gasSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    }
}, { timestamps: true })

export const Category = mongoose.model('Category', gasSchema)