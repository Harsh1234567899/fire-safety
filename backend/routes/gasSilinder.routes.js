import { Router } from "express";
import { authorize, verifyJWT } from "../middlewares/auth.middleware.js";
import { addSilinder, createRefilling, deleteSilinder, exportFireExtinguishersXlsx, getFireExtinguishers, updateSilinder } from "../controllers/gasSilinder.controller.js";

const router = Router()

router.get('/all-silinder', verifyJWT, authorize('admin', 'manager', 'godown-manager'), getFireExtinguishers)
router.post("/download-report", verifyJWT, authorize('admin', 'manager'), exportFireExtinguishersXlsx)
router.put('/update/:id', verifyJWT, authorize('admin', 'manager', 'godown-manager'), updateSilinder)
router.post('/create', verifyJWT, authorize('admin', 'manager', 'godown-manager'), addSilinder)
router.post('/refill', verifyJWT, authorize('admin', 'manager', 'godown-manager'), createRefilling)
router.delete('/:id', verifyJWT, authorize('admin', 'manager', 'godown-manager'), deleteSilinder)

export default router