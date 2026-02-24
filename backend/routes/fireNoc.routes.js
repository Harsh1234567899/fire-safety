import { Router } from "express";
import { authorize, verifyJWT } from "../middlewares/auth.middleware.js";
import { createFireNoc, createFireNOCRefilling, exportFireNOCsXlsx, getFireNoce, updateFireNoc } from "../controllers/fireNOC.controller.js";

const router = Router()

router.get('/', verifyJWT, authorize('admin', 'manager'), getFireNoce)
router.post('/create', verifyJWT, authorize('admin', 'manager'), createFireNoc)
router.post('/refill', verifyJWT, authorize('admin', 'manager'), createFireNOCRefilling)
router.put('/update/:id', verifyJWT, authorize('admin', 'manager'), updateFireNoc)

router.post('/download', verifyJWT, authorize('admin', 'manager'), exportFireNOCsXlsx)

export default router