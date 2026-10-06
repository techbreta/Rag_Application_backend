import mongoose, { Document, Model } from "mongoose";

export type IndexingNotificationType = "URL_UPDATED" | "URL_DELETED";

export const INDEX_VERDICTS = ["PASS", "PARTIAL", "FAIL", "NEUTRAL", "VERDICT_UNSPECIFIED"] as const;

// Real Google index status from the Search Console URL Inspection API
export interface IIndexInspection {
  verdict?: string;
  coverageState?: string;
  indexingState?: string;
  pageFetchState?: string;
  robotsTxtState?: string;
  lastCrawlTime?: Date;
  googleCanonical?: string;
  userCanonical?: string;
  resultLink?: string;
  checkedAt: Date;
  error?: string;
}

export interface IIndexingSubmission {
  url: string;
  // Latest Indexing API notification; absent for URLs that were only inspected
  type?: IndexingNotificationType;
  status?: "success" | "failed";
  lastSubmittedAt?: Date;
  lastError?: string;
  inspection?: IIndexInspection;
}

export interface IIndexingSubmissionDoc extends IIndexingSubmission, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IIndexingSubmissionModel extends Model<IIndexingSubmissionDoc> {}

// One document per public URL: Indexing API submission + Google index status
const indexingSubmissionSchema = new mongoose.Schema<IIndexingSubmissionDoc, IIndexingSubmissionModel>(
  {
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
  },
  {
    timestamps: true,
  }
);

const IndexingSubmission = mongoose.model<IIndexingSubmissionDoc, IIndexingSubmissionModel>(
  "IndexingSubmission",
  indexingSubmissionSchema
);

export default IndexingSubmission;
