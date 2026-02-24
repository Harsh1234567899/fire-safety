import  app  from "./app.js";
import dotenv from "dotenv"
import connectDB from "./db/db.js";
dotenv.config({
    path: './.env'
})

connectDB().then(() => {
    app.on("error", (error) => {
        console.log("error in db connect index.js", error);
        throw error
    })
    app.listen(process.env.PORT || 8000, () => {
        console.log(`app is runing on port ${process.env.PORT || 8000}`);

    })
}).catch((error) => {
    console.log('catch block db connect app.js ', error);

})