"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleRights = exports.roles = void 0;
const allRoles = {
    admin: [
        "getUsers",
        "manageUsers",
        // Booking management"
    ],
    customer: [
        "getUsers",
        // Booking management
    ],
};
exports.roles = Object.keys(allRoles);
// Normalize allRoles so that each role maps to a string[]
const normalizedRoleRights = [];
for (const [role, rights] of Object.entries(allRoles)) {
    if (Array.isArray(rights)) {
        normalizedRoleRights.push([role, rights]);
    }
}
exports.roleRights = new Map(normalizedRoleRights);
