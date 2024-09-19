"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validUserToken = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
dotenv_1.default.config();
const validUserToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Authorization token is missing or malformed.",
            code: "NO_TOKEN",
            details: "A valid access token is required to access this resource.",
        });
    }
    const token = authHeader.split(" ")[1];
    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
    if (!accessTokenSecret) {
        return res.status(500).json({
            message: "Access token secret is missing.",
            code: "MISSING_SECRET",
            details: "The server is missing the access token secret.",
        });
    }
    jsonwebtoken_1.default.verify(token, accessTokenSecret, (err, decodedToken) => {
        if (err) {
            return res.status(401).json({
                message: "Invalid or expired token.",
                code: "INVALID_TOKEN",
                details: "The provided token is invalid, expired, or malformed.",
            });
        }
        const { userId } = decodedToken;
        req.userId = userId;
        next();
    });
};
exports.validUserToken = validUserToken;
