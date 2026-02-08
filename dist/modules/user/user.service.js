"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserById = exports.updateUserById = exports.getUserByEmail = exports.getUsers = exports.getUserById = exports.queryUsers = exports.getme = exports.loginWithGoogle = exports.googleprofiledata = exports.registerUser = exports.createUser = void 0;
const http_status_1 = __importDefault(require("http-status"));
const user_model_1 = __importDefault(require("./user.model"));
const ApiError_1 = __importDefault(require("../errors/ApiError"));
const axios_1 = __importDefault(require("axios"));
const user_model_2 = __importDefault(require("./user.model"));
const email_service_1 = require("../email/email.service");
const token_1 = require("../token");
/**
 * Create a user
 * @param {NewCreatedUser} userBody
 * @returns {Promise<IUserDoc>}
 */
const createUser = async (userBody) => {
    if (await user_model_1.default.isEmailTaken(userBody.email)) {
        throw new ApiError_1.default("Email already taken", http_status_1.default.BAD_REQUEST);
    }
    const user = await user_model_2.default.create({ ...userBody, role: "subAdmin" });
    console.log("user create before create token", user);
    const inviteToken = await token_1.tokenService.generateInviteToken(userBody.email);
    const inviteUrl = `${process.env["CLIENT_URL"]}/invite?email=${encodeURIComponent(userBody.email)}&token=${inviteToken}`;
    const htmlbodyforsendpassword = `
    <p>Welcome to EventPlace, ${userBody.name}!</p>
    <p>Email: ${userBody.email}</p>
    <p>Please click the button below to accept your invitation and set your password or proceed with Google:</p>
    <a href="${inviteUrl}" style="display:inline-block;padding:10px 20px;background:#007bff;color:#fff;text-decoration:none;border-radius:4px;">Accept Invitation</a>
    <p>If you did not expect this invitation, you can ignore this email.</p>
  `;
    (0, email_service_1.sendEmail)(userBody.email, "Welcome to Tellust! Accept Your Invitation", "", htmlbodyforsendpassword);
    return user;
};
exports.createUser = createUser;
/**
 * Register a user
 * @param {NewRegisteredUser} userBody
 * @returns {Promise<IUserDoc>}
 */
const registerUser = async (userBody) => {
    if (await user_model_1.default.isEmailTaken(userBody.email)) {
        throw new ApiError_1.default("Email already taken", http_status_1.default.BAD_REQUEST);
    }
    const user = await user_model_1.default.create({
        ...userBody,
        isEmailVerified: true,
        role: "customer",
        providers: ["local"],
    });
    return user;
};
exports.registerUser = registerUser;
const googleprofiledata = async (access_token) => {
    try {
        const response = await axios_1.default.get("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        });
        return response.data;
    }
    catch (error) {
        console.error("Error fetching Google profile data:", error);
        throw new ApiError_1.default("Failed to fetch Google profile data", http_status_1.default.UNAUTHORIZED);
    }
};
exports.googleprofiledata = googleprofiledata;
const loginWithGoogle = async (body) => {
    const { access_token, role } = body;
    if (!access_token) {
        throw new ApiError_1.default("Access token is required", http_status_1.default.BAD_REQUEST, {
            access_token: "access_token is required",
        });
    }
    let userData;
    try {
        const response = await (0, exports.googleprofiledata)(access_token);
        userData = response;
    }
    catch (err) {
        console.error("Google token error:", err.response?.data || err.message);
        throw new ApiError_1.default("Invalid or expired Google access token", http_status_1.default.UNAUTHORIZED);
    }
    console.log("userData", userData);
    const email = userData?.email;
    if (!email) {
        throw new ApiError_1.default("Google account did not return an email", http_status_1.default.BAD_REQUEST);
    }
    let user = await user_model_1.default.findOne({ email });
    if (user && user.providers.includes("local")) {
        throw new ApiError_1.default("This email is already registered. Please log in using your email and password", http_status_1.default.BAD_REQUEST);
    }
    if (user) {
        let needsUpdate = false;
        if (!user.providers.includes("google")) {
            user.providers.push("google");
            needsUpdate = true;
        }
        if (!user.googleId) {
            user.googleId = userData?.sub;
            needsUpdate = true;
        }
        if (!user.isEmailVerified) {
            user.isEmailVerified = true;
            needsUpdate = true;
        }
        if (needsUpdate) {
            await user.save();
        }
        return user;
    }
    if (!user && !role) {
        throw new ApiError_1.default("Please Create Account with Role", http_status_1.default.BAD_REQUEST, { role: "role is required" });
    }
    // Create a new user
    user = await user_model_1.default.create({
        googleId: userData?.sub,
        name: userData?.given_name || "Unknown",
        role: role,
        email,
        isEmailVerified: true,
        providers: ["google"],
    });
    return user;
};
exports.loginWithGoogle = loginWithGoogle;
const getme = async (userId) => {
    const users = await user_model_1.default.aggregate([
        { $match: { _id: userId, isDeleted: false } },
        { $project: { password: 0 } },
    ]);
    if (!users || users.length === 0) {
        throw new ApiError_1.default("User not found", http_status_1.default.NOT_FOUND);
    }
    return users[0];
};
exports.getme = getme;
/**
 * Query for users
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryUsers = async (filter, options) => {
    const users = await user_model_1.default.paginate(filter, options);
    return users;
};
exports.queryUsers = queryUsers;
/**
 * Get user by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<IUserDoc | null>}
 */
const getUserById = async (id) => {
    const user = await user_model_1.default.findOne({ _id: id, isDeleted: false });
    return user;
};
exports.getUserById = getUserById;
const getUsers = async (data) => {
    const { page, limit, role = "subAdmin", userId, search } = data;
    const matchStage = { isDeleted: false };
    if (role) {
        matchStage.role = role;
    }
    if (userId) {
        matchStage.createdBy = userId;
    }
    if (search) {
        matchStage.$or = [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { phone: { $regex: search, $options: "i" } },
            { role: { $regex: search, $options: "i" } },
        ];
    }
    console.log("matchStage", matchStage);
    const total = await user_model_1.default.countDocuments(matchStage);
    const users = await user_model_1.default.aggregate([
        { $match: matchStage },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
    ]);
    return { users, total, page };
};
exports.getUsers = getUsers;
/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<IUserDoc | null>}
 */
const getUserByEmail = async (email) => {
    const user = await user_model_1.default.findOne({ email: email });
    if (!user) {
        throw new ApiError_1.default("User not found", http_status_1.default.NOT_FOUND);
    }
    return user;
};
exports.getUserByEmail = getUserByEmail;
/**
 * Update user by id
 * @param {mongoose.Types.ObjectId} userId
 * @param {UpdateUserBody} updateBody
 * @returns {Promise<IUserDoc | null>}
 */
const updateUserById = async (userId, updateBody) => {
    const user = await (0, exports.getUserById)(userId);
    if (!user) {
        throw new ApiError_1.default("User not found", http_status_1.default.NOT_FOUND);
    }
    if (updateBody.email && (await user_model_1.default.isEmailTaken(updateBody.email, userId))) {
        throw new ApiError_1.default("Email already taken", http_status_1.default.BAD_REQUEST);
    }
    Object.assign(user, updateBody);
    await user.save();
    return user;
};
exports.updateUserById = updateUserById;
/**
 * Delete user by id
 * @param {mongoose.Types.ObjectId} userId
 * @returns {Promise<IUserDoc | null>}
 */
const deleteUserById = async (userId) => {
    const user = await (0, exports.getUserById)(userId);
    if (!user) {
        throw new ApiError_1.default("User not found", http_status_1.default.NOT_FOUND);
    }
    user.isDeleted = true;
    await user.save();
    return user;
};
exports.deleteUserById = deleteUserById;
