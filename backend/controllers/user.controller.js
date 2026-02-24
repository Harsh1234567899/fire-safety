import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const getAllUsers = asyncHandler(async (req, res) => {

    const users = await User.find()
        .select("-password -refreshToken")
        .sort({ createdAt: -1 });

    if (!users) {
        throw new ApiError(404, 'failed to fatch all users')
    }
    return res.status(200).json(
        new ApiResponse(200, users, "All users fetched")
    );
});
const logout = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate( // update the token
        req.user._id,
        {

            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
    }
    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(new ApiResponse(200, {}, "user logged out"))
})
export {
    logout,
    getAllUsers
}