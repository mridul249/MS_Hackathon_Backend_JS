import bcrypt from "bcrypt";
import { sendOtpEmail, sendOtpEmailResetPassword } from "../services/emailService.js";
import User from "../models/User.js";
import { errorResponse, successResponse } from "../utils/response.js";
import { generateToken } from "../utils/jwt.js";
import mongoose from "mongoose";
import Chat from "../models/Chat.js"; // Add this import at the top with other imports

export const signup = async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return errorResponse(res, "EMAIL_REQUIRED", "Email is required", 400);
      }

    //   console.log("Mongoose Connection State:", mongoose.connection.readyState);

  
      let user = await User.findOne({ email }); // Email is the primary key
  
      if (user) {
        return handleExistingUser(user, req, res);
      }
  
      return await handleNewUser({ email }, res);
    } catch (err) {
      console.error(err);
      return errorResponse(
        res,
        "ERROR_PROCESSING_REGISTRATION",
        err.message,
        500
      );
    }
};
  
  const handleExistingUser = async (user, req, res) => {
    try {
  
      // Resend OTP for incomplete registration
      return await resendOtp(user, res, "Registration incomplete. OTP resent.");
    } catch (error) {
      console.error(error);
      return errorResponse(
        res,
        "SERVER_ERROR",
        "Error handling existing store.",
        500
      );
    }
  };
  
  const handleNewUser = async (userData, res) => {
    const user = new User({ ...userData});
    const otp = Math.floor(10000 + Math.random() * 90000).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedOTP = await bcrypt.hash(otp, salt);
    user.otp = hashedOTP;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();
  
    await sendOtpEmail(user.email, otp); // Send OTP email
    return successResponse(res, "OTP sent. Proceed to verification.", {
      data:"email sent"
    });
  };
  
  const resendOtp = async (user, res, message) => {
    const otp = Math.floor(10000 + Math.random() * 90000).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedOTP = await bcrypt.hash(otp, salt);
    user.otp = hashedOTP;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();
    await sendOtpEmail(user.email, otp); // Send OTP email
  
    let response = { data: "OTP sent successfully." };
  
    return successResponse(res, message, response);
  };
  
 export const resendOtpHandler = async (req, res) => {
    try {
      const { email } = req.body;
  
      if (!email) {
        return errorResponse(res, "EMAIL_REQUIRED", "Email is required", 400);
      }
  
      const user = await User.findOne({ email });
  
      if (!user) {
        return errorResponse(res, "USER_NOT_FOUND", "User not found.", 404);
      }
  
      return await resendOtp(user, res, "OTP resent successfully.");
    } catch (error) {
      return errorResponse(res, "SERVER_ERROR", "Internal server error.", 500);
    }
  };
  
 export const verifyOTP = async (req, res) => {
    try {
      const { name, email, password, otp } = req.body;
  
      if (!name || !email || !password || !otp) {
        return errorResponse(res, "INVALID_INPUT", "Fill all the details", 400);
      }
  
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
      if (!emailRegex.test(email)) {
        return errorResponse(res, "INVALID_INPUT", "Invalid email format.", 400);
      }
  
      let user = await User.findOne({ email });
  
      if (!user) {
        return errorResponse(res, "USER_NOT_FOUND", "User not found.", 404);
      }
  
      if (user.otpVerified) {
        return successResponse(res, "User already verified.", {
          user
        });
      }
  
      if(!user.otp)
      {
        return errorResponse(res, "INVALID_OTP", "Invalid or expired OTP.", 400);
      }
  
      const isMatch = await bcrypt.compare(otp, user.otp);
      if (!isMatch || user.otpExpires < Date.now()) {
        return errorResponse(res, "INVALID_OTP", "Invalid or expired OTP.", 400);
      }
  
      user.otp = null;
      user.otpExpires = null;
      user.otpVerified = true;
  
      // save all data from the first page , update if it exists
      user.name = name;
      user.email = email;
  
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
  
      await user.save();
  
      const token = generateToken({
        userId: user._id,
      });
  
      return successResponse(res, "OTP verified.", {
        token,
      });
    } catch (err) {
      return errorResponse(res, "Error verifying OTP.", err.message, 500);
    }
  };

  export const login = async (req, res) => {
      try {
          const { email, password } = req.body;
  
          if (!email || !password) {
              return errorResponse(res, "VALIDATION_ERROR", "Email and password are required.", 400);
          }
  
          const user = await User.findOne({ email });
  
          if (!user) {
              return errorResponse(res, "USER_NOT_FOUND", "No user found with the given email.", 404);
          }
  
          if (!user.otpVerified) {
              return errorResponse(res, "OTP_NOT_VERIFIED", "Please verify your OTP first.", 403);
          }
  
          // Check if password matches
          const passwordMatch = await bcrypt.compare(password, user.password);
          if (!passwordMatch) {
              return errorResponse(res, "INVALID_CREDENTIALS", "Wrong password.", 400);
          }
  
          // Create a new chat document for the user
          const chatDocument = new Chat({ userId: user._id });
          await chatDocument.save();
  
          const userObj = user.toObject();
          delete userObj.password; // Remove password field
  
          // Generate JWT token
          
          const token = generateToken({
            userId: user._id,
          });
  
          // Set token in an HTTP-only cookie (Secure, SameSite=strict to prevent CSRF attacks)
          res.cookie('token', token, {
              httpOnly: true,
          });
  
          return successResponse(res, "LOGIN_SUCCESS", { 
              user: {
                  _id: user._id,
                  fullName: user.name,
                  email: user.email,
                  chatId: chatDocument._id,
              }
          }, 200);
  
      } catch (error) {
          console.error(error);
          return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
      }
  };
  

  export const forgotPassword = async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        return errorResponse(
          res,
          "USER_NOT_FOUND",
          "user with this email does not exist",
          404
        );
      }
      const otp = Math.floor(10000 + Math.random() * 90000).toString();
      const salt = await bcrypt.genSalt(10);
      const hashedOTP = await bcrypt.hash(otp, salt);
  
      const expiry = Date.now() + 10 * 60 * 1000;
      user.passwordResetOTP = hashedOTP;
      user.passwordResetExpires = expiry;
      await user.save();
      await sendOtpEmailResetPassword(email, otp);
      return successResponse(
        res,
        "OTP_SENT",
        `OTP has been sent to your email ${email}  for resetting the password...`,
        200
      );
    } catch (err) {
      console.error("forgot password Error:", err);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  };

export  const verifyResetPasswordOTP = async (req, res) => {
    try {
      const { email, otp } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        return errorResponse(
          res,
          "USER_NOT_FOUND",
          "user with this email does not exist",
          404
        );
      }
      if (!user.passwordResetExpires || user.passwordResetExpires < Date.now()) {
        return errorResponse(
          res,
          "OTP_EXPIRED",
          "OTP has expired. Please request a new one.",
          400
        );
      }
      const isMatch = await bcrypt.compare(otp, user.passwordResetOTP);
      if (!isMatch) {
        return errorResponse(res, "INVALID_OTP", "Invalid OTP...", 400);
      }
      user.resetOtpVerified = true;
      await user.save();
  
      return successResponse(
        res,
        "OTP_VERIFIED",
        "OTP verified. You can now reset your password."
      );
    } catch (err) {
      console.error("verify reset password otp Error:", err);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  };
  
export  const resetPassword = async (req, res) => {
    try {
      const { email, newPassword, confirmPassword } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        return errorResponse(
          res,
          "USER_NOT_FOUND",
          "user with this email does not exist",
          404
        );
      }
      if (!user.resetOtpVerified) {
        return errorResponse(
          res,
          "OTP_NOT_VERIFIED",
          "OTP not verified. Cannot reset password.",
          400
        );
      }
      if (newPassword !== confirmPassword) {
        return errorResponse(
          res,
          "PASSWORD_NOT_MATCH",
          "newPassword and confirmPassword do not match...",
          400
        );
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;

      // Clear OTP info and reset the verified flag
      user.passwordResetOTP = null;
      user.passwordResetExpires = null;
      user.resetOtpVerified = false;
      await user.save();
  
      return successResponse(
        res,
        "PASSWORD_RESET",
        "Password has been reset successfully",
        200
      );
    } catch (err) {
      console.error("reset password Error:", err);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  };


export const newChat = async (req, res) => {
    try {
        const userId = req.user._id;
        
        const chatDocument = new Chat({
            userId: userId,
        });
        
        await chatDocument.save();

        return successResponse(res, "New chat created", {
            chatId: chatDocument._id
        });

    } catch (error) {
        console.error(error);
        return errorResponse(res, "SERVER_ERROR", "Error creating new chat", 500);
    }
};

export const logout = async (req, res) => {
    try {
        res.clearCookie('token', { httpOnly: true });

        await Chat.deleteMany({
          userId: req.user._id,
          question: { $exists: true, $size: 0 },
          answer: { $exists: true, $size: 0 }
        });

        return successResponse(res, "LOGOUT_SUCCESS", "User logged out successfully", 200);
    } catch (error) {
        console.error(error);
        return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
};