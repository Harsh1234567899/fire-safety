import { Router } from "express";
import { authorize, verifyJWT } from "../middlewares/auth.middleware.js";
import { getAllServices, getClientServicesWithDetails, getServiceById } from "../controllers/service.controller.js";

const router = Router()

router.get('/get-all', verifyJWT, authorize('admin', 'manager', 'godown-manager'), getAllServices);
router.get('/get-client-services/:clientId', verifyJWT, authorize('admin', 'manager', 'godown-manager'), getClientServicesWithDetails);
router.get('/:id', verifyJWT, authorize('admin', 'manager', 'godown-manager'), getServiceById);


export default router