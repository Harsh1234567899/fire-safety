import { Router } from "express";
import { authorize, verifyJWT } from "../middlewares/auth.middleware.js";
import { createAmc, createAmcValidation, createRefillingAmc, exportAMCsXlsx, getAMCs, updateAmcById, deleteAmcById } from "../controllers/amc.controller.js";

const router = Router()

router.get('/all', verifyJWT, authorize('admin', 'manager', 'godown-manager'), getAMCs)
router.post('/create', verifyJWT, authorize('admin', 'manager', 'godown-manager'), createAmcValidation, createAmc)
router.post('/refill', verifyJWT, authorize('admin', 'manager', 'godown-manager'), createAmcValidation, createRefillingAmc)
router.put('/update/:id', verifyJWT, authorize('admin', 'manager', 'godown-manager'), updateAmcById)
router.post('/download', verifyJWT, authorize('admin', 'manager'), exportAMCsXlsx)
router.delete('/:id', verifyJWT, authorize('admin', 'manager', 'godown-manager'), deleteAmcById)

export default router