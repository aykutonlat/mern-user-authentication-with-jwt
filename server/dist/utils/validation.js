"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordValidation = void 0;
const passwordValidation = (password) => {
    const minLength = password.length >= 6;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    return minLength && hasUpperCase && hasLowerCase;
};
exports.passwordValidation = passwordValidation;
