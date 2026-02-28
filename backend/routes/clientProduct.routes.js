import { Router } from "express";
import { authorize, verifyJWT } from "../middlewares/auth.middleware.js";
import { createClientProducts, getClientProducts } from "../controllers/clientProduct.controller.js";

const router = Router();

router.post('/create', verifyJWT, authorize('admin', 'manager', 'godown-manager'), createClientProducts);
router.get('/client/:clientId', verifyJWT, authorize('admin', 'manager', 'godown-manager'), getClientProducts);

export default router;
