import { Router } from "express";
import { authorize, verifyJWT } from "../middlewares/auth.middleware.js";
import { createAmc, createAmcValidation, createRefillingAmc, exportAMCsXlsx, getAMCs, updateAmcById } from "../controllers/amc.controller.js";

const router = Router()

router.get('/all', verifyJWT, authorize('admin', 'manager'), getAMCs)
router.post('/create', verifyJWT, authorize('admin', 'manager'), createAmcValidation, createAmc)
router.post('/refill', verifyJWT, authorize('admin', 'manager'), createAmcValidation, createRefillingAmc)
router.put('/update/:id', verifyJWT, authorize('admin', 'manager'), updateAmcById)
router.post('/download', verifyJWT, authorize('admin', 'manager', 'godown-manager'), exportAMCsXlsx)

export default router