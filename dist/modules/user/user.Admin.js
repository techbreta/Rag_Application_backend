"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const user_model_1 = __importDefault(require("./user.model"));
const mongoose_1 = __importDefault(require("mongoose"));
const AdminSchema = new mongoose_1.default.Schema({
    adminOF: [{
            method: {
                type: mongoose_1.default.Schema.Types.ObjectId,
                ref: "Subscription"
            },
            workspacePermissions: {
                type: [mongoose_1.default.Schema.Types.ObjectId],
                ref: "Workspace",
                default: []
            }
        }],
});
const admin = user_model_1.default.discriminator("admin", AdminSchema);
exports.default = admin;
