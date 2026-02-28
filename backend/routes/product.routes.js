import { Router } from "express";
import {
    getAllProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductById
} from "../controllers/product.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middlerware.js";

const router = Router();

// Routes
router.route("/").get(getAllProducts); // Public or private based on requirement, usually public for website
router.route("/:id").get(getProductById);

// Protected routes (Assuming Admins manage these)
router.route("/").post(verifyJWT, upload.single("image"), createProduct);
router.route("/:id").patch(verifyJWT, upload.single("image"), updateProduct);
router.route("/:id").delete(verifyJWT, deleteProduct);

export default router;
