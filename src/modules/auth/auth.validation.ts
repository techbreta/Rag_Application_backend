import Joi from "joi";
import { password } from "../validate/custom.validation";
import { NewRegisteredUser } from "../user/user.interfaces";

const registerBody: Record<keyof NewRegisteredUser, any> = {
  email: Joi.string().required().email(),
  password: Joi.string().required().custom(password),
  name: Joi.string().required(),
  contact: Joi.string().optional(),
  providers: Joi.array()
    .items(Joi.string().valid("google", "facebook"))
    .optional()
    .default(["local"]),
  googleId: Joi.string().optional(),
  status: Joi.string().valid("active", "inactive").default("active"),
  profilePicture: Joi.string().optional(),
  profilePictureKey: Joi.string().optional(),
  isDeleted: Joi.boolean().default(false),
  orgName: Joi.string().optional(),
  role: Joi.string().optional(),
  stripeaccountid: Joi.string().optional(),
  activeChat: Joi.string().optional().allow(null),
  isOnline: Joi.boolean().optional(),
};

export const register = {
  body: Joi.object().keys(registerBody),
};

export const login = {
  body: Joi.object().keys({
    email: Joi.string().required(),
    password: Joi.string().required(),
  }),
};

export const logout = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

export const refreshTokens = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

export const forgotPassword = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
  }),
};

export const resetPassword = {
  query: Joi.object().keys({
    token: Joi.string().required(),
  }),
  body: Joi.object().keys({
    password: Joi.string().required().custom(password),
  }),
};

export const verifyEmail = {
  query: Joi.object().keys({
    token: Joi.string().required(),
  }),
};

export const updatePassword = {
  body: Joi.object().keys({
    oldPassword: Joi.string().required(),
    password: Joi.string().required().custom(password),
  }),
};
