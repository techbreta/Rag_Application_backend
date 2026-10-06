import { GoogleAuth } from "google-auth-library";
import config from "../../config/config";
import logger from "../logger/logger";
import IndexingSubmission, { IndexingNotificationType } from "./indexing.model";

const INDEXING_PUBLISH_ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish";
const INDEXING_SCOPE = "https://www.googleapis.com/auth/indexing";
const REQUEST_TIMEOUT_MS = 15000;

export interface IIndexingResult {
  success: boolean;
  /** HTTP status from Google, when the request reached it (429 = daily quota exhausted) */
  httpStatus?: number;
  error?: string;
}

let auth: GoogleAuth | null | undefined;

/**
 * Lazily build the Google client; null when no service account is configured
 */
const getAuth = (): GoogleAuth | null => {
  if (auth !== undefined) return auth;

  const { keyFile, credentials } = config.googleIndexing;
  if (!keyFile && !credentials) {
    logger.warn(
      "Google Indexing API disabled: set GOOGLE_INDEXING_KEY_FILE or GOOGLE_INDEXING_CREDENTIALS to enable it",
    );
    auth = null;
    return auth;
  }

  auth = new GoogleAuth({
    ...(credentials ? { credentials } : { keyFile: keyFile as string }),
    scopes: [INDEXING_SCOPE],
  });
  return auth;
};

export const isIndexingEnabled = (): boolean => getAuth() !== null;

/**
 * Google only accepts URLs of a verified public site; skip local/dev URLs (e.g. CLIENT_URL=http://localhost:3000)
 */
export const isPublicUrl = (url: string): boolean => {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && hostname !== "localhost" && hostname !== "127.0.0.1";
  } catch {
    return false;
  }
};

const getErrorDetails =(error: unknown): { httpStatus?: number; message: string } => {
  const err = error as {
    message?: string;
    response?: { status?: number; data?: { error?: { message?: string } } };
  };
  const httpStatus = err?.response?.status;
  const message = err?.response?.data?.error?.message || err?.message || "Unknown error";
  return { ...(httpStatus !== undefined && { httpStatus }), message };
};

/**
 * Notify Google that a URL was added/updated or removed, and record the outcome.
 * Never throws.
 */
export const publishUrlNotification = async (
  url: string,
  type: IndexingNotificationType = "URL_UPDATED",
): Promise<IIndexingResult> => {
  const client = getAuth();
  if (!client) {
    return { success: false, error: "Google Indexing API is not configured" };
  }
  if (!isPublicUrl(url)) {
    logger.warn(`Google Indexing API: skipped non-public URL ${url}`);
    return { success: false, error: "Not a public https URL" };
  }

  let result: IIndexingResult;
  try {
    await client.request({
      url: INDEXING_PUBLISH_ENDPOINT,
      method: "POST",
      data: { url, type },
      timeout: REQUEST_TIMEOUT_MS,
    });
    result = { success: true };
    logger.info(`Google Indexing API: ${type} sent for ${url}`);
  } catch (error) {
    const { httpStatus, message } = getErrorDetails(error);
    result = { success: false, ...(httpStatus !== undefined && { httpStatus }), error: message };
    logger.error(`Google Indexing API: ${type} failed for ${url} (${httpStatus ?? "no response"}): ${message}`);
  }

  try {
    await IndexingSubmission.updateOne(
      { url },
      {
        $set: {
          type,
          status: result.success ? "success" : "failed",
          lastSubmittedAt: new Date(),
          ...(result.error && { lastError: result.error.slice(0, 1000) }),
        },
        ...(result.success && { $unset: { lastError: 1 } }),
      },
      { upsert: true },
    );
  } catch (error) {
    logger.error(`Google Indexing API: failed to record submission for ${url}: ${(error as Error).message}`);
  }

  return result;
};

/**
 * Fire-and-forget notification for request handlers: never delays or fails the caller
 */
export const notifyGoogleIndexing = (url: string, type: IndexingNotificationType = "URL_UPDATED"): void => {
  publishUrlNotification(url, type).catch((error) => {
    logger.error(`Google Indexing API: unexpected error for ${url}: ${(error as Error).message}`);
  });
};
