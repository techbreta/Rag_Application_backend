"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
// ── Schema ─────────────────────────────────────────────────────────
const ragImageSchema = new mongoose_1.default.Schema({
    userId: {
        type: mongoose_1.default.SchemaTypes.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    prompt: {
        type: String,
        required: true,
        maxlength: 2000,
    },
    promptEmbedding: {
        type: [Number],
        required: true,
        index: "2dsphere", // For similarity search
    },
    cloudinaryUrl: {
        type: String,
        required: true,
    },
    cloudinaryPublicId: {
        type: String,
        required: true,
        unique: true,
    },
    mistralFileId: {
        type: String,
        required: true,
    },
    mistralConversationId: {
        type: String,
        required: true,
    },
    metadata: {
        model: {
            type: String,
            default: "mistral-medium-2505",
        },
        temperature: {
            type: Number,
            default: 0.3,
        },
        generationTime: {
            type: Number, // milliseconds
        },
    },
}, {
    timestamps: true,
});
// ── Compound Index for efficient queries ───────────────────────────
ragImageSchema.index({ userId: 1, createdAt: -1 });
ragImageSchema.index({ userId: 1, "metadata.model": 1 });
const RagImage = mongoose_1.default.model("RagImage", ragImageSchema);
exports.default = RagImage;
