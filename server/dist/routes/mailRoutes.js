"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userMailsRoutes = void 0;
const express_1 = __importDefault(require("express"));
const userAuthController_1 = require("../controllers/auth/userAuthController");
const authMiddleware_1 = require("../middleware/auth/authMiddleware");
exports.userMailsRoutes = express_1.default.Router();
exports.userMailsRoutes.get("/resend-verification-email/:token?", authMiddleware_1.validUserToken, userAuthController_1.resendVerifyEmail);
