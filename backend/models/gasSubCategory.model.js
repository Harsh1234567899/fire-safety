import mongoose from "mongoose";

const gesSubCategory = new mongoose.Schema({
    originalName: {
        type: String,
        trim: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category"
    },
    kgLiter: {
        type: String,
        enum: ['kg', 'liter'],
        required: false
    },
    //weight 
    weight: {
        type: Number,
        required: 'false'
    }
}, { timestamps: true, collection: 'gescategories' })

gesSubCategory.index({ name: 1, category: 1 }, { unique: true })

export const gasSubCategory = mongoose.model('gasSubCategory', gesSubCategory)