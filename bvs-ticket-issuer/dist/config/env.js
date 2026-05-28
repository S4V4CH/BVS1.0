"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    PORT: zod_1.z.string().default('3000').transform(Number),
    LOG_LEVEL: zod_1.z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    DATABASE_URL: zod_1.z.string().url(),
    STELLAR_NETWORK: zod_1.z.enum(['TESTNET', 'PUBLIC']).default('TESTNET'),
    STELLAR_ISSUER_SECRET: zod_1.z.string().min(50), // Clave secreta (solo in-memory)
    WEBHOOK_URL: zod_1.z.string().url(),
});
// Parsea y gesticula un error fatal si falta algo en inicialización
exports.env = envSchema.parse(process.env);
