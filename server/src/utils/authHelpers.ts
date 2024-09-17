import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { IUser } from "../models/userModel";
import { LoginHistory } from "../models/loginHistoryModel";
import mongoose from "mongoose";

dotenv.config();

export const comparePassword = async (
  enteredPassword: string,
  storedPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(enteredPassword, storedPassword);
};

export const generateAccessToken = (userId: string): string => {
  const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
  if (!accessTokenSecret) {
    throw new Error("Access token secret is missing");
  }
  return jwt.sign({ userId }, accessTokenSecret, {
    expiresIn: process.env.ACCESS_TOKEN_SECRET_EXPIRES_IN,
  });
};

export const generateRefreshToken = (userId: string): string => {
  const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
  if (!refreshTokenSecret) {
    throw new Error("Refresh token secret is missing");
  }
  return jwt.sign({ userId }, refreshTokenSecret, {
    expiresIn: process.env.REFRESH_TOKEN_SECRET_EXPIRES_IN,
  });
};

export const isAccountLocked = (user: IUser): boolean => {
  return (
    user.accountLocked && user.lockUntil !== null && user.lockUntil > new Date()
  );
};

export const getRemainingLockTime = (user: IUser): number => {
  if (!user.lockUntil) return 0;
  return Math.ceil(
    (user.lockUntil.getTime() - new Date().getTime()) / (1000 * 60)
  );
};

export const lockAccount = (user: IUser, lockTime: number) => {
  user.accountLocked = true;
  user.failedLoginAttempts = 0;
  user.lockUntil = new Date(Date.now() + lockTime);
};

export const unlockAccount = async (user: IUser) => {
  user.accountLocked = false;
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  await user.save();
};

export const handleIpAndLoginHistory = async (
  user: IUser,
  req: Request & { headers: { [key: string]: string } } & {
    socket: { remoteAddress: string };
  }
): Promise<void> => {
  const ipAddress =
    (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress;

  if (ipAddress !== user.lastLoginIp) {
    const loginHistory = new LoginHistory({
      userId: user._id,
      loginTime: new Date(),
      ipAddress,
    });
    await loginHistory.save();

    user.loginHistory.push(loginHistory._id as mongoose.Types.ObjectId);
    user.lastLoginIp = ipAddress as string;
  } else {
    const lastLoginHistory = await LoginHistory.findOne({
      userId: user._id,
      ipAddress,
    }).sort({ loginTime: -1 });

    if (lastLoginHistory) {
      lastLoginHistory.loginTime = new Date();
      await lastLoginHistory.save();
    }
  }
};

export const generateRegistrationToken = (userId: string): string => {
  const registrationTokenSecret = process.env.REGISTRATION_TOKEN_SECRET;
  if (!registrationTokenSecret) {
    throw new Error("Registration token secret is missing");
  }
  return jwt.sign({ userId }, registrationTokenSecret, {
    expiresIn: process.env.REGISTRATION_TOKEN_SECRET_EXPIRES_IN,
  });
};
