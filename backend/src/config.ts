import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env if present (fails silently if file does not exist)
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('127.0.0.1'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.format());
  throw new Error('Failed to parse environment configuration.');
}

export const config = parsed.data;
