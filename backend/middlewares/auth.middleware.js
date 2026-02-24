import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

        if (!token) {
            throw new ApiError(401, "Unauthorized Access")
        }
        const decodeToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        const user = await User.findById(decodeToken?._id).select("-password -refreshToken")
        if (!user) {
            throw new ApiError(401, "invalid access Token try block")
        }

        req.user = user
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid access token catch block")
    }

})

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `User role '${req.user.role}' is not authorized to perform this task in this route`
            });
        }
        next();
    };
};