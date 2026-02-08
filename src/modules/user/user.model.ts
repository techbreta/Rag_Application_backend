import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcryptjs";

import paginate from "../paginate/paginate";
import { roles } from "../../config/roles";
import { IUserDoc, IUserModel } from "./user.interfaces";
import pk from "google-libphonenumber";
const { PhoneNumberUtil } = pk;
const phoneUtil = PhoneNumberUtil.getInstance();
const userSchema = new mongoose.Schema<IUserDoc, IUserModel>(
  {
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
      validate(value: string) {
        if (!validator.isEmail(value)) {
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
        validator(value: string) {
          if (!value) return true;
          try {
            const number = phoneUtil.parseAndKeepRawInput(value);
            return phoneUtil.isValidNumber(number);
          } catch (error) {
            return false;
          }
        },
        message: "Invalid phone number for the specified country",
      },
    },
    password: {
      type: String,
      required: function (this: any) {
        // Required if 'local' is in providers array
        return (
          Array.isArray(this.providers) && this.providers.includes("local")
        );
      },
      trim: true,
      minlength: 8,
      validate(value: string) {
        if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
          throw new Error(
            "Password must contain at least one letter and one number"
          );
        }
      },
      private: true, // used by the toJSON plugin
    },
    role: {
      type: String,
      enum: roles,
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
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      default: null,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);


userSchema.plugin(paginate);

/**
 * Check if email is taken
 * @param {string} email - The user's email
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
userSchema.static(
  "isEmailTaken",
  async function (
    email: string,
    excludeUserId: mongoose.ObjectId
  ): Promise<boolean> {
    const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
    return !!user;
  }
);

/**
 * Check if password matches the user's password
 * @param {string} password
 * @returns {Promise<boolean>}
 */
userSchema.method(
  "isPasswordMatch",
  async function (password: string): Promise<boolean> {
    const user = this;
    return bcrypt.compare(password, user.password);
  }
);

userSchema.pre("save", async function (next) {
  const user = this;
  if (user.isModified("password")) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

const User = mongoose.model<IUserDoc, IUserModel>("User", userSchema);

export default User;
