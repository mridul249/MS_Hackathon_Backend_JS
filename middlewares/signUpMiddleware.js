// const jwt = require("jsonwebtoken");
// const User = require("../models/User");
// const { jwtSecret } = require("../config/constants");
// const { errorResponse } = require("../utils/response");

// const signupMiddlewareOne= async (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;
//     if (!authHeader?.startsWith("Bearer ")) {
//       return errorResponse(res, "UNAUTHORIZED", "No token provided.", 401);
//     }

//     const token = authHeader.split(" ")[1];
//     const decoded = jwt.verify(token, jwtSecret);
//     if (!decoded?.userId) {
//       return errorResponse(res, "UNAUTHORIZED", "Invalid token.", 401);
//     }

//     const user = await User.findById(decoded.userId);
//     if (!user) {
//       return errorResponse(res, "USER_NOT_FOUND", "User not found.", 404);
//     }

    

//     if (!user.otpVerified) {
//       return errorResponse(
//         res,
//         "OTP_NOT_VERIFIED",
//         "Please verify your OTP first.",
//         403
//       );
//     }

//     if (user.tokenVersion !== decoded.tokenVersion) {
//       return errorResponse(
//         res,
//         "TOKEN_INVALID",
//         "Token has been invalidated, please log in again.",
//         401
//       );
//     }

//     if(user.currentSignupStep<3) {
//       return errorResponse(
//         res,
//         "NOT_VERIFIED",
//         "Please complete otp verification first",
//         403
//       );
//     }
    
//     req.user = user;
//     next();
//   } catch (error) {
//     console.error(error);
//     return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
//   }
// };
// const signupMiddlewareTwo= async (req, res, next) => {
//     try {
//       const authHeader = req.headers.authorization;
//       if (!authHeader?.startsWith("Bearer ")) {
//         return errorResponse(res, "UNAUTHORIZED", "No token provided.", 401);
//       }
  
//       const token = authHeader.split(" ")[1];
//       const decoded = jwt.verify(token, jwtSecret);
//       if (!decoded?.userId) {
//         return errorResponse(res, "UNAUTHORIZED", "Invalid token.", 401);
//       }
  
//       const user = await User.findById(decoded.userId);
//       if (!user) {
//         return errorResponse(res, "USER_NOT_FOUND", "User not found.", 404);
//       }
  
//       if (!user.otpVerified) {
//         return errorResponse(
//           res,
//           "OTP_NOT_VERIFIED",
//           "Please verify your OTP first.",
//           403
//         );
//       }
  
//       if (user.tokenVersion !== decoded.tokenVersion) {
//         return errorResponse(
//           res,
//           "TOKEN_INVALID",
//           "Token has been invalidated, please log in again.",
//           401
//         );
//       }
  
//       if(user.currentSignupStep<4) {
//         return errorResponse(
//           res,
//           "INCOMPLETE",
//           "Please complete SET UP PROFILE PAGE first",
//           403
//         );
//       }
      
//       req.user = user;
//       next();
//     } catch (error) {
//       console.error(error);
//       return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
//     }
//   };

// module.exports = {signupMiddlewareOne, signupMiddlewareTwo};
