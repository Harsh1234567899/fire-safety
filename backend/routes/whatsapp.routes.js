import { Router } from "express";
import { verifyJWT, authorize } from "../middlewares/auth.middleware.js";
import { sendWhatsappReminder } from "../controllers/whatsapp.controller.js";

const router = Router();

// Protected route to trigger WhatsApp texts
router.post('/send', verifyJWT, authorize('admin', 'manager', 'godown-manager'), sendWhatsappReminder);

export default router;
