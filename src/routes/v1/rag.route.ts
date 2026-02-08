import express, { Router } from "express";
import { validate } from "../../modules/validate";
import { auth } from "../../modules/auth";
import { ragController, ragValidation } from "../../modules/rag";

const router: Router = express.Router();

// ── Document endpoints ─────────────────────────────────────────────
router.post(
  "/upload",
  auth(),
  validate(ragValidation.uploadDocument),
  ragController.uploadDocument,
);

router.get("/documents", auth(), ragController.getDocuments);

router.get(
  "/documents/:documentId",
  auth(),
  validate(ragValidation.getDocument),
  ragController.getDocument,
);

router.delete(
  "/documents/:documentId",
  auth(),
  validate(ragValidation.deleteDocument),
  ragController.deleteDocument,
);

// ── Chat endpoints ─────────────────────────────────────────────────
router.post("/chat", auth(), validate(ragValidation.chat), ragController.chat);

// Get all chats for user (including multi-document chats)
router.get("/chats", auth(), ragController.getAllChats);

router.get(
  "/documents/:documentId/chats",
  auth(),
  validate(ragValidation.getChats),
  ragController.getChats,
);

router.get(
  "/chats/:chatId",
  auth(),
  validate(ragValidation.getChat),
  ragController.getChat,
);

router.delete(
  "/chats/:chatId",
  auth(),
  validate(ragValidation.deleteChat),
  ragController.deleteChat,
);

// ── Search endpoint ────────────────────────────────────────────────
router.post(
  "/search",
  auth(),
  validate(ragValidation.search),
  ragController.search,
);

export default router;
