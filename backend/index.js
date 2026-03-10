import  app  from "./app.js";
import dotenv from "dotenv"
import connectDB from "./db/db.js";

dotenv.config({
    path: './.env'
});

// For Vercel, we call connectDB but we don't need to await it before exporting the app.
// The runtime will handle the first request and trigger the DB connection.
connectDB().catch((error) => {
    console.log('Database connection error in index.js:', error);
});

export default app;