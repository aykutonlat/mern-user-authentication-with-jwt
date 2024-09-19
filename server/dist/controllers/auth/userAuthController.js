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
exports.getProfile = exports.refreshToken = exports.deleteProfilePicture = exports.uploadProfilePicture = exports.updateProfile = exports.resetPassword = exports.forgotPassword = exports.login = exports.resendVerifyEmail = exports.verifyEmail = exports.checkEmail = exports.checkUsername = exports.register = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const ms_1 = __importDefault(require("ms"));
const url_1 = __importDefault(require("url"));
const userModel_1 = require("../../models/userModel");
const validation_1 = require("../../utils/validation");
const authHelpers_1 = require("../../utils/authHelpers");
const notificationPreferencesModel_1 = require("../../models/notificationPreferencesModel");
const addressModel_1 = require("../../models/addressModel");
const verificationMail_1 = require("../../mails/verificationMail");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const resendVerificationMail_1 = require("../../mails/resendVerificationMail");
const resetPasswordMail_1 = require("../../mails/resetPasswordMail");
const cloudinary_1 = require("../../config/cloudinary");
dotenv_1.default.config();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Invalid email format.",
                code: "INVALID_EMAIL",
                details: "Please provide a valid email address.",
            });
        }
        if (!password) {
            return res.status(400).json({
                message: "Password is required.",
                code: "MISSING_PASSWORD",
                details: "A password is required to create an account.",
            });
        }
        if (!(0, validation_1.passwordValidation)(password)) {
            return res.status(400).json({
                message: "Invalid password format.",
                code: "INVALID_PASSWORD",
                details: "Password must be at least 6 characters long, and contain at least one uppercase and one lowercase letter.",
            });
        }
        const existingUsername = yield userModel_1.User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({
                message: "Username already exists.",
                code: "USERNAME_EXISTS",
                details: "The provided username is already taken. Please choose another one.",
            });
        }
        const existingEmail = yield userModel_1.User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({
                message: "Email already exists.",
                code: "EMAIL_EXISTS",
                details: "The provided email address is already associated with an account.",
            });
        }
        const salt = yield bcrypt_1.default.genSalt(10);
        const hashedPassword = yield bcrypt_1.default.hash(password, salt);
        const user = new userModel_1.User({
            username: username.toLowerCase(),
            email,
            password: hashedPassword,
        });
        yield user.save();
        const notificationPreferences = new notificationPreferencesModel_1.NotificationPreferences({
            userId: user._id,
        });
        yield notificationPreferences.save();
        const address = new addressModel_1.Address({
            userId: user._id,
        });
        yield address.save();
        user.address = address._id;
        user.notificationPreferences =
            notificationPreferences._id;
        const userId = user._id;
        const accessToken = (0, authHelpers_1.generateAccessToken)(userId.toString());
        const refreshToken = (0, authHelpers_1.generateRefreshToken)(userId.toString());
        const registerMailToken = (0, authHelpers_1.generateRegistrationToken)(userId.toString());
        const registerMailExpires = process.env.REGISTRATION_TOKEN_SECRET_EXPIRES_IN;
        user.emailVerificationToken = registerMailToken;
        user.emailVerificationExpires = new Date(Date.now() + (0, ms_1.default)(registerMailExpires));
        user.profileCompletion = (0, authHelpers_1.calculateProfileCompletion)(user);
        yield user.save();
        const sendMail = yield (0, verificationMail_1.sendVerificationMail)(user.username, user.email, registerMailToken);
        if (!sendMail) {
            return res.status(500).json({
                message: "Failed to send registration email.",
                code: "MAIL_SEND_ERROR",
                details: "An error occurred while sending the registration email. Please try again.",
            });
        }
        return res.status(201).json({
            accessToken,
            refreshToken,
            message: "Registration successful.",
            code: "REGISTRATION_SUCCESS",
            details: "User account created successfully.",
        });
    }
    catch (error) {
        return res
            .status(500)
            .json({ message: error.message || "Something went wrong" });
    }
});
exports.register = register;
const checkUsername = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { username } = req.body;
    try {
        if (!username) {
            return res.status(400).json({
                message: "Username is required.",
                code: "MISSING_USERNAME",
                details: "A valid username is required to check availability.",
            });
        }
        if (username.length < 5 || username.length > 20) {
            return res.status(400).json({
                message: "Invalid username.",
                code: "INVALID_USERNAME",
                details: "Username must be between 5 and 20 characters long. Please try again.",
            });
        }
        username = username.toLowerCase();
        const existingUsername = yield userModel_1.User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({
                message: "This username cannot be used.",
                code: "USERNAME_TAKEN",
                details: "The username entered is already taken. Please choose another one.",
            });
        }
        return res.status(200).json({
            message: "Username available.",
            code: "USERNAME_AVAILABLE",
            details: "The username is available for registration.",
        });
    }
    catch (error) {
        return res.status(500).json({
            message: error.message || "Something went wrong",
        });
    }
});
exports.checkUsername = checkUsername;
const checkEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                message: "Email is required",
                code: "MISSING_EMAIL",
                details: "A valid email address is required to check availability.",
            });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Invalid email format",
                code: "INVALID_EMAIL",
                details: "Please provide a valid email address.",
            });
        }
        const normalizedEmail = email.toLowerCase();
        const userExists = yield userModel_1.User.findOne({ email: normalizedEmail });
        if (userExists) {
            return res.status(400).json({
                message: "This email cannot be used",
                code: "EMAIL_TAKEN",
                details: "The email address entered is already associated with an account.",
            });
        }
        return res.status(200).json({
            message: "Email is available",
            code: "EMAIL_AVAILABLE",
            details: "The email address is available for registration.",
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "Something went wrong",
            code: "INTERNAL_SERVER_ERROR",
            details: error.message || "Unexpected error while checking email.",
        });
    }
});
exports.checkEmail = checkEmail;
const verifyEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { token } = req.params;
    try {
        if (!token) {
            return res.status(400).json({
                message: "Verification link is missing.",
                code: "MISSING_TOKEN",
                details: "A valid verification link is required to verify the email address.",
            });
        }
        let decodedToken;
        try {
            decodedToken = jsonwebtoken_1.default.verify(token, process.env.REGISTRATION_TOKEN_SECRET);
        }
        catch (err) {
            if (err.name === "TokenExpiredError") {
                return res.status(410).json({
                    message: "The verification link is invalid or has expired.",
                    code: "INVALID_TOKEN",
                    details: "Please request a new verification link.",
                });
            }
            return res.status(404).json({
                message: "Invalid token.",
                code: "INVALID_TOKEN",
                details: "The provided token is invalid or malformed.",
            });
        }
        const { userId } = decodedToken;
        const existingUser = yield userModel_1.User.findById(userId);
        if (!existingUser) {
            return res.status(404).json({
                message: "User not found.",
                code: "USER_NOT_FOUND",
                details: "The user account associated with the token was not found.",
            });
        }
        if (existingUser.verifyEmail) {
            return res.status(400).json({
                message: "Email already verified.",
                code: "EMAIL_ALREADY_VERIFIED",
                details: "The email address is already verified.",
            });
        }
        existingUser.verifyEmail = true;
        existingUser.emailVerificationToken = "";
        existingUser.emailVerificationExpires = null;
        yield existingUser.save();
        return res.status(200).json({
            message: "Email verified.",
            code: "EMAIL_VERIFIED",
            details: "The email address has been successfully verified.",
        });
    }
    catch (error) {
        return res.status(500).json({
            message: error.message || "Something went wrong",
        });
    }
});
exports.verifyEmail = verifyEmail;
const resendVerifyEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    if (!userId) {
        return res.status(400).json({
            message: "User is not authenticated.",
            code: "USER_NOT_AUTHENTICATED",
            details: "A valid user must be authenticated to resend the verification email.",
        });
    }
    try {
        const user = yield userModel_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found.",
                code: "USER_NOT_FOUND",
                details: "No user found with the provided ID.",
            });
        }
        if (user.verifyEmail) {
            return res.status(400).json({
                message: "Email already verified.",
                code: "EMAIL_ALREADY_VERIFIED",
                details: "The email address is already verified.",
            });
        }
        const registerMailToken = (0, authHelpers_1.generateRegistrationToken)(user._id);
        user.emailVerificationToken = registerMailToken;
        yield user.save();
        const sendMail = yield (0, resendVerificationMail_1.resendVerificationMail)(user.username, user.email, registerMailToken);
        if (!sendMail) {
            return res.status(500).json({
                message: "Failed to send registration email.",
                code: "MAIL_SEND_ERROR",
                details: "An error occurred while sending the registration email. Please try again.",
            });
        }
        return res.status(200).json({
            message: "Verification email sent.",
            code: "EMAIL_SENT",
            details: "A new verification email has been sent to your email address.",
        });
    }
    catch (error) {
        return res.status(500).json({
            message: error.message || "Something went wrong",
        });
    }
});
exports.resendVerifyEmail = resendVerifyEmail;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    try {
        if (!username || !password) {
            return res.status(400).json({
                message: "Please provide a username and password.",
                code: "MISSING_CREDENTIALS",
                details: "Both username and password are required to log in.",
            });
        }
        const user = yield userModel_1.User.findOne({ username });
        if (!user) {
            return res.status(401).json({
                message: "User does not exist.",
                code: "USER_NOT_FOUND",
                details: "The username entered was not found in the system. Please verify the username and try again.",
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
            yield user.save();
        }
        if ((0, authHelpers_1.isAccountLocked)(user)) {
            const remainingTime = (0, authHelpers_1.getRemainingLockTime)(user);
            return res.status(403).json({
                message: `Your account is locked. Please try again in ${remainingTime} minutes.`,
                code: "ACCOUNT_LOCKED",
                details: "The account is temporarily locked due to multiple failed login attempts.",
            });
        }
        const validPassword = yield (0, authHelpers_1.comparePassword)(password, user.password);
        if (!validPassword) {
            if (user.failedLoginAttempts < 5) {
                user.failedLoginAttempts += 1;
                user.failedLoginAttemptsHistory.push(new Date());
                if (user.failedLoginAttempts >= 5) {
                    (0, authHelpers_1.lockAccount)(user, user.accountLockDuration * 60 * 1000);
                }
                yield user.save();
            }
            return res.status(401).json({
                message: "Invalid password.",
                code: "INVALID_PASSWORD",
                details: "The password entered is incorrect. Please try again.",
            });
        }
        const timezone = req.headers["timezone"];
        if (timezone && user.timezone !== timezone) {
            user.timezone = timezone;
            yield user.save();
        }
        yield (0, authHelpers_1.handleIpAndLoginHistory)(user, req);
        yield (0, authHelpers_1.unlockAccount)(user);
        yield user.save();
        const userId = user._id;
        const accessToken = (0, authHelpers_1.generateAccessToken)(userId.toString());
        const refreshToken = (0, authHelpers_1.generateRefreshToken)(userId.toString());
        return res.status(200).json({
            accessToken,
            refreshToken,
            message: "Login successful.",
            code: "LOGIN_SUCCESS",
            details: "User logged in successfully.",
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "An internal server error occurred.",
            code: "INTERNAL_SERVER_ERROR",
            details: error.message || "Unexpected error during login process.",
        });
    }
});
exports.login = login;
const forgotPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    try {
        if (!email) {
            return res.status(400).json({
                message: "Email is required.",
                code: "MISSING_EMAIL",
                details: "A valid email address is required to reset the password.",
            });
        }
        const user = yield userModel_1.User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                message: "User not found.",
                code: "USER_NOT_FOUND",
                details: "The email address entered was not found in the system. Please verify the email address and try again.",
            });
        }
        const resetToken = (0, authHelpers_1.generateForgotPasswordToken)(user._id);
        const resetTokenExpires = process.env.PASSWORD_RESET_TOKEN_SECRET_EXPIRES_IN;
        user.passwordResetToken = resetToken;
        user.passwordResetExpires = new Date(Date.now() + (0, ms_1.default)(resetTokenExpires));
        yield user.save();
        const sendMail = yield (0, resetPasswordMail_1.sendForgotPasswordtMail)(user.username, user.email, resetToken);
        if (!sendMail) {
            return res.status(500).json({
                message: "Failed to send password reset email.",
                code: "MAIL_SEND_ERROR",
                details: "An error occurred while sending the password reset email. Please try again.",
            });
        }
        return res.status(200).json({
            message: "Password reset email sent.",
            code: "PASSWORD_RESET_EMAIL_SENT",
            details: "A password reset email has been sent to your email address.",
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "An internal server error occurred.",
            code: "INTERNAL_SERVER_ERROR",
            details: error.message || "Unexpected error during password reset process.",
        });
    }
});
exports.forgotPassword = forgotPassword;
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { token } = req.params;
    const { newPassword, newPasswordAgain } = req.body;
    try {
        if (!token) {
            return res.status(400).json({
                message: "Reset token is missing.",
                code: "MISSING_TOKEN",
                details: "A valid reset token is required to reset the password. Please check the link in your email.",
            });
        }
        if (!newPassword || !newPasswordAgain) {
            return res.status(400).json({
                message: "New password is required.",
                code: "MISSING_PASSWORD",
                details: "Please provide a new password to reset your account.",
            });
        }
        if (!(0, validation_1.passwordValidation)(newPassword)) {
            return res.status(400).json({
                message: "Invalid password format.",
                code: "INVALID_PASSWORD",
                details: "Password must be at least 6 characters long, and contain at least one uppercase and one lowercase letter.",
            });
        }
        if (newPassword !== newPasswordAgain) {
            return res.status(400).json({
                message: "Passwords do not match.",
                code: "PASSWORD_MISMATCH",
                details: "The new passwords entered do not match. Please try again.",
            });
        }
        let decodedToken;
        try {
            decodedToken = jsonwebtoken_1.default.verify(token, process.env.PASSWORD_RESET_TOKEN_SECRET);
        }
        catch (err) {
            if (err.name === "TokenExpiredError") {
                return res.status(410).json({
                    message: "The password reset link is invalid or has expired.",
                    code: "INVALID_TOKEN",
                    details: "Please request a new password reset link.",
                });
            }
            return res.status(404).json({
                message: "Invalid token.",
                code: "INVALID_TOKEN",
                details: "The provided token is invalid or malformed.",
            });
        }
        const { userId } = decodedToken;
        const user = yield userModel_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found.",
                code: "USER_NOT_FOUND",
                details: "The user account associated with the token was not found.",
            });
        }
        if (user.passwordResetToken !== token) {
            return res.status(400).json({
                message: "Invalid token.",
                code: "INVALID_TOKEN",
                details: "The provided token is invalid or has expired.",
            });
        }
        if (user.passwordResetExpires < new Date()) {
            return res.status(410).json({
                message: "The password reset link has expired.",
                code: "TOKEN_EXPIRED",
                details: "Please request a new password reset link.",
            });
        }
        const salt = yield bcrypt_1.default.genSalt(10);
        const hashedPassword = yield bcrypt_1.default.hash(newPassword, salt);
        user.password = hashedPassword;
        user.passwordResetToken = "";
        user.passwordResetExpires = null;
        yield user.save();
        return res.status(200).json({
            message: "Password reset successful.",
            code: "PASSWORD_RESET_SUCCESS",
            details: "Your password has been successfully reset.",
        });
    }
    catch (error) {
        return res.status(500).json({
            message: error.message || "Something went wrong",
        });
    }
});
exports.resetPassword = resetPassword;
const updateProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const { firstName, lastName, gender, street, city, state, postalCode, country, emailNotifications, smsNotifications, pushNotifications, timezone, } = req.body;
    try {
        const user = yield userModel_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found.",
                code: "USER_NOT_FOUND",
                details: "No user found with the provided ID.",
            });
        }
        if (firstName)
            user.firstName = firstName;
        if (lastName)
            user.lastName = lastName;
        if (gender && ["male", "female", "other"].includes(gender)) {
            user.gender = gender;
        }
        if (timezone)
            user.timezone = timezone;
        let address = yield addressModel_1.Address.findOne({ userId: user._id });
        if (!address) {
            address = new addressModel_1.Address({ userId: user._id });
        }
        if (street)
            address.street = street;
        if (city)
            address.city = city;
        if (state)
            address.state = state;
        if (postalCode)
            address.postalCode = postalCode;
        if (country)
            address.country = country;
        yield address.save();
        let notificationPreferences = yield notificationPreferencesModel_1.NotificationPreferences.findOne({
            userId: user._id,
        });
        if (!notificationPreferences) {
            notificationPreferences = new notificationPreferencesModel_1.NotificationPreferences({
                userId: user._id,
            });
        }
        if (typeof emailNotifications === "boolean") {
            notificationPreferences.email = emailNotifications;
        }
        if (typeof smsNotifications === "boolean") {
            notificationPreferences.sms = smsNotifications;
        }
        if (typeof pushNotifications === "boolean") {
            notificationPreferences.push = pushNotifications;
        }
        yield notificationPreferences.save();
        user.address = address._id;
        user.notificationPreferences =
            notificationPreferences._id;
        user.profileCompletion = (0, authHelpers_1.calculateProfileCompletion)(user);
        yield user.save();
        return res.status(200).json({
            message: "Profile updated successfully.",
            code: "PROFILE_UPDATED",
            details: "Your profile information has been successfully updated.",
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "An error occurred while updating the profile.",
            code: "INTERNAL_SERVER_ERROR",
            details: error.message || "Unexpected error occurred.",
        });
    }
});
exports.updateProfile = updateProfile;
const uploadProfilePicture = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded",
                code: "NO_FILE_UPLOADED",
                details: "Please upload a valid image file.",
            });
        }
        const user = yield userModel_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                code: "USER_NOT_FOUND",
                details: "No user found with the provided ID.",
            });
        }
        if (user.profilePicture) {
            const pathname = decodeURIComponent(url_1.default.parse(user.profilePicture).pathname || "");
            let publicId = pathname === null || pathname === void 0 ? void 0 : pathname.split("/").slice(-2).join("/");
            publicId = publicId === null || publicId === void 0 ? void 0 : publicId.split(".").slice(0, -1).join(".");
            if (publicId) {
                yield cloudinary_1.cloudinary.uploader.destroy(publicId);
            }
        }
        if (req.file && req.file.path) {
            user.profilePicture = req.file.path;
        }
        user.profileCompletion = (0, authHelpers_1.calculateProfileCompletion)(user);
        yield user.save();
        return res.status(200).json({
            message: "Profile picture updated successfully",
            code: "PROFILE_PICTURE_UPDATED",
            profilePicture: user.profilePicture,
        });
    }
    catch (error) {
        return res.status(500).json({
            message: error.message || "Something went wrong",
        });
    }
});
exports.uploadProfilePicture = uploadProfilePicture;
const deleteProfilePicture = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const user = yield userModel_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                code: "USER_NOT_FOUND",
                details: "No user found with the provided ID.",
            });
        }
        if (user.profilePicture) {
            const pathname = decodeURIComponent(url_1.default.parse(user.profilePicture).pathname || "");
            let publicId = pathname === null || pathname === void 0 ? void 0 : pathname.split("/").slice(-2).join("/");
            publicId = publicId === null || publicId === void 0 ? void 0 : publicId.split(".").slice(0, -1).join(".");
            if (publicId) {
                yield cloudinary_1.cloudinary.uploader.destroy(publicId);
            }
            user.profilePicture = "";
            user.profileCompletion = (0, authHelpers_1.calculateProfileCompletion)(user);
            yield user.save();
        }
        return res.status(200).json({
            message: "Profile picture deleted successfully",
            code: "PROFILE_PICTURE_DELETED",
        });
    }
    catch (error) {
        return res.status(500).json({
            message: error.message || "Something went wrong",
        });
    }
});
exports.deleteProfilePicture = deleteProfilePicture;
const refreshToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { token } = req.params;
    if (!token) {
        return res.status(400).json({
            message: "Refresh token is required.",
            code: "MISSING_REFRESH_TOKEN",
            details: "A valid refresh token is required to generate a new access token.",
        });
    }
    try {
        let decodedToken;
        try {
            decodedToken = jsonwebtoken_1.default.verify(token, process.env.REFRESH_TOKEN_SECRET);
        }
        catch (err) {
            return res.status(401).json({
                message: "Invalid token.",
                code: "INVALID_TOKEN",
                details: "The provided token is invalid or has expired.",
            });
        }
        const { userId } = decodedToken;
        const user = yield userModel_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found.",
                code: "USER_NOT_FOUND",
                details: "No user found with the provided ID.",
            });
        }
        const accessToken = (0, authHelpers_1.generateAccessToken)(user._id);
        const refreshToken = (0, authHelpers_1.generateRefreshToken)(user._id);
        return res.status(200).json({
            accessToken,
            refreshToken,
        });
    }
    catch (error) {
        return res.status(500).json({
            message: error.message || "Something went wrong",
        });
    }
});
exports.refreshToken = refreshToken;
const getProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    try {
        const user = yield userModel_1.User.findById(userId)
            .populate("address", "-_id -userId -__v")
            .populate("notificationPreferences", "-_id -userId -__v")
            .populate("loginHistory", "-_id -userId -__v")
            .select("-_id -password -accountLockDuration -verifiedPhone -updatedAt -__v -lockUntil -passwordResetExpires -isActive -accountLocked -accountStatus -passwordResetToken -emailVerificationToken -emailVerificationExpires");
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                code: "USER_NOT_FOUND",
                details: "No user found with the provided ID.",
            });
        }
        return res.status(200).json({
            user,
        });
    }
    catch (error) {
        return res.status(500).json({
            message: error.message || "Something went wrong",
        });
    }
});
exports.getProfile = getProfile;
