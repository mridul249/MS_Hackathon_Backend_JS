import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { errorResponse } from '../utils/response.js';

const jwtSecret = process.env.JWT_SECRET;

export default async (req, res, next) => {
    try {
        // Read token from cookies instead of headers
        const token = req.cookies?.token;
        if (!token) {
            return errorResponse(res, "UNAUTHORIZED", "No token provided.", 401);
        }

        const decoded = jwt.verify(token, jwtSecret);
        if (!decoded?.userId) {
            return errorResponse(res, "UNAUTHORIZED", "Invalid token.", 401);
        }

        // Fetch user from DB
        const user = await User.findById(decoded.userId);
        if (!user) {
            return errorResponse(res, "USER_NOT_FOUND", "User not found.", 404);
        }

        // Ensure OTP is verified
        if (!user.otpVerified) {
            return errorResponse(res, "OTP_NOT_VERIFIED", "Please verify your OTP first.", 403);
        }

        req.user = user; // Attach user data to request
        next(); // Proceed to next middleware
    } catch (error) {
        console.error("Auth Middleware Error:", error);
        return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
};
