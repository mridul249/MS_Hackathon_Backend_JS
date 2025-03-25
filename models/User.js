import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address."],
    },
    password: {
      type: String,
    },
    otpVerified: {
      type: Boolean,
      default: false,
    },
    passwordResetOTP: {
      type: String, // Will store hashed OTP
      default: null,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
    },
    resetOtpVerified: {
      type: Boolean,
      default: false,
    },
    otp: { type: String },
    otpExpires: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
