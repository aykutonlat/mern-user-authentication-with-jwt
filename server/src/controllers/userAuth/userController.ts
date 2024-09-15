import { Request, Response } from "express";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { User } from "../../models/userModel";
import { passwordValidation } from "../../utils/validation";
import {
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  getRemainingLockTime,
  handleIpAndLoginHistory,
  isAccountLocked,
  lockAccount,
  unlockAccount,
} from "../../utils/authHelpers";
import { NotificationPreferences } from "../../models/notificationPreferencesModel";
import { Address } from "../../models/addressModel";

dotenv.config();

export const register = async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  try {
    if (!username) {
      return res.status(400).json({
        message: "Username is required.",
        code: "MISSING_USERNAME",
        details: "A valid username is required to register.",
      });
    }
    if (!email) {
      return res.status(400).json({
        message: "Email is required.",
        code: "MISSING_EMAIL",
        details: "A valid email address is required to register.",
      });
    }
    if (!password) {
      return res.status(400).json({
        message: "Password is required.",
        code: "MISSING_PASSWORD",
        details: "A password is required to create an account.",
      });
    }

    if (!passwordValidation(password)) {
      return res.status(400).json({
        message: "Invalid password format.",
        code: "INVALID_PASSWORD",
        details:
          "Password must be at least 6 characters long, and contain at least one uppercase and one lowercase letter.",
      });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        message: "Username already exists.",
        code: "USERNAME_EXISTS",
        details:
          "The provided username is already taken. Please choose another one.",
      });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        message: "Email already exists.",
        code: "EMAIL_EXISTS",
        details:
          "The provided email address is already associated with an account.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      username,
      email,
      password: hashedPassword,
    });

    await user.save();

    const notificationPreferences = new NotificationPreferences({
      userId: user._id,
    });
    await notificationPreferences.save();

    const address = new Address({
      userId: user._id,
    });
    await address.save();

    user.address = address._id as mongoose.Types.ObjectId;
    user.notificationPreferences =
      notificationPreferences._id as mongoose.Types.ObjectId;

    await user.save();

    const userId = user._id as mongoose.Types.ObjectId;
    const accessToken = generateAccessToken(userId.toString());
    const refreshToken = generateRefreshToken(userId.toString());

    return res.status(201).json({
      accessToken,
      refreshToken,
      message: "Registration successful.",
      code: "REGISTRATION_SUCCESS",
      details: "User account created successfully.",
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({ message: error.message || "Something went wrong" });
  }
};

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({
        message: "Please provide a username and password.",
        code: "MISSING_CREDENTIALS",
        details: "Both username and password are required to log in.",
      });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({
        message: "User does not exist.",
        code: "USER_NOT_FOUND",
        details:
          "The username entered was not found in the system. Please verify the username and try again.",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        message: "Your account is inactive.",
        code: "USER_NOT_ACTIVE",
        details: "The user account is marked as inactive.",
      });
    }

    if (user.accountStatus === "suspended") {
      return res.status(403).json({
        message: "Your account is suspended. Please contact support.",
        code: "ACCOUNT_SUSPENDED",
        details: "The user account is currently suspended.",
      });
    }

    if (user.accountStatus === "deleted") {
      user.accountStatus = "active";
      await user.save();
    }

    if (isAccountLocked(user)) {
      const remainingTime = getRemainingLockTime(user);
      return res.status(403).json({
        message: `Your account is locked. Please try again in ${remainingTime} minutes.`,
        code: "ACCOUNT_LOCKED",
        details:
          "The account is temporarily locked due to multiple failed login attempts.",
      });
    }

    const validPassword = await comparePassword(password, user.password);
    if (!validPassword) {
      if (user.failedLoginAttempts < 5) {
        user.failedLoginAttempts += 1;
        user.failedLoginAttemptsHistory.push(new Date());

        if (user.failedLoginAttempts >= 5) {
          lockAccount(user, user.accountLockDuration * 60 * 1000);
        }

        await user.save();
      }

      return res.status(401).json({
        message: "Invalid password.",
        code: "INVALID_PASSWORD",
        details: "The password entered is incorrect. Please try again.",
      });
    }

    const timezone = req.headers["timezone"] as string;

    if (timezone && user.timezone !== timezone) {
      user.timezone = timezone;
      await user.save();
    }

    await handleIpAndLoginHistory(user, req as any);

    await unlockAccount(user);

    await user.save();

    const userId = user._id as mongoose.Types.ObjectId;
    const accessToken = generateAccessToken(userId.toString());
    const refreshToken = generateRefreshToken(userId.toString());

    return res.status(200).json({ accessToken, refreshToken });
  } catch (error: any) {
    return res.status(500).json({
      message: "An internal server error occurred.",
      code: "INTERNAL_SERVER_ERROR",
      details: error.message || "Unexpected error during login process.",
    });
  }
};
