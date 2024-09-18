import express from "express";
import { resendVerifyEmail } from "../controllers/auth/userAuthController";
import { validUserToken } from "../middleware/auth/authMiddleware";

export const userMailsRoutes = express.Router();

userMailsRoutes.get(
  "/resend-verification-email/:token?",
  validUserToken,
  resendVerifyEmail
);
