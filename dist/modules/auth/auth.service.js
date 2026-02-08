"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEmail = exports.resetPassword = exports.AcceptInvitation = exports.refreshAuth = exports.logout = exports.loginUserWithEmailAndPassword = void 0;
const http_status_1 = __importDefault(require("http-status"));
const mongoose_1 = __importDefault(require("mongoose"));
const token_model_1 = __importDefault(require("../token/token.model"));
const ApiError_1 = __importDefault(require("../errors/ApiError"));
const token_types_1 = __importDefault(require("../token/token.types"));
const user_service_1 = require("../user/user.service");
const token_service_1 = require("../token/token.service");
const ApiError_2 = __importDefault(require("../errors/ApiError"));
/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<IUserDoc>}
 */
const loginUserWithEmailAndPassword = async (email, password) => {
    const user = await (0, user_service_1.getUserByEmail)(email);
    if (user && user.providers.includes('google') && !user.password) {
        throw new ApiError_1.default('Please login using Google Sign-In', http_status_1.default.BAD_REQUEST);
    }
    if (!user || !(await user.isPasswordMatch(password))) {
        throw new ApiError_1.default('Incorrect email or password', http_status_1.default.UNAUTHORIZED);
    }
    return user;
};
exports.loginUserWithEmailAndPassword = loginUserWithEmailAndPassword;
/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise<void>}
 */
const logout = async (refreshToken) => {
    const refreshTokenDoc = await token_model_1.default.findOne({ token: refreshToken, type: token_types_1.default.REFRESH, blacklisted: false });
    if (!refreshTokenDoc) {
        throw new ApiError_1.default('Not found', http_status_1.default.NOT_FOUND);
    }
    await refreshTokenDoc.deleteOne();
};
exports.logout = logout;
/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<IUserWithTokens>}
 */
const refreshAuth = async (refreshToken) => {
    try {
        const refreshTokenDoc = await (0, token_service_1.verifyToken)(refreshToken, token_types_1.default.REFRESH);
        const user = await (0, user_service_1.getUserById)(new mongoose_1.default.Types.ObjectId(refreshTokenDoc.user));
        if (!user) {
            throw new Error();
        }
        await refreshTokenDoc.deleteOne();
        const tokens = await (0, token_service_1.generateAuthTokens)(user);
        return { user, tokens };
    }
    catch (error) {
        throw new ApiError_1.default('Please authenticate', http_status_1.default.UNAUTHORIZED);
    }
};
exports.refreshAuth = refreshAuth;
const AcceptInvitation = async (body) => {
    try {
        const { token, password, access_token } = body;
        const refreshTokenDoc = await (0, token_service_1.verifyToken)(token, token_types_1.default.INVITE);
        console.log('refreshTokenDoc', refreshTokenDoc);
        const user = await (0, user_service_1.getUserById)(new mongoose_1.default.Types.ObjectId(refreshTokenDoc.user));
        if (!user) {
            throw new ApiError_1.default('User not found', http_status_1.default.NOT_FOUND);
        }
        if (user.googleId || user.password) {
            throw new ApiError_1.default('User already has credentials', http_status_1.default.BAD_REQUEST);
        }
        if (!access_token && !token) {
            throw new ApiError_1.default('access_token or token is required', http_status_1.default.BAD_REQUEST);
        }
        if (password) {
            user.password = password;
            user.providers = ['local'];
        }
        if (access_token) {
            const userData = await (0, user_service_1.googleprofiledata)(access_token);
            user.googleId = userData?.sub;
            if (userData?.email !== user.email) {
                throw new ApiError_1.default('Email mismatch with Google account', http_status_1.default.BAD_REQUEST);
            }
            user.providers.push('google');
        }
        user.isEmailVerified = true;
        await user.save();
        await token_model_1.default.deleteMany({ user: user.id, type: token_types_1.default.INVITE });
        return user;
    }
    catch (error) {
        console.error('Error accepting invitation:', error);
        throw new ApiError_2.default('Invitation acceptance failed', http_status_1.default.UNAUTHORIZED);
    }
};
exports.AcceptInvitation = AcceptInvitation;
/**
 * Reset password
 * @param {string} resetPasswordToken
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
const resetPassword = async (resetPasswordToken, newPassword) => {
    try {
        const resetPasswordTokenDoc = await (0, token_service_1.verifyToken)(resetPasswordToken, token_types_1.default.RESET_PASSWORD);
        const user = await (0, user_service_1.getUserById)(new mongoose_1.default.Types.ObjectId(resetPasswordTokenDoc.user));
        if (!user) {
            throw new Error();
        }
        await (0, user_service_1.updateUserById)(user.id, { password: newPassword });
        await token_model_1.default.deleteMany({ user: user.id, type: token_types_1.default.RESET_PASSWORD });
    }
    catch (error) {
        throw new ApiError_1.default('Password reset failed', http_status_1.default.UNAUTHORIZED);
    }
};
exports.resetPassword = resetPassword;
/**
 * Verify email
 * @param {string} verifyEmailToken
 * @returns {Promise<IUserDoc | null>}
 */
const verifyEmail = async (verifyEmailToken) => {
    try {
        const verifyEmailTokenDoc = await (0, token_service_1.verifyToken)(verifyEmailToken, token_types_1.default.VERIFY_EMAIL);
        const user = await (0, user_service_1.getUserById)(new mongoose_1.default.Types.ObjectId(verifyEmailTokenDoc.user));
        if (!user) {
            throw new Error();
        }
        await token_model_1.default.deleteMany({ user: user.id, type: token_types_1.default.VERIFY_EMAIL });
        const updatedUser = await (0, user_service_1.updateUserById)(user.id, { isEmailVerified: true });
        return updatedUser;
    }
    catch (error) {
        throw new ApiError_1.default('Email verification failed', http_status_1.default.UNAUTHORIZED);
    }
};
exports.verifyEmail = verifyEmail;
