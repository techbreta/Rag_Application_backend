import mongoose from "mongoose";
import Blog from "./blog.model";
import { IBlog, IBlogFilter } from "./blog.interfaces";
import ApiError from "../errors/ApiError";
import httpStatus from "http-status";
import { getBlogPageUrl } from "../seo/seo.service";
import { notifyGoogleIndexing } from "../seo/indexing.service";

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function calculateReadTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

/**
 * Get published blogs for public website with pagination and filtering
 */
export const getPublishedBlogs = async (filter: IBlogFilter) => {
  const page = Math.max(1, Number(filter.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(filter.limit) || 9));
  const skip = (page - 1) * limit;

  const matchQuery: any = { status: "published" };

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
    Blog.find(matchQuery, { content: 0 })
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Blog.countDocuments(matchQuery),
    page === 1 && !filter.search && (!filter.category || filter.category === "all")
      ? Blog.findOne({ status: "published", featured: true }).lean()
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

/**
 * Get single published blog by slug with view increment and related posts
 */
export const getBlogBySlug = async (slug: string) => {
  const blog = await Blog.findOneAndUpdate(
    { slug, status: "published" },
    { $inc: { views: 1 } },
    { new: true }
  ).lean();

  if (!blog) {
    throw new ApiError("Blog article not found", httpStatus.NOT_FOUND);
  }

  // Get 3 related articles from same category
  const relatedBlogs = await Blog.find(
    {
      _id: { $ne: blog._id },
      category: blog.category,
      status: "published",
    },
    { content: 0 }
  )
    .sort({ publishedAt: -1 })
    .limit(3)
    .lean();

  return {
    blog,
    relatedBlogs,
  };
};

/**
 * Get list of categories with counts
 */
export const getCategories = async () => {
  const categories = await Blog.aggregate([
    { $match: { status: "published" } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return categories.map((c) => ({
    name: c._id,
    count: c.count,
  }));
};

/**
 * Get all blogs for Super Admin management
 */
export const getAllAdminBlogs = async (filter: IBlogFilter) => {
  const page = Math.max(1, Number(filter.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(filter.limit) || 15));
  const skip = (page - 1) * limit;

  const matchQuery: any = {};

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
    Blog.find(matchQuery, { content: 0 })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Blog.countDocuments(matchQuery),
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

/**
 * Get single blog by ID (for admin editing)
 */
export const getBlogById = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError("Invalid blog ID", httpStatus.BAD_REQUEST);
  }

  const blog = await Blog.findById(id).lean();
  if (!blog) {
    throw new ApiError("Blog not found", httpStatus.NOT_FOUND);
  }

  return { blog };
};

/**
 * Create a new blog post
 */
export const createBlog = async (blogBody: Partial<IBlog>) => {
  if (!blogBody.title) {
    throw new ApiError("Blog title is required", httpStatus.BAD_REQUEST);
  }

  const slug = blogBody.slug ? slugify(blogBody.slug) : slugify(blogBody.title);

  // Check slug uniqueness
  const existing = await Blog.findOne({ slug });
  if (existing) {
    throw new ApiError("A blog with this slug already exists", httpStatus.BAD_REQUEST);
  }

  const readTime =
    blogBody.readTimeMinutes ||
    (blogBody.content ? calculateReadTime(blogBody.content) : 5);

  const blog = await Blog.create({
    coverImage:
      blogBody.coverImage ||
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop",
    ...blogBody,
    slug,
    readTimeMinutes: readTime,
    publishedAt: blogBody.status === "published" ? new Date() : undefined,
  });

  if (blog.status === "published") {
    notifyGoogleIndexing(getBlogPageUrl(blog.slug));
  }

  return blog;
};

/**
 * Update an existing blog post
 */
export const updateBlog = async (id: string, updateBody: Partial<IBlog>) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError("Invalid blog ID", httpStatus.BAD_REQUEST);
  }

  const blog = await Blog.findById(id);
  if (!blog) {
    throw new ApiError("Blog not found", httpStatus.NOT_FOUND);
  }

  const wasPublished = blog.status === "published";
  const previousSlug = blog.slug;

  if (updateBody.slug && updateBody.slug !== blog.slug) {
    const slug = slugify(updateBody.slug);
    const existing = await Blog.findOne({ slug, _id: { $ne: blog._id } });
    if (existing) {
      throw new ApiError("A blog with this slug already exists", httpStatus.BAD_REQUEST);
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
    notifyGoogleIndexing(getBlogPageUrl(previousSlug), "URL_DELETED");
  }
  if (blog.status === "published") {
    notifyGoogleIndexing(getBlogPageUrl(blog.slug));
  }

  return blog;
};

/**
 * Delete a blog post
 */
export const deleteBlog = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError("Invalid blog ID", httpStatus.BAD_REQUEST);
  }

  const blog = await Blog.findByIdAndDelete(id);
  if (!blog) {
    throw new ApiError("Blog not found", httpStatus.NOT_FOUND);
  }

  if (blog.status === "published") {
    notifyGoogleIndexing(getBlogPageUrl(blog.slug), "URL_DELETED");
  }

  return { success: true };
};
