import { Router } from "express";
import { authorize, verifyJWT } from "../middlewares/auth.middleware.js";
import { getDashboardCounts, getMonthlyServiceStatus } from "../controllers/dashboard.controller.js";

const router = Router()

router.get('/count',verifyJWT,getDashboardCounts)
router.get('/monthly-service-status',verifyJWT,getMonthlyServiceStatus)

export default router