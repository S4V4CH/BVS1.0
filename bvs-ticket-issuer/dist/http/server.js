"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const fastify_1 = __importDefault(require("fastify"));
function createServer() {
    const server = (0, fastify_1.default)({
        logger: {
            level: process.env.LOG_LEVEL || 'info',
        }
    });
    return server;
}
