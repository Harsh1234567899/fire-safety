import { Router } from "express";
import { authorize, verifyJWT } from "../middlewares/auth.middleware.js";
import { createClient, getAllClients, updateClient, validateCreateClient, validateUpdateClient, downloadClientDirectory, deleteClient } from "../controllers/client.controller.js";

const router = Router()

router.get('/all-clients', verifyJWT, authorize('admin', 'manager', 'godown-manager'), getAllClients)
router.get('/download-directory', verifyJWT, authorize('admin', 'manager'), downloadClientDirectory)
router.post('/create', verifyJWT, authorize('admin', 'manager', 'godown-manager'), validateCreateClient, createClient)
router.patch('/update/:id', verifyJWT, authorize('admin', 'manager', 'godown-manager'), validateUpdateClient, updateClient)
router.delete('/:id', verifyJWT, authorize('admin', 'manager', 'godown-manager'), deleteClient)
export default router