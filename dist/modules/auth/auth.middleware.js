"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const http_status_1 = __importDefault(require("http-status"));
const ApiError_1 = __importDefault(require("../errors/ApiError"));
const roles_1 = require("../../config/roles");
const verifyCallback = (req, resolve, reject, requiredRights) => async (err, user, info) => {
    console.log('Authentication attempt:', req.headers.authorization);
    console.log('required rights', requiredRights);
    if (err || info || !user) {
        return reject(new ApiError_1.default('Please authenticate', http_status_1.default.UNAUTHORIZED));
    }
    req.user = user;
    if (requiredRights.length) {
        const userRights = roles_1.roleRights.get(user.role);
        const hasRequiredRights = requiredRights.every((right) => userRights?.includes(right));
        if (!hasRequiredRights) {
            return reject(new ApiError_1.default('You do not have permission to perform this action', http_status_1.default.FORBIDDEN));
        }
    }
    resolve();
};
const authMiddleware = (...requiredRights) => async (req, res, next) => new Promise((resolve, reject) => {
    // console.log("Auth middleware triggered", req.headers, ".................headers");
    passport_1.default.authenticate('jwt', { session: false }, verifyCallback(req, resolve, reject, requiredRights))(req, res, next);
})
    .then(() => next())
    .catch((err) => next(err));
exports.default = authMiddleware;
