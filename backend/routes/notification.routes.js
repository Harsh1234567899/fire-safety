import { Router } from "express";
import { getNotifications, markAllRead } from "../controllers/notification.controller.js";

const router = Router();

router.route("/").get(getNotifications);
router.route("/mark-read").patch(markAllRead);

export default router;
