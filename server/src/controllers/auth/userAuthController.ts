import { Request, Response } from "express";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import ms from "ms";
import url from "url";
import { User } from "../../models/userModel";
import { passwordValidation } from "../../utils/validation";
import {
  comparePassword,
  generateAccessToken,
  generateForgotPasswordToken,
  generateRefreshToken,
  generateRegistrationToken,
  getRemainingLockTime,
  handleIpAndLoginHistory,
  isAccountLocked,
  lockAccount,
  unlockAccount,
} from "../../utils/authHelpers";
import { NotificationPreferences } from "../../models/notificationPreferencesModel";
import { Address } from "../../models/addressModel";
import { sendVerificationMail } from "../../mails/verificationMail";
import jwt from "jsonwebtoken";
import { resendVerificationMail } from "../../mails/resendVerificationMail";
import { sendForgotPasswordtMail } from "../../mails/resetPasswordMail";
import { cloudinary } from "../../config/cloudinary";

dotenv.config();

interface AuthenticatedRequest extends Request {
  userId?: string;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      username: username.toLowerCase(),
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

    const userId = user._id as mongoose.Types.ObjectId;
    const accessToken = generateAccessToken(userId.toString());
    const refreshToken = generateRefreshToken(userId.toString());

    const registerMailToken = generateRegistrationToken(userId.toString());
    const registerMailExpires =
      process.env.REGISTRATION_TOKEN_SECRET_EXPIRES_IN;

    user.emailVerificationToken = registerMailToken;
    user.emailVerificationExpires = new Date(
      Date.now() + ms(registerMailExpires as string)
    );

    await user.save();

    const sendMail = await sendVerificationMail(
      user.username,
      user.email,
      registerMailToken
    );

    if (!sendMail) {
      return res.status(500).json({
        message: "Failed to send registration email.",
        code: "MAIL_SEND_ERROR",
        details:
          "An error occurred while sending the registration email. Please try again.",
      });
    }

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

export const checkUsername = async (req: Request, res: Response) => {
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
        details:
          "Username must be between 5 and 20 characters long. Please try again.",
      });
    }
    username = username.toLowerCase();

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        message: "This username cannot be used.",
        code: "USERNAME_TAKEN",
        details:
          "The username entered is already taken. Please choose another one.",
      });
    }

    return res.status(200).json({
      message: "Username available.",
      code: "USERNAME_AVAILABLE",
      details: "The username is available for registration.",
    });
  } catch (error: any) {
    return res.status(500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const checkEmail = async (req: Request, res: Response) => {
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

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({
        message: "This email cannot be used",
        code: "EMAIL_TAKEN",
        details:
          "The email address entered is already associated with an account.",
      });
    }

    return res.status(200).json({
      message: "Email is available",
      code: "EMAIL_AVAILABLE",
      details: "The email address is available for registration.",
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Something went wrong",
      code: "INTERNAL_SERVER_ERROR",
      details: error.message || "Unexpected error while checking email.",
    });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  const { token } = req.params;

  try {
    if (!token) {
      return res.status(400).json({
        message: "Verification link is missing.",
        code: "MISSING_TOKEN",
        details:
          "A valid verification link is required to verify the email address.",
      });
    }
    let decodedToken;
    try {
      decodedToken = jwt.verify(
        token,
        process.env.REGISTRATION_TOKEN_SECRET as string
      ) as { userId: string };
    } catch (err: any) {
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
    const existingUser = await User.findById(userId as string);
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
    existingUser.emailVerificationExpires = null as any;
    await existingUser.save();

    return res.status(200).json({
      message: "Email verified.",
      code: "EMAIL_VERIFIED",
      details: "The email address has been successfully verified.",
    });
  } catch (error: any) {
    return res.status(500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const resendVerifyEmail = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(400).json({
      message: "User is not authenticated.",
      code: "USER_NOT_AUTHENTICATED",
      details:
        "A valid user must be authenticated to resend the verification email.",
    });
  }

  try {
    const user = await User.findById(userId);
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

    const registerMailToken = generateRegistrationToken(user._id as string);
    const registerMailExpires =
      process.env.REGISTRATION_TOKEN_SECRET_EXPIRES_IN;

    user.emailVerificationToken = registerMailToken;
    user.emailVerificationExpires = new Date(
      Date.now() + parseInt(registerMailExpires as string) * 60 * 1000
    );
    await user.save();

    const sendMail = await resendVerificationMail(
      user.username,
      user.email,
      registerMailToken
    );

    if (!sendMail) {
      return res.status(500).json({
        message: "Failed to send registration email.",
        code: "MAIL_SEND_ERROR",
        details:
          "An error occurred while sending the registration email. Please try again.",
      });
    }

    return res.status(200).json({
      message: "Verification email sent.",
      code: "EMAIL_SENT",
      details: "A new verification email has been sent to your email address.",
    });
  } catch (error: any) {
    return res.status(500).json({
      message: error.message || "Something went wrong",
    });
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

    return res.status(200).json({
      accessToken,
      refreshToken,
      message: "Login successful.",
      code: "LOGIN_SUCCESS",
      details: "User logged in successfully.",
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "An internal server error occurred.",
      code: "INTERNAL_SERVER_ERROR",
      details: error.message || "Unexpected error during login process.",
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({
        message: "Email is required.",
        code: "MISSING_EMAIL",
        details: "A valid email address is required to reset the password.",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "User not found.",
        code: "USER_NOT_FOUND",
        details:
          "The email address entered was not found in the system. Please verify the email address and try again.",
      });
    }

    const resetToken = generateForgotPasswordToken(user._id as string);
    const resetTokenExpires =
      process.env.PASSWORD_RESET_TOKEN_SECRET_EXPIRES_IN;

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(
      Date.now() + ms(resetTokenExpires as string)
    );

    await user.save();

    const sendMail = await sendForgotPasswordtMail(
      user.username,
      user.email,
      resetToken
    );

    if (!sendMail) {
      return res.status(500).json({
        message: "Failed to send password reset email.",
        code: "MAIL_SEND_ERROR",
        details:
          "An error occurred while sending the password reset email. Please try again.",
      });
    }

    return res.status(200).json({
      message: "Password reset email sent.",
      code: "PASSWORD_RESET_EMAIL_SENT",
      details: "A password reset email has been sent to your email address.",
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "An internal server error occurred.",
      code: "INTERNAL_SERVER_ERROR",
      details:
        error.message || "Unexpected error during password reset process.",
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token } = req.params;
  const { newPassword, newPasswordAgain } = req.body;

  try {
    if (!token) {
      return res.status(400).json({
        message: "Reset token is missing.",
        code: "MISSING_TOKEN",
        details:
          "A valid reset token is required to reset the password. Please check the link in your email.",
      });
    }

    if (!newPassword || !newPasswordAgain) {
      return res.status(400).json({
        message: "New password is required.",
        code: "MISSING_PASSWORD",
        details: "Please provide a new password to reset your account.",
      });
    }

    if (!passwordValidation(newPassword)) {
      return res.status(400).json({
        message: "Invalid password format.",
        code: "INVALID_PASSWORD",
        details:
          "Password must be at least 6 characters long, and contain at least one uppercase and one lowercase letter.",
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
      decodedToken = jwt.verify(
        token,
        process.env.PASSWORD_RESET_TOKEN_SECRET as string
      ) as { userId: string };
    } catch (err: any) {
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
    const user = await User.findById(userId);
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

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.passwordResetToken = "";
    user.passwordResetExpires = null as any;
    await user.save();

    return res.status(200).json({
      message: "Password reset successful.",
      code: "PASSWORD_RESET_SUCCESS",
      details: "Your password has been successfully reset.",
    });
  } catch (error: any) {
    return res.status(500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.userId;
  const {
    firstName,
    lastName,
    gender,
    phone,
    street,
    city,
    state,
    postalCode,
    country,
    emailNotifications,
    smsNotifications,
    pushNotifications,
    timezone,
  } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found.",
        code: "USER_NOT_FOUND",
        details: "No user found with the provided ID.",
      });
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (gender && ["male", "female", "other"].includes(gender)) {
      user.gender = gender;
    }
    if (phone) user.phone = phone;
    if (timezone) user.timezone = timezone;

    let address = await Address.findOne({ userId: user._id });
    if (!address) {
      address = new Address({ userId: user._id });
    }
    if (street) address.street = street;
    if (city) address.city = city;
    if (state) address.state = state;
    if (postalCode) address.postalCode = postalCode;
    if (country) address.country = country;

    await address.save();

    let notificationPreferences = await NotificationPreferences.findOne({
      userId: user._id,
    });
    if (!notificationPreferences) {
      notificationPreferences = new NotificationPreferences({
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

    await notificationPreferences.save();

    user.address = address._id as mongoose.Types.ObjectId;
    user.notificationPreferences =
      notificationPreferences._id as mongoose.Types.ObjectId;

    await user.save();

    return res.status(200).json({
      message: "Profile updated successfully.",
      code: "PROFILE_UPDATED",
      details: "Your profile information has been successfully updated.",
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "An error occurred while updating the profile.",
      code: "INTERNAL_SERVER_ERROR",
      details: error.message || "Unexpected error occurred.",
    });
  }
};

export const uploadProfilePicture = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.userId;

    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded",
        code: "NO_FILE_UPLOADED",
        details: "Please upload a valid image file.",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        code: "USER_NOT_FOUND",
        details: "No user found with the provided ID.",
      });
    }

    if (user.profilePicture) {
      const pathname = decodeURIComponent(
        url.parse(user.profilePicture).pathname || ""
      );
      let publicId = pathname?.split("/").slice(-2).join("/");
      publicId = publicId?.split(".").slice(0, -1).join(".");

      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    }

    if (req.file && req.file.path) {
      user.profilePicture = req.file.path;
    }

    await user.save();

    return res.status(200).json({
      message: "Profile picture updated successfully",
      code: "PROFILE_PICTURE_UPDATED",
      profilePicture: user.profilePicture,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const deleteProfilePicture = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        code: "USER_NOT_FOUND",
        details: "No user found with the provided ID.",
      });
    }

    if (user.profilePicture) {
      const pathname = decodeURIComponent(
        url.parse(user.profilePicture).pathname || ""
      );
      let publicId = pathname?.split("/").slice(-2).join("/");
      publicId = publicId?.split(".").slice(0, -1).join(".");
      console.log("publicId", publicId);

      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }

      user.profilePicture = "";
      await user.save();
    }

    return res.status(200).json({
      message: "Profile picture deleted successfully",
      code: "PROFILE_PICTURE_DELETED",
    });
  } catch (error: any) {
    return res.status(500).json({
      message: error.message || "Something went wrong",
    });
  }
};
