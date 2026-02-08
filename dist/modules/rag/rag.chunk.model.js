"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const ragChunkSchema = new mongoose_1.default.Schema({
    documentId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "RagDocument",
        required: true,
        index: true,
    },
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    content: {
        type: String,
        required: true,
    },
    embedding: {
        type: [Number],
        required: true,
    },
    metadata: {
        source: {
            type: String,
            required: true,
        },
        pageNumber: {
            type: Number,
        },
        chunkIndex: {
            type: Number,
            required: true,
        },
        totalChunks: {
            type: Number,
            required: true,
        },
    },
}, {
    timestamps: true,
});
// Compound index for efficient user + document queries
ragChunkSchema.index({ userId: 1, documentId: 1 });
const RagChunk = mongoose_1.default.model("RagChunk", ragChunkSchema);
exports.default = RagChunk;
