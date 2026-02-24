import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { monoIdIsValid } from "../utils/mongoDBid.js";
import jwt from "jsonwebtoken";

const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const giveUserToken = await User.findById(userId)
        const accessToken = giveUserToken.generateAccessToken()
        const refreshToken = giveUserToken.generateRefreshToken()

        giveUserToken.refreshToken = refreshToken // give to db 
        await giveUserToken.save({ validateBeforeSave: false }) // save token // if validation is not false than need to again verfy the user
        return { accessToken, refreshToken }
    } catch (error) {
        console.error("TOKEN GENERATION ERROR:", error.message);
        throw new ApiError(500, "Something went wrong while generating tokens: " + error.message)
    }
}

const registerUser = asyncHandler(
    async (req, res) => {
        if (req.user.role !== 'admin' && req.user.role !== 'manager') {
            throw new ApiError(403, 'You are not allowed to add users. Only admin and manager can do this.')
        }
        const { name, email, systemId, password, role } = req.body

        if ([name, email, systemId, password, role].some((field) => field?.trim() === '')) {
            throw new ApiError(400, 'Please enter all details')
        }
        const existingUser = await User.findOne({
            $or: [{ email }, { systemId }]
        })
        if (existingUser) {
            throw new ApiError(400, 'User already exists')
        }
        const user = await User.create({
            name: name,
            email: email,
            systemId: systemId,
            password: password,
            role: role,
            createdBy: req.user.name
        })
        if (!user) {
            throw new ApiError(500, 'Error in creating user')
        }
        const createdUser = await User.findById(user._id).select("-password -refreshToken")

        if (!createdUser) {
            throw new ApiError(500, "Something went wrong while registering user")
        }

        return res.status(200).json(new ApiResponse(200, createdUser, 'User created'))
    }
)
const loginUser = asyncHandler(
    async (req, res) => {
        const { systemId, password } = req.body
        if (!systemId || !password) {
            throw new ApiError(400, 'System ID and password are required')
        }
        const user = await User.findOne({ systemId }).select('+password')
        if (!user) {
            throw new ApiError(400, 'User not found')
        }
        const isPasswordValid = await user.isPassword(password)
        if (!isPasswordValid) {
            throw new ApiError(401, 'Password is incorrect')
        }
        const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id)
        const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

        const options = {
            httpOnly: true,
            secure: true, // Always true for cross-site cookies
            sameSite: 'none' // Required for cross-site cookie sending
        }
        res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully"))
    }
)

const updatePassword = asyncHandler(
    async (req, res) => {
        const { id } = req.params;
        const { newPassword } = req.body

        if (!newPassword) {
            throw new ApiError(400, 'Enter password field to update')
        }
        monoIdIsValid(id)
        const user = await User.findById(id);

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        if (req.user.role !== "admin") {
            throw new ApiError(403, "You are not allowed to update password");
        } else {
            user.password = newPassword
            await user.save({ validateBeforeSave: false })
            return res
                .status(200)
                .json(new ApiResponse(200, {}, "User password updated successfully"));
        }
    }
)
const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    monoIdIsValid(id)
    // 1️⃣ Find target user
    const user = await User.findById(id);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // 2️⃣ No one can delete themselves
    if (req.user._id.equals(user._id)) {
        throw new ApiError(400, "You cannot delete yourself");
    }

    // 3️⃣ Admin rules
    if (req.user.role !== "admin") {
        // admin can delete anyone except himself (already checked)
        throw new ApiError(403, "You are not allowed to delete users");
    } else {
        await user.deleteOne();
        return res
            .status(200)
            .json(new ApiResponse(200, null, "User deleted successfully"));
    }

});

const updateUser = asyncHandler(
    async (req, res) => {
        const { id } = req.params;
        const { name, systemId, email, role } = req.body

        if (!name) {
            throw new ApiError(400, 'Enter name field to update')
        }

        monoIdIsValid(id)
        const user = await User.findById(id);

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        // Check for duplicate email/systemId, excluding the user being updated
        const existUser = await User.findOne({
            _id: { $ne: id },
            $or: [{ email }, { systemId }]
        })
        if (existUser) {
            throw new ApiError(400, 'Email or System ID already exists, please try another')
        }

        if (req.user.role !== "admin") {
            throw new ApiError(403, "You are not allowed to update users");
        } else {
            const updatedUser = await User.findByIdAndUpdate(id, { $set: { name, systemId, email, role } }, { new: true }).select('-refreshToken -password')
            return res
                .status(200)
                .json(new ApiResponse(200, updatedUser, "User updated successfully"));
        }
    }
)
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user = await User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }

        const options = {
            httpOnly: true,
            secure: true,
            sameSite: 'none'
        }

        const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

export {
    registerUser,
    loginUser,
    updatePassword,
    deleteUser,
    updateUser,
    refreshAccessToken
}