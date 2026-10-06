"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyGoogleIndexing = exports.publishUrlNotification = exports.getErrorDetails = exports.isPublicUrl = exports.isIndexingEnabled = exports.getGoogleAuth = exports.REQUEST_TIMEOUT_MS = void 0;
const google_auth_library_1 = require("google-auth-library");
const config_1 = __importDefault(require("../../config/config"));
const logger_1 = __importDefault(require("../logger/logger"));
const indexing_model_1 = __importDefault(require("./indexing.model"));
const INDEXING_PUBLISH_ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish";
const GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/indexing",
    // Search Console URL Inspection (real index status)
    "https://www.googleapis.com/auth/webmasters.readonly",
];
exports.REQUEST_TIMEOUT_MS = 15000;
let auth;
/**
 * Lazily build the Google client; null when no service account is configured
 */
const getGoogleAuth = () => {
    if (auth !== undefined)
        return auth;
    const { keyFile, credentials } = config_1.default.googleIndexing;
    if (!keyFile && !credentials) {
        logger_1.default.warn("Google Indexing API disabled: set GOOGLE_INDEXING_KEY_FILE or GOOGLE_INDEXING_CREDENTIALS to enable it");
        auth = null;
        return auth;
    }
    auth = new google_auth_library_1.GoogleAuth({
        ...(credentials ? { credentials } : { keyFile: keyFile }),
        scopes: GOOGLE_SCOPES,
    });
    return auth;
};
exports.getGoogleAuth = getGoogleAuth;
const isIndexingEnabled = () => (0, exports.getGoogleAuth)() !== null;
exports.isIndexingEnabled = isIndexingEnabled;
/**
 * Google only accepts URLs of a verified public site; skip local/dev URLs (e.g. CLIENT_URL=http://localhost:3000)
 */
const isPublicUrl = (url) => {
    try {
        const { protocol, hostname } = new URL(url);
        return protocol === "https:" && hostname !== "localhost" && hostname !== "127.0.0.1";
    }
    catch {
        return false;
    }
};
exports.isPublicUrl = isPublicUrl;
const getErrorDetails = (error) => {
    const err = error;
    const httpStatus = err?.response?.status;
    const message = err?.response?.data?.error?.message || err?.message || "Unknown error";
    return { ...(httpStatus !== undefined && { httpStatus }), message };
};
exports.getErrorDetails = getErrorDetails;
/**
 * Notify Google that a URL was added/updated or removed, and record the outcome.
 * Never throws.
 */
const publishUrlNotification = async (url, type = "URL_UPDATED") => {
    const client = (0, exports.getGoogleAuth)();
    if (!client) {
        return { success: false, error: "Google Indexing API is not configured" };
    }
    if (!(0, exports.isPublicUrl)(url)) {
        logger_1.default.warn(`Google Indexing API: skipped non-public URL ${url}`);
        return { success: false, error: "Not a public https URL" };
    }
    let result;
    try {
        await client.request({
            url: INDEXING_PUBLISH_ENDPOINT,
            method: "POST",
            data: { url, type },
            timeout: exports.REQUEST_TIMEOUT_MS,
        });
        result = { success: true };
        logger_1.default.info(`Google Indexing API: ${type} sent for ${url}`);
    }
    catch (error) {
        const { httpStatus, message } = (0, exports.getErrorDetails)(error);
        result = { success: false, ...(httpStatus !== undefined && { httpStatus }), error: message };
        logger_1.default.error(`Google Indexing API: ${type} failed for ${url} (${httpStatus ?? "no response"}): ${message}`);
    }
    try {
        await indexing_model_1.default.updateOne({ url }, {
            $set: {
                type,
                status: result.success ? "success" : "failed",
                lastSubmittedAt: new Date(),
                ...(result.error && { lastError: result.error.slice(0, 1000) }),
            },
            ...(result.success && { $unset: { lastError: 1 } }),
        }, { upsert: true });
    }
    catch (error) {
        logger_1.default.error(`Google Indexing API: failed to record submission for ${url}: ${error.message}`);
    }
    return result;
};
exports.publishUrlNotification = publishUrlNotification;
/**
 * Fire-and-forget notification for request handlers: never delays or fails the caller
 */
const notifyGoogleIndexing = (url, type = "URL_UPDATED") => {
    (0, exports.publishUrlNotification)(url, type).catch((error) => {
        logger_1.default.error(`Google Indexing API: unexpected error for ${url}: ${error.message}`);
    });
};
exports.notifyGoogleIndexing = notifyGoogleIndexing;
