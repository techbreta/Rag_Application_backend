"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalError = exports.ApiError = void 0;
const ApiError_1 = __importDefault(require("./ApiError"));
exports.ApiError = ApiError_1.default;
const error_1 = __importDefault(require("./error"));
exports.GlobalError = error_1.default;
