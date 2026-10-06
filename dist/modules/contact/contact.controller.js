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
exports.deleteContact = exports.updateContact = exports.getAdminContact = exports.getContactStats = exports.getAdminContacts = exports.submitContact = void 0;
const http_status_1 = __importDefault(require("http-status"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const contactService = __importStar(require("./contact.service"));
exports.submitContact = (0, catchAsync_1.default)(async (req, res) => {
    const contact = await contactService.createContact(req.body);
    res.status(http_status_1.default.CREATED).send({
        status: "success",
        message: "Your inquiry has been submitted successfully. Our enterprise engineering team will reach out shortly.",
        data: contact,
    });
});
exports.getAdminContacts = (0, catchAsync_1.default)(async (req, res) => {
    const { page, limit, search, status, inquiryType } = req.query;
    const result = await contactService.getAdminContacts({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
        search: search,
        status: status,
        inquiryType: inquiryType,
    });
    res.status(http_status_1.default.OK).send({
        status: "success",
        data: result,
    });
});
exports.getContactStats = (0, catchAsync_1.default)(async (_req, res) => {
    const stats = await contactService.getContactStats();
    res.status(http_status_1.default.OK).send({
        status: "success",
        data: stats,
    });
});
exports.getAdminContact = (0, catchAsync_1.default)(async (req, res) => {
    const contact = await contactService.getContactById(req.params["contactId"]);
    res.status(http_status_1.default.OK).send({
        status: "success",
        data: contact,
    });
});
exports.updateContact = (0, catchAsync_1.default)(async (req, res) => {
    const contact = await contactService.updateContact(req.params["contactId"], req.body);
    res.status(http_status_1.default.OK).send({
        status: "success",
        message: "Inquiry updated successfully",
        data: contact,
    });
});
exports.deleteContact = (0, catchAsync_1.default)(async (req, res) => {
    await contactService.deleteContact(req.params["contactId"]);
    res.status(http_status_1.default.OK).send({
        status: "success",
        message: "Inquiry deleted successfully",
    });
});
