import mongoose from "mongoose";

const AMCvisitSchema = mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'client',
        required: true,
    },
    visitDate: {
        type: Date,
        required: true,
    },
    notes: {
        type: String,
        required: true,
    }, 
},{timestamps:true})

export const amcVisit = mongoose.model("amcVisit",AMCvisitSchema)