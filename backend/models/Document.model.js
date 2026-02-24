// models/Document.js
import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema({
  referenceId: {
    type:  mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  filename: { type: String },
  url: { type: String, required: true },
  public_id: { type: String, required: true },
  contentType: { type: String },
  serviceType: {
    type: String,
    enum: ["noc","amc"],
    required: true
  }
}, { timestamps: true });



export const Document = mongoose.model("Document",DocumentSchema)
