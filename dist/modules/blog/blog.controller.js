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
exports.deleteBlog = exports.updateBlog = exports.createBlog = exports.getAdminBlog = exports.getAdminBlogs = exports.getCategories = exports.getBlogBySlug = exports.getPublishedBlogs = void 0;
const http_status_1 = __importDefault(require("http-status"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const blogService = __importStar(require("./blog.service"));
exports.getPublishedBlogs = (0, catchAsync_1.default)(async (req, res) => {
    const { page, limit, search, category, tag } = req.query;
    const result = await blogService.getPublishedBlogs({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 9,
        search: search,
        category: category,
        tag: tag,
    });
    res.status(http_status_1.default.OK).send({
        status: "success",
        data: result,
    });
});
exports.getBlogBySlug = (0, catchAsync_1.default)(async (req, res) => {
    const result = await blogService.getBlogBySlug(req.params["slug"]);
    res.status(http_status_1.default.OK).send({
        status: "success",
        data: result,
    });
});
exports.getCategories = (0, catchAsync_1.default)(async (_req, res) => {
    const categories = await blogService.getCategories();
    res.status(http_status_1.default.OK).send({
        status: "success",
        data: { categories },
    });
});
exports.getAdminBlogs = (0, catchAsync_1.default)(async (req, res) => {
    const { page, limit, search, category, status } = req.query;
    const result = await blogService.getAllAdminBlogs({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 15,
        search: search,
        category: category,
        status: status,
    });
    res.status(http_status_1.default.OK).send({
        status: "success",
        data: result,
    });
});
exports.getAdminBlog = (0, catchAsync_1.default)(async (req, res) => {
    const result = await blogService.getBlogById(req.params["blogId"]);
    res.status(http_status_1.default.OK).send({
        status: "success",
        data: result,
    });
});
exports.createBlog = (0, catchAsync_1.default)(async (req, res) => {
    const blog = await blogService.createBlog(req.body);
    res.status(http_status_1.default.CREATED).send({
        status: "success",
        data: { blog },
    });
});
exports.updateBlog = (0, catchAsync_1.default)(async (req, res) => {
    const blog = await blogService.updateBlog(req.params["blogId"], req.body);
    res.status(http_status_1.default.OK).send({
        status: "success",
        data: { blog },
    });
});
exports.deleteBlog = (0, catchAsync_1.default)(async (req, res) => {
    await blogService.deleteBlog(req.params["blogId"]);
    res.status(http_status_1.default.NO_CONTENT).send();
});
