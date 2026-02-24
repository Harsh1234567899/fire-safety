import { v2 as cloudinary } from "cloudinary";
import fs from "fs"
import { extractPublicId } from 'cloudinary-build-url';
import { ApiError } from "./ApiError.js";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API,
    api_secret: process.env.CLOUDINARY_SECRET
})
// console.log(process.env.CLOUDINARY_NAME,process.env.CLOUDINARY_API,process.env.CLOUDINARY_SECRET);


const uploadOnCloudinary = async (localFilePath, folder = "", resourceType = "auto") => {
    try {
        if (!localFilePath) return null // check file path is there or not
        // upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: resourceType,
            folder: folder // use to give aa folder path
        })
        // console.log("cloudinary response",response);

        //file upload success
        // console.log("fill upload in cloudinary", response.url); // give a url of the file uplload 
        fs.unlinkSync(localFilePath);
        return response

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        return null

    }
}

const deleteOnCloudinary = async (imageURL) => {
    try {
        if (!imageURL) {
            throw new ApiError(404, "Image Invalid")
        }
        //delete the file on cloudinary
        const publicId = extractPublicId(imageURL);
        const getResourceTypeFromUrl = (url) => {
            if (url.includes("/image/upload/")) return "image";
            if (url.includes("/video/upload/")) return "video";
            if (url.includes("/raw/upload/")) return "raw";
            return null;
        };
        const resource_type = getResourceTypeFromUrl(imageURL)

        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type: resource_type
        });
        if (response.result != 'ok') {
            throw new ApiError(404, "Old file Deletion Failed from Cloudinary")
        }

        // file has been deleted
        return 1;

    } catch (error) {
        throw new ApiError(400, "cloudinary delete catch block");
    }
}



const replaceOnCloudinary = async (localFilePath, oldFileUrl, folder = "") => {

    if (!(localFilePath && oldFileUrl)) {
        throw new ApiError(401, "old and new file path is requierd")
    }
    const newFile = await uploadOnCloudinary(localFilePath, folder);
    if (!newFile?.url) {
        throw new ApiError(401, "new file is not upload")
    };

    const deletefile = await deleteOnCloudinary(oldFileUrl);

    return newFile;
};

export { uploadOnCloudinary, replaceOnCloudinary, deleteOnCloudinary }