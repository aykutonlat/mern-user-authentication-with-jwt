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
exports.sendVerificationMail = void 0;
const mailSettings_1 = require("../config/mailSettings");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const sendVerificationMail = (username, email, token) => __awaiter(void 0, void 0, void 0, function* () {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Welcome to our platform - Please verify your email",
        html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <title>Welcome to Our Platform</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    background-color: #f4f4f4;
                    font-family: Arial, sans-serif;
                }
                table {
                    max-width: 600px;
                    margin: 20px auto;
                    background-color: #ffffff;
                    padding: 20px;
                    border-radius: 8px;
                    border: 1px solid #ddd;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                }
                td {
                    padding: 20px;
                }
                h1 {
                    color: #333333;
                }
                p {
                    color: #555555;
                    margin-bottom: 20px;
                }
                .button {
                    display: inline-block;
                    padding: 12px 25px;
                    margin-top: 20px;
                    font-size: 16px;
                    color: #ffffff !important;
                    background-color: #4CAF50;
                    text-decoration: none;
                    border-radius: 5px;
                    cursor: pointer;
                    width: auto;
                    max-width: 100px;
                    align-self: center;
                    justify-self: center;
                }
                .button:hover {
                    background-color: #45a049;
                }
                .link {
                    color: #4CAF50 !important;
                    text-decoration: none !important;
                    font-size: 12px;
                    word-wrap: break-word;
                }
                @media only screen and (max-width: 600px) {
                    table {
                        width: 100%;
                    }
                    .button {
                        width: 100%;
                        text-align: center;
                    }
                }
            </style>
        </head>
        <body>
            <table>
                <tr>
                    <td>
                        <h1>Welcome ${username}!</h1>
                        <p>We're excited to have you join our platform. To complete your registration, please verify your email by clicking the button below:</p>
                        <a href="${process.env.CLIENT_URL}/register-email/${token}" class="button">Verify Email</a>
                        <p>If the button above doesn't work, copy and paste the following link into your browser:</p>
                        <a class="link" href="${process.env.CLIENT_URL}/verify-email/${token}">${process.env.FRONTEND_URL}/register-email/${token}</a>
                        <p>Thank you for joining us!</p>
                        <p>Best regards,<br>Your Company Name</p>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        `,
    };
    try {
        yield mailSettings_1.transporter.sendMail(mailOptions);
        return true;
    }
    catch (error) {
        console.error("Error sending registration email: ", error);
        return false;
    }
});
exports.sendVerificationMail = sendVerificationMail;
