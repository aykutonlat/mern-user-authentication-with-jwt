"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const userSchema = new mongoose_1.default.Schema({
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
        minlength: 6,
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
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "LoginHistory",
        },
    ],
    address: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Address",
    },
    notificationPreferences: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "NotificationPreferences",
    },
    timezone: {
        type: String,
        default: "UTC",
    },
}, {
    timestamps: true,
});
exports.User = mongoose_1.default.model("User", userSchema);
