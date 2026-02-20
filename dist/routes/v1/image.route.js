"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const image_1 = require("../../modules/image");
const router = express_1.default.Router();
// Endpoint expects JSON body: { imageUrl: string }
router.post("/remove-background", image_1.imageController.removeBackground);
exports.default = router;
