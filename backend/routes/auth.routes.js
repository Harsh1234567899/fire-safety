import { Router } from "express";
import rateLimit from "express-rate-limit";
import { deleteUser, loginUser, registerUser, updatePassword, updateUser, refreshAccessToken } from "../controllers/auth.controller.js";
import { verifyJWT, authorize } from "../middlewares/auth.middleware.js";

const router = Router()

// Strict rate limiter for login route to prevent brute-force attacks
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 login requests per `window`
    message: { success: false, error: "Too many login attempts, please try again after 15 minutes" },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/register', verifyJWT, registerUser)
router.post('/login', loginLimiter, loginUser)
router.post('/refresh-token', refreshAccessToken)
router.route('/:id').delete(verifyJWT, authorize('admin'), deleteUser).put(verifyJWT, authorize('admin'), updateUser)
router.patch('/:id', verifyJWT, authorize('admin'), updatePassword)

export default router