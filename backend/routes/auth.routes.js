import { Router } from "express";
import { deleteUser, loginUser, registerUser, updatePassword, updateUser, refreshAccessToken } from "../controllers/auth.controller.js";
import { verifyJWT, authorize } from "../middlewares/auth.middleware.js";

const router = Router()

router.post('/register', verifyJWT, registerUser)
router.post('/login', loginUser)
router.post('/refresh-token', refreshAccessToken)
router.route('/:id').delete(verifyJWT, authorize('admin'), deleteUser).put(verifyJWT, authorize('admin'), updateUser)
router.patch('/:id', verifyJWT, authorize('admin'), updatePassword)

export default router