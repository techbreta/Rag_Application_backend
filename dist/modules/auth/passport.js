"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_jwt_1 = require("passport-jwt");
const token_types_1 = __importDefault(require("../token/token.types"));
const config_1 = __importDefault(require("../../config/config"));
const user_model_1 = __importDefault(require("../user/user.model"));
const jwtStrategy = new passport_jwt_1.Strategy({
    secretOrKey: config_1.default.jwt.secret,
    jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
}, async (payload, done) => {
    try {
        if (payload.type !== token_types_1.default.ACCESS) {
            throw new Error('Invalid token type');
        }
        const user = await user_model_1.default.findById(payload.sub);
        if (!user) {
            return done(null, false);
        }
        done(null, user);
    }
    catch (error) {
        done(error, false);
    }
});
exports.default = jwtStrategy;
