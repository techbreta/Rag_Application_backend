import mongoose, { Model, Document } from "mongoose";

// ── Document Chunk (vector store) ──────────────────────────────────
export interface IRagChunk {
  documentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  content: string;
  embedding: number[];
  metadata: {
    source: string;
    pageNumber?: number;
    chunkIndex: number;
    totalChunks: number;
  };
}

export interface IRagChunkDoc extends IRagChunk, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IRagChunkModel extends Model<IRagChunkDoc> {}

// ── Uploaded Document ──────────────────────────────────────────────
export interface IRagDocument {
  userId: mongoose.Types.ObjectId;
  fileName: string;
  fileUrl: string;
  fileType: string;
  totalChunks: number;
  status: "processing" | "ready" | "failed";
  errorMessage?: string;
}

export interface IRagDocumentDoc extends IRagDocument, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IRagDocumentModel extends Model<IRagDocumentDoc> {}

// ── Chat Conversation ──────────────────────────────────────────────
export interface IChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: {
    content: string;
    score: number;
    pageNumber?: number;
    documentName?: string;
    documentId?: mongoose.Types.ObjectId;
  }[];
  timestamp: Date;
}

export interface IRagChat {
  userId: mongoose.Types.ObjectId;
  documentId?: mongoose.Types.ObjectId; // Optional for multi-document chats
  documentIds?: mongoose.Types.ObjectId[]; // For multi-document chats
  chatType?: "single-document" | "multi-document" | "all-documents";
  title: string;
  messages: IChatMessage[];
}

export interface IRagChatDoc extends IRagChat, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IRagChatModel extends Model<IRagChatDoc> {}

// ── Request Bodies ─────────────────────────────────────────────────
export interface IUploadDocumentBody {
  fileUrl: string;
  fileName: string;
}

export interface IChatBody {
  documentId?: string; // Optional for multi-document chats
  documentIds?: string[]; // For specific multi-document chats
  chatType?: "single-document" | "multi-document" | "all-documents";
  chatId?: string;
  message: string;
}

export interface ISearchBody {
  documentId: string;
  query: string;
  limit?: number;
}

// ── Generated Image ────────────────────────────────────────────────
export interface IRagImage {
  userId: mongoose.Types.ObjectId;
  prompt: string;
  promptEmbedding: number[]; // Embedding of the generation prompt
  cloudinaryUrl: string; // Image URL from Cloudinary
  cloudinaryPublicId: string; // For deletion/management
  mistralFileId: string; // Original fileId from Mistral
  mistralConversationId: string; // For tracking the conversation
  metadata: {
    model: string; // e.g., "mistral-medium-2505"
    temperature?: number;
    generationTime?: number; // in milliseconds
  };
}

export interface IRagImageDoc extends IRagImage, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IRagImageModel extends Model<IRagImageDoc> {}
