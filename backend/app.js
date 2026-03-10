import cookieParser from "cookie-parser";
import express from "express";
import cors from 'cors';
import { errorHandler } from "./middlewares/errorHandler.middlewares.js";


const app = express()
app.set("trust proxy", 1);

import helmet from "helmet";
import rateLimit from 'express-rate-limit';

// Global Rate Limiting - 1000 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', globalLimiter);

// Security Middlewares
app.use(helmet()); // Set standard security headers

app.use(cors({
  origin: process.env.CORS_ORIGIN.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}))


app.use(express.json({ limit: "100kb" }))
app.use(express.urlencoded({ extended: true, limit: "100kb" }))
app.use(express.static("public"))
app.use(cookieParser())

app.get('/', (req, res) => {
  res.send('Hello World!')
})

import authRouter from './routes/auth.routes.js'
app.use('/api/v1/auth', authRouter)

import userRouter from './routes/user.routes.js'
app.use('/api/v2/users', userRouter)

import clientRouter from './routes/client.routes.js'
app.use('/api/v3/client', clientRouter)

import amcRouter from './routes/amc.routes.js'
app.use('/api/v4/amc', amcRouter)

import amcVisitRouter from './routes/amcVisit.routes.js'
app.use('/api/v5/amc-visit', amcVisitRouter)

import categoryRouter from './routes/category.routes.js'
app.use('/api/v6/category', categoryRouter)

import dasboardRouter from './routes/dashboard.routes.js'
app.use('/api/v7/dashboard', dasboardRouter)

import documentRouter from './routes/document.routes.js'
app.use('/api/v8/document', documentRouter)

import fireNOCRouter from './routes/fire-noc.routes.js'
app.use('/api/v9/fire-noc', fireNOCRouter)

import fireNOCTypesRouter from './routes/fireNocTypes.routes.js'
app.use('/api/v10/noc-types', fireNOCTypesRouter)

import gasSilinderRouter from './routes/gasSilinder.routes.js'
app.use('/api/v11/fire-extinguisher', gasSilinderRouter)

import gasSilinderCategoryRouter from './routes/gasSubCatergory.routes.js'
app.use('/api/v12/extinguisher-category', gasSilinderCategoryRouter)

import serviceRouter from './routes/service.routes.js'
app.use('/api/v13/service', serviceRouter)

import productRouter from './routes/product.routes.js'
app.use('/api/v14/product', productRouter)

import reachRouter from './routes/reach.routes.js'
app.use('/api/v15/reach', reachRouter)

import notificationRouter from './routes/notification.routes.js'
app.use('/api/v16/notifications', notificationRouter)

import clientProductRouter from './routes/clientProduct.routes.js'
app.use('/api/v17/client-product', clientProductRouter)

import allServiceExportRouter from './routes/allServiceExport.routes.js'
app.use('/api/v18/all-service', allServiceExportRouter)

import excelImportRouter from './routes/excelImport.routes.js'
app.use('/api/v19/excel-import', excelImportRouter)

import whatsappRouter from './routes/whatsapp.routes.js'
app.use('/api/v20/whatsapp', whatsappRouter)

app.use(errorHandler)

export default app 