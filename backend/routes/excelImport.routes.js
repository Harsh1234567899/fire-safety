import { Router } from 'express'
import { importExcelData } from '../controllers/excelImport.controller.js'
import { upload } from '../middlewares/multer.middlerware.js'
import { verifyJWT, authorize } from '../middlewares/auth.middleware.js'

const router = Router()

router.post('/upload', verifyJWT, authorize('admin', 'manager'), upload.single('file'), importExcelData)

export default router
