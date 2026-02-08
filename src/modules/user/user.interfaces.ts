import mongoose, { Model, Document } from "mongoose";
import { QueryResult } from "../paginate/paginate";
import { AccessAndRefreshTokens } from "../token/token.interfaces";

export interface IUser {
  name: string;
  email: string;
  password: string;
  contact?: string;
  role?: string;
  isEmailVerified: boolean;
  providers: string[];
  googleId?: string;
  stripeCustomerId?: string;
  status?: string;
  profilePicture?: string;
  profilePictureKey?: string;
  isDeleted?: boolean;
  orgName?: string;
  stripeaccountid?: string;
  activeChat?: mongoose.Types.ObjectId | null;
  isOnline?: boolean;
}

export interface IUserDoc extends IUser, Document {
  createdBy?: mongoose.Schema.Types.ObjectId;
  adminOF?: mongoose.Schema.Types.ObjectId[];
  subAdminRole?: string;
  roleId?: mongoose.Schema.Types.ObjectId;
  workspace?: mongoose.Schema.Types.ObjectId;
  isPasswordMatch(password: string): Promise<boolean>;
  findByIdAndUpdate(
    id: mongoose.Types.ObjectId,
    update: Partial<IUser>,
    options?: mongoose.QueryOptions
  ): Promise<IUserDoc | null>;
}

export interface IUserModel extends Model<IUserDoc> {
  isEmailTaken(
    email: string,
    excludeUserId?: mongoose.Types.ObjectId
  ): Promise<boolean>;
  paginate(
    filter: Record<string, any>,
    options: Record<string, any>
  ): Promise<QueryResult>;
}
export interface ISubAdmin extends IUser {
  createdBy: mongoose.Schema.Types.ObjectId;
  adminOF: mongoose.Schema.Types.ObjectId[];
  permissions: string[];
}

export interface ISubAdminDoc extends ISubAdmin, Document {
  isPasswordMatch(password: string): Promise<boolean>;
}

export type UpdateUserBody = Partial<IUser>;

export type NewRegisteredUser = Omit<
  IUser,
  "isEmailVerified" | "stripeCustomerId"
>;

export interface IUserWithTokens {
  user: IUserDoc;
  tokens: AccessAndRefreshTokens;
}

export interface Iinvitation {
  token: string;
  password: string;
  access_token: string;
}

export interface CreateNewUser extends IUser {
  adminOF?: [
    {
      method: mongoose.Schema.Types.ObjectId;
      workspacePermissions: mongoose.Schema.Types.ObjectId[];
    }
  ];
  subAdminRole: string;
  createdBy?: mongoose.Schema.Types.ObjectId;
}
export type NewCreatedUser = Omit<
  CreateNewUser,
  "isEmailVerified" | "stripeCustomerId"
>;

export interface IwithId extends IUserDoc {}
