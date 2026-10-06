"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.INDEX_VERDICTS = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
exports.INDEX_VERDICTS = ["PASS", "PARTIAL", "FAIL", "NEUTRAL", "VERDICT_UNSPECIFIED"];
// One document per public URL: Indexing API submission + Google index status
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
    },
    status: {
        type: String,
        enum: ["success", "failed"],
        index: true,
    },
    lastSubmittedAt: {
        type: Date,
    },
    lastError: {
        type: String,
        maxlength: 1000,
    },
    inspection: {
        // No enum: stored as returned so a new Google value never fails the write
        verdict: { type: String, index: true },
        coverageState: String,
        indexingState: String,
        pageFetchState: String,
        robotsTxtState: String,
        lastCrawlTime: Date,
        googleCanonical: String,
        userCanonical: String,
        resultLink: String,
        checkedAt: { type: Date, index: true },
        error: { type: String, maxlength: 1000 },
    },
}, {
    timestamps: true,
});
const IndexingSubmission = mongoose_1.default.model("IndexingSubmission", indexingSubmissionSchema);
exports.default = IndexingSubmission;
