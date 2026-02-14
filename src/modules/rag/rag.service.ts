// Canvas polyfill must be imported first for PDF parsing
import "../../utils/canvas-polyfill";

import mongoose from "mongoose";
// @ts-ignore -- no declaration file for @langchain/textsplitters
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Mistral } from "@mistralai/mistralai";
import RagDocument from "./rag.document.model";
import RagChunk from "./rag.chunk.model";
import RagChat from "./rag.chat.model";
import RagImage from "./rag.image.model";
import ApiError from "../errors/ApiError";
import httpStatus from "http-status";
import { IRagDocumentDoc, IRagChatDoc } from "./rag.interfaces";
import { img as uploadToCloudinary } from "../utils/cloudinary";

import type {
  ToolFileChunk,
  MessageOutputEntry,
} from "@mistralai/mistralai/models/components/index.js";

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

// ── Utility: Detect document type from URL ────────────────────────
const detectFileType = (url: string): string => {
  const urlLower = url.toLowerCase();
  if (urlLower.includes(".pdf")) return "pdf";
  if (urlLower.includes(".docx")) return "docx";
  if (urlLower.includes(".doc") && !urlLower.includes(".docx")) return "doc";
  if (urlLower.includes(".txt")) return "txt";
  if (urlLower.includes(".rtf")) return "rtf";
  if (urlLower.includes(".odt")) return "odt";
  if (urlLower.includes(".odp")) return "odp";
  if (/\.(html?|htm)$/.test(urlLower)) return "html";
  // Default to webpage if no recognized extension
  return "webpage";
};

// ── DOCX loading via docx-parse ────────────────────────────────────
const loadDocxFromUrl = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new ApiError(
      `Failed to fetch DOCX from URL: ${response.statusText}`,
      httpStatus.BAD_REQUEST,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { default: mammoth } = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    if (!result.value || result.value.trim().length === 0) {
      throw new Error("No text extracted from DOCX");
    }
    return result.value;
  } catch (error: any) {
    throw new ApiError(
      `DOCX parsing failed: ${error.message}`,
      httpStatus.INTERNAL_SERVER_ERROR,
    );
  }
};

// ── TXT loading (plain text) ──────────────────────────────────────
const loadTxtFromUrl = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new ApiError(
      `Failed to fetch TXT from URL: ${response.statusText}`,
      httpStatus.BAD_REQUEST,
    );
  }
  const text = await response.text();
  if (!text || text.trim().length === 0) {
    throw new ApiError("TXT file is empty", httpStatus.BAD_REQUEST);
  }
  return text;
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
  return docs.map((d: any) => d.pageContent).join("\n");
};

// ── Text splitting ─────────────────────────────────────────────────
const splitText = async (text: string) => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ["\n\n", "\n", " ", ""],
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
  // Detect file type from URL
  const fileType = detectFileType(fileUrl);

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
    // 2. Load content based on file type
    let rawText: string;
    switch (fileType) {
      case "pdf":
        rawText = await loadPdfFromUrl(fileUrl);
        break;
      case "docx":
      case "doc":
        rawText = await loadDocxFromUrl(fileUrl);
        break;
      case "txt":
        rawText = await loadTxtFromUrl(fileUrl);
        break;
      case "html":
      case "webpage":
        rawText = await loadWebPage(fileUrl);
        break;
      default:
        // Fallback: try as webpage
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
    {
      $match: {
        score: { $gt: 0.6 }, // filter out non-relevant results
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
      {
        $match: {
          score: { $gt: 0.6 }, // filter out non-relevant results
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

export const createImageFromText = async (text: string, userId: string) => {
  const startTime = Date.now();
  const client = getMistralClient();

  // Generate embedding for the prompt text
  const promptEmbedding = await getEmbedding(text);

  const conversation: any = await client.beta.conversations.start({
    agentId: "ag_019c5deda865740d8a08ed6b6cca218f",
    inputs: text,
  });

  console.log("Conversation with image agent:", conversation);
  // Validate conversation response structure
  if (!conversation?.outputs) {
    throw new ApiError(
      "Invalid response from image generation agent",
      httpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  // ✅ Correct path to outputs
  const outputs = conversation.outputs;

  if (!Array.isArray(outputs) || outputs.length === 0) {
    throw new ApiError(
      "No output from image generation agent",
      httpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  // Get last message output entry
  const entry: MessageOutputEntry = outputs[
    outputs.length - 1
  ] as MessageOutputEntry;

  // Handle case where agent returns a text message instead of generating an image
  if (typeof entry.content === "string") {
    // This happens when the agent declines or can't process the request
    const message = entry.content;
    throw new ApiError(
      `Image generation failed: ${
        message || "Agent unable to process request"
      }`,
      httpStatus.BAD_REQUEST,
    );
  }

  // Find tool_file chunk (ensure content is an array)
  const chunk = entry.content.find(
    (c: any) => typeof c !== "string" && c.type === "tool_file",
  );

  if (!chunk || !("fileId" in chunk)) {
    // If no tool_file found, check what content was returned
    const contentTypes = Array.isArray(entry.content)
      ? entry.content
          .map((c: any) => (typeof c === "string" ? "text" : c.type))
          .join(", ")
      : "unknown";
    throw new ApiError(
      `Image generation failed: No image file in response. Content types: ${contentTypes}`,
      httpStatus.BAD_REQUEST,
    );
  }

  const fileChunk = chunk as ToolFileChunk;

  // ❗ Use download (not get)
  const fileStream = await client.files.download({
    fileId: fileChunk.fileId,
  });

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  const reader = fileStream.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const buffer = Buffer.concat(chunks as any);
  // fs.writeFileSync(tempFilePath, buffer as any);

  // ── Upload to Cloudinary ───────────────────────────────────────────
  let cloudinaryUrl: string | null = null;
  let cloudinaryPublicId = "";

  try {
    cloudinaryUrl = await uploadToCloudinary(buffer);
    if (!cloudinaryUrl) {
      throw new Error("Cloudinary upload failed");
    }

    // Extract public_id from cloudinary URL
    // Format: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{folder}/{public_id}.{ext}
    const urlParts = cloudinaryUrl.split("/");
    const fileNameWithExt = urlParts[urlParts.length - 1];
    if (!fileNameWithExt) {
      throw new Error("Failed to extract filename from Cloudinary URL");
    }
    cloudinaryPublicId = fileNameWithExt.replace(/\.[^/.]+$/, "");
  } catch (error) {
    console.error("Cloudinary upload failed:", error);

    throw new ApiError(
      "Failed to upload image to Cloudinary",
      httpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  // ── Save to Database ───────────────────────────────────────────────
  const generationTime = Date.now() - startTime;

  const ragImage = await RagImage.create({
    userId: new mongoose.Types.ObjectId(userId),
    prompt: text,
    promptEmbedding,
    cloudinaryUrl,
    cloudinaryPublicId,
    mistralFileId: fileChunk.fileId,
    mistralConversationId: conversation.conversationId,
    metadata: {
      model: "mistral-medium-2505",
      temperature: 0.3,
      generationTime,
    },
  });

  return {
    message: "Image generated and saved successfully",
    image: ragImage,
    fileStream,
  };
};

// ── Image Management Methods ───────────────────────────────────────

/**
 * Get all generated images for a user
 */
export const getImagesByUserId = async (userId: string) => {
  const images = await RagImage.find({
    userId: new mongoose.Types.ObjectId(userId),
  })
    .sort({ createdAt: -1 })
    .select(
      "prompt cloudinaryUrl mistralConversationId metadata createdAt updatedAt",
    );

  return images;
};

/**
 * Get a specific image by ID (verify ownership)
 */
export const getImageById = async (userId: string, imageId: string) => {
  const image = await RagImage.findOne({
    _id: new mongoose.Types.ObjectId(imageId),
    userId: new mongoose.Types.ObjectId(userId),
  });

  if (!image) {
    throw new ApiError("Image not found", httpStatus.NOT_FOUND);
  }

  return image;
};

/**
 * Delete a generated image and its Cloudinary file
 */
export const deleteImage = async (userId: string, imageId: string) => {
  const image = await RagImage.findOne({
    _id: new mongoose.Types.ObjectId(imageId),
    userId: new mongoose.Types.ObjectId(userId),
  });

  if (!image) {
    throw new ApiError("Image not found", httpStatus.NOT_FOUND);
  }

  // Delete from Cloudinary
  const { deleteImageByUrl } = await import("../utils/cloudinary");
  await deleteImageByUrl(image.cloudinaryUrl);

  // Delete from database
  await RagImage.deleteOne({
    _id: new mongoose.Types.ObjectId(imageId),
  });
};

/**
 * Search images by prompt similarity using embedding with pagination
 * Only searches when prompt is provided and not empty
 */
export const searchImagesByPrompt = async (
  query: string,
  limit: number = 10,
  page: number = 1,
) => {
  // Validate that query is provided and not empty
  if (!query || query.trim().length === 0) {
    throw new ApiError("Search prompt cannot be empty", httpStatus.BAD_REQUEST);
  }

  // Get embedding for search query
  const queryEmbedding = await getEmbedding(query);

  // Validate embedding
  if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
    throw new ApiError(
      "Failed to generate embedding for search query",
      httpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  // Ensure limit and page are valid numbers
  const pageNum = Math.max(1, Math.floor(page || 1));
  const pageSize = Math.min(Math.max(1, Math.floor(limit || 10)), 50); // max 50 per page
  const skip = (pageNum - 1) * pageSize;

  try {
    // Use MongoDB aggregation for similarity search
    const results = await (RagImage.collection as any)
      .aggregate([
        {
          // Vector search (if available on MongoDB Atlas)
          $vectorSearch: {
            index: "image_vector_index",
            path: "promptEmbedding",
            queryVector: queryEmbedding,
            numCandidates: 100,
            limit: Math.min(100, skip + pageSize + 20), // fetch enough for pagination
          },
        },
        {
          // Get vector search score
          $addFields: {
            vectorSearchScore: { $meta: "vectorSearchScore" },
          },
        },
        {
          // Sort by relevance score
          $sort: { vectorSearchScore: -1 },
        },
        {
          // Skip for pagination
          $skip: skip,
        },
        {
          // Limit results per page
          $limit: pageSize,
        },
        {
          // Project relevant fields
          $project: {
            _id: 1,
            prompt: 1,
            cloudinaryUrl: 1,
            vectorSearchScore: 1,
            mistralConversationId: 1,
            metadata: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ])
      .toArray();

    // Get total count for pagination
    const totalCount = await RagImage.countDocuments({
      
    });

    return {
      data: results,
      pagination: {
        currentPage: pageNum,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        hasNextPage: pageNum < Math.ceil(totalCount / pageSize),
        hasPreviousPage: pageNum > 1,
      },
    };
  } catch (error: any) {
    // Fallback to simple similarity search if vector search is not available
    console.warn(
      "Vector search failed, using fallback similarity search:",
      error.message,
    );

    return searchImagesByPromptFallback( query, pageSize, pageNum);
  }
};

/**
 * Fallback search using dot-product similarity (for non-Atlas MongoDB)
 */
const searchImagesByPromptFallback = async (

  query: string,
  pageSize: number,
  pageNum: number,
) => {
  const queryEmbedding = await getEmbedding(query);

  // Fetch all user images
  const allImages = await RagImage.find().select(
    "prompt cloudinaryUrl promptEmbedding mistralConversationId metadata createdAt updatedAt",
  );

  // Calculate dot product similarity
  const imagesWithSimilarity = allImages
    .map((image) => {
      let similarity = 0;
      if (Array.isArray(image.promptEmbedding)) {
        for (
          let i = 0;
          i < Math.min(image.promptEmbedding.length, queryEmbedding.length);
          i++
        ) {
          similarity +=
            (image.promptEmbedding[i] || 0) * (queryEmbedding[i] || 0);
        }
      }
      return {
        ...image.toObject(),
        vectorSearchScore: similarity,
      };
    })
    .sort((a, b) => b.vectorSearchScore - a.vectorSearchScore);

  // Apply pagination
  const skip = (pageNum - 1) * pageSize;
  const paginatedResults = imagesWithSimilarity.slice(skip, skip + pageSize);

  return {
    data: paginatedResults,
    pagination: {
      currentPage: pageNum,
      pageSize,
      totalCount: allImages.length,
      totalPages: Math.ceil(allImages.length / pageSize),
      hasNextPage: pageNum < Math.ceil(allImages.length / pageSize),
      hasPreviousPage: pageNum > 1,
    },
  };
};
