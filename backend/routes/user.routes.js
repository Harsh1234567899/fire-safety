import { Router } from "express";
import { logout, getAllUsers } from "../controllers/user.controller.js";
import { authorize, verifyJWT } from "../middlewares/auth.middleware.js";

const router =  Router()


router.get('/all-users',verifyJWT,authorize('admin','manager'),getAllUsers),
router.post('/logout',verifyJWT,logout)
export default router