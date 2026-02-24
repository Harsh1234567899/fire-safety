import { Router } from "express";
import { authorize, verifyJWT } from "../middlewares/auth.middleware.js";
import { createAmcVisit, updateAmcVisitById } from "../controllers/amcVisit.controller.js";

const router = Router()

router.post('/create',verifyJWT,authorize('admin', 'manager'), createAmcVisit);
router.put('/update/:id',verifyJWT,authorize('admin', 'manager'),updateAmcVisitById);

export default router