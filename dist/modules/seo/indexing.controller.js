"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIndexingUrls = exports.getIndexingStats = void 0;
const http_status_1 = __importDefault(require("http-status"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const indexStatusService = __importStar(require("./indexStatus.service"));
exports.getIndexingStats = (0, catchAsync_1.default)(async (_req, res) => {
    const result = await indexStatusService.getIndexingStats();
    res.status(http_status_1.default.OK).send({
        status: "success",
        data: result,
    });
});
exports.getIndexingUrls = (0, catchAsync_1.default)(async (req, res) => {
    const { page, limit, search, submissionStatus, verdict } = req.query;
    const result = await indexStatusService.getIndexingUrls({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        search: search,
        submissionStatus: submissionStatus,
        verdict: verdict,
    });
    res.status(http_status_1.default.OK).send({
        status: "success",
        data: result,
    });
});
