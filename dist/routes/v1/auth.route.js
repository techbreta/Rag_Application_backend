"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const validate_1 = require("../../modules/validate");
const auth_1 = require("../../modules/auth");
const router = express_1.default.Router();
// Core authentication endpoints
router.post("/register", (0, validate_1.validate)(auth_1.authValidation.register), auth_1.authController.register);
router.post("/login", (0, validate_1.validate)(auth_1.authValidation.login), auth_1.authController.login);
router.post("/logout", (0, validate_1.validate)(auth_1.authValidation.logout), auth_1.authController.logout);
router.post("/refresh-tokens", (0, validate_1.validate)(auth_1.authValidation.refreshTokens), auth_1.authController.refreshTokens);
// Password management
router.post("/forgot-password", (0, validate_1.validate)(auth_1.authValidation.forgotPassword), auth_1.authController.forgotPassword);
router.post("/reset-password", (0, validate_1.validate)(auth_1.authValidation.resetPassword), auth_1.authController.resetPassword);
router.post("/update-password", (0, auth_1.auth)(), (0, validate_1.validate)(auth_1.authValidation.updatePassword), auth_1.authController.updatePassword);
// Email verification
router.post("/send-verification-email", (0, auth_1.auth)(), auth_1.authController.sendVerificationEmail);
router.post("/verify-email", (0, validate_1.validate)(auth_1.authValidation.verifyEmail), auth_1.authController.verifyEmail);
exports.default = router;
