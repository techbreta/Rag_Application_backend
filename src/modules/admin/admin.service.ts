import mongoose from "mongoose";
import User from "../user/user.model";
import RagDocument from "../rag/rag.document.model";
import RagChat from "../rag/rag.chat.model";
import RagChunk from "../rag/rag.chunk.model";
import RagImage from "../rag/rag.image.model";
import ApiError from "../errors/ApiError";
import httpStatus from "http-status";
import { getImagePageUrl } from "../seo/seo.service";
import { notifyGoogleIndexing } from "../seo/indexing.service";
import {
  IAdminStats,
  IAdminUserFilter,
  IAdminDocumentFilter,
  IAdminChatFilter,
  IAdminImageFilter,
} from "./admin.interfaces";

/**
 * Get overall platform stats for super admin dashboard
 */
export const getAdminStats = async (): Promise<IAdminStats> => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalDocuments,
    totalChats,
    totalImages,
    newUsersToday,
    newUsersThisWeek,
    messagesAgg,
    recentUsers,
    recentDocuments,
    recentChats,
  ] = await Promise.all([
    User.countDocuments({ isDeleted: false }),
    RagDocument.countDocuments(),
    RagChat.countDocuments(),
    RagImage.countDocuments(),
    User.countDocuments({ isDeleted: false, createdAt: { $gte: startOfToday } }),
    User.countDocuments({ isDeleted: false, createdAt: { $gte: startOfWeek } }),
    RagChat.aggregate([
      { $project: { count: { $size: { $ifNull: ["$messages", []] } } } },
      { $group: { _id: null, total: { $sum: "$count" } } },
    ]),
    User.find({ isDeleted: false }, { password: 0 })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    RagDocument.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    RagChat.find()
      .populate("userId", "name email")
      .populate("documentId", "fileName")
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean(),
  ]);

  const totalMessages = messagesAgg[0]?.total || 0;

  return {
    totalUsers,
    totalDocuments,
    totalChats,
    totalMessages,
    totalImages,
    newUsersToday,
    newUsersThisWeek,
    recentUsers,
    recentDocuments,
    recentChats,
  };
};

/**
 * Get all users with search, filtering, pagination and document/chat counts
 */
export const getAllUsers = async (filter: IAdminUserFilter) => {
  const page = Math.max(1, Number(filter.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(filter.limit) || 10));
  const skip = (page - 1) * limit;

  const matchQuery: any = { isDeleted: false };

  if (filter.role && filter.role !== "all") {
    matchQuery.role = filter.role;
  }

  if (filter.status && filter.status !== "all") {
    matchQuery.status = filter.status;
  }

  if (filter.search && filter.search.trim()) {
    const searchRegex = new RegExp(filter.search.trim(), "i");
    matchQuery.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { contact: searchRegex },
    ];
  }

  const [users, totalCount] = await Promise.all([
    User.aggregate([
      { $match: matchQuery },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "ragdocuments",
          localField: "_id",
          foreignField: "userId",
          as: "documents",
        },
      },
      {
        $lookup: {
          from: "ragchats",
          localField: "_id",
          foreignField: "userId",
          as: "chats",
        },
      },
      {
        $project: {
          password: 0,
          "documents.chunks": 0,
        },
      },
      {
        $addFields: {
          documentsCount: { $size: "$documents" },
          chatsCount: { $size: "$chats" },
        },
      },
      {
        $project: {
          documents: 0,
          chats: 0,
        },
      },
    ]),
    User.countDocuments(matchQuery),
  ]);

  return {
    users,
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
 * Get detailed profile for a specific user, including their documents and chats
 */
export const getUserDetails = async (userId: string) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError("Invalid user ID", httpStatus.BAD_REQUEST);
  }

  const user = await User.findOne(
    { _id: new mongoose.Types.ObjectId(userId), isDeleted: false },
    { password: 0 }
  ).lean();

  if (!user) {
    throw new ApiError("User not found", httpStatus.NOT_FOUND);
  }

  const [documents, chats, images] = await Promise.all([
    RagDocument.find({ userId: user._id }).sort({ createdAt: -1 }).lean(),
    RagChat.find({ userId: user._id })
      .populate("documentId", "fileName")
      .sort({ updatedAt: -1 })
      .lean(),
    RagImage.find({ userId: user._id }).sort({ createdAt: -1 }).lean(),
  ]);

  return {
    user,
    documents,
    chats,
    images,
  };
};

/**
 * Update user status or role
 */
export const updateUserStatus = async (
  userId: string,
  updateBody: { status?: string; role?: string; isEmailVerified?: boolean }
) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError("Invalid user ID", httpStatus.BAD_REQUEST);
  }

  const user = await User.findById(userId);
  if (!user || user.isDeleted) {
    throw new ApiError("User not found", httpStatus.NOT_FOUND);
  }

  if (updateBody.status) {
    user.status = updateBody.status as any;
  }
  if (updateBody.role) {
    user.role = updateBody.role as any;
  }
  if (typeof updateBody.isEmailVerified === "boolean") {
    user.isEmailVerified = updateBody.isEmailVerified;
  }

  await user.save();
  return user;
};

/**
 * Get all platform documents with pagination, filtering, and owner information
 */
export const getAllDocuments = async (filter: IAdminDocumentFilter) => {
  const page = Math.max(1, Number(filter.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(filter.limit) || 10));
  const skip = (page - 1) * limit;

  const matchQuery: any = {};

  if (filter.fileType && filter.fileType !== "all") {
    matchQuery.fileType = filter.fileType;
  }

  if (filter.status && filter.status !== "all") {
    matchQuery.status = filter.status;
  }

  if (filter.userId && mongoose.Types.ObjectId.isValid(filter.userId)) {
    matchQuery.userId = new mongoose.Types.ObjectId(filter.userId);
  }

  if (filter.search && filter.search.trim()) {
    matchQuery.fileName = new RegExp(filter.search.trim(), "i");
  }

  const [documents, totalCount] = await Promise.all([
    RagDocument.find(matchQuery)
      .populate("userId", "name email role status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    RagDocument.countDocuments(matchQuery),
  ]);

  return {
    documents,
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
 * Get document details along with associated chat sessions
 */
export const getDocumentDetails = async (documentId: string) => {
  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    throw new ApiError("Invalid document ID", httpStatus.BAD_REQUEST);
  }

  const document = await RagDocument.findById(documentId)
    .populate("userId", "name email role")
    .lean();

  if (!document) {
    throw new ApiError("Document not found", httpStatus.NOT_FOUND);
  }

  const [chats, chunkCount] = await Promise.all([
    RagChat.find({ documentId: document._id })
      .populate("userId", "name email")
      .sort({ updatedAt: -1 })
      .lean(),
    RagChunk.countDocuments({ documentId: document._id }),
  ]);

  return {
    document,
    chunkCount,
    chats,
  };
};

/**
 * Admin delete document and all its chunks and related chats
 */
export const deleteDocumentAdmin = async (documentId: string) => {
  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    throw new ApiError("Invalid document ID", httpStatus.BAD_REQUEST);
  }

  const doc = await RagDocument.findById(documentId);
  if (!doc) {
    throw new ApiError("Document not found", httpStatus.NOT_FOUND);
  }

  await Promise.all([
    RagChunk.deleteMany({ documentId: doc._id }),
    RagChat.deleteMany({ documentId: doc._id }),
    RagDocument.findByIdAndDelete(doc._id),
  ]);

  return { success: true };
};

/**
 * Get all chats across all users with search, filtering, and message summaries
 */
export const getAllChats = async (filter: IAdminChatFilter) => {
  const page = Math.max(1, Number(filter.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(filter.limit) || 10));
  const skip = (page - 1) * limit;

  const matchQuery: any = {};

  if (filter.chatType && filter.chatType !== "all") {
    matchQuery.chatType = filter.chatType;
  }

  if (filter.userId && mongoose.Types.ObjectId.isValid(filter.userId)) {
    matchQuery.userId = new mongoose.Types.ObjectId(filter.userId);
  }

  if (filter.search && filter.search.trim()) {
    matchQuery.title = new RegExp(filter.search.trim(), "i");
  }

  const [chats, totalCount] = await Promise.all([
    RagChat.find(matchQuery, {
      title: 1,
      chatType: 1,
      userId: 1,
      documentId: 1,
      documentIds: 1,
      createdAt: 1,
      updatedAt: 1,
      messages: { $slice: -1 }, // Only get last message for preview
    })
      .populate("userId", "name email role")
      .populate("documentId", "fileName fileUrl fileType")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    RagChat.countDocuments(matchQuery),
  ]);

  // Map to include total message count
  const chatIds = chats.map((c) => c._id);
  const countsAgg = await RagChat.aggregate([
    { $match: { _id: { $in: chatIds } } },
    { $project: { messageCount: { $size: { $ifNull: ["$messages", []] } } } },
  ]);
  const countMap = new Map(countsAgg.map((c) => [c._id.toString(), c.messageCount]));

  const enrichedChats = chats.map((chat) => ({
    ...chat,
    messageCount: countMap.get(chat._id.toString()) || 0,
    lastMessage: chat.messages?.[0] || null,
  }));

  return {
    chats: enrichedChats,
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
 * Get full chat details including complete message transcript and sources
 */
export const getChatDetails = async (chatId: string) => {
  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    throw new ApiError("Invalid chat ID", httpStatus.BAD_REQUEST);
  }

  const chat = await RagChat.findById(chatId)
    .populate("userId", "name email role")
    .populate("documentId", "fileName fileUrl fileType")
    .populate("documentIds", "fileName fileUrl fileType")
    .lean();

  if (!chat) {
    throw new ApiError("Chat not found", httpStatus.NOT_FOUND);
  }

  return { chat };
};

/**
 * Get all user generated images with pagination and search across all users
 */
export const getAllImages = async (filter: IAdminImageFilter) => {
  const page = Math.max(1, Number(filter.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(filter.limit) || 12));
  const skip = (page - 1) * limit;

  const matchQuery: any = {};

  if (filter.userId && mongoose.Types.ObjectId.isValid(filter.userId)) {
    matchQuery.userId = new mongoose.Types.ObjectId(filter.userId);
  }

  if (filter.search && filter.search.trim()) {
    matchQuery.prompt = new RegExp(filter.search.trim(), "i");
  }

  const [images, totalCount] = await Promise.all([
    RagImage.find(matchQuery, { promptEmbedding: 0 })
      .populate("userId", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    RagImage.countDocuments(matchQuery),
  ]);

  return {
    images,
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
 * Admin delete generated image from Cloudinary and database
 */
export const deleteImageAdmin = async (imageId: string) => {
  if (!mongoose.Types.ObjectId.isValid(imageId)) {
    throw new ApiError("Invalid image ID", httpStatus.BAD_REQUEST);
  }

  const image = await RagImage.findById(imageId);
  if (!image) {
    throw new ApiError("Image not found", httpStatus.NOT_FOUND);
  }

  // Delete from Cloudinary if URL exists
  if (image.cloudinaryUrl) {
    try {
      const { deleteImageByUrl } = await import("../utils/cloudinary");
      await deleteImageByUrl(image.cloudinaryUrl);
    } catch {
      // Continue to delete from DB if Cloudinary deletion errors
    }
  }

  await RagImage.findByIdAndDelete(imageId);
  notifyGoogleIndexing(getImagePageUrl(image), "URL_DELETED");
  return { success: true };
};


