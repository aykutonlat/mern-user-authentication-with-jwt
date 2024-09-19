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
exports.emailSuspensionWarningCron = exports.emailSuspensionCron = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const ms_1 = __importDefault(require("ms"));
const userModel_1 = require("../models/userModel");
const suspendInfoMail_1 = require("../mails/suspendInfoMail");
const suspensionWarningMail_1 = require("../mails/suspensionWarningMail");
const emailSuspensionCron = () => {
    node_cron_1.default.schedule("0 0 * * *", () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const users = yield userModel_1.User.find({
                verifyEmail: false,
                emailVerificationExpires: { $lt: new Date() },
                accountStatus: "active",
            });
            for (const user of users) {
                user.accountStatus = "suspended";
                const sendMail = yield (0, suspendInfoMail_1.sendSuspensionMail)(user.username, user.email);
                if (!sendMail) {
                    console.error("Error sending suspension email");
                }
                yield user.save();
            }
        }
        catch (error) {
            console.error("Error in cron job:", error);
        }
    }));
};
exports.emailSuspensionCron = emailSuspensionCron;
const emailSuspensionWarningCron = () => {
    node_cron_1.default.schedule("0 0 * * *", () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const oneDayFromNow = new Date(Date.now() + (0, ms_1.default)("1d"));
            const users = yield userModel_1.User.find({
                verifyEmail: false,
                emailVerificationExpires: { $lt: oneDayFromNow, $gt: new Date() },
                accountStatus: "active",
            });
            for (const user of users) {
                const sendMail = yield (0, suspensionWarningMail_1.sendSuspensionWarningMail)(user.username, user.email, user.emailVerificationToken);
                if (!sendMail) {
                    console.error("Error sending suspension warning email");
                }
            }
        }
        catch (error) {
            console.error("Error in suspension warning cron job:", error);
        }
    }));
};
exports.emailSuspensionWarningCron = emailSuspensionWarningCron;
