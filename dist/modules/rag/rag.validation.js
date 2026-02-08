"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteChat = exports.getChat = exports.getChats = exports.deleteDocument = exports.getDocument = exports.search = exports.chat = exports.uploadDocument = void 0;
const joi_1 = __importDefault(require("joi"));
exports.uploadDocument = {
    body: joi_1.default.object().keys({
        fileUrl: joi_1.default.string().uri().required().messages({
            "string.uri": "fileUrl must be a valid URL",
            "any.required": "fileUrl is required",
        }),
        fileName: joi_1.default.string().required().trim().max(255).messages({
            "any.required": "fileName is required",
        }),
    }),
};
exports.chat = {
    body: joi_1.default.object()
        .keys({
        // Single document chat
        documentId: joi_1.default.string()
            .regex(/^[0-9a-fA-F]{24}$/)
            .messages({
            "string.pattern.base": "documentId must be a valid MongoDB ObjectId",
        }),
        // Multi-document chat
        documentIds: joi_1.default.array()
            .items(joi_1.default.string()
            .regex(/^[0-9a-fA-F]{24}$/)
            .messages({
            "string.pattern.base": "Each documentId must be a valid MongoDB ObjectId",
        }))
            .min(1)
            .max(10)
            .messages({
            "array.min": "documentIds must contain at least 1 document",
            "array.max": "documentIds must contain at most 10 documents",
        }),
        // Chat type
        chatType: joi_1.default.string()
            .valid("single-document", "multi-document", "all-documents")
            .default("single-document"),
        chatId: joi_1.default.string()
            .optional()
            .regex(/^[0-9a-fA-F]{24}$/)
            .messages({
            "string.pattern.base": "chatId must be a valid MongoDB ObjectId",
        }),
        message: joi_1.default.string().required().trim().min(1).max(5000).messages({
            "any.required": "message is required",
            "string.max": "message must be at most 5000 characters",
        }),
    })
        .custom((value, helpers) => {
        // Validation logic for different chat types
        const { documentId, documentIds, chatType, chatId } = value;
        // When continuing an existing chat, documentId/documentIds are resolved from the chat record
        if (chatId) {
            return value;
        }
        if (chatType === "single-document" && !documentId) {
            return helpers.message({
                custom: "documentId is required for single-document chat",
            });
        }
        if (chatType === "multi-document" &&
            (!documentIds || documentIds.length === 0)) {
            return helpers.message({
                custom: "documentIds is required for multi-document chat",
            });
        }
        if (chatType === "all-documents" && (documentId || documentIds)) {
            return helpers.message({
                custom: "documentId and documentIds should not be provided for all-documents chat",
            });
        }
        return value;
    }),
};
exports.search = {
    body: joi_1.default.object()
        .keys({
        // Single document search
        documentId: joi_1.default.string()
            .regex(/^[0-9a-fA-F]{24}$/)
            .messages({
            "string.pattern.base": "documentId must be a valid MongoDB ObjectId",
        }),
        // Multi-document search
        documentIds: joi_1.default.array()
            .items(joi_1.default.string()
            .regex(/^[0-9a-fA-F]{24}$/)
            .messages({
            "string.pattern.base": "Each documentId must be a valid MongoDB ObjectId",
        }))
            .min(1)
            .max(10)
            .messages({
            "array.min": "documentIds must contain at least 1 document",
            "array.max": "documentIds must contain at most 10 documents",
        }),
        query: joi_1.default.string().required().trim().min(1).max(2000).messages({
            "any.required": "query is required",
        }),
        limit: joi_1.default.number().integer().min(1).max(20).default(5),
    })
        .custom((value, helpers) => {
        const { documentId, documentIds } = value;
        if (!documentId && (!documentIds || documentIds.length === 0)) {
            return helpers.message({
                custom: "Either documentId or documentIds must be provided",
            });
        }
        if (documentId && documentIds) {
            return helpers.message({
                custom: "Provide either documentId or documentIds, not both",
            });
        }
        return value;
    }),
};
exports.getDocument = {
    params: joi_1.default.object().keys({
        documentId: joi_1.default.string()
            .required()
            .regex(/^[0-9a-fA-F]{24}$/),
    }),
};
exports.deleteDocument = {
    params: joi_1.default.object().keys({
        documentId: joi_1.default.string()
            .required()
            .regex(/^[0-9a-fA-F]{24}$/),
    }),
};
exports.getChats = {
    params: joi_1.default.object().keys({
        documentId: joi_1.default.string()
            .required()
            .regex(/^[0-9a-fA-F]{24}$/),
    }),
};
exports.getChat = {
    params: joi_1.default.object().keys({
        chatId: joi_1.default.string()
            .required()
            .regex(/^[0-9a-fA-F]{24}$/),
    }),
};
exports.deleteChat = {
    params: joi_1.default.object().keys({
        chatId: joi_1.default.string()
            .required()
            .regex(/^[0-9a-fA-F]{24}$/),
    }),
};
