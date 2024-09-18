import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import {
  login,
  register,
  verifyEmail,
  checkUsername,
  checkEmail,
  forgotPassword,
  resetPassword,
} from "./controllers/auth/userAuthController";
import connectDB from "./config/database";
import { userMailsRoutes } from "./routes/mailRoutes";
import { userProfileRoutes } from "./routes/userRoutes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

connectDB();

app.post("/register", register);
app.post("/check-email", checkEmail);
app.post("/check-username", checkUsername);
app.post("/forgot-password", forgotPassword);
app.post("/reset-password/:token?", resetPassword);
app.post("/login", login);
app.get("/verify-email/:token?", verifyEmail);
app.use("/mails", userMailsRoutes);
app.use("/profile", userProfileRoutes);

export { app };
