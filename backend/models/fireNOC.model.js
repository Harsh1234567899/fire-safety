import mongoose from "mongoose";

const fireNOCSchema = mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'client'
    },
    serviceType: {
        type: String,
        enum: ['new', 'refilling'],
        required: true
    },
    nocType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NOCType',
        required: true
    },
    nocName: {
        type: String,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['ongoing', 'expired'],
        default: 'ongoing'
    },
    notes: {
        type: String,
        required: false
    }
}, { timestamps: true })

fireNOCSchema.index({endDate: 1})

export const fireNOC = mongoose.model('fireNOC', fireNOCSchema)