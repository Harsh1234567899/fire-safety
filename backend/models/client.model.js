import mongoose from "mongoose";

const clientSchema = new mongoose.Schema({
    firmName: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    gstNumber: {
        type: String,
        unique: true,
        uppercase: true,
        sparse: true,
        default: undefined,
        required: false
    },
    contactPerson: {
        type: String,
        required: true,
    },
    contactNumber: {
        type: String,
        required: false,
        match: /^[0-9]{10}$/,
        index: true
    },
    email: {
        type: String,
        required: false,
        lowercase: true,
        trim: true,
        match: [/^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/, 'Please fill a valid email address'],
        index: true
    },
    address: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: false
    },
    pincode: {
        type: String,
        required: false
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

export const client = mongoose.model('client', clientSchema)