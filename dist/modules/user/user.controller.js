"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.deleteUser = exports.updateMe = exports.updateUser = exports.getUser = exports.getAllUsers = exports.getUsers = exports.createUser = void 0;
const http_status_1 = __importDefault(require("http-status"));
const mongoose_1 = __importDefault(require("mongoose"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const ApiError_1 = __importDefault(require("../errors/ApiError"));
const pick_1 = __importDefault(require("../utils/pick"));
const userService = __importStar(require("./user.service"));
exports.createUser = (0, catchAsync_1.default)(async (req, res) => {
    let ownerId;
    if (req.user.role !== "admin") {
        ownerId = req.user._id;
    }
    else {
        // For admin users, they might pass ownerId in the request body or use their own ID
        ownerId = req.body.ownerId ? new mongoose_1.default.Types.ObjectId(req.body.ownerId) : req.user._id;
    }
    console.log("Creating user with body:", req.body);
    const user = await userService.createUser({
        ...req.body,
        createdBy: req.user._id,
        ownerId
    });
    res.status(http_status_1.default.CREATED).send(user);
});
exports.getUsers = (0, catchAsync_1.default)(async (req, res) => {
    // Authorization logic
    if (req.user && req.user.role === 'admin') {
        // Admin can see users they created
    }
    else if (req.user && req.user.role === 'sub-admin') {
        // Sub-admin can see users created by their admin
    }
    else {
        throw new Error("Unauthorized");
    }
    const filter = (0, pick_1.default)(req.query, ['name', 'role']);
    const options = (0, pick_1.default)(req.query, ['sortBy', 'limit', 'page', 'projectBy']);
    const result = await userService.queryUsers(filter, options);
    res.send(result);
});
exports.getAllUsers = (0, catchAsync_1.default)(async (req, res) => {
    const { page, limit, role, search } = req.query;
    // Authorization logic
    if (req.user && req.user.role === 'admin') {
        // Admin can see users they created
    }
    else if (req.user && req.user.role === 'sub-admin') {
        // Sub-admin can see users created by their admin
    }
    else {
        throw new Error("Unauthorized");
    }
    const queryParams = {
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        search: search,
    };
    if (role) {
        queryParams.role = role;
    }
    // if (req.user._id) {
    //   queryParams.userId = req.user._id;
    // }
    const data = await userService.getUsers(queryParams);
    res.send(data);
});
exports.getUser = (0, catchAsync_1.default)(async (req, res) => {
    if (typeof req.params['userId'] === 'string') {
        const user = await userService.getUserById(new mongoose_1.default.Types.ObjectId(req.params['userId']));
        if (!user) {
            throw new ApiError_1.default('User not found', http_status_1.default.NOT_FOUND);
        }
        res.send(user);
    }
});
exports.updateUser = (0, catchAsync_1.default)(async (req, res) => {
    if (typeof req.params['userId'] === 'string') {
        const user = await userService.updateUserById(new mongoose_1.default.Types.ObjectId(req.params['userId']), req.body);
        if (!user) {
            throw new ApiError_1.default('User not found', http_status_1.default.NOT_FOUND);
        }
        res.send(user);
    }
});
exports.updateMe = (0, catchAsync_1.default)(async (req, res) => {
    const user = await userService.updateUserById(req.user._id, req.body);
    if (!user) {
        throw new ApiError_1.default('User not found', http_status_1.default.NOT_FOUND);
    }
    res.send(user);
});
exports.deleteUser = (0, catchAsync_1.default)(async (req, res) => {
    if (typeof req.params['userId'] === 'string') {
        const user = await userService.deleteUserById(new mongoose_1.default.Types.ObjectId(req.params['userId']));
        if (!user) {
            throw new ApiError_1.default('User not found', http_status_1.default.NOT_FOUND);
        }
        res.status(http_status_1.default.NO_CONTENT).send();
    }
});
exports.getMe = (0, catchAsync_1.default)(async (req, res) => {
    const userId = req.user._id;
    const user = await userService.getme(userId);
    console.log(user.role, 'User role');
    res.send({ user });
});
