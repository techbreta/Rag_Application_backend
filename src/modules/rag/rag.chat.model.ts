import mongoose from "mongoose";
import { IRagChatDoc, IRagChatModel } from "./rag.interfaces";

const chatMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    sources: [
      {
        content: { type: String },
        score: { type: Number },
        pageNumber: { type: Number },
        documentName: { type: String },
        documentId: { type: mongoose.Schema.Types.ObjectId },
      },
    ],
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const ragChatSchema = new mongoose.Schema<IRagChatDoc, IRagChatModel>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RagDocument",
      required: false, // null for multi-document chats
      index: true,
    },
    documentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "RagDocument",
      },
    ], // For multi-document chats
    chatType: {
      type: String,
      enum: ["single-document", "multi-document", "all-documents"],
      default: "single-document",
    },
    title: {
      type: String,
      required: true,
      trim: true,
      default: "New Chat",
    },
    messages: [chatMessageSchema],
  },
  {
    timestamps: true,
  },
);

//  compound index for single-document chats
ragChatSchema.index({ userId: 1, documentId: 1 });
// Index for multi-document chats
ragChatSchema.index({ userId: 1, chatType: 1 });

const RagChat = mongoose.model<IRagChatDoc, IRagChatModel>(
  "RagChat",
  ragChatSchema,
);

export default RagChat;
