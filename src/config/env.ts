import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3000),
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN é obrigatório'),
  TELEGRAM_ALLOWED_USER: z.string().min(1, 'TELEGRAM_ALLOWED_USER é obrigatório'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY é obrigatório'),
  GEMINI_MODEL: z.string().default('gemini-2.5-pro'),
  GEMINI_IMAGE_MODEL: z.string().default('gemini-2.0-flash-preview-image-generation'),
  GEMINI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.72),
  GHOST_URL: z.string().url(),
  GHOST_ADMIN_API_URL: z.string().url(),
  GHOST_ADMIN_KEY: z.string().min(1, 'GHOST_ADMIN_KEY é obrigatório'),
  GHOST_AUTHOR_ID: z.string().optional().default(''),
  LOG_LEVEL: z.string().default('info'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
  IMAGE_STYLE: z.string().default('cyberpunk'),
  IMAGE_WIDTH: z.coerce.number().default(1792),
  IMAGE_HEIGHT: z.coerce.number().default(1024),
  SQLITE_PATH: z.string().default('./storage/database.sqlite'),
  QUEUE_CONCURRENCY: z.coerce.number().int().positive().default(1),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(90000),
  RETRY_ATTEMPTS: z.coerce.number().int().positive().default(3),
  TZ: z.string().default('America/Sao_Paulo'),
});

export const env = EnvSchema.parse(process.env);
