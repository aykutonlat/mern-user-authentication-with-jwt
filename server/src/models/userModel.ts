import mongoose, { Schema } from "mongoose";

export interface IUser extends mongoose.Document {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  verifyEmail: boolean;
  emailVerificationToken: string;
  emailVerificationExpires: Date;
  password: string;
  passwordResetToken: string;
  passwordResetExpires: Date;
  lastLogin: Date;
  role: string;
  gender: string;
  isActive: boolean;
  accountStatus: string;
  lastLoginIp: string;
  failedLoginAttempts: number;
  failedLoginAttemptsHistory: Date[];
  loginHistory: mongoose.Types.ObjectId[];
  accountLocked: boolean;
  lockUntil: Date | null;
  accountLockDuration: number;
  profilePicture?: string;
  profileCompletion: number;
  language: string;
  phone: string;
  verifiedPhone: boolean;
  phoneVerificationToken: string;
  phoneVerificationExpires: Date;
  address: mongoose.Types.ObjectId;
  notificationPreferences: mongoose.Types.ObjectId;
  timezone: string;
}

const userSchema: Schema<IUser> = new mongoose.Schema(
  {
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please fill a valid email address",
      ],
    },
    verifyEmail: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
    },
    emailVerificationExpires: {
      type: Date,
    },
    password: {
      type: String,
      required: true,
    },
    passwordResetToken: {
      type: String,
    },
    passwordResetExpires: {
      type: Date,
    },
    lastLogin: {
      type: Date,
    },
    role: {
      type: String,
      default: "user",
      enum: ["user", "admin", "superadmin"],
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: "other",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    accountStatus: {
      type: String,
      default: "active",
      enum: ["active", "suspended", "deleted"],
    },
    lastLoginIp: {
      type: String,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      max: 5,
    },
    failedLoginAttemptsHistory: {
      type: [Date],
      default: [],
    },
    accountLocked: {
      type: Boolean,
      default: false,
    },
    lockUntil: {
      type: Date,
    },
    accountLockDuration: {
      type: Number,
      default: 1,
    },
    profilePicture: {
      type: String,
    },
    profileCompletion: {
      type: Number,
      default: 0,
    },
    language: {
      type: String,
      default: "en-US",
    },
    phone: {
      type: String,
    },
    verifiedPhone: {
      type: Boolean,
      default: false,
    },
    phoneVerificationToken: {
      type: String,
    },
    phoneVerificationExpires: {
      type: Date,
    },
    loginHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "LoginHistory",
      },
    ],
    address: {
      type: Schema.Types.ObjectId,
      ref: "Address",
    },
    notificationPreferences: {
      type: Schema.Types.ObjectId,
      ref: "NotificationPreferences",
    },
    timezone: {
      type: String,
      default: "UTC",
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>("User", userSchema);
