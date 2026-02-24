import { addsubCatagory, deleteSubCategory, updateSubCategory } from "../controllers/gasSubCategory.controller.js";
import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/auth.middleware.js";

const router = Router()


router.post('/add-category', verifyJWT, authorize('admin'), addsubCatagory)
router.post('/delete/:id', verifyJWT, authorize('admin'), deleteSubCategory)
router.post('/update/:id', verifyJWT, authorize('admin'), updateSubCategory)

export default router