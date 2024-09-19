"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userProfileRoutes = void 0;
const express_1 = __importDefault(require("express"));
const userAuthController_1 = require("../controllers/auth/userAuthController");
const authMiddleware_1 = require("../middleware/auth/authMiddleware");
const upload_1 = __importDefault(require("../uploads/upload"));
exports.userProfileRoutes = express_1.default.Router();
exports.userProfileRoutes.post("/update", authMiddleware_1.validUserToken, userAuthController_1.updateProfile);
exports.userProfileRoutes.post("/upload-profile-picture", authMiddleware_1.validUserToken, upload_1.default.single("profilePicture"), userAuthController_1.uploadProfilePicture);
exports.userProfileRoutes.post("/delete-profile-picture", authMiddleware_1.validUserToken, userAuthController_1.deleteProfilePicture);
exports.userProfileRoutes.get("/get-profile", authMiddleware_1.validUserToken, userAuthController_1.getProfile);
