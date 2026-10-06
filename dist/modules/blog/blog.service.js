"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBlog = exports.updateBlog = exports.createBlog = exports.getBlogById = exports.getAllAdminBlogs = exports.getCategories = exports.getBlogBySlug = exports.getPublishedBlogs = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const blog_model_1 = __importDefault(require("./blog.model"));
const ApiError_1 = __importDefault(require("../errors/ApiError"));
const http_status_1 = __importDefault(require("http-status"));
const seo_service_1 = require("../seo/seo.service");
const indexing_service_1 = require("../seo/indexing.service");
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[\s\W-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
function calculateReadTime(content) {
    const words = content.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
}
/**
 * Get published blogs for public website with pagination and filtering
 */
const getPublishedBlogs = async (filter) => {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(filter.limit) || 9));
    const skip = (page - 1) * limit;
    const matchQuery = { status: "published" };
    if (filter.category && filter.category !== "all") {
        matchQuery.category = filter.category;
    }
    if (filter.tag && filter.tag !== "all") {
        matchQuery.tags = filter.tag;
    }
    if (filter.search && filter.search.trim()) {
        const searchRegex = new RegExp(filter.search.trim(), "i");
        matchQuery.$or = [
            { title: searchRegex },
            { excerpt: searchRegex },
            { category: searchRegex },
            { tags: searchRegex },
        ];
    }
    const [blogs, totalCount, featuredBlog] = await Promise.all([
        blog_model_1.default.find(matchQuery, { content: 0 })
            .sort({ publishedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        blog_model_1.default.countDocuments(matchQuery),
        page === 1 && !filter.search && (!filter.category || filter.category === "all")
            ? blog_model_1.default.findOne({ status: "published", featured: true }).lean()
            : null,
    ]);
    return {
        blogs,
        featuredBlog,
        pagination: {
            currentPage: page,
            pageSize: limit,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            hasNextPage: page * limit < totalCount,
            hasPreviousPage: page > 1,
        },
    };
};
exports.getPublishedBlogs = getPublishedBlogs;
/**
 * Get single published blog by slug with view increment and related posts
 */
const getBlogBySlug = async (slug) => {
    const blog = await blog_model_1.default.findOneAndUpdate({ slug, status: "published" }, { $inc: { views: 1 } }, { new: true }).lean();
    if (!blog) {
        throw new ApiError_1.default("Blog article not found", http_status_1.default.NOT_FOUND);
    }
    // Get 3 related articles from same category
    const relatedBlogs = await blog_model_1.default.find({
        _id: { $ne: blog._id },
        category: blog.category,
        status: "published",
    }, { content: 0 })
        .sort({ publishedAt: -1 })
        .limit(3)
        .lean();
    return {
        blog,
        relatedBlogs,
    };
};
exports.getBlogBySlug = getBlogBySlug;
/**
 * Get list of categories with counts
 */
const getCategories = async () => {
    const categories = await blog_model_1.default.aggregate([
        { $match: { status: "published" } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
    ]);
    return categories.map((c) => ({
        name: c._id,
        count: c.count,
    }));
};
exports.getCategories = getCategories;
/**
 * Get all blogs for Super Admin management
 */
const getAllAdminBlogs = async (filter) => {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filter.limit) || 15));
    const skip = (page - 1) * limit;
    const matchQuery = {};
    if (filter.status && filter.status !== "all") {
        matchQuery.status = filter.status;
    }
    if (filter.category && filter.category !== "all") {
        matchQuery.category = filter.category;
    }
    if (filter.search && filter.search.trim()) {
        const searchRegex = new RegExp(filter.search.trim(), "i");
        matchQuery.$or = [
            { title: searchRegex },
            { excerpt: searchRegex },
            { slug: searchRegex },
        ];
    }
    const [blogs, totalCount] = await Promise.all([
        blog_model_1.default.find(matchQuery, { content: 0 })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        blog_model_1.default.countDocuments(matchQuery),
    ]);
    return {
        blogs,
        pagination: {
            currentPage: page,
            pageSize: limit,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            hasNextPage: page * limit < totalCount,
            hasPreviousPage: page > 1,
        },
    };
};
exports.getAllAdminBlogs = getAllAdminBlogs;
/**
 * Get single blog by ID (for admin editing)
 */
const getBlogById = async (id) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new ApiError_1.default("Invalid blog ID", http_status_1.default.BAD_REQUEST);
    }
    const blog = await blog_model_1.default.findById(id).lean();
    if (!blog) {
        throw new ApiError_1.default("Blog not found", http_status_1.default.NOT_FOUND);
    }
    return { blog };
};
exports.getBlogById = getBlogById;
/**
 * Create a new blog post
 */
const createBlog = async (blogBody) => {
    if (!blogBody.title) {
        throw new ApiError_1.default("Blog title is required", http_status_1.default.BAD_REQUEST);
    }
    const slug = blogBody.slug ? slugify(blogBody.slug) : slugify(blogBody.title);
    // Check slug uniqueness
    const existing = await blog_model_1.default.findOne({ slug });
    if (existing) {
        throw new ApiError_1.default("A blog with this slug already exists", http_status_1.default.BAD_REQUEST);
    }
    const readTime = blogBody.readTimeMinutes ||
        (blogBody.content ? calculateReadTime(blogBody.content) : 5);
    const blog = await blog_model_1.default.create({
        coverImage: blogBody.coverImage ||
            "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop",
        ...blogBody,
        slug,
        readTimeMinutes: readTime,
        publishedAt: blogBody.status === "published" ? new Date() : undefined,
    });
    if (blog.status === "published") {
        (0, indexing_service_1.notifyGoogleIndexing)((0, seo_service_1.getBlogPageUrl)(blog.slug));
    }
    return blog;
};
exports.createBlog = createBlog;
/**
 * Update an existing blog post
 */
const updateBlog = async (id, updateBody) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new ApiError_1.default("Invalid blog ID", http_status_1.default.BAD_REQUEST);
    }
    const blog = await blog_model_1.default.findById(id);
    if (!blog) {
        throw new ApiError_1.default("Blog not found", http_status_1.default.NOT_FOUND);
    }
    const wasPublished = blog.status === "published";
    const previousSlug = blog.slug;
    if (updateBody.slug && updateBody.slug !== blog.slug) {
        const slug = slugify(updateBody.slug);
        const existing = await blog_model_1.default.findOne({ slug, _id: { $ne: blog._id } });
        if (existing) {
            throw new ApiError_1.default("A blog with this slug already exists", http_status_1.default.BAD_REQUEST);
        }
        blog.slug = slug;
    }
    if (updateBody.content && !updateBody.readTimeMinutes) {
        blog.readTimeMinutes = calculateReadTime(updateBody.content);
    }
    if (updateBody.status === "published" && blog.status !== "published") {
        blog.publishedAt = new Date();
    }
    Object.assign(blog, updateBody);
    await blog.save();
    if (wasPublished && (blog.status !== "published" || blog.slug !== previousSlug)) {
        (0, indexing_service_1.notifyGoogleIndexing)((0, seo_service_1.getBlogPageUrl)(previousSlug), "URL_DELETED");
    }
    if (blog.status === "published") {
        (0, indexing_service_1.notifyGoogleIndexing)((0, seo_service_1.getBlogPageUrl)(blog.slug));
    }
    return blog;
};
exports.updateBlog = updateBlog;
/**
 * Delete a blog post
 */
const deleteBlog = async (id) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new ApiError_1.default("Invalid blog ID", http_status_1.default.BAD_REQUEST);
    }
    const blog = await blog_model_1.default.findByIdAndDelete(id);
    if (!blog) {
        throw new ApiError_1.default("Blog not found", http_status_1.default.NOT_FOUND);
    }
    if (blog.status === "published") {
        (0, indexing_service_1.notifyGoogleIndexing)((0, seo_service_1.getBlogPageUrl)(blog.slug), "URL_DELETED");
    }
    return { success: true };
};
exports.deleteBlog = deleteBlog;
