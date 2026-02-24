import multer from "multer";
import os from 'os'
import path from 'path'


const storage = multer.diskStorage({
    destination: function (req, file, cb) { // cb = callback
        // cb(null, '../project/public/assets') // give full path this will give error
        cb(null, os.tmpdir()) // multer store file in this for some time 
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
})

export const upload = multer({ storage })