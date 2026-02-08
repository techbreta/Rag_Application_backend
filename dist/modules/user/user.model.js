"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const validator_1 = __importDefault(require("validator"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const paginate_1 = __importDefault(require("../paginate/paginate"));
const roles_1 = require("../../config/roles");
const google_libphonenumber_1 = __importDefault(require("google-libphonenumber"));
const { PhoneNumberUtil } = google_libphonenumber_1.default;
const phoneUtil = PhoneNumberUtil.getInstance();
const userSchema = new mongoose_1.default.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    profilePicture: {
        type: String,
        trim: true,
    },
    profilePictureKey: {
        type: String,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        validate(value) {
            if (!validator_1.default.isEmail(value)) {
                throw new Error("Invalid email");
            }
        },
    },
    providers: {
        type: [String],
        enum: ["google", "local"],
        default: [],
    },
    googleId: {
        type: String,
        trim: true,
        unique: true,
        sparse: true, // allows multiple users to have no googleId
    },
    contact: {
        type: String,
        trim: true,
        validate: {
            validator(value) {
                if (!value)
                    return true;
                try {
                    const number = phoneUtil.parseAndKeepRawInput(value);
                    return phoneUtil.isValidNumber(number);
                }
                catch (error) {
                    return false;
                }
            },
            message: "Invalid phone number for the specified country",
        },
    },
    password: {
        type: String,
        required: function () {
            // Required if 'local' is in providers array
            return (Array.isArray(this.providers) && this.providers.includes("local"));
        },
        trim: true,
        minlength: 8,
        validate(value) {
            if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
                throw new Error("Password must contain at least one letter and one number");
            }
        },
        private: true, // used by the toJSON plugin
    },
    role: {
        type: String,
        enum: roles_1.roles,
        default: "customer",
    },
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    status: {
        type: String,
        enum: ["active", "inactive", "pending"],
        default: "pending",
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    orgName: {
        type: String,
        trim: true,
    },
    stripeCustomerId: {
        type: String,
        unique: true,
        sparse: true, // allows multiple users to have no stripeCustomerId
    },
    stripeaccountid: {
        type: String,
        unique: true,
        sparse: true, // allows multiple users to have no stripeaccountid
    },
    activeChat: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Chat",
        default: null,
    },
    isOnline: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});
userSchema.plugin(paginate_1.default);
/**
 * Check if email is taken
 * @param {string} email - The user's email
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
userSchema.static("isEmailTaken", async function (email, excludeUserId) {
    const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
    return !!user;
});
/**
 * Check if password matches the user's password
 * @param {string} password
 * @returns {Promise<boolean>}
 */
userSchema.method("isPasswordMatch", async function (password) {
    const user = this;
    return bcryptjs_1.default.compare(password, user.password);
});
userSchema.pre("save", async function (next) {
    const user = this;
    if (user.isModified("password")) {
        user.password = await bcryptjs_1.default.hash(user.password, 8);
    }
    next();
});
const User = mongoose_1.default.model("User", userSchema);
exports.default = User;
