"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeBackground = void 0;
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const ApiError_1 = __importDefault(require("../errors/ApiError"));
const image_service_1 = require("./image.service");
exports.removeBackground = (0, catchAsync_1.default)(async (req, res) => {
    const { imageUrl } = req.body;
    if (!imageUrl) {
        throw new ApiError_1.default("imageUrl is required in request body", 400, {
            imageUrl: "imageUrl is required",
        });
    }
    const outBuffer = await (0, image_service_1.removeBackgroundBufferFromUrl)(imageUrl);
    // Stream result back to the client
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", "inline; filename=output.png");
    const stream = (0, image_service_1.bufferToStream)(outBuffer);
    stream.pipe(res);
});
