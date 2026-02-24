import mongoose from "mongoose";

const AMCSchema = mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'client',
        required: true,
    },
    type: {
        type: String,
        enum: ['new', 'refilling', 'amc-visit'],
        required: true,
    },
    personDetails: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    mobile: {
        type: String,
        required: true
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    visits: { type: Number, required: true, default: 4 },
    status: {
        type: String,
        enum: ["ongoing", "expired"],
        default: "ongoing",
    },
    notes: { type: String }
}, { timestamps: true })

AMCSchema.index({ endDate: 1 });

export const AMC = mongoose.model("AMC", AMCSchema)