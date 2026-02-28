import { Router } from "express";
import { createReach, deleteReach, getAllReach } from "../controllers/reach.controller.js";
import { verifyJWT, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

// Public route for saving new reach form submissions
router.route("/create").post(createReach);

// Admin routes for viewing and deleting reach entries
router.route("/all").get(verifyJWT, authorize('admin'), getAllReach);
router.route("/delete/:id").delete(verifyJWT, authorize('admin'), deleteReach);

export default router;
