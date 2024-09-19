"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateProfileCompletion = exports.generateForgotPasswordToken = exports.generateRegistrationToken = exports.handleIpAndLoginHistory = exports.unlockAccount = exports.lockAccount = exports.getRemainingLockTime = exports.isAccountLocked = exports.generateRefreshToken = exports.generateAccessToken = exports.comparePassword = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const loginHistoryModel_1 = require("../models/loginHistoryModel");
dotenv_1.default.config();
const comparePassword = (enteredPassword, storedPassword) => __awaiter(void 0, void 0, void 0, function* () {
    return yield bcrypt_1.default.compare(enteredPassword, storedPassword);
});
exports.comparePassword = comparePassword;
const generateAccessToken = (userId) => {
    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
    if (!accessTokenSecret) {
        throw new Error("Access token secret is missing");
    }
    return jsonwebtoken_1.default.sign({ userId }, accessTokenSecret, {
        expiresIn: process.env.ACCESS_TOKEN_SECRET_EXPIRES_IN,
    });
};
exports.generateAccessToken = generateAccessToken;
const generateRefreshToken = (userId) => {
    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
    if (!refreshTokenSecret) {
        throw new Error("Refresh token secret is missing");
    }
    return jsonwebtoken_1.default.sign({ userId }, refreshTokenSecret, {
        expiresIn: process.env.REFRESH_TOKEN_SECRET_EXPIRES_IN,
    });
};
exports.generateRefreshToken = generateRefreshToken;
const isAccountLocked = (user) => {
    return (user.accountLocked && user.lockUntil !== null && user.lockUntil > new Date());
};
exports.isAccountLocked = isAccountLocked;
const getRemainingLockTime = (user) => {
    if (!user.lockUntil)
        return 0;
    return Math.ceil((user.lockUntil.getTime() - new Date().getTime()) / (1000 * 60));
};
exports.getRemainingLockTime = getRemainingLockTime;
const lockAccount = (user, lockTime) => {
    user.accountLocked = true;
    user.failedLoginAttempts = 0;
    user.lockUntil = new Date(Date.now() + lockTime);
};
exports.lockAccount = lockAccount;
const unlockAccount = (user) => __awaiter(void 0, void 0, void 0, function* () {
    user.accountLocked = false;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    yield user.save();
});
exports.unlockAccount = unlockAccount;
const handleIpAndLoginHistory = (user, req) => __awaiter(void 0, void 0, void 0, function* () {
    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    if (ipAddress !== user.lastLoginIp) {
        const loginHistory = new loginHistoryModel_1.LoginHistory({
            userId: user._id,
            loginTime: new Date(),
            ipAddress,
        });
        yield loginHistory.save();
        user.loginHistory.push(loginHistory._id);
        user.lastLoginIp = ipAddress;
    }
    else {
        const lastLoginHistory = yield loginHistoryModel_1.LoginHistory.findOne({
            userId: user._id,
            ipAddress,
        }).sort({ loginTime: -1 });
        if (lastLoginHistory) {
            lastLoginHistory.loginTime = new Date();
            yield lastLoginHistory.save();
        }
    }
});
exports.handleIpAndLoginHistory = handleIpAndLoginHistory;
const generateRegistrationToken = (userId) => {
    const registrationTokenSecret = process.env.REGISTRATION_TOKEN_SECRET;
    if (!registrationTokenSecret) {
        throw new Error("Registration token secret is missing");
    }
    return jsonwebtoken_1.default.sign({ userId }, registrationTokenSecret, {
        expiresIn: process.env.REGISTRATION_TOKEN_SECRET_EXPIRES_IN,
    });
};
exports.generateRegistrationToken = generateRegistrationToken;
const generateForgotPasswordToken = (userId) => {
    const forgotPasswordTokenSecret = process.env.PASSWORD_RESET_TOKEN_SECRET;
    if (!forgotPasswordTokenSecret) {
        throw new Error("Forgot password token secret is missing");
    }
    return jsonwebtoken_1.default.sign({ userId }, forgotPasswordTokenSecret, {
        expiresIn: process.env.PASSWORD_RESET_TOKEN_SECRET_EXPIRES_IN,
    });
};
exports.generateForgotPasswordToken = generateForgotPasswordToken;
const calculateProfileCompletion = (user) => {
    let completion = 0;
    const totalFields = 8;
    if (user.firstName)
        completion++;
    if (user.lastName)
        completion++;
    if (user.email)
        completion++;
    if (user.username)
        completion++;
    if (user.phone)
        completion++;
    if (user.address)
        completion++;
    if (user.profilePicture)
        completion++;
    if (user.gender)
        completion++;
    const profileCompletion = (completion / totalFields) * 100;
    return profileCompletion;
};
exports.calculateProfileCompletion = calculateProfileCompletion;
