"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteChat = exports.getChat = exports.getAllChats = exports.getChats = exports.deleteDocument = exports.getDocument = exports.getDocuments = exports.search = exports.chat = exports.uploadDocument = void 0;
const http_status_1 = __importDefault(require("http-status"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const ragService = __importStar(require("./rag.service"));
const rag_chat_model_1 = __importDefault(require("./rag.chat.model"));
const ApiError_1 = __importDefault(require("../errors/ApiError"));
/**
 * POST /v1/rag/upload
 * Upload a document (PDF url or web page url) for RAG processing.
 */
exports.uploadDocument = (0, catchAsync_1.default)(async (req, res) => {
    const { fileUrl, fileName } = req.body;
    const document = await ragService.uploadDocument(req.user.id, fileUrl, fileName);
    res.status(http_status_1.default.CREATED).send({
        status: "success",
        data: { document },
    });
});
/**
 * POST /v1/rag/chat
 * Chat with documents - supports single, multiple, or all documents
 */
exports.chat = (0, catchAsync_1.default)(async (req, res) => {
    let { documentId, documentIds, chatType, chatId, message } = req.body;
    // When continuing an existing chat, resolve context from the chat record
    if (chatId && !documentId && !documentIds) {
        const existingChat = await rag_chat_model_1.default.findOne({
            _id: chatId,
            userId: req.user.id,
        });
        if (!existingChat) {
            throw new ApiError_1.default("Chat not found", http_status_1.default.NOT_FOUND);
        }
        chatType = existingChat.chatType || "single-document";
        if (existingChat.documentId) {
            documentId = existingChat.documentId.toString();
        }
        if (existingChat.documentIds && existingChat.documentIds.length > 0) {
            documentIds = existingChat.documentIds.map((id) => id.toString());
        }
    }
    let result;
    if (chatType === "all-documents") {
        // Chat with all user documents
        result = await ragService.chatWithAllDocuments(req.user.id, message, chatId);
    }
    else if (chatType === "multi-document" && documentIds) {
        // Chat with specific multiple documents
        result = await ragService.chatWithMultipleDocuments(req.user.id, documentIds, message, chatId);
    }
    else if (documentId) {
        // Chat with single document (default behavior)
        result = await ragService.chatWithDocument(req.user.id, documentId, message, chatId);
    }
    else {
        throw new ApiError_1.default("Must provide documentId, documentIds with chatType=multi-document, or chatType=all-documents", http_status_1.default.BAD_REQUEST);
    }
    res.status(http_status_1.default.OK).send({
        status: "success",
        data: result,
    });
});
/**
 * POST /v1/rag/search
 * Search within document chunks - supports single or multiple documents
 */
exports.search = (0, catchAsync_1.default)(async (req, res) => {
    const { documentId, documentIds, query, limit } = req.body;
    let results;
    if (documentIds && Array.isArray(documentIds)) {
        // Search across multiple documents
        results = await ragService.searchMultipleDocuments(documentIds, query, limit || 10);
    }
    else if (documentId) {
        // Search single document
        try {
            results = await ragService.searchChunks(documentId, query, limit || 5);
        }
        catch {
            results = await ragService.searchChunksFallback(documentId, query, limit || 5);
        }
    }
    else {
        throw new ApiError_1.default("Must provide either documentId or documentIds", http_status_1.default.BAD_REQUEST);
    }
    res.status(http_status_1.default.OK).send({
        status: "success",
        results: results.length,
        data: { chunks: results },
    });
});
/**
 * GET /v1/rag/documents
 * Get all documents for the authenticated user.
 */
exports.getDocuments = (0, catchAsync_1.default)(async (req, res) => {
    const documents = await ragService.getUserDocuments(req.user.id);
    res.status(http_status_1.default.OK).send({
        status: "success",
        results: documents.length,
        data: { documents },
    });
});
/**
 * GET /v1/rag/documents/:documentId
 * Get a single document.
 */
exports.getDocument = (0, catchAsync_1.default)(async (req, res) => {
    const document = await ragService.getDocumentById(req.user.id, req.params["documentId"]);
    res.status(http_status_1.default.OK).send({
        status: "success",
        data: { document },
    });
});
/**
 * DELETE /v1/rag/documents/:documentId
 * Delete a document and all associated data.
 */
exports.deleteDocument = (0, catchAsync_1.default)(async (req, res) => {
    await ragService.deleteDocument(req.user.id, req.params["documentId"]);
    res.status(http_status_1.default.NO_CONTENT).send();
});
/**
 * GET /v1/rag/documents/:documentId/chats
 * Get all chats for a document.
 */
exports.getChats = (0, catchAsync_1.default)(async (req, res) => {
    const chats = await ragService.getChats(req.user.id, req.params["documentId"]);
    res.status(http_status_1.default.OK).send({
        status: "success",
        results: chats.length,
        data: { chats },
    });
});
/**
 * GET /v1/rag/chats
 * Get all chats for the user (including multi-document chats)
 */
exports.getAllChats = (0, catchAsync_1.default)(async (req, res) => {
    const chats = await ragService.getAllUserChats(req.user.id);
    res.status(http_status_1.default.OK).send({
        status: "success",
        results: chats.length,
        data: { chats },
    });
});
/**
 * GET /v1/rag/chats/:chatId
 * Get a single chat with full message history.
 */
exports.getChat = (0, catchAsync_1.default)(async (req, res) => {
    const chat = await ragService.getChatById(req.user.id, req.params["chatId"]);
    res.status(http_status_1.default.OK).send({
        status: "success",
        data: { chat },
    });
});
/**
 * DELETE /v1/rag/chats/:chatId
 * Delete a chat.
 */
exports.deleteChat = (0, catchAsync_1.default)(async (req, res) => {
    await ragService.deleteChat(req.user.id, req.params["chatId"]);
    res.status(http_status_1.default.NO_CONTENT).send();
});
