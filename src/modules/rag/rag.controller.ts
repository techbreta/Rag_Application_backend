import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../utils/catchAsync";
import * as ragService from "./rag.service";
import RagChat from "./rag.chat.model";
import ApiError from "../errors/ApiError";

/**
 * POST /v1/rag/upload
 * Upload a document (PDF url or web page url) for RAG processing.
 */
export const uploadDocument = catchAsync(
  async (req: Request, res: Response) => {
    const { fileUrl, fileName } = req.body;
    const document = await ragService.uploadDocument(
      req.user.id,
      fileUrl,
      fileName,
    );
    res.status(httpStatus.CREATED).send({
      status: "success",
      data: { document },
    });
  },
);

/**
 * POST /v1/rag/chat
 * Chat with documents - supports single, multiple, or all documents
 */
export const chat = catchAsync(async (req: Request, res: Response) => {
  let { documentId, documentIds, chatType, chatId, message } = req.body;

  // When continuing an existing chat, resolve context from the chat record
  if (chatId && !documentId && !documentIds) {
    const existingChat = await RagChat.findOne({
      _id: chatId,
      userId: req.user.id,
    });
    if (!existingChat) {
      throw new ApiError("Chat not found", httpStatus.NOT_FOUND);
    }
    chatType = existingChat.chatType || "single-document";
    if (existingChat.documentId) {
      documentId = existingChat.documentId.toString();
    }
    if (existingChat.documentIds && existingChat.documentIds.length > 0) {
      documentIds = existingChat.documentIds.map((id: any) => id.toString());
    }
  }

  let result;

  if (chatType === "all-documents") {
    // Chat with all user documents
    result = await ragService.chatWithAllDocuments(
      req.user.id,
      message,
      chatId,
    );
  } else if (chatType === "multi-document" && documentIds) {
    // Chat with specific multiple documents
    result = await ragService.chatWithMultipleDocuments(
      req.user.id,
      documentIds,
      message,
      chatId,
    );
  } else if (documentId) {
    // Chat with single document (default behavior)
    result = await ragService.chatWithDocument(
      req.user.id,
      documentId,
      message,
      chatId,
    );
  } else {
    throw new ApiError(
      "Must provide documentId, documentIds with chatType=multi-document, or chatType=all-documents",
      httpStatus.BAD_REQUEST,
    );
  }

  res.status(httpStatus.OK).send({
    status: "success",
    data: result,
  });
});

/**
 * POST /v1/rag/search
 * Search within document chunks - supports single or multiple documents
 */
export const search = catchAsync(async (req: Request, res: Response) => {
  const { documentId, documentIds, query, limit } = req.body;

  let results;

  if (documentIds && Array.isArray(documentIds)) {
    // Search across multiple documents
    results = await ragService.searchMultipleDocuments(
      documentIds,
      query,
      limit || 10,
    );
  } else if (documentId) {
    // Search single document
    try {
      results = await ragService.searchChunks(documentId, query, limit || 5);
    } catch {
      results = await ragService.searchChunksFallback(
        documentId,
        query,
        limit || 5,
      );
    }
  } else {
    throw new ApiError(
      "Must provide either documentId or documentIds",
      httpStatus.BAD_REQUEST,
    );
  }

  res.status(httpStatus.OK).send({
    status: "success",
    results: results.length,
    data: { chunks: results },
  });
});

/**
 * GET /v1/rag/documents
 * Get all documents for the authenticated user.
 */
export const getDocuments = catchAsync(async (req: Request, res: Response) => {
  const documents = await ragService.getUserDocuments(req.user.id);
  res.status(httpStatus.OK).send({
    status: "success",
    results: documents.length,
    data: { documents },
  });
});

/**
 * GET /v1/rag/documents/:documentId
 * Get a single document.
 */
export const getDocument = catchAsync(async (req: Request, res: Response) => {
  const document = await ragService.getDocumentById(
    req.user.id,
    req.params["documentId"] as string,
  );
  res.status(httpStatus.OK).send({
    status: "success",
    data: { document },
  });
});

/**
 * DELETE /v1/rag/documents/:documentId
 * Delete a document and all associated data.
 */
export const deleteDocument = catchAsync(
  async (req: Request, res: Response) => {
    await ragService.deleteDocument(
      req.user.id,
      req.params["documentId"] as string,
    );
    res.status(httpStatus.NO_CONTENT).send();
  },
);

/**
 * GET /v1/rag/documents/:documentId/chats
 * Get all chats for a document.
 */
export const getChats = catchAsync(async (req: Request, res: Response) => {
  const chats = await ragService.getChats(
    req.user.id,
    req.params["documentId"] as string,
  );
  res.status(httpStatus.OK).send({
    status: "success",
    results: chats.length,
    data: { chats },
  });
});

/**
 * GET /v1/rag/chats
 * Get all chats for the user (including multi-document chats)
 */
export const getAllChats = catchAsync(async (req: Request, res: Response) => {
  const chats = await ragService.getAllUserChats(req.user.id);
  res.status(httpStatus.OK).send({
    status: "success",
    results: chats.length,
    data: { chats },
  });
});

/**
 * GET /v1/rag/chats/:chatId
 * Get a single chat with full message history.
 */
export const getChat = catchAsync(async (req: Request, res: Response) => {
  const chat = await ragService.getChatById(
    req.user.id,
    req.params["chatId"] as string,
  );
  res.status(httpStatus.OK).send({
    status: "success",
    data: { chat },
  });
});

/**
 * DELETE /v1/rag/chats/:chatId
 * Delete a chat.
 */
export const deleteChat = catchAsync(async (req: Request, res: Response) => {
  await ragService.deleteChat(req.user.id, req.params["chatId"] as string);
  res.status(httpStatus.NO_CONTENT).send();
});
