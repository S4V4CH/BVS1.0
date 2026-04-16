import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3000').transform(Number),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.string().url(),
  STELLAR_NETWORK: z.enum(['TESTNET', 'PUBLIC']).default('TESTNET'),
  STELLAR_ISSUER_SECRET: z.string().min(50), // Clave secreta (solo in-memory)
  WEBHOOK_URL: z.string().url(),
});

// Parsea y gesticula un error fatal si falta algo en inicialización
export const env = envSchema.parse(process.env);
