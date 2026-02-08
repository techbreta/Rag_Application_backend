"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const joi_1 = __importDefault(require("joi"));
const http_status_1 = __importDefault(require("http-status"));
const pick_1 = __importDefault(require("../utils/pick"));
const ApiError_1 = __importDefault(require("../errors/ApiError"));
const validate = (schema) => (req, _res, next) => {
    const validSchema = (0, pick_1.default)(schema, ['params', 'query', 'body']);
    const object = (0, pick_1.default)(req, Object.keys(validSchema));
    const { value, error } = joi_1.default.compile(validSchema)
        .prefs({ errors: { label: 'key' } })
        .validate(object, { abortEarly: false, convert: true, allowUnknown: true });
    if (error) {
        const errorFields = error.details.reduce((acc, err) => {
            acc[err.context.key] = err.message.replace(/['"]/g, '');
            return acc;
        }, {});
        return next(new ApiError_1.default("Invalid request", http_status_1.default.BAD_REQUEST, errorFields));
    }
    Object.assign(req, value);
    return next();
};
exports.default = validate;
