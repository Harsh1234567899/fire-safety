import { Router } from "express";
import { upload } from '../middlewares/multer.middlerware.js'
import { authorize, verifyJWT } from "../middlewares/auth.middleware.js";
import { deleteDocument, getDocument, uploadDocument } from "../controllers/document.controller.js";

const router = Router()

router.post('/upload', verifyJWT, upload.fields([{ name: "url", maxCount: 1 }]), uploadDocument)
router.get('/get/:id', verifyJWT, authorize('admin', "manager", "godown-manager"), getDocument)
router.delete('/:id', verifyJWT, authorize('admin', "manager", "godown-manager"), deleteDocument)

export default router