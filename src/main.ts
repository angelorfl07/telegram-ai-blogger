import fs from 'fs';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { migrateDatabase } from './database/client';
import { createBot } from './bot/bot';
import { logger } from './utils/logger';
import { getHealth } from './services/healthService';

async function bootstrap() {
  fs.mkdirSync('logs', { recursive: true });
  fs.mkdirSync('storage/images', { recursive: true });
  migrateDatabase();

  const app = express();
  app.use(helmet());
  app.use(express.json({ limit: '2mb' }));
  app.use(rateLimit({ windowMs: env.RATE_LIMIT_WINDOW_MS, limit: env.RATE_LIMIT_MAX }));
  app.get('/health', (_req, res) => res.json(getHealth()));

  const server = app.listen(env.PORT, () => logger.info(`HTTP healthcheck iniciado na porta ${env.PORT}`));

  const bot = createBot();
  await bot.launch();
  logger.info('Bot Telegram iniciado em modo long polling');

  const shutdown = async (signal: string) => {
    logger.info(`Recebido ${signal}; encerrando com segurança...`);
    bot.stop(signal);
    server.close(() => process.exit(0));
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  logger.error('Falha fatal ao iniciar aplicação', { error });
  process.exit(1);
});
