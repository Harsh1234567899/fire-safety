import mongoose from "mongoose";

const reachSchema = new mongoose.Schema({
    name : {
        type: String,
        required: true
    },
    contactNumber: {
        type : String,
        required: true
    },
    contactEmail: {
        type: String,
        required: true
    },
    firmName: {
        type: String,
        required: true
    },
    requirements: {
        type: String,
        required: true
    }
    
},{timestamps: true})

export const reach = mongoose.model("reach",reachSchema)