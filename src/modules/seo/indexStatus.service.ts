import httpStatus from "http-status";
import config from "../../config/config";
import logger from "../logger/logger";
import ApiError from "../errors/ApiError";
import IndexingSubmission, { INDEX_VERDICTS } from "./indexing.model";
import {
  IIndexingResult,
  REQUEST_TIMEOUT_MS,
  getErrorDetails,
  getGoogleAuth,
  isPublicUrl,
} from "./indexing.service";
import { getSitemapUrls } from "./seo.service";

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

const SUBMISSION_STATUS_FILTERS = ["success", "failed", "not_submitted"] as const;
const VERDICT_FILTERS = [...INDEX_VERDICTS, "unchecked"] as const;

interface IIndexStatusResult {
  verdict?: string;
  coverageState?: string;
  indexingState?: string;
  pageFetchState?: string;
  robotsTxtState?: string;
  lastCrawlTime?: string;
  googleCanonical?: string;
  userCanonical?: string;
}

interface IUrlInspectionResponse {
  inspectionResult?: {
    inspectionResultLink?: string;
    indexStatusResult?: IIndexStatusResult;
  };
}

export const isIndexStatusEnabled = (): boolean =>
  Boolean(config.googleIndexing.searchConsoleSiteUrl) && getGoogleAuth() !== null;

/**
 * Fetch the real Google index status of a URL and store it. Never throws.
 */
export const inspectUrl = async (url: string): Promise<IIndexingResult> => {
  const client = getGoogleAuth();
  const siteUrl = config.googleIndexing.searchConsoleSiteUrl;
  if (!client || !siteUrl) {
    return { success: false, error: "Search Console index status is not configured" };
  }

  const checkedAt = new Date();
  try {
    const response = await client.request<IUrlInspectionResponse>({
      url: URL_INSPECTION_ENDPOINT,
      method: "POST",
      data: { inspectionUrl: url, siteUrl },
      timeout: REQUEST_TIMEOUT_MS,
    });
    const result = response.data.inspectionResult;
    const status = result?.indexStatusResult ?? {};

    await IndexingSubmission.updateOne(
      { url },
      {
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
      },
      { upsert: true },
    );
    return { success: true };
  } catch (error) {
    const { httpStatus: status, message } = getErrorDetails(error);
    logger.error(`Search Console: inspection failed for ${url} (${status ?? "no response"}): ${message}`);
    try {
      // Keep the previous status, but record when and why this check failed
      await IndexingSubmission.updateOne(
        { url },
        { $set: { "inspection.checkedAt": checkedAt, "inspection.error": message.slice(0, 1000) } },
        { upsert: true },
      );
    } catch (dbError) {
      logger.error(`Search Console: failed to record inspection for ${url}: ${(dbError as Error).message}`);
    }
    return { success: false, ...(status !== undefined && { httpStatus: status }), error: message };
  }
};

let refreshRunning = false;

/**
 * Check the index status of every sitemap URL not checked in the last 24 hours.
 * Never throws; overlapping calls are skipped.
 */
export const refreshIndexStatuses = async (): Promise<void> => {
  if (refreshRunning) return;
  if (!isIndexStatusEnabled()) {
    logger.warn("Index status refresh skipped: set GOOGLE_SEARCH_CONSOLE_SITE_URL and Google credentials");
    return;
  }
  if (!isPublicUrl(config.clientUrl)) {
    logger.warn(`Index status refresh skipped: CLIENT_URL is not a public https URL (${config.clientUrl})`);
    return;
  }

  refreshRunning = true;
  try {
    const urls = await getSitemapUrls();

    // Track every sitemap URL, including ones never submitted to the Indexing API
    if (urls.length > 0) {
      await IndexingSubmission.bulkWrite(
        urls.map((url) => ({
          updateOne: { filter: { url }, update: { $setOnInsert: { url } }, upsert: true },
        })),
        { ordered: false },
      );
    }

    const staleBefore = new Date(Date.now() - RECHECK_AFTER_MS);
    const stale = await IndexingSubmission.find(
      {
        url: { $in: urls },
        $or: [{ "inspection.checkedAt": { $exists: false } }, { "inspection.checkedAt": { $lt: staleBefore } }],
      },
      { url: 1 },
    )
      .sort({ "inspection.checkedAt": 1 })
      .limit(MAX_INSPECTIONS_PER_RUN)
      .lean();

    let checked = 0;
    let failed = 0;
    for (const { url } of stale) {
      const result = await inspectUrl(url);
      if (result.success) {
        checked += 1;
        continue;
      }
      failed += 1;
      if (result.httpStatus !== undefined && STOP_ON_HTTP_STATUS.includes(result.httpStatus)) {
        logger.error(`Index status refresh stopped early (HTTP ${result.httpStatus}): ${result.error}`);
        break;
      }
    }

    if (stale.length > 0) {
      logger.info(`Index status refresh: ${checked} checked, ${failed} failed, ${stale.length} were due`);
    }
  } catch (error) {
    logger.error(`Index status refresh failed: ${(error as Error).message}`);
  } finally {
    refreshRunning = false;
  }
};

/**
 * Run the refresh shortly after startup and then periodically; each URL is rechecked about once a day
 */
export const startIndexStatusScheduler = (): void => {
  if (!isIndexStatusEnabled()) {
    logger.info("Index status scheduler not started: GOOGLE_SEARCH_CONSOLE_SITE_URL is not set");
    return;
  }
  setTimeout(() => void refreshIndexStatuses(), FIRST_REFRESH_DELAY_MS).unref();
  setInterval(() => void refreshIndexStatuses(), REFRESH_INTERVAL_MS).unref();
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const countBy = async (field: string): Promise<Record<string, number>> => {
  const groups = await IndexingSubmission.aggregate<{ _id: string | null; count: number }>([
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(groups.map((g) => [g._id ?? "none", g.count]));
};

/**
 * Summary counts for the admin indexing dashboard
 */
export const getIndexingStats = async () => {
  const sitemapUrls = await getSitemapUrls();
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [totalTracked, submissionCounts, verdictCounts, coverageCounts, submittedLast24h, sitemapSubmitted, latestCheck] =
    await Promise.all([
      IndexingSubmission.countDocuments(),
      countBy("status"),
      countBy("inspection.verdict"),
      countBy("inspection.coverageState"),
      IndexingSubmission.countDocuments({ lastSubmittedAt: { $gte: last24h } }),
      IndexingSubmission.countDocuments({ url: { $in: sitemapUrls }, type: "URL_UPDATED", status: "success" }),
      IndexingSubmission.findOne({ "inspection.checkedAt": { $exists: true } }, { "inspection.checkedAt": 1 })
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
      enabled: isIndexStatusEnabled(),
      indexed: byVerdict["PASS"] ?? 0,
      checked: totalTracked - unchecked,
      unchecked,
      byVerdict,
      byCoverageState,
      lastCheckedAt: latestCheck?.inspection?.checkedAt ?? null,
    },
  };
};

export interface IIndexingUrlFilter {
  page?: number;
  limit?: number;
  search?: string;
  submissionStatus?: string;
  verdict?: string;
}

/**
 * Paginated per-URL submission and index status for the admin dashboard
 */
export const getIndexingUrls = async (filter: IIndexingUrlFilter) => {
  const page = Math.max(1, Number(filter.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(filter.limit) || 20));
  const skip = (page - 1) * limit;

  const matchQuery: Record<string, unknown> = {};

  if (filter.search && filter.search.trim()) {
    matchQuery["url"] = new RegExp(escapeRegex(filter.search.trim()), "i");
  }

  if (filter.submissionStatus && filter.submissionStatus !== "all") {
    if (!(SUBMISSION_STATUS_FILTERS as readonly string[]).includes(filter.submissionStatus)) {
      throw new ApiError(
        `submissionStatus must be one of: all, ${SUBMISSION_STATUS_FILTERS.join(", ")}`,
        httpStatus.BAD_REQUEST,
      );
    }
    matchQuery["status"] =
      filter.submissionStatus === "not_submitted" ? { $exists: false } : filter.submissionStatus;
  }

  if (filter.verdict && filter.verdict !== "all") {
    if (!(VERDICT_FILTERS as readonly string[]).includes(filter.verdict)) {
      throw new ApiError(`verdict must be one of: all, ${VERDICT_FILTERS.join(", ")}`, httpStatus.BAD_REQUEST);
    }
    matchQuery["inspection.verdict"] = filter.verdict === "unchecked" ? { $exists: false } : filter.verdict;
  }

  const [urls, totalCount] = await Promise.all([
    IndexingSubmission.find(matchQuery, { __v: 0 }).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    IndexingSubmission.countDocuments(matchQuery),
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
