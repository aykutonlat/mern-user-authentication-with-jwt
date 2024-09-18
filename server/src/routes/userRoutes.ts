import express from "express";
import {
  updateProfile,
  uploadProfilePicture,
  deleteProfilePicture,
} from "../controllers/auth/userAuthController";
import { validUserToken } from "../middleware/auth/authMiddleware";
import upload from "../uploads/upload";

export const userProfileRoutes = express.Router();

userProfileRoutes.post("/update", validUserToken, updateProfile);
userProfileRoutes.post(
  "/upload-profile-picture",
  validUserToken,
  upload.single("profilePicture"),
  uploadProfilePicture
);
userProfileRoutes.post(
  "/delete-profile-picture",
  validUserToken,
  deleteProfilePicture
);
