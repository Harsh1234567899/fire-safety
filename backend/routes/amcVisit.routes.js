import { Router } from "express";
import { authorize, verifyJWT } from "../middlewares/auth.middleware.js";
import { createAmcVisit, updateAmcVisitById } from "../controllers/amcVisit.controller.js";

const router = Router()

router.post('/create', verifyJWT, authorize('admin', 'manager', 'godown-manager'), createAmcVisit);
router.put('/update/:id', verifyJWT, authorize('admin', 'manager', 'godown-manager'), updateAmcVisitById);

export default router