"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../../modules/auth");
const admin_1 = require("../../modules/admin");
const blog_1 = require("../../modules/blog");
const seo_1 = require("../../modules/seo");
const router = express_1.default.Router();
// All admin routes strictly require authentication and the "adminAccess" right
router.use((0, auth_1.auth)("adminAccess"));
// ── Overview Stats ──
router.get("/stats", admin_1.adminController.getStats);
// ── Users Management ──
router.get("/users", admin_1.adminController.getUsers);
router.get("/users/:userId", admin_1.adminController.getUser);
router.patch("/users/:userId/status", admin_1.adminController.updateUser);
// ── Documents Management ──
router.get("/documents", admin_1.adminController.getDocuments);
router.get("/documents/:documentId", admin_1.adminController.getDocument);
router.delete("/documents/:documentId", admin_1.adminController.deleteDocument);
// ── Chats Management ──
router.get("/chats", admin_1.adminController.getChats);
router.get("/chats/:chatId", admin_1.adminController.getChat);
// ── Images Management ──
router.get("/images", admin_1.adminController.getImages);
router.delete("/images/:imageId", admin_1.adminController.deleteImage);
// ── Blogs Management ──
router.get("/blogs", blog_1.blogController.getAdminBlogs);
router.get("/blogs/:blogId", blog_1.blogController.getAdminBlog);
router.post("/blogs", blog_1.blogController.createBlog);
router.patch("/blogs/:blogId", blog_1.blogController.updateBlog);
router.delete("/blogs/:blogId", blog_1.blogController.deleteBlog);
// ── Google Indexing ──
router.get("/indexing/stats", seo_1.indexingController.getIndexingStats);
router.get("/indexing/urls", seo_1.indexingController.getIndexingUrls);
exports.default = router;
