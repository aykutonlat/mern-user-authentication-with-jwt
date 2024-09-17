import express from "express";
import { resendVerifyEmail } from "../controllers/userAuth/userController";
import { validUserToken } from "../middleware/auth/authMiddleware";

export const userAuthRoutes = express.Router();

userAuthRoutes.post(
  "/resend-verification-email/:token",
  validUserToken,
  resendVerifyEmail
);
