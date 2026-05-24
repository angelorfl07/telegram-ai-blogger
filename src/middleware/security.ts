import type { Context, MiddlewareFn } from 'telegraf';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const authorizeTelegramUser: MiddlewareFn<Context> = async (ctx, next) => {
  const allowed = env.TELEGRAM_ALLOWED_USER.trim();
  const userId = String(ctx.from?.id ?? '');
  const username = ctx.from?.username ? `@${ctx.from.username}` : '';
  const authorized = allowed === userId || allowed === username || allowed === ctx.from?.username;

  if (!authorized) {
    logger.warn('Acesso Telegram bloqueado', { userId, username, chatId: ctx.chat?.id });
    await ctx.reply('Acesso negado. Este bot está restrito ao administrador configurado.');
    return;
  }
  return next();
};
