import { Router } from "express";
import { authorize, verifyJWT } from "../middlewares/auth.middleware.js";
import { exportAllServicesXlsx } from "../controllers/allServiceExport.controller.js";

const router = Router()

router.post("/download-all-report", verifyJWT, authorize('admin', 'manager'), exportAllServicesXlsx)

export default router
