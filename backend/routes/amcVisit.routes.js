import { Router } from "express";
import { authorize, verifyJWT } from "../middlewares/auth.middleware.js";
import { createAmcVisit, updateAmcVisitById, deleteAmcVisitById } from "../controllers/amcVisit.controller.js";

const router = Router()

router.post('/create', verifyJWT, authorize('admin', 'manager', 'godown-manager'), createAmcVisit);
router.put('/update/:id', verifyJWT, authorize('admin', 'manager', 'godown-manager'), updateAmcVisitById);
router.delete('/:id', verifyJWT, authorize('admin', 'manager', 'godown-manager'), deleteAmcVisitById);

export default router