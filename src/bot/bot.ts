import { Telegraf } from 'telegraf';
import { env } from '../config/env';
import { addEvent, getPost, getRecentPosts, markPostPublished, markPostStatus, saveGeneratedPost, updatePostPayload } from '../database/client';
import { authorizeTelegramUser } from '../middleware/security';
import { publishPostToGhost } from '../ghost/ghostClient';
import { createGeneratedPost } from '../services/postService';
import { getAnalyticsSummary } from '../services/analyticsService';
import type { GeneratedPost } from '../types';
import { AsyncQueue } from '../utils/queue';
import { logger } from '../utils/logger';
import { buildTelegramPreview } from './preview';

interface SessionState { postId?: number; generated?: GeneratedPost; }
const sessions = new Map<string, SessionState>();
const queue = new AsyncQueue(env.QUEUE_CONCURRENCY);

function sessionKey(chatId: number | string | undefined): string { return String(chatId ?? 'unknown'); }
function extractTopic(text: string): string { return text.replace(/^\/novopost(@\w+)?\s*/i, '').trim(); }

async function sendPreview(ctx: any, generated: GeneratedPost): Promise<void> {
  const preview = buildTelegramPreview(generated);
  if (generated.image?.localPath) {
    await ctx.replyWithPhoto({ source: generated.image.localPath }, { caption: preview.slice(0, 1024) });
    if (preview.length > 1024) await ctx.reply(preview.slice(1024));
  } else {
    await ctx.reply(preview);
  }
}

export function createBot(): Telegraf {
  const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);
  bot.use(authorizeTelegramUser);

  bot.start(async (ctx) => {
    await ctx.reply('Bot Telegram AI Blogger ativo. Use /novopost tema para gerar um artigo SEO completo.');
  });

  bot.help(async (ctx) => {
    await ctx.reply([
      'Comandos:',
      '/start — iniciar',
      '/status — status e analytics',
      '/novopost tema — gerar artigo SEO',
      '/rewrite — reescrever o rascunho atual',
      '/postar — publicar no Ghost CMS',
      '/cancelar — cancelar rascunho',
      '/logs — últimos posts registrados',
    ].join('\n'));
  });

  bot.command('status', async (ctx) => {
    const analytics = getAnalyticsSummary();
    await ctx.reply(`Status: online\nFila: ${JSON.stringify(queue.stats())}\nSEO médio: ${analytics.avgSeoScore}\nPosts por status: ${analytics.totals.map((t) => `${t.status}=${t.count}`).join(', ') || '0'}`);
  });

  bot.command('logs', async (ctx) => {
    const posts = getRecentPosts(10);
    if (!posts.length) return ctx.reply('Nenhum histórico encontrado.');
    return ctx.reply(posts.map((p) => `#${p.id} | ${p.status} | ${p.title} | ${p.ghost_url ?? p.slug}`).join('\n'));
  });

  bot.command('novopost', async (ctx) => {
    const topic = extractTopic((ctx.message as any).text ?? '');
    if (!topic || topic.length < 5) return ctx.reply('Envie um tema válido. Exemplo: /novopost Como usar IA com Node.js');
    const key = sessionKey(ctx.chat?.id);
    await ctx.reply('Gerando artigo SEO, imagem destacada e prévia. Isso pode levar alguns minutos...');

    try {
      await queue.enqueue(async () => {
        const generated = await createGeneratedPost(topic, 'new', true);
        const postId = saveGeneratedPost(String(ctx.from?.id), key, generated);
        sessions.set(key, { postId, generated });
        addEvent('info', 'Post gerado com sucesso', { topic }, postId);
        await sendPreview(ctx, generated);
        await ctx.reply('Deseja publicar? Responda com /postar, /rewrite ou /cancelar. Também aceito: poste, reescreva, cancelar.');
      });
    } catch (error) {
      logger.error('Falha ao gerar novo post', { error, topic });
      await ctx.reply('Falha ao gerar o post. Verifique as chaves de API, logs e tente novamente.');
    }
  });

  bot.command('rewrite', async (ctx) => {
    const key = sessionKey(ctx.chat?.id);
    const state = sessions.get(key);
    if (!state?.generated || !state.postId) return ctx.reply('Não há rascunho ativo para reescrever. Use /novopost tema.');
    await ctx.reply('Reescrevendo artigo com nova abordagem SEO...');
    try {
      await queue.enqueue(async () => {
        const generated = await createGeneratedPost(state.generated!.topic, 'rewrite', false);
        updatePostPayload(state.postId!, generated, 'rewritten');
        sessions.set(key, { postId: state.postId, generated });
        addEvent('info', 'Post reescrito com sucesso', { topic: generated.topic }, state.postId);
        await sendPreview(ctx, generated);
        await ctx.reply('Nova versão pronta. Use /postar para publicar ou /rewrite para reescrever novamente.');
      });
    } catch (error) {
      logger.error('Falha ao reescrever post', { error });
      await ctx.reply('Falha ao reescrever. Consulte os logs e tente novamente.');
    }
  });

  bot.command('postar', async (ctx) => {
    const key = sessionKey(ctx.chat?.id);
    const state = sessions.get(key);
    if (!state?.generated || !state.postId) return ctx.reply('Não há rascunho ativo para publicar.');
    await ctx.reply('Publicando no Ghost CMS...');
    try {
      const published = await queue.enqueue(() => publishPostToGhost(state.generated!));
      markPostPublished(state.postId, published.url);
      addEvent('info', 'Post publicado', { url: published.url }, state.postId);
      sessions.delete(key);
      await ctx.reply(`Publicado com sucesso: ${published.url}`);
    } catch (error) {
      logger.error('Falha ao publicar no Ghost', { error });
      await ctx.reply('Falha ao publicar no Ghost CMS. Verifique GHOST_ADMIN_KEY, URL, permissões e logs.');
    }
  });

  bot.command('cancelar', async (ctx) => {
    const key = sessionKey(ctx.chat?.id);
    const state = sessions.get(key);
    if (state?.postId) markPostStatus(state.postId, 'cancelled');
    sessions.delete(key);
    await ctx.reply('Rascunho cancelado.');
  });

  bot.hears(/^(sim|poste)$/i, async (ctx) => bot.handleUpdate({ ...ctx.update, message: { ...(ctx.message as any), text: '/postar' } } as any));
  bot.hears(/^(não|nao|cancelar)$/i, async (ctx) => bot.handleUpdate({ ...ctx.update, message: { ...(ctx.message as any), text: '/cancelar' } } as any));
  bot.hears(/^reescreva$/i, async (ctx) => bot.handleUpdate({ ...ctx.update, message: { ...(ctx.message as any), text: '/rewrite' } } as any));

  bot.catch((error, ctx) => {
    logger.error('Erro global do bot', { error, update: ctx.update });
  });

  return bot;
}
