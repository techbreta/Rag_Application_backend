// Canvas polyfill must be imported first for PDF parsing
import "../../utils/canvas-polyfill";

import mongoose from "mongoose";
// @ts-ignore -- no declaration file for @langchain/textsplitters
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Mistral } from "@mistralai/mistralai";
import RagDocument from "./rag.document.model";
import RagChunk from "./rag.chunk.model";
import RagChat from "./rag.chat.model";
import ApiError from "../errors/ApiError";
import httpStatus from "http-status";
import { IRagDocumentDoc, IRagChatDoc } from "./rag.interfaces";

// ── Mistral client ─────────────────────────────────────────────────
const apiKey = process.env["MISTRAL_API_KEY"];
if (!apiKey) {
  console.warn(
    "WARNING: MISTRAL_API_KEY is not set. RAG features will not work.",
  );
}

const getMistralClient = () => {
  if (!apiKey) {
    throw new ApiError(
      "MISTRAL_API_KEY is not configured",
      httpStatus.INTERNAL_SERVER_ERROR,
    );
  }
  return new Mistral({ apiKey });
};

// ── Embedding helper ───────────────────────────────────────────────
const getEmbedding = async (text: string): Promise<number[]> => {
  const client = getMistralClient();
  const response = await client.embeddings.create({
    model: "mistral-embed",
    inputs: [text],
  });
  const embedding = response.data?.[0]?.embedding;
  if (!embedding) {
    throw new ApiError(
      "Failed to generate embedding",
      httpStatus.INTERNAL_SERVER_ERROR,
    );
  }
  return embedding;
};

// ── PDF loading via URL ────────────────────────────────────────────
const loadPdfFromUrl = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new ApiError(
      `Failed to fetch PDF from URL: ${response.statusText}`,
      httpStatus.BAD_REQUEST,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    // pdf-parse v2 exports a PDFParse class (not a function)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PDFParse } = require("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();

    if (!result || !result.text) {
      throw new ApiError(
        "Failed to extract text from PDF",
        httpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return result.text;
  } catch (error: any) {
    // If pdf-parse v2 fails, try pdf-parse-fork (v1-style API)
    if (
      error instanceof ApiError ||
      error.message?.includes("Failed to extract")
    ) {
      throw error;
    }

    console.warn(
      "pdf-parse v2 failed, trying pdf-parse-fork fallback:",
      error.message,
    );

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pdfParseFork = require("pdf-parse-fork");
      const data = await pdfParseFork(buffer);
      return data.text || "";
    } catch (fallbackError: any) {
      throw new ApiError(
        `PDF processing failed: ${error.message}`,
        httpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
};

// ── Web page loading via Cheerio ───────────────────────────────────
const loadWebPage = async (url: string): Promise<string> => {
  const { CheerioWebBaseLoader } = await import(
    "@langchain/community/document_loaders/web/cheerio"
  );
  const loader = new CheerioWebBaseLoader(url, {
    selector: "p, h1, h2, h3, h4, h5, h6, li, td, th, span, div",
  });
  const docs = await loader.load();
  return docs.map((d) => d.pageContent).join("\n");
};

// ── Text splitting ─────────────────────────────────────────────────
const splitText = async (text: string) => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  return splitter.createDocuments([text]);
};

// ══════════════════════════════════════════════════════════════════
//  PUBLIC SERVICE METHODS
// ══════════════════════════════════════════════════════════════════

/**
 * Upload & process a document (PDF url or web page url).
 * 1. Create a RagDocument record (status = processing)
 * 2. Fetch the file, split into chunks, compute embeddings
 * 3. Store each chunk as a RagChunk with its embedding
 * 4. Mark document as ready
 */
export const uploadDocument = async (
  userId: mongoose.Types.ObjectId,
  fileUrl: string,
  fileName: string,
): Promise<IRagDocumentDoc> => {
  // Determine file type from URL
  const isPdf =
    fileUrl.toLowerCase().endsWith(".pdf") || fileUrl.includes(".pdf");
  const fileType = isPdf ? "pdf" : "webpage";

  // 1. Create document record
  const ragDoc = await RagDocument.create({
    userId,
    fileName,
    fileUrl,
    fileType,
    status: "processing",
  });

  // Process asynchronously but still await so the caller knows if it failed
  try {
    // 2. Load content
    let rawText: string;
    if (fileType === "pdf") {
      rawText = await loadPdfFromUrl(fileUrl);
    } else {
      rawText = await loadWebPage(fileUrl);
    }

    if (!rawText || rawText.trim().length === 0) {
      throw new Error("No text content could be extracted from the document");
    }

    // 3. Split into chunks
    const chunks = await splitText(rawText);

    // 4. Compute embeddings & save chunks in batches
    const BATCH_SIZE = 10;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);

      const chunkDocs = await Promise.all(
        batch.map(async (chunk: any, batchIdx: number) => {
          const embedding = await getEmbedding(chunk.pageContent);
          return {
            documentId: ragDoc._id,
            userId,
            content: chunk.pageContent,
            embedding,
            metadata: {
              source: fileName,
              chunkIndex: i + batchIdx,
              totalChunks: chunks.length,
            },
          };
        }),
      );

      await RagChunk.insertMany(chunkDocs);
    }

    // 5. Mark as ready
    ragDoc.totalChunks = chunks.length;
    ragDoc.status = "ready";
    await ragDoc.save();

    return ragDoc;
  } catch (error: any) {
    ragDoc.status = "failed";
    ragDoc.errorMessage = error.message;
    await ragDoc.save();
    throw new ApiError(
      `Document processing failed: ${error.message}`,
      httpStatus.INTERNAL_SERVER_ERROR,
    );
  }
};

/**
 * Vector search — find the most relevant chunks for a query.
 * Uses MongoDB $vectorSearch (requires an Atlas vector index named `rag_vector_index` on the `ragchunks` collection).
 */
export const searchChunks = async (
  documentId: string,
  query: string,
  limit: number = 5,
) => {
  const queryEmbedding = await getEmbedding(query);

  const pipeline = [
    {
      $vectorSearch: {
        index: "rag_vector_index",
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates: 100,
        limit: limit * 2, // fetch extra then filter by document
        filter: {
          documentId: new mongoose.Types.ObjectId(documentId),
        },
      },
    },
    {
      $project: {
        _id: 1,
        content: 1,
        metadata: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
    { $limit: limit },
  ];

  const results = await RagChunk.collection.aggregate(pipeline).toArray();
  return results;
};

/**
 * Fallback search using cosine similarity calculated in-app (no Atlas vector index needed).
 * Useful for development / free-tier Atlas without vector search support.
 */
export const searchChunksFallback = async (
  documentId: string,
  query: string,
  limit: number = 5,
) => {
  const queryEmbedding = await getEmbedding(query);

  // Fetch all chunks for this document
  const chunks = await RagChunk.find({
    documentId: new mongoose.Types.ObjectId(documentId),
  }).lean();

  // Calculate cosine similarity
  const scored = chunks.map((chunk) => {
    const dotProduct = chunk.embedding.reduce(
      (sum: number, val: number, idx: number) =>
        sum + val * (queryEmbedding[idx] ?? 0),
      0,
    );
    const magA = Math.sqrt(
      chunk.embedding.reduce((sum: number, val: number) => sum + val * val, 0),
    );
    const magB = Math.sqrt(
      queryEmbedding.reduce((sum: number, val: number) => sum + val * val, 0),
    );
    const score = magA && magB ? dotProduct / (magA * magB) : 0;
    return { ...chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
};

/**
 * Search chunks across multiple documents
 */
export const searchMultipleDocuments = async (
  documentIds: string[],
  query: string,
  limit: number = 10,
) => {
  const queryEmbedding = await getEmbedding(query);

  try {
    // Try vector search first
    const pipeline = [
      {
        $vectorSearch: {
          index: "rag_vector_index",
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: 200,
          limit: limit * 2,
          filter: {
            documentId: {
              $in: documentIds.map((id) => new mongoose.Types.ObjectId(id)),
            },
          },
        },
      },
      {
        $lookup: {
          from: "ragdocuments",
          localField: "documentId",
          foreignField: "_id",
          as: "document",
        },
      },
      {
        $project: {
          _id: 1,
          content: 1,
          metadata: 1,
          documentId: 1,
          documentName: { $arrayElemAt: ["$document.fileName", 0] },
          score: { $meta: "vectorSearchScore" },
        },
      },
      { $limit: limit },
    ];

    const results = await RagChunk.collection.aggregate(pipeline).toArray();
    return results;
  } catch {
    // Fallback to cosine similarity
    const chunks = await RagChunk.find({
      documentId: {
        $in: documentIds.map((id) => new mongoose.Types.ObjectId(id)),
      },
    })
      .populate("documentId", "fileName")
      .lean();

    const scored = chunks.map((chunk) => {
      const dotProduct = chunk.embedding.reduce(
        (sum: number, val: number, idx: number) =>
          sum + val * (queryEmbedding[idx] ?? 0),
        0,
      );
      const magA = Math.sqrt(
        chunk.embedding.reduce(
          (sum: number, val: number) => sum + val * val,
          0,
        ),
      );
      const magB = Math.sqrt(
        queryEmbedding.reduce((sum: number, val: number) => sum + val * val, 0),
      );
      const score = magA && magB ? dotProduct / (magA * magB) : 0;
      return {
        ...chunk,
        score,
        documentName: (chunk.documentId as any)?.fileName || "Unknown",
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }
};

/**
 * Chat with a single document — retrieval-augmented generation.
 * 1. Search for relevant chunks
 * 2. Build a prompt with context
 * 3. Send to Mistral chat
 * 4. Save the conversation
 */
export const chatWithDocument = async (
  userId: mongoose.Types.ObjectId,
  documentId: string,
  message: string,
  chatId?: string,
) => {
  // Verify the document belongs to the user and is ready
  const ragDoc = await RagDocument.findOne({
    _id: documentId,
    userId,
    status: "ready",
  });

  if (!ragDoc) {
    throw new ApiError("Document not found or not ready", httpStatus.NOT_FOUND);
  }

  // 1. Search for relevant chunks (try vector search first, fallback if it fails)
  let relevantChunks: any[];
  try {
    relevantChunks = await searchChunks(documentId, message, 5);
  } catch {
    // Fallback for environments without Atlas vector index
    relevantChunks = await searchChunksFallback(documentId, message, 5);
  }

  const contextText = relevantChunks.map((c) => c.content).join("\n\n---\n\n");

  // 2. Build chat history
  let chat: IRagChatDoc | null = null;
  if (chatId) {
    chat = await RagChat.findOne({ _id: chatId, userId, documentId });
  }

  const previousMessages =
    chat?.messages?.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })) ?? [];

  // 3. Build prompt
  const systemPrompt = `You are a helpful AI assistant that answers questions based on the provided document context. 
Use ONLY the information from the context below to answer the user's question. 
If the answer cannot be found in the context, say "I couldn't find the answer in the provided document."
Be concise and accurate.

DOCUMENT CONTEXT:
${contextText}`;

  const messages: { role: "system" | "user" | "assistant"; content: string }[] =
    [
      { role: "system", content: systemPrompt },
      ...previousMessages.slice(-10), // keep last 10 messages for context window
      { role: "user", content: message },
    ];

  // 4. Call Mistral chat
  const client = getMistralClient();
  const chatResponse = await client.chat.complete({
    model: "mistral-small-latest",
    messages,
  });

  const assistantMessage =
    chatResponse.choices?.[0]?.message?.content ??
    "Sorry, I could not generate a response.";

  // 5. Prepare sources
  const sources = relevantChunks.map((c) => ({
    content:
      c.content.substring(0, 200) + (c.content.length > 200 ? "..." : ""),
    score: c.score ?? 0,
    pageNumber: c.metadata?.pageNumber,
  }));

  // 6. Save / update chat
  if (!chat) {
    // Create a new chat — use first few words of user message as title
    const title =
      message.length > 50 ? message.substring(0, 50) + "..." : message;
    chat = await RagChat.create({
      userId,
      documentId,
      title,
      messages: [
        { role: "user", content: message, timestamp: new Date() },
        {
          role: "assistant",
          content: assistantMessage,
          sources,
          timestamp: new Date(),
        },
      ],
    });
  } else {
    chat.messages.push(
      { role: "user", content: message, timestamp: new Date(), sources: [] },
      {
        role: "assistant",
        content: assistantMessage as string,
        sources,
        timestamp: new Date(),
      },
    );
    await chat.save();
  }

  return {
    chatId: chat._id,
    answer: assistantMessage,
    sources,
  };
};

/**
 * Chat with multiple documents — retrieval-augmented generation across selected documents.
 */
export const chatWithMultipleDocuments = async (
  userId: mongoose.Types.ObjectId,
  documentIds: string[],
  message: string,
  chatId?: string,
) => {
  // Verify all documents belong to the user and are ready
  const ragDocs = await RagDocument.find({
    _id: { $in: documentIds },
    userId,
    status: "ready",
  });

  if (ragDocs.length !== documentIds.length) {
    throw new ApiError(
      "One or more documents not found or not ready",
      httpStatus.NOT_FOUND,
    );
  }

  // 1. Search for relevant chunks across all documents
  const relevantChunks = await searchMultipleDocuments(documentIds, message, 8);

  const contextText = relevantChunks
    .map((c) => `[From: ${c.documentName || "Unknown Document"}]\n${c.content}`)
    .join("\n\n---\n\n");

  // 2. Build chat history (for multi-doc chats, use a general chat not tied to specific document)
  let chat: IRagChatDoc | null = null;
  if (chatId) {
    chat = await RagChat.findOne({ _id: chatId, userId, documentId: null });
  }

  const previousMessages =
    chat?.messages?.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })) ?? [];

  // 3. Build prompt
  const systemPrompt = `You are a helpful AI assistant that answers questions based on information from multiple documents. 
Use ONLY the information from the contexts below to answer the user's question. 
Each context section is labeled with its source document.
If the answer cannot be found in the provided contexts, say "I couldn't find the answer in the provided documents."
When referencing information, mention which document it came from.
Be concise and accurate.

DOCUMENT CONTEXTS:
${contextText}`;

  const messages: { role: "system" | "user" | "assistant"; content: string }[] =
    [
      { role: "system", content: systemPrompt },
      ...previousMessages.slice(-8), // keep last 8 messages for context window
      { role: "user", content: message },
    ];

  // 4. Call Mistral chat
  const client = getMistralClient();
  const chatResponse = await client.chat.complete({
    model: "mistral-small-latest",
    messages,
  });

  const assistantMessage =
    chatResponse.choices?.[0]?.message?.content ??
    "Sorry, I could not generate a response.";

  // 5. Prepare sources
  const sources = relevantChunks.map((c) => ({
    content:
      c.content.substring(0, 200) + (c.content.length > 200 ? "..." : ""),
    score: c.score ?? 0,
    documentName: c.documentName,
    documentId: c.documentId,
    pageNumber: c.metadata?.pageNumber,
  }));

  // 6. Save / update chat
  if (!chat) {
    // Create a new multi-document chat
    const title =
      message.length > 50 ? message.substring(0, 50) + "..." : message;
    chat = await RagChat.create({
      userId,
      documentId: null, // null indicates multi-document chat
      title,
      documentIds, // store which documents this chat involves
      chatType: "multi-document",
      messages: [
        { role: "user", content: message, timestamp: new Date() },
        {
          role: "assistant",
          content: assistantMessage,
          sources,
          timestamp: new Date(),
        },
      ],
    });
  } else {
    chat.messages.push(
      { role: "user", content: message, timestamp: new Date(), sources: [] },
      {
        role: "assistant",
        content: assistantMessage as string,
        sources,
        timestamp: new Date(),
      },
    );
    await chat.save();
  }

  return {
    chatId: chat._id,
    answer: assistantMessage,
    sources,
    documentsUsed: ragDocs.map((d) => ({ id: d._id, name: d.fileName })),
  };
};

/**
 * Chat with all user documents — retrieval-augmented generation across all user's documents.
 */
export const chatWithAllDocuments = async (
  userId: mongoose.Types.ObjectId,
  message: string,
  chatId?: string,
) => {
  // Get all ready documents for the user
  const ragDocs = await RagDocument.find({
    userId,
    status: "ready",
  });

  if (ragDocs.length === 0) {
    throw new ApiError("No documents found for user", httpStatus.NOT_FOUND);
  }

  const documentIds = ragDocs.map((doc) => doc._id.toString());
  return chatWithMultipleDocuments(userId, documentIds, message, chatId);
};

/**
 * Get all documents for a user.
 */
export const getUserDocuments = async (userId: mongoose.Types.ObjectId) => {
  return RagDocument.find({ userId }).sort({ createdAt: -1 }).lean();
};

/**
 * Get a single document by id (must belong to user).
 */
export const getDocumentById = async (
  userId: mongoose.Types.ObjectId,
  documentId: string,
) => {
  const doc = await RagDocument.findOne({ _id: documentId, userId });
  if (!doc) {
    throw new ApiError("Document not found", httpStatus.NOT_FOUND);
  }
  return doc;
};

/**
 * Delete a document and all associated chunks and chats.
 */
export const deleteDocument = async (
  userId: mongoose.Types.ObjectId,
  documentId: string,
) => {
  const doc = await RagDocument.findOne({ _id: documentId, userId });
  if (!doc) {
    throw new ApiError("Document not found", httpStatus.NOT_FOUND);
  }

  await Promise.all([
    RagChunk.deleteMany({ documentId: doc._id }),
    RagChat.deleteMany({ documentId: doc._id }),
    RagDocument.findByIdAndDelete(doc._id),
  ]);

  return doc;
};

/**
 * Get all chats for a document.
 */
export const getChats = async (
  userId: mongoose.Types.ObjectId,
  documentId: string,
) => {
  return RagChat.find({ userId, documentId })
    .select("_id title createdAt updatedAt chatType")
    .sort({ updatedAt: -1 })
    .lean();
};

/**
 * Get all chats for a user (including multi-document chats).
 */
export const getAllUserChats = async (userId: mongoose.Types.ObjectId) => {
  return RagChat.find({ userId })
    .populate("documentId", "fileName")
    .populate("documentIds", "fileName")
    .select("_id title createdAt updatedAt chatType documentId documentIds")
    .sort({ updatedAt: -1 })
    .lean();
};

/**
 * Get a single chat with full messages.
 */
export const getChatById = async (
  userId: mongoose.Types.ObjectId,
  chatId: string,
) => {
  const chat = await RagChat.findOne({ _id: chatId, userId });
  if (!chat) {
    throw new ApiError("Chat not found", httpStatus.NOT_FOUND);
  }
  return chat;
};

/**
 * Delete a chat.
 */
export const deleteChat = async (
  userId: mongoose.Types.ObjectId,
  chatId: string,
) => {
  const chat = await RagChat.findOne({ _id: chatId, userId });
  if (!chat) {
    throw new ApiError("Chat not found", httpStatus.NOT_FOUND);
  }
  await RagChat.findByIdAndDelete(chatId);
  return chat;
};
