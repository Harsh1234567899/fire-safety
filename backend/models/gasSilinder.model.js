import mongoose from "mongoose";

const gasSilinderSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'client'
    },
    serviceType: {
        type: String,
        enum: ['new','refilling'],
        required: true
    },
    refillingType: {
        type: String,
        enum: ['new','existing'],
        required: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    kgLtr: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'gasSubCategory'
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    startDate: {
        type : Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    status: {
        type : String,
        enum: ['ongoing','expired'],
        default: 'ongoing'
    },
    serialNumber: [{
        type: String
    }],
    notes:{
        type: String,
        required:false
    }
},{timestamps: true})

gasSilinderSchema.index({endDate: 1})

export const gasSilinder = mongoose.model("gasSilinder",gasSilinderSchema)