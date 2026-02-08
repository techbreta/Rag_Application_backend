import mongoose from "mongoose";
import { IRagChunkDoc, IRagChunkModel } from "./rag.interfaces";

const ragChunkSchema = new mongoose.Schema<IRagChunkDoc, IRagChunkModel>(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RagDocument",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
    },
    metadata: {
      source: {
        type: String,
        required: true,
      },
      pageNumber: {
        type: Number,
      },
      chunkIndex: {
        type: Number,
        required: true,
      },
      totalChunks: {
        type: Number,
        required: true,
      },
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for efficient user + document queries
ragChunkSchema.index({ userId: 1, documentId: 1 });

const RagChunk = mongoose.model<IRagChunkDoc, IRagChunkModel>(
  "RagChunk",
  ragChunkSchema,
);

export default RagChunk;
