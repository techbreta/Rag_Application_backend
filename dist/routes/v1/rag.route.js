"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const validate_1 = require("../../modules/validate");
const auth_1 = require("../../modules/auth");
const rag_1 = require("../../modules/rag");
const router = express_1.default.Router();
// ── Document endpoints ─────────────────────────────────────────────
router.post("/upload", (0, auth_1.auth)(), (0, validate_1.validate)(rag_1.ragValidation.uploadDocument), rag_1.ragController.uploadDocument);
router.get("/documents", (0, auth_1.auth)(), rag_1.ragController.getDocuments);
router.get("/documents/:documentId", (0, auth_1.auth)(), (0, validate_1.validate)(rag_1.ragValidation.getDocument), rag_1.ragController.getDocument);
router.delete("/documents/:documentId", (0, auth_1.auth)(), (0, validate_1.validate)(rag_1.ragValidation.deleteDocument), rag_1.ragController.deleteDocument);
// ── Chat endpoints ─────────────────────────────────────────────────
router.post("/chat", (0, auth_1.auth)(), (0, validate_1.validate)(rag_1.ragValidation.chat), rag_1.ragController.chat);
// Get all chats for user (including multi-document chats)
router.get("/chats", (0, auth_1.auth)(), rag_1.ragController.getAllChats);
router.get("/documents/:documentId/chats", (0, auth_1.auth)(), (0, validate_1.validate)(rag_1.ragValidation.getChats), rag_1.ragController.getChats);
router.get("/chats/:chatId", (0, auth_1.auth)(), (0, validate_1.validate)(rag_1.ragValidation.getChat), rag_1.ragController.getChat);
router.delete("/chats/:chatId", (0, auth_1.auth)(), (0, validate_1.validate)(rag_1.ragValidation.deleteChat), rag_1.ragController.deleteChat);
// ── Search endpoint ────────────────────────────────────────────────
router.post("/search", (0, auth_1.auth)(), (0, validate_1.validate)(rag_1.ragValidation.search), rag_1.ragController.search);
exports.default = router;
