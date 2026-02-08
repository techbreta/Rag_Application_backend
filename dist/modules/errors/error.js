"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../logger");
const ApiError_1 = __importDefault(require("./ApiError"));
require('dotenv').config();
const handleCastErrorDB = (err) => {
    const message = `Invalid ${err["path"]}: ${err["value"]}.`;
    logger_1.logger.error(`Cast Error: ${message}`);
    return new ApiError_1.default(message, 400);
};
const handleDuplicateFieldsDB = (err) => {
    const field = Object.keys(err["keyPattern"])[0];
    const message = { [field]: `${field} already exist` };
    logger_1.logger.error(`Duplicate field error: ${JSON.stringify(message)}`);
    return new ApiError_1.default('Duplicate field error', 400, message);
};
const handleValidationErrorDB = (err) => {
    const fieldErrors = {};
    Object.values(err.errors).forEach((error) => {
        fieldErrors[error.path] = error.message;
    });
    logger_1.logger.error(`Validation error: ${JSON.stringify(fieldErrors)}`);
    return new ApiError_1.default('Validation error', 400, fieldErrors);
};
// JWT error handlers
const handleJWTError = () => new ApiError_1.default('Invalid token. Please log in again!', 401, {
    token: 'invalid token'
});
const handleJWTExpiredError = () => new ApiError_1.default('Your token has expired! Please log in again.', 401, {
    token: 'Token expired'
});
// Global error handler
const sendError = (err, error, _, res, _next) => {
    const response = {
        status: 'fail',
        message: err["message"] || error["message"] || 'An error occurred'
    };
    // Include field-specific errors if present
    if (err["fieldErrors"] || error["fieldErrors"]) {
        response.errors = err["fieldErrors"] || error["fieldErrors"];
    }
    return res.status(err["statusCode"] || 400).json(response);
};
const GlobalError = (err, req, _, next) => {
    logger_1.logger.error('Error:', err);
    let error = { ...err };
    error["message"] = err['message'] || 'An unexpected error occurred';
    // Customize MongoDB or JWT errors
    if (err["name"] === 'CastError')
        error = handleCastErrorDB(err);
    if (err["code"] === 11000)
        error = handleDuplicateFieldsDB(err);
    if (err["name"] === 'ValidationError')
        error = handleValidationErrorDB(err);
    if (err["name"] === 'JsonWebTokenError')
        error = handleJWTError();
    if (err["name"] === 'TokenExpiredError')
        error = handleJWTExpiredError();
    return sendError(error, error, req, _, next);
};
exports.default = GlobalError;
