import { Router } from "express";
import { authorize, verifyJWT } from "../middlewares/auth.middleware.js";
import { createFireNoctype, deleteFireNoctype, getAllFireNoctypes, updateFireNoctype } from "../controllers/fireNOCtypes.controller.js";

const router = Router()

router.post('/create', verifyJWT, authorize('admin'), createFireNoctype)
router.get('/all', verifyJWT, authorize('admin', 'manager', 'godown-manager'), getAllFireNoctypes)
router.put('/:id', verifyJWT, authorize('admin'), updateFireNoctype)
router.delete('/:id', verifyJWT, authorize('admin'), deleteFireNoctype)

export default router