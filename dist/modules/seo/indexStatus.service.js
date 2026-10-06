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
exports.getIndexingUrls = exports.getIndexingStats = exports.startIndexStatusScheduler = exports.refreshIndexStatuses = exports.inspectUrl = exports.isIndexStatusEnabled = void 0;
const http_status_1 = __importDefault(require("http-status"));
const config_1 = __importDefault(require("../../config/config"));
const logger_1 = __importDefault(require("../logger/logger"));
const ApiError_1 = __importDefault(require("../errors/ApiError"));
const indexing_model_1 = __importStar(require("./indexing.model"));
const indexing_service_1 = require("./indexing.service");
const seo_service_1 = require("./seo.service");
const URL_INSPECTION_ENDPOINT = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
const RECHECK_AFTER_MS = 24 * 60 * 60 * 1000;
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
const FIRST_REFRESH_DELAY_MS = 60 * 1000;
// Google allows 2000 inspections/day per property; leave headroom
const MAX_INSPECTIONS_PER_RUN = 1500;
// Errors that will fail every remaining URL too (auth, permission, quota)
const STOP_ON_HTTP_STATUS = [401, 403, 429];
// Google's default Indexing API quota (publish requests per day)
const INDEXING_DAILY_QUOTA = 200;
const SUBMISSION_STATUS_FILTERS = ["success", "failed", "not_submitted"];
const VERDICT_FILTERS = [...indexing_model_1.INDEX_VERDICTS, "unchecked"];
const isIndexStatusEnabled = () => Boolean(config_1.default.googleIndexing.searchConsoleSiteUrl) && (0, indexing_service_1.getGoogleAuth)() !== null;
exports.isIndexStatusEnabled = isIndexStatusEnabled;
/**
 * Fetch the real Google index status of a URL and store it. Never throws.
 */
const inspectUrl = async (url) => {
    const client = (0, indexing_service_1.getGoogleAuth)();
    const siteUrl = config_1.default.googleIndexing.searchConsoleSiteUrl;
    if (!client || !siteUrl) {
        return { success: false, error: "Search Console index status is not configured" };
    }
    const checkedAt = new Date();
    try {
        const response = await client.request({
            url: URL_INSPECTION_ENDPOINT,
            method: "POST",
            data: { inspectionUrl: url, siteUrl },
            timeout: indexing_service_1.REQUEST_TIMEOUT_MS,
        });
        const result = response.data.inspectionResult;
        const status = result?.indexStatusResult ?? {};
        await indexing_model_1.default.updateOne({ url }, {
            $set: {
                inspection: {
                    verdict: status.verdict,
                    coverageState: status.coverageState,
                    indexingState: status.indexingState,
                    pageFetchState: status.pageFetchState,
                    robotsTxtState: status.robotsTxtState,
                    lastCrawlTime: status.lastCrawlTime ? new Date(status.lastCrawlTime) : undefined,
                    googleCanonical: status.googleCanonical,
                    userCanonical: status.userCanonical,
                    resultLink: result?.inspectionResultLink,
                    checkedAt,
                },
            },
        }, { upsert: true });
        return { success: true };
    }
    catch (error) {
        const { httpStatus: status, message } = (0, indexing_service_1.getErrorDetails)(error);
        logger_1.default.error(`Search Console: inspection failed for ${url} (${status ?? "no response"}): ${message}`);
        try {
            // Keep the previous status, but record when and why this check failed
            await indexing_model_1.default.updateOne({ url }, { $set: { "inspection.checkedAt": checkedAt, "inspection.error": message.slice(0, 1000) } }, { upsert: true });
        }
        catch (dbError) {
            logger_1.default.error(`Search Console: failed to record inspection for ${url}: ${dbError.message}`);
        }
        return { success: false, ...(status !== undefined && { httpStatus: status }), error: message };
    }
};
exports.inspectUrl = inspectUrl;
let refreshRunning = false;
/**
 * Check the index status of every sitemap URL not checked in the last 24 hours.
 * Never throws; overlapping calls are skipped.
 */
const refreshIndexStatuses = async () => {
    if (refreshRunning)
        return;
    if (!(0, exports.isIndexStatusEnabled)()) {
        logger_1.default.warn("Index status refresh skipped: set GOOGLE_SEARCH_CONSOLE_SITE_URL and Google credentials");
        return;
    }
    if (!(0, indexing_service_1.isPublicUrl)(config_1.default.clientUrl)) {
        logger_1.default.warn(`Index status refresh skipped: CLIENT_URL is not a public https URL (${config_1.default.clientUrl})`);
        return;
    }
    refreshRunning = true;
    try {
        const urls = await (0, seo_service_1.getSitemapUrls)();
        // Track every sitemap URL, including ones never submitted to the Indexing API
        if (urls.length > 0) {
            await indexing_model_1.default.bulkWrite(urls.map((url) => ({
                updateOne: { filter: { url }, update: { $setOnInsert: { url } }, upsert: true },
            })), { ordered: false });
        }
        const staleBefore = new Date(Date.now() - RECHECK_AFTER_MS);
        const stale = await indexing_model_1.default.find({
            url: { $in: urls },
            $or: [{ "inspection.checkedAt": { $exists: false } }, { "inspection.checkedAt": { $lt: staleBefore } }],
        }, { url: 1 })
            .sort({ "inspection.checkedAt": 1 })
            .limit(MAX_INSPECTIONS_PER_RUN)
            .lean();
        let checked = 0;
        let failed = 0;
        for (const { url } of stale) {
            const result = await (0, exports.inspectUrl)(url);
            if (result.success) {
                checked += 1;
                continue;
            }
            failed += 1;
            if (result.httpStatus !== undefined && STOP_ON_HTTP_STATUS.includes(result.httpStatus)) {
                logger_1.default.error(`Index status refresh stopped early (HTTP ${result.httpStatus}): ${result.error}`);
                break;
            }
        }
        if (stale.length > 0) {
            logger_1.default.info(`Index status refresh: ${checked} checked, ${failed} failed, ${stale.length} were due`);
        }
    }
    catch (error) {
        logger_1.default.error(`Index status refresh failed: ${error.message}`);
    }
    finally {
        refreshRunning = false;
    }
};
exports.refreshIndexStatuses = refreshIndexStatuses;
/**
 * Run the refresh shortly after startup and then periodically; each URL is rechecked about once a day
 */
const startIndexStatusScheduler = () => {
    if (!(0, exports.isIndexStatusEnabled)()) {
        logger_1.default.info("Index status scheduler not started: GOOGLE_SEARCH_CONSOLE_SITE_URL is not set");
        return;
    }
    setTimeout(() => void (0, exports.refreshIndexStatuses)(), FIRST_REFRESH_DELAY_MS).unref();
    setInterval(() => void (0, exports.refreshIndexStatuses)(), REFRESH_INTERVAL_MS).unref();
};
exports.startIndexStatusScheduler = startIndexStatusScheduler;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const countBy = async (field) => {
    const groups = await indexing_model_1.default.aggregate([
        { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(groups.map((g) => [g._id ?? "none", g.count]));
};
/**
 * Summary counts for the admin indexing dashboard
 */
const getIndexingStats = async () => {
    const sitemapUrls = await (0, seo_service_1.getSitemapUrls)();
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [totalTracked, submissionCounts, verdictCounts, coverageCounts, submittedLast24h, sitemapSubmitted, latestCheck] = await Promise.all([
        indexing_model_1.default.countDocuments(),
        countBy("status"),
        countBy("inspection.verdict"),
        countBy("inspection.coverageState"),
        indexing_model_1.default.countDocuments({ lastSubmittedAt: { $gte: last24h } }),
        indexing_model_1.default.countDocuments({ url: { $in: sitemapUrls }, type: "URL_UPDATED", status: "success" }),
        indexing_model_1.default.findOne({ "inspection.checkedAt": { $exists: true } }, { "inspection.checkedAt": 1 })
            .sort({ "inspection.checkedAt": -1 })
            .lean(),
    ]);
    const { none: unchecked = 0, ...byVerdict } = verdictCounts;
    const { none: _noCoverage, ...byCoverageState } = coverageCounts;
    return {
        sitemap: {
            totalUrls: sitemapUrls.length,
            submitted: sitemapSubmitted,
            pendingSubmission: sitemapUrls.length - sitemapSubmitted,
        },
        submissions: {
            totalTracked,
            success: submissionCounts["success"] ?? 0,
            failed: submissionCounts["failed"] ?? 0,
            notSubmitted: submissionCounts["none"] ?? 0,
            // Approximate: Google's quota resets at midnight Pacific Time
            sentLast24h: submittedLast24h,
            dailyQuota: INDEXING_DAILY_QUOTA,
        },
        indexStatus: {
            enabled: (0, exports.isIndexStatusEnabled)(),
            indexed: byVerdict["PASS"] ?? 0,
            checked: totalTracked - unchecked,
            unchecked,
            byVerdict,
            byCoverageState,
            lastCheckedAt: latestCheck?.inspection?.checkedAt ?? null,
        },
    };
};
exports.getIndexingStats = getIndexingStats;
/**
 * Paginated per-URL submission and index status for the admin dashboard
 */
const getIndexingUrls = async (filter) => {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filter.limit) || 20));
    const skip = (page - 1) * limit;
    const matchQuery = {};
    if (filter.search && filter.search.trim()) {
        matchQuery["url"] = new RegExp(escapeRegex(filter.search.trim()), "i");
    }
    if (filter.submissionStatus && filter.submissionStatus !== "all") {
        if (!SUBMISSION_STATUS_FILTERS.includes(filter.submissionStatus)) {
            throw new ApiError_1.default(`submissionStatus must be one of: all, ${SUBMISSION_STATUS_FILTERS.join(", ")}`, http_status_1.default.BAD_REQUEST);
        }
        matchQuery["status"] =
            filter.submissionStatus === "not_submitted" ? { $exists: false } : filter.submissionStatus;
    }
    if (filter.verdict && filter.verdict !== "all") {
        if (!VERDICT_FILTERS.includes(filter.verdict)) {
            throw new ApiError_1.default(`verdict must be one of: all, ${VERDICT_FILTERS.join(", ")}`, http_status_1.default.BAD_REQUEST);
        }
        matchQuery["inspection.verdict"] = filter.verdict === "unchecked" ? { $exists: false } : filter.verdict;
    }
    const [urls, totalCount] = await Promise.all([
        indexing_model_1.default.find(matchQuery, { __v: 0 }).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
        indexing_model_1.default.countDocuments(matchQuery),
    ]);
    return {
        urls,
        pagination: {
            currentPage: page,
            pageSize: limit,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            hasNextPage: page * limit < totalCount,
            hasPreviousPage: page > 1,
        },
    };
};
exports.getIndexingUrls = getIndexingUrls;
