"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
// Latest Google Indexing API notification per URL
const indexingSubmissionSchema = new mongoose_1.default.Schema({
    url: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    type: {
        type: String,
        enum: ["URL_UPDATED", "URL_DELETED"],
        required: true,
    },
    status: {
        type: String,
        enum: ["success", "failed"],
        required: true,
        index: true,
    },
    lastSubmittedAt: {
        type: Date,
        required: true,
    },
    lastError: {
        type: String,
        maxlength: 1000,
    },
}, {
    timestamps: true,
});
const IndexingSubmission = mongoose_1.default.model("IndexingSubmission", indexingSubmissionSchema);
exports.default = IndexingSubmission;
