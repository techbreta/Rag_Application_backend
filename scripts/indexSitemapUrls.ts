/**
 * Submit every sitemap URL that has not yet been successfully submitted to the
 * Google Indexing API. Safe to re-run: already-submitted URLs are skipped, so run
 * it once per day until "Remaining" reaches 0 (Google's default quota is 200/day).
 *
 * Usage: npx ts-node scripts/indexSitemapUrls.ts [--limit=200] [--dry-run]
 */
import dns from "dns";
import mongoose from "mongoose";

// Configure DNS for MongoDB Atlas SRV resolution
dns.setServers(["8.8.8.8", "1.1.1.1"]);
// Config validation requires NODE_ENV; must be set before the app config is loaded
process.env["NODE_ENV"] = process.env["NODE_ENV"] || "development";

const DEFAULT_DAILY_LIMIT = 200;
// Errors that will fail every remaining URL too (auth, ownership, quota)
const STOP_ON_HTTP_STATUS = [401, 403, 429];

const parseArgs = () => {
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : DEFAULT_DAILY_LIMIT;
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("--limit must be a positive integer");
  }
  return { limit, dryRun: args.includes("--dry-run") };
};

async function main() {
  const { limit, dryRun } = parseArgs();

  const { default: config } = await import("../src/config/config");
  const { getSitemapUrls } = await import("../src/modules/seo/seo.service");
  const { publishUrlNotification, isIndexingEnabled, isPublicUrl } = await import(
    "../src/modules/seo/indexing.service"
  );
  const { default: IndexingSubmission } = await import("../src/modules/seo/indexing.model");

  if (!dryRun && !isIndexingEnabled()) {
    throw new Error("Set GOOGLE_INDEXING_KEY_FILE or GOOGLE_INDEXING_CREDENTIALS in .env first");
  }
  if (!dryRun && !isPublicUrl(config.clientUrl)) {
    throw new Error(`CLIENT_URL must be the live https site (got ${config.clientUrl}), e.g. CLIENT_URL=https://www.ragai.website`);
  }

  await mongoose.connect(config.mongoose.url);

  const urls = await getSitemapUrls();
  const submitted = await IndexingSubmission.find(
    { url: { $in: urls }, type: "URL_UPDATED", status: "success" },
    { url: 1 },
  ).lean();
  const submittedUrls = new Set(submitted.map((s) => s.url));
  const pending = urls.filter((url) => !submittedUrls.has(url));
  const batch = pending.slice(0, limit);

  console.log(`Sitemap URLs: ${urls.length}, already submitted: ${submittedUrls.size}, pending: ${pending.length}`);

  if (dryRun) {
    batch.forEach((url) => console.log(`[dry-run] ${url}`));
    return;
  }

  let succeeded = 0;
  let failed = 0;
  for (const url of batch) {
    const result = await publishUrlNotification(url, "URL_UPDATED");
    if (result.success) {
      succeeded += 1;
      continue;
    }
    failed += 1;
    if (result.httpStatus !== undefined && STOP_ON_HTTP_STATUS.includes(result.httpStatus)) {
      console.error(`Stopping early (HTTP ${result.httpStatus}): ${result.error}`);
      break;
    }
  }

  console.log(`Submitted: ${succeeded}, failed: ${failed}, remaining: ${pending.length - succeeded}`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error((error as Error).message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
