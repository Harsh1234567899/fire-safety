import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import axios from "axios";

// Helper function to format the Whatsapp message
const formatMessageTemplate = (firmName, type, expiryDate, companyContact) => {
    return `Dear ${firmName}, your ${type} is expiring on ${expiryDate}. Please contact us on ${companyContact} to renew your service.`;
};

// Generic API Endpoint to trigger WhatsApp
const sendWhatsappReminder = asyncHandler(async (req, res) => {
    const { firmName, type, expiryDate, phoneNumbers, companyPhone } = req.body;

    if (!firmName || !type || !expiryDate || !phoneNumbers || phoneNumbers.length === 0) {
        throw new ApiError(400, "Missing required fields for WhatsApp reminder (firmName, type, expiryDate, phoneNumbers)");
    }

    const companyContact = companyPhone || process.env.VITE_APP_COMPANY_PHONE || process.env.COMPANY_CONTACT || "our provided numbers";
    const message = formatMessageTemplate(firmName, type, expiryDate, companyContact);

    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiKey = process.env.WHATSAPP_API_KEY;

    // Simulate sending if API is not fully configured (User requested placeholder future functionality)
    if (!apiUrl) {
        
        return res.status(200).json(new ApiResponse(200, {
            simulated: true,
            messageSent: message,
            phoneNumbers
        }, "WhatsApp API url not found in .env, simulated message successfully."));
    }

    // Try an actual external API call if configured
    try {
        const results = await Promise.all(phoneNumbers.map(async (phone) => {
            // General structure, User can tweak this depending on their chosen provider (Twilio, Wati, etc)
            const payload = {
                phone: phone,
                message: message,
                // apiKey: apiKey // some providers take it in payload, some in headers
            };

            const response = await axios.post(apiUrl, payload, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": apiKey ? `Bearer ${apiKey}` : ""
                }
            });
            return { phone, status: "success", data: response.data };
        }));

        res.status(200).json(new ApiResponse(200, results, "WhatsApp reminders sent automatically"));
    } catch (error) {
        console.error("WhatsApp API Error:", error?.response?.data || error.message);
        throw new ApiError(500, "Failed to send WhatsApp message via external provider: " + (error?.response?.data?.message || error.message));
    }
});

export { sendWhatsappReminder };
