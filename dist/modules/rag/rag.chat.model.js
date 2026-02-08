"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const chatMessageSchema = new mongoose_1.default.Schema({
    role: {
        type: String,
        enum: ["user", "assistant"],
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    sources: [
        {
            content: { type: String },
            score: { type: Number },
            pageNumber: { type: Number },
            documentName: { type: String },
            documentId: { type: mongoose_1.default.Schema.Types.ObjectId },
        },
    ],
    timestamp: {
        type: Date,
        default: Date.now,
    },
}, { _id: false });
const ragChatSchema = new mongoose_1.default.Schema({
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    documentId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "RagDocument",
        required: false,
        index: true,
    },
    documentIds: [
        {
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: "RagDocument",
        },
    ],
    chatType: {
        type: String,
        enum: ["single-document", "multi-document", "all-documents"],
        default: "single-document",
    },
    title: {
        type: String,
        required: true,
        trim: true,
        default: "New Chat",
    },
    messages: [chatMessageSchema],
}, {
    timestamps: true,
});
//  compound index for single-document chats
ragChatSchema.index({ userId: 1, documentId: 1 });
// Index for multi-document chats
ragChatSchema.index({ userId: 1, chatType: 1 });
const RagChat = mongoose_1.default.model("RagChat", ragChatSchema);
exports.default = RagChat;
