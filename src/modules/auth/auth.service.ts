import httpStatus from 'http-status';
import mongoose from 'mongoose';
import Token from '../token/token.model';
import ApiError from '../errors/ApiError';
import tokenTypes from '../token/token.types';
import { getUserByEmail, getUserById, googleprofiledata, updateUserById } from '../user/user.service';
import { Iinvitation, IUserDoc, IUserWithTokens } from '../user/user.interfaces';
import { generateAuthTokens, verifyToken } from '../token/token.service';
import AppiError from '../errors/ApiError';

/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<IUserDoc>}
 */
export const loginUserWithEmailAndPassword = async (email: string, password: string): Promise<IUserDoc> => {
  const user = await getUserByEmail(email);
  if (user && user.providers.includes('google') && !user.password) {
    throw new ApiError('Please login using Google Sign-In', httpStatus.BAD_REQUEST);
  }

  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError('Incorrect email or password', httpStatus.UNAUTHORIZED);
  }
  return user;
};

/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise<void>}
 */
export const logout = async (refreshToken: string): Promise<void> => {
  const refreshTokenDoc = await Token.findOne({ token: refreshToken, type: tokenTypes.REFRESH, blacklisted: false });
  if (!refreshTokenDoc) {
    throw new ApiError('Not found', httpStatus.NOT_FOUND);
  }
  await refreshTokenDoc.deleteOne();
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<IUserWithTokens>}
 */
export const refreshAuth = async (refreshToken: string): Promise<IUserWithTokens> => {
  try {
    const refreshTokenDoc = await verifyToken(refreshToken, tokenTypes.REFRESH);
    const user = await getUserById(new mongoose.Types.ObjectId(refreshTokenDoc.user));
    if (!user) {
      throw new Error();
    }
    await refreshTokenDoc.deleteOne();
    const tokens = await generateAuthTokens(user);
    return { user, tokens };
  } catch (error) {
    throw new ApiError('Please authenticate', httpStatus.UNAUTHORIZED);
  }
};

export const AcceptInvitation = async (body: Iinvitation): Promise<IUserDoc> => {
  try {
    const { token, password, access_token } = body;
    const refreshTokenDoc = await verifyToken(token, tokenTypes.INVITE);
    console.log('refreshTokenDoc', refreshTokenDoc);
    const user = await getUserById(new mongoose.Types.ObjectId(refreshTokenDoc.user));
    if (!user) {
      throw new ApiError('User not found', httpStatus.NOT_FOUND);
    }
    if (user.googleId || user.password) {
      throw new ApiError('User already has credentials', httpStatus.BAD_REQUEST);
    }
    if (!access_token && !token) {
      throw new ApiError('access_token or token is required', httpStatus.BAD_REQUEST);
    }
    if (password) {
      user.password = password;
      user.providers = ['local'];
    }

    if (access_token) {
      const userData = await googleprofiledata(access_token);
      user.googleId = userData?.sub;
      if (userData?.email !== user.email) {
        throw new ApiError('Email mismatch with Google account', httpStatus.BAD_REQUEST);
      }
      user.providers.push('google');
    }
    user.isEmailVerified = true;
    await user.save();
    await Token.deleteMany({ user: user.id, type: tokenTypes.INVITE });
    return user;
  } catch (error) {
    console.error('Error accepting invitation:', error);
    throw new AppiError('Invitation acceptance failed', httpStatus.UNAUTHORIZED);
  }
};
/**
 * Reset password
 * @param {string} resetPasswordToken
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
export const resetPassword = async (resetPasswordToken: any, newPassword: string): Promise<void> => {
  try {
    const resetPasswordTokenDoc = await verifyToken(resetPasswordToken, tokenTypes.RESET_PASSWORD);
    const user = await getUserById(new mongoose.Types.ObjectId(resetPasswordTokenDoc.user));
    if (!user) {
      throw new Error();
    }
    await updateUserById(user.id, { password: newPassword });
    await Token.deleteMany({ user: user.id, type: tokenTypes.RESET_PASSWORD });
  } catch (error) {
    throw new ApiError('Password reset failed', httpStatus.UNAUTHORIZED);
  }
};

/**
 * Verify email
 * @param {string} verifyEmailToken
 * @returns {Promise<IUserDoc | null>}
 */
export const verifyEmail = async (verifyEmailToken: any): Promise<IUserDoc | null> => {
  try {
    const verifyEmailTokenDoc = await verifyToken(verifyEmailToken, tokenTypes.VERIFY_EMAIL);
    const user = await getUserById(new mongoose.Types.ObjectId(verifyEmailTokenDoc.user));
    if (!user) {
      throw new Error();
    }
    await Token.deleteMany({ user: user.id, type: tokenTypes.VERIFY_EMAIL });
    const updatedUser = await updateUserById(user.id, { isEmailVerified: true });
    return updatedUser;
  } catch (error) {
    throw new ApiError('Email verification failed', httpStatus.UNAUTHORIZED);
  }
};
