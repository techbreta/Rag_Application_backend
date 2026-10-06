"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const joi_1 = __importDefault(require("joi"));
require("dotenv/config");
// Copied into dist/ by tsc (see tsconfig "include"); gitignored, never committed
const bundledIndexingKeyFile = path_1.default.join(__dirname, "../modules/json/ragai-indexing-dab48234d203.json");
const envVarsSchema = joi_1.default.object()
    .keys({
    NODE_ENV: joi_1.default.string()
        .valid("production", "development", "test")
        .required(),
    PORT: joi_1.default.number().default(3000),
    MONGODB_URL: joi_1.default.string().required().description("Mongo DB url"),
    JWT_SECRET: joi_1.default.string().required().description("JWT secret key"),
    JWT_ACCESS_EXPIRATION_MINUTES: joi_1.default.number()
        .default(30)
        .description("minutes after which access tokens expire"),
    JWT_REFRESH_EXPIRATION_DAYS: joi_1.default.number()
        .default(30)
        .description("days after which refresh tokens expire"),
    JWT_RESET_PASSWORD_EXPIRATION_MINUTES: joi_1.default.number()
        .default(10)
        .description("minutes after which reset password token expires"),
    JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: joi_1.default.number()
        .default(10)
        .description("minutes after which verify email token expires"),
    SMTP_HOST: joi_1.default.string().description("server that will send the emails"),
    SMTP_PORT: joi_1.default.number().description("port to connect to the email server"),
    SMTP_USERNAME: joi_1.default.string().description("username for email server"),
    SMTP_PASSWORD: joi_1.default.string().description("password for email server"),
    EMAIL_FROM: joi_1.default.string().description("the from field in the emails sent by the app"),
    CLIENT_URL: joi_1.default.string().required().description("Client url"),
    FRONTEND_URL: joi_1.default.string().description("Frontend URL for Stripe return"),
    MISTRAL_API_KEY: joi_1.default.string()
        .required()
        .description("Mistral AI API key for embeddings and chat"),
    GOOGLE_INDEXING_KEY_FILE: joi_1.default.string().description("Path to the Google service account JSON key used for the Indexing API"),
    GOOGLE_INDEXING_CREDENTIALS: joi_1.default.string().description("Inline Google service account JSON (alternative to GOOGLE_INDEXING_KEY_FILE)"),
    GOOGLE_SEARCH_CONSOLE_SITE_URL: joi_1.default.string().description("Search Console property for index status checks, e.g. sc-domain:ragai.website or https://www.ragai.website/"),
})
    .unknown();
const { value: envVars, error } = envVarsSchema
    .prefs({ errors: { label: "key" } })
    .validate(process.env);
if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}
let googleIndexingCredentials;
if (envVars.GOOGLE_INDEXING_CREDENTIALS) {
    try {
        googleIndexingCredentials = JSON.parse(envVars.GOOGLE_INDEXING_CREDENTIALS);
    }
    catch {
        // Do not include the parse error: it can echo parts of the private key
        throw new Error("Config validation error: GOOGLE_INDEXING_CREDENTIALS is not valid JSON");
    }
}
const config = {
    env: envVars.NODE_ENV,
    port: envVars.PORT,
    mongoose: {
        url: envVars.MONGODB_URL + (envVars.NODE_ENV === "test" ? "-test" : ""),
        options: {
            useCreateIndex: true,
            useNewUrlParser: true,
            useUnifiedTopology: true,
        },
    },
    jwt: {
        secret: envVars.JWT_SECRET,
        accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
        refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
        resetPasswordExpirationMinutes: envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
        verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
        cookieOptions: {
            httpOnly: true,
            secure: envVars.NODE_ENV === "production",
            signed: true,
        },
    },
    email: {
        smtp: {
            host: envVars.SMTP_HOST,
            port: envVars.SMTP_PORT,
            auth: {
                user: envVars.SMTP_USERNAME,
                pass: envVars.SMTP_PASSWORD,
            },
        },
        from: envVars.EMAIL_FROM,
    },
    clientUrl: envVars.CLIENT_URL,
    mistralApiKey: envVars.MISTRAL_API_KEY,
    googleIndexing: {
        keyFile: envVars.GOOGLE_INDEXING_KEY_FILE ||
            (fs_1.default.existsSync(bundledIndexingKeyFile) ? bundledIndexingKeyFile : undefined),
        credentials: googleIndexingCredentials,
        searchConsoleSiteUrl: envVars.GOOGLE_SEARCH_CONSOLE_SITE_URL,
    },
};
exports.default = config;
