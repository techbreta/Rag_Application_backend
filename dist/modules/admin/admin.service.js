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
exports.deleteImageAdmin = exports.getAllImages = exports.getChatDetails = exports.getAllChats = exports.deleteDocumentAdmin = exports.getDocumentDetails = exports.getAllDocuments = exports.updateUserStatus = exports.getUserDetails = exports.getAllUsers = exports.getAdminStats = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const user_model_1 = __importDefault(require("../user/user.model"));
const rag_document_model_1 = __importDefault(require("../rag/rag.document.model"));
const rag_chat_model_1 = __importDefault(require("../rag/rag.chat.model"));
const rag_chunk_model_1 = __importDefault(require("../rag/rag.chunk.model"));
const rag_image_model_1 = __importDefault(require("../rag/rag.image.model"));
const ApiError_1 = __importDefault(require("../errors/ApiError"));
const http_status_1 = __importDefault(require("http-status"));
const seo_service_1 = require("../seo/seo.service");
const indexing_service_1 = require("../seo/indexing.service");
/**
 * Get overall platform stats for super admin dashboard
 */
const getAdminStats = async () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const [totalUsers, totalDocuments, totalChats, totalImages, newUsersToday, newUsersThisWeek, messagesAgg, recentUsers, recentDocuments, recentChats,] = await Promise.all([
        user_model_1.default.countDocuments({ isDeleted: false }),
        rag_document_model_1.default.countDocuments(),
        rag_chat_model_1.default.countDocuments(),
        rag_image_model_1.default.countDocuments(),
        user_model_1.default.countDocuments({ isDeleted: false, createdAt: { $gte: startOfToday } }),
        user_model_1.default.countDocuments({ isDeleted: false, createdAt: { $gte: startOfWeek } }),
        rag_chat_model_1.default.aggregate([
            { $project: { count: { $size: { $ifNull: ["$messages", []] } } } },
            { $group: { _id: null, total: { $sum: "$count" } } },
        ]),
        user_model_1.default.find({ isDeleted: false }, { password: 0 })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean(),
        rag_document_model_1.default.find()
            .populate("userId", "name email")
            .sort({ createdAt: -1 })
            .limit(5)
            .lean(),
        rag_chat_model_1.default.find()
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
exports.getAdminStats = getAdminStats;
/**
 * Get all users with search, filtering, pagination and document/chat counts
 */
const getAllUsers = async (filter) => {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filter.limit) || 10));
    const skip = (page - 1) * limit;
    const matchQuery = { isDeleted: false };
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
        user_model_1.default.aggregate([
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
        user_model_1.default.countDocuments(matchQuery),
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
exports.getAllUsers = getAllUsers;
/**
 * Get detailed profile for a specific user, including their documents and chats
 */
const getUserDetails = async (userId) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
        throw new ApiError_1.default("Invalid user ID", http_status_1.default.BAD_REQUEST);
    }
    const user = await user_model_1.default.findOne({ _id: new mongoose_1.default.Types.ObjectId(userId), isDeleted: false }, { password: 0 }).lean();
    if (!user) {
        throw new ApiError_1.default("User not found", http_status_1.default.NOT_FOUND);
    }
    const [documents, chats, images] = await Promise.all([
        rag_document_model_1.default.find({ userId: user._id }).sort({ createdAt: -1 }).lean(),
        rag_chat_model_1.default.find({ userId: user._id })
            .populate("documentId", "fileName")
            .sort({ updatedAt: -1 })
            .lean(),
        rag_image_model_1.default.find({ userId: user._id }).sort({ createdAt: -1 }).lean(),
    ]);
    return {
        user,
        documents,
        chats,
        images,
    };
};
exports.getUserDetails = getUserDetails;
/**
 * Update user status or role
 */
const updateUserStatus = async (userId, updateBody) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
        throw new ApiError_1.default("Invalid user ID", http_status_1.default.BAD_REQUEST);
    }
    const user = await user_model_1.default.findById(userId);
    if (!user || user.isDeleted) {
        throw new ApiError_1.default("User not found", http_status_1.default.NOT_FOUND);
    }
    if (updateBody.status) {
        user.status = updateBody.status;
    }
    if (updateBody.role) {
        user.role = updateBody.role;
    }
    if (typeof updateBody.isEmailVerified === "boolean") {
        user.isEmailVerified = updateBody.isEmailVerified;
    }
    await user.save();
    return user;
};
exports.updateUserStatus = updateUserStatus;
/**
 * Get all platform documents with pagination, filtering, and owner information
 */
const getAllDocuments = async (filter) => {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filter.limit) || 10));
    const skip = (page - 1) * limit;
    const matchQuery = {};
    if (filter.fileType && filter.fileType !== "all") {
        matchQuery.fileType = filter.fileType;
    }
    if (filter.status && filter.status !== "all") {
        matchQuery.status = filter.status;
    }
    if (filter.userId && mongoose_1.default.Types.ObjectId.isValid(filter.userId)) {
        matchQuery.userId = new mongoose_1.default.Types.ObjectId(filter.userId);
    }
    if (filter.search && filter.search.trim()) {
        matchQuery.fileName = new RegExp(filter.search.trim(), "i");
    }
    const [documents, totalCount] = await Promise.all([
        rag_document_model_1.default.find(matchQuery)
            .populate("userId", "name email role status")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        rag_document_model_1.default.countDocuments(matchQuery),
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
exports.getAllDocuments = getAllDocuments;
/**
 * Get document details along with associated chat sessions
 */
const getDocumentDetails = async (documentId) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(documentId)) {
        throw new ApiError_1.default("Invalid document ID", http_status_1.default.BAD_REQUEST);
    }
    const document = await rag_document_model_1.default.findById(documentId)
        .populate("userId", "name email role")
        .lean();
    if (!document) {
        throw new ApiError_1.default("Document not found", http_status_1.default.NOT_FOUND);
    }
    const [chats, chunkCount] = await Promise.all([
        rag_chat_model_1.default.find({ documentId: document._id })
            .populate("userId", "name email")
            .sort({ updatedAt: -1 })
            .lean(),
        rag_chunk_model_1.default.countDocuments({ documentId: document._id }),
    ]);
    return {
        document,
        chunkCount,
        chats,
    };
};
exports.getDocumentDetails = getDocumentDetails;
/**
 * Admin delete document and all its chunks and related chats
 */
const deleteDocumentAdmin = async (documentId) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(documentId)) {
        throw new ApiError_1.default("Invalid document ID", http_status_1.default.BAD_REQUEST);
    }
    const doc = await rag_document_model_1.default.findById(documentId);
    if (!doc) {
        throw new ApiError_1.default("Document not found", http_status_1.default.NOT_FOUND);
    }
    await Promise.all([
        rag_chunk_model_1.default.deleteMany({ documentId: doc._id }),
        rag_chat_model_1.default.deleteMany({ documentId: doc._id }),
        rag_document_model_1.default.findByIdAndDelete(doc._id),
    ]);
    return { success: true };
};
exports.deleteDocumentAdmin = deleteDocumentAdmin;
/**
 * Get all chats across all users with search, filtering, and message summaries
 */
const getAllChats = async (filter) => {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filter.limit) || 10));
    const skip = (page - 1) * limit;
    const matchQuery = {};
    if (filter.chatType && filter.chatType !== "all") {
        matchQuery.chatType = filter.chatType;
    }
    if (filter.userId && mongoose_1.default.Types.ObjectId.isValid(filter.userId)) {
        matchQuery.userId = new mongoose_1.default.Types.ObjectId(filter.userId);
    }
    if (filter.search && filter.search.trim()) {
        matchQuery.title = new RegExp(filter.search.trim(), "i");
    }
    const [chats, totalCount] = await Promise.all([
        rag_chat_model_1.default.find(matchQuery, {
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
        rag_chat_model_1.default.countDocuments(matchQuery),
    ]);
    // Map to include total message count
    const chatIds = chats.map((c) => c._id);
    const countsAgg = await rag_chat_model_1.default.aggregate([
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
exports.getAllChats = getAllChats;
/**
 * Get full chat details including complete message transcript and sources
 */
const getChatDetails = async (chatId) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(chatId)) {
        throw new ApiError_1.default("Invalid chat ID", http_status_1.default.BAD_REQUEST);
    }
    const chat = await rag_chat_model_1.default.findById(chatId)
        .populate("userId", "name email role")
        .populate("documentId", "fileName fileUrl fileType")
        .populate("documentIds", "fileName fileUrl fileType")
        .lean();
    if (!chat) {
        throw new ApiError_1.default("Chat not found", http_status_1.default.NOT_FOUND);
    }
    return { chat };
};
exports.getChatDetails = getChatDetails;
/**
 * Get all user generated images with pagination and search across all users
 */
const getAllImages = async (filter) => {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filter.limit) || 12));
    const skip = (page - 1) * limit;
    const matchQuery = {};
    if (filter.userId && mongoose_1.default.Types.ObjectId.isValid(filter.userId)) {
        matchQuery.userId = new mongoose_1.default.Types.ObjectId(filter.userId);
    }
    if (filter.search && filter.search.trim()) {
        matchQuery.prompt = new RegExp(filter.search.trim(), "i");
    }
    const [images, totalCount] = await Promise.all([
        rag_image_model_1.default.find(matchQuery, { promptEmbedding: 0 })
            .populate("userId", "name email role")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        rag_image_model_1.default.countDocuments(matchQuery),
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
exports.getAllImages = getAllImages;
/**
 * Admin delete generated image from Cloudinary and database
 */
const deleteImageAdmin = async (imageId) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(imageId)) {
        throw new ApiError_1.default("Invalid image ID", http_status_1.default.BAD_REQUEST);
    }
    const image = await rag_image_model_1.default.findById(imageId);
    if (!image) {
        throw new ApiError_1.default("Image not found", http_status_1.default.NOT_FOUND);
    }
    // Delete from Cloudinary if URL exists
    if (image.cloudinaryUrl) {
        try {
            const { deleteImageByUrl } = await Promise.resolve().then(() => __importStar(require("../utils/cloudinary")));
            await deleteImageByUrl(image.cloudinaryUrl);
        }
        catch {
            // Continue to delete from DB if Cloudinary deletion errors
        }
    }
    await rag_image_model_1.default.findByIdAndDelete(imageId);
    (0, indexing_service_1.notifyGoogleIndexing)((0, seo_service_1.getImagePageUrl)(image), "URL_DELETED");
    return { success: true };
};
exports.deleteImageAdmin = deleteImageAdmin;
