import mongoose, { Document, Model } from "mongoose";

export type IndexingNotificationType = "URL_UPDATED" | "URL_DELETED";

export interface IIndexingSubmission {
  url: string;
  type: IndexingNotificationType;
  status: "success" | "failed";
  lastSubmittedAt: Date;
  lastError?: string;
}

export interface IIndexingSubmissionDoc extends IIndexingSubmission, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IIndexingSubmissionModel extends Model<IIndexingSubmissionDoc> {}

// Latest Google Indexing API notification per URL
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
