"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.getUser = exports.getUsers = exports.createUser = void 0;
const joi_1 = __importDefault(require("joi"));
const custom_validation_1 = require("../validate/custom.validation");
const createUserBody = {
    email: joi_1.default.string().optional().email(),
    password: joi_1.default.string().optional().custom(custom_validation_1.password),
    name: joi_1.default.string().optional(),
    role: joi_1.default.string().optional().valid("subAdmin", "admin"),
    contact: joi_1.default.string().optional(),
    googleId: joi_1.default.string().optional(),
    providers: joi_1.default.array().items(joi_1.default.string().valid("google", "local")),
    adminOF: joi_1.default.array()
        .items(joi_1.default.object().keys({
        method: joi_1.default.string(),
        workspacePermissions: joi_1.default.array().items(joi_1.default.string()),
    }))
        .min(1)
        .optional(),
    subAdminRole: joi_1.default.string().valid("subAdmin", "standardUser").optional(),
    createdBy: joi_1.default.string().custom(custom_validation_1.objectId).optional(),
    status: joi_1.default.string().valid("active", "inactive").default("active"),
    profilePicture: joi_1.default.string().optional(),
    profilePictureKey: joi_1.default.string().optional(),
    isDeleted: joi_1.default.boolean().default(false),
    orgName: joi_1.default.string().optional(),
    stripeaccountid: joi_1.default.string().optional(),
    activeChat: joi_1.default.string().optional().allow(null),
    isOnline: joi_1.default.boolean().optional(),
};
exports.createUser = {
    body: joi_1.default.object()
        .keys(createUserBody)
        .fork([
        "email",
        "name",
        "subAdminRole",
        "adminOF",
        "profilePicture",
        "profilePictureKey",
    ], (schema) => schema.required()),
};
exports.getUsers = {
    query: joi_1.default.object().keys({
        name: joi_1.default.string(),
        role: joi_1.default.string(),
        sortBy: joi_1.default.string(),
        projectBy: joi_1.default.string(),
        limit: joi_1.default.number().integer(),
        page: joi_1.default.number().integer(),
    }),
};
exports.getUser = {
    params: joi_1.default.object().keys({
        userId: joi_1.default.string().custom(custom_validation_1.objectId),
    }),
};
exports.updateUser = {
    params: joi_1.default.object().keys({
        userId: joi_1.default.required().custom(custom_validation_1.objectId),
    }),
    body: joi_1.default.object().keys(createUserBody).min(1),
};
exports.deleteUser = {
    params: joi_1.default.object().keys({
        userId: joi_1.default.string().custom(custom_validation_1.objectId),
    }),
};
