"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = exports.password = exports.objectId = void 0;
const custom_validation_1 = require("./custom.validation");
Object.defineProperty(exports, "objectId", { enumerable: true, get: function () { return custom_validation_1.objectId; } });
Object.defineProperty(exports, "password", { enumerable: true, get: function () { return custom_validation_1.password; } });
const validate_middleware_1 = __importDefault(require("./validate.middleware"));
exports.validate = validate_middleware_1.default;
