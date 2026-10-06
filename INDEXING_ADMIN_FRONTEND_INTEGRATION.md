# Google Indexing: Admin Dashboard Integration

This guide covers the two read-only admin APIs for the "Google Indexing" page of the admin dashboard. They let you show:

- which public pages (static pages, blogs, image pages) the backend has **submitted** to Google through the Indexing API, and
- whether Google has actually **indexed** each page, using Search Console URL Inspection.

The backend does all the work. Submissions happen automatically when a blog is published, edited or deleted, or when an image is created or deleted. Index status is refreshed in the background, and each URL is checked about once a day. The frontend only reads data. There are no buttons to wire up.

---

## Authentication

These routes sit under `/v1/admin` and need the same token as the other admin pages. The user must have the `adminAccess` right (roles `admin` and `superadmin`).

```
Authorization: Bearer <access_token>
```

| Status | Meaning | Frontend action |
|---|---|---|
| 401 | Missing or expired token | Refresh the token or redirect to login |
| 403 | User is not an admin | Show "no permission" |

---

## 1. Summary stats

```
GET /v1/admin/indexing/stats
```

No query parameters. Use it for the summary cards at the top of the page.

### Response `200`

```json
{
  "status": "success",
  "data": {
    "sitemap": {
      "totalUrls": 57,
      "submitted": 57,
      "pendingSubmission": 0
    },
    "submissions": {
      "totalTracked": 57,
      "success": 57,
      "failed": 0,
      "notSubmitted": 0,
      "sentLast24h": 57,
      "dailyQuota": 200
    },
    "indexStatus": {
      "enabled": true,
      "indexed": 41,
      "checked": 57,
      "unchecked": 0,
      "byVerdict": { "PASS": 41, "NEUTRAL": 14, "FAIL": 2 },
      "byCoverageState": {
        "Submitted and indexed": 41,
        "Crawled - currently not indexed": 9,
        "URL is unknown to Google": 5,
        "Page with redirect": 2
      },
      "lastCheckedAt": "2026-10-06T14:02:11.120Z"
    }
  }
}
```

### Field reference

| Field | Meaning |
|---|---|
| `sitemap.totalUrls` | Public URLs currently in `sitemap.xml` |
| `sitemap.submitted` | Sitemap URLs that were successfully submitted to Google |
| `sitemap.pendingSubmission` | Sitemap URLs not submitted yet. The backend sends them at up to 200 per day. |
| `submissions.totalTracked` | All URLs the backend tracks, including deleted pages |
| `submissions.success` / `failed` | Result of the latest submission for each URL |
| `submissions.notSubmitted` | Tracked URLs that were never submitted (index status only) |
| `submissions.sentLast24h` / `dailyQuota` | Requests sent in the last 24h, against Google's limit of 200 per day. Show as a progress bar. This is approximate: Google resets the quota at midnight Pacific Time. |
| `indexStatus.enabled` | `false` means index checking is not configured on the server. All `indexStatus` numbers will be 0 or empty, so show a notice instead of the charts. |
| `indexStatus.indexed` | URLs Google reports as indexed (`verdict = PASS`) |
| `indexStatus.checked` / `unchecked` | URLs with and without a status result yet |
| `indexStatus.byVerdict` | Count per verdict (see [Verdict values](#verdict-values)). Keys that would be 0 are left out. |
| `indexStatus.byCoverageState` | Count per human-readable Google reason (good for a breakdown chart). Keys that would be 0 are left out. |
| `indexStatus.lastCheckedAt` | ISO date of the latest status check, or `null` |

---

## 2. URL list

```
GET /v1/admin/indexing/urls
```

A paginated table with one row per URL, sorted by most recently updated first.

### Query parameters (all optional)

| Param | Type | Default | Values |
|---|---|---|---|
| `page` | number | `1` | ≥ 1 |
| `limit` | number | `20` | 1 to 100 |
| `search` | string | none | Case-insensitive match anywhere in the URL, e.g. `blog/` or `free-images` |
| `submissionStatus` | string | `all` | `all`, `success`, `failed`, `not_submitted` |
| `verdict` | string | `all` | `all`, `PASS`, `PARTIAL`, `FAIL`, `NEUTRAL`, `VERDICT_UNSPECIFIED`, `unchecked` |

Examples:

```
GET /v1/admin/indexing/urls?page=1&limit=20
GET /v1/admin/indexing/urls?verdict=PASS
GET /v1/admin/indexing/urls?submissionStatus=failed
GET /v1/admin/indexing/urls?search=blog/&verdict=NEUTRAL
```

### Response `200`

```json
{
  "status": "success",
  "data": {
    "urls": [
      {
        "_id": "6ac4a8a788bda4d88bc20005",
        "url": "https://www.ragai.website/blog/five-ways-to-use-ai-coding-agents-to-improve-your-software-architecture",
        "type": "URL_UPDATED",
        "status": "success",
        "lastSubmittedAt": "2026-10-06T07:52:07.364Z",
        "inspection": {
          "verdict": "PASS",
          "coverageState": "Submitted and indexed",
          "indexingState": "INDEXING_ALLOWED",
          "pageFetchState": "SUCCESSFUL",
          "robotsTxtState": "ALLOWED",
          "lastCrawlTime": "2026-10-05T22:14:03.000Z",
          "googleCanonical": "https://www.ragai.website/blog/five-ways-to-use-ai-coding-agents-to-improve-your-software-architecture",
          "userCanonical": "https://www.ragai.website/blog/five-ways-to-use-ai-coding-agents-to-improve-your-software-architecture",
          "resultLink": "https://search.google.com/search-console/inspect?resource_id=...",
          "checkedAt": "2026-10-06T14:02:11.120Z"
        },
        "createdAt": "2026-10-06T07:52:07.364Z",
        "updatedAt": "2026-10-06T14:02:11.121Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 20,
      "totalCount": 57,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

### Response `400` (invalid filter value)

```json
{
  "status": "fail",
  "message": "verdict must be one of: all, PASS, PARTIAL, FAIL, NEUTRAL, VERDICT_UNSPECIFIED, unchecked",
  "errors": {}
}
```

### Row fields

Almost every field is **optional**. Handle missing values in the UI.

| Field | When present | Meaning |
|---|---|---|
| `url` | always | The public page URL |
| `type` | after a submission | `URL_UPDATED` (page added or changed) or `URL_DELETED` (page removed) |
| `status` | after a submission | `success` or `failed`. Missing means the URL was never submitted. |
| `lastSubmittedAt` | after a submission | When the backend last sent this URL to Google |
| `lastError` | only on a failed submission | Google's error message, e.g. a quota or permission error |
| `inspection` | after the first index check | Google's index status (below). Missing means "Not checked yet". |
| `inspection.verdict` | on a successful check | See [Verdict values](#verdict-values) |
| `inspection.coverageState` | on a successful check | Google's human-readable reason. **Display this text as-is.** |
| `inspection.lastCrawlTime` | if Google has crawled it | Last time Googlebot fetched the page |
| `inspection.googleCanonical` / `userCanonical` | if known | If they differ, Google treats another URL as the main one |
| `inspection.resultLink` | on a successful check | Opens the full report in Google Search Console. Show it as an external link. |
| `inspection.checkedAt` | after any check | When the status was last checked |
| `inspection.error` | if the latest check failed | The previous verdict is kept; show this as a warning |

All dates are ISO 8601 UTC strings.

---

## Verdict values

| `verdict` | Suggested badge | Meaning |
|---|---|---|
| `PASS` | Green: "Indexed" | Page is in Google's index |
| `PARTIAL` | Yellow: "Indexed (warnings)" | Indexed, with issues |
| `NEUTRAL` | Grey: "Not indexed" | Not indexed (e.g. not crawled yet, excluded or a duplicate). Show `coverageState` as the reason. |
| `FAIL` | Red: "Error" | Google could not index it (e.g. blocked, 404 or server error) |
| `VERDICT_UNSPECIFIED` | Grey: "Unknown" | Google gave no verdict |
| *(no `inspection`)* | Outline: "Not checked yet" | The background check hasn't reached this URL |

Common `coverageState` texts you will see: `Submitted and indexed`, `Crawled - currently not indexed`, `Discovered - currently not indexed`, `URL is unknown to Google`, `Page with redirect`, `Excluded by 'noindex' tag`, `Duplicate, Google chose different canonical than user`. Google can return other texts too, so don't hard-code a fixed list. Show whatever string comes back.

A successful **submission** does not mean the page is **indexed**. Submission only means Google received the request. Use `inspection.verdict` for "is it on Google?".

---

## TypeScript types

```ts
export type IndexVerdict = "PASS" | "PARTIAL" | "FAIL" | "NEUTRAL" | "VERDICT_UNSPECIFIED";

export interface IndexingStats {
  sitemap: { totalUrls: number; submitted: number; pendingSubmission: number };
  submissions: {
    totalTracked: number;
    success: number;
    failed: number;
    notSubmitted: number;
    sentLast24h: number;
    dailyQuota: number;
  };
  indexStatus: {
    enabled: boolean;
    indexed: number;
    checked: number;
    unchecked: number;
    byVerdict: Partial<Record<IndexVerdict, number>>;
    byCoverageState: Record<string, number>;
    lastCheckedAt: string | null;
  };
}

export interface IndexInspection {
  verdict?: IndexVerdict | string;
  coverageState?: string;
  indexingState?: string;
  pageFetchState?: string;
  robotsTxtState?: string;
  lastCrawlTime?: string;
  googleCanonical?: string;
  userCanonical?: string;
  resultLink?: string;
  checkedAt?: string;
  error?: string;
}

export interface IndexingUrl {
  _id: string;
  url: string;
  type?: "URL_UPDATED" | "URL_DELETED";
  status?: "success" | "failed";
  lastSubmittedAt?: string;
  lastError?: string;
  inspection?: IndexInspection;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface IndexingUrlFilters {
  page?: number;
  limit?: number;
  search?: string;
  submissionStatus?: "all" | "success" | "failed" | "not_submitted";
  verdict?: "all" | IndexVerdict | "unchecked";
}
```

## Example client

Adapt this to your existing API helper (axios instance, interceptors, etc.):

```ts
const API_URL = process.env.NEXT_PUBLIC_API_URL; // e.g. https://api.example.com

async function adminGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || `Request failed (${res.status})`);
  return body.data as T;
}

export const getIndexingStats = (token: string) =>
  adminGet<IndexingStats>("/v1/admin/indexing/stats", token);

export const getIndexingUrls = (token: string, filters: IndexingUrlFilters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== "all") params.set(key, String(value));
  });
  return adminGet<{ urls: IndexingUrl[]; pagination: Pagination }>(
    `/v1/admin/indexing/urls?${params.toString()}`,
    token,
  );
};
```

---

## Suggested UI

**Summary cards** (from `/stats`):
- **Indexed on Google:** `indexStatus.indexed` / `sitemap.totalUrls`
- **Submitted:** `sitemap.submitted` / `sitemap.totalUrls`, with "N pending" from `pendingSubmission`
- **Failed submissions:** `submissions.failed`. Clicking it opens the table filtered with `submissionStatus=failed`.
- **Daily quota:** progress bar of `sentLast24h` / `dailyQuota`
- **Last checked:** relative time from `lastCheckedAt`

**Breakdown chart:** a bar or donut chart of `byCoverageState`. Clicking a slice can apply the matching `verdict` filter.

**Table** (from `/urls`):

| Column | Source |
|---|---|
| URL | `url` (shorten to the path, link to the live page) |
| Google status | Badge from `inspection.verdict`, tooltip with `coverageState` |
| Last crawled | `inspection.lastCrawlTime` or "Never" |
| Submission | `status` badge plus `type`; tooltip with `lastError` on failure |
| Submitted at | `lastSubmittedAt` |
| Checked at | `inspection.checkedAt` |
| Actions | "Open in Search Console" (`inspection.resultLink`) |

Filters: a search box (debounce about 300 ms), a "Google status" select (`verdict`), a "Submission" select (`submissionStatus`), and pagination from `pagination`.

**Empty and edge states:**
- `indexStatus.enabled === false`: banner reading "Google index checking is not configured on the server." Keep the submission data visible.
- No `inspection` on a row: "Not checked yet". New pages get checked within about 6 hours.
- `inspection.error` present: small warning icon with the message. The badge still shows the last known verdict.
- `type === "URL_DELETED"`: the page was removed from the site; show the row muted.

**Refreshing:** data changes at most every few hours, so load it on page open and offer a manual "Reload" button. Don't poll on a timer.
