import mongoose from "mongoose";

const NOCTypesSchema = mongoose.Schema({
    type: {
        type: String,
        required: true
    }
},{timestamps: true})

export const NOCType = mongoose.model("NOCType",NOCTypesSchema)