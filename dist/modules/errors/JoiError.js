"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const JoiError = (error) => {
    const errorFields = error.details.reduce((acc, err) => {
        acc[err.context.key] = err.message.replace(/['"]/g, '');
        return acc;
    }, {});
    return errorFields;
};
exports.default = JoiError;
