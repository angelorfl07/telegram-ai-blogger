import path from 'path';
import winston from 'winston';
import { env } from '../config/env';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: logFormat,
  defaultMeta: { service: 'telegram-ai-blogger' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
    new winston.transports.File({ filename: path.resolve('logs/error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.resolve('logs/combined.log') }),
  ],
});
