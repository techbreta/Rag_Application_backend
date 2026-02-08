import { ISubAdminDoc, IUserModel } from "./user.interfaces";
import User from "./user.model";
import mongoose from "mongoose";

const AdminSchema = new mongoose.Schema({
    adminOF: [{
        method: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subscription"
        },
        workspacePermissions: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: "Workspace",
            default: []
        }
    }],
    
});

const admin = User.discriminator<ISubAdminDoc, IUserModel>(
    "admin",
    AdminSchema
);

export default admin;