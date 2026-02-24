import { Router } from "express";
import { authorize, verifyJWT } from "../middlewares/auth.middleware.js";
import { getAllCategories, seedCategories } from "../controllers/category.controller.js";


const router = Router()

router.get('/seed',seedCategories)
router.get('/',getAllCategories)

export default router