"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePassword = exports.verifyEmail = exports.resetPassword = exports.forgotPassword = exports.refreshTokens = exports.logout = exports.login = exports.register = void 0;
const joi_1 = __importDefault(require("joi"));
const custom_validation_1 = require("../validate/custom.validation");
const registerBody = {
    email: joi_1.default.string().required().email(),
    password: joi_1.default.string().required().custom(custom_validation_1.password),
    name: joi_1.default.string().required(),
    contact: joi_1.default.string().optional(),
    providers: joi_1.default.array()
        .items(joi_1.default.string().valid("google", "facebook"))
        .optional()
        .default(["local"]),
    googleId: joi_1.default.string().optional(),
    status: joi_1.default.string().valid("active", "inactive").default("active"),
    profilePicture: joi_1.default.string().optional(),
    profilePictureKey: joi_1.default.string().optional(),
    isDeleted: joi_1.default.boolean().default(false),
    orgName: joi_1.default.string().optional(),
    role: joi_1.default.string().optional(),
    stripeaccountid: joi_1.default.string().optional(),
    activeChat: joi_1.default.string().optional().allow(null),
    isOnline: joi_1.default.boolean().optional(),
};
exports.register = {
    body: joi_1.default.object().keys(registerBody),
};
exports.login = {
    body: joi_1.default.object().keys({
        email: joi_1.default.string().required(),
        password: joi_1.default.string().required(),
    }),
};
exports.logout = {
    body: joi_1.default.object().keys({
        refreshToken: joi_1.default.string().required(),
    }),
};
exports.refreshTokens = {
    body: joi_1.default.object().keys({
        refreshToken: joi_1.default.string().required(),
    }),
};
exports.forgotPassword = {
    body: joi_1.default.object().keys({
        email: joi_1.default.string().email().required(),
    }),
};
exports.resetPassword = {
    query: joi_1.default.object().keys({
        token: joi_1.default.string().required(),
    }),
    body: joi_1.default.object().keys({
        password: joi_1.default.string().required().custom(custom_validation_1.password),
    }),
};
exports.verifyEmail = {
    query: joi_1.default.object().keys({
        token: joi_1.default.string().required(),
    }),
};
exports.updatePassword = {
    body: joi_1.default.object().keys({
        oldPassword: joi_1.default.string().required(),
        password: joi_1.default.string().required().custom(custom_validation_1.password),
    }),
};
