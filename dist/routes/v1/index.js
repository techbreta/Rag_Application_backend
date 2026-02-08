"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_route_1 = __importDefault(require("./auth.route"));
const user_route_1 = __importDefault(require("./user.route"));
const rag_route_1 = __importDefault(require("./rag.route"));
const router = express_1.default.Router();
const defaultIRoute = [
    {
        path: "/auth",
        route: auth_route_1.default,
    },
    {
        path: "/users",
        route: user_route_1.default,
    },
    {
        path: "/rag",
        route: rag_route_1.default,
    },
];
// Globally Routes
defaultIRoute.forEach((route) => {
    router.use(route.path, route.route);
});
exports.default = router;
