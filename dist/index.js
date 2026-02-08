"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Canvas/DOM polyfills must load before anything that uses pdf-parse
require("./utils/canvas-polyfill");
const mongoose_1 = __importDefault(require("mongoose"));
const app_1 = __importDefault(require("./app"));
const config_1 = __importDefault(require("./config/config"));
const logger_1 = __importDefault(require("./modules/logger/logger"));
// import { seedPlans } from './modules/plans';
let server;
mongoose_1.default.connect(config_1.default.mongoose.url).then(() => {
    server = app_1.default.listen(config_1.default.port, () => {
        logger_1.default.info(`Listening to Port ${config_1.default.port}`);
    });
    // Increase server timeouts for long-running operations like Puppeteer
    server.timeout = 600000; // 10 minutes
    server.keepAliveTimeout = 610000; // 10 minutes + 10 seconds
    server.headersTimeout = 620000; // 10 minutes + 20 seconds
    logger_1.default.info("Connected to MongoDB database");
    logger_1.default.info("Server timeouts configured for long-running operations");
    // seedPlans();
});
const exitHandler = () => {
    if (server) {
        server.close(() => {
            logger_1.default.info("Server closed");
            process.exit(1);
        });
    }
    else {
        process.exit(1);
    }
};
const unexpectedErrorHandler = (error) => {
    logger_1.default.error(error);
    exitHandler();
};
process.on("uncaughtException", unexpectedErrorHandler);
process.on("unhandledRejection", unexpectedErrorHandler);
process.on("SIGTERM", () => {
    logger_1.default.info("SIGTERM received");
    if (server) {
        server.close();
    }
});
