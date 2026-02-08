"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const ragDocumentSchema = new mongoose_1.default.Schema({
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    fileName: {
        type: String,
        required: true,
        trim: true,
    },
    fileUrl: {
        type: String,
        required: true,
        trim: true,
    },
    fileType: {
        type: String,
        required: true,
        enum: ['pdf', 'webpage'],
        default: 'pdf',
    },
    totalChunks: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ['processing', 'ready', 'failed'],
        default: 'processing',
    },
    errorMessage: {
        type: String,
        trim: true,
    },
}, {
    timestamps: true,
});
const RagDocument = mongoose_1.default.model('RagDocument', ragDocumentSchema);
exports.default = RagDocument;
