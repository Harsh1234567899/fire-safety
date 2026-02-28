import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['INFO', 'SUCCESS', 'WARNING', 'ALERT'],
            default: 'INFO'
        },
        read: {
            type: Boolean,
            default: false
        },
        createdAt: {
            type: Date,
            default: Date.now,
            expires: '7d' // TTL index: Automatically delete the document 7 days after creation
        }
    },
    { timestamps: true }
)

export const Notification = mongoose.model('Notification', notificationSchema)
