import { Telegraf } from 'telegraf';
import { env } from '../config/env';
import { addEvent, getPost, getRecentPosts, markPostPublished, markPostStatus, saveGeneratedPost, updatePostPayload } from '../database/client';
import { authorizeTelegramUser } from '../middleware/security';
import { publishPostToGhost } from '../ghost/ghostClient';
import { createGeneratedPost } from '../services/postService';
import { getAnalyticsSummary } from '../services/analyticsService';
import type { GeneratedPost, SiteConfig } from '../types';
import { getSites, saveSite, getSiteById } from '../config/sites';
import { AsyncQueue } from '../utils/queue';
import { logger } from '../utils/logger';
import { buildTelegramPreview } from './preview';

interface SessionState { 
  postId?: number; 
  generated?: GeneratedPost; 
  step?: 'awaiting_site' | 'awaiting_topic' | 'awaiting_style' | 'awaiting_novosite_url' | 'awaiting_novosite_api' | 'awaiting_novosite_key' | 'awaiting_novosite_author';
  siteId?: string;
  topic?: string;
  imageStyle?: string;
  newSite?: Partial<SiteConfig>;
}
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
      '/novosite — cadastrar um novo site Ghost',
      '/novopost — gerar artigo SEO passo a passo',
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

  bot.command('novosite', async (ctx) => {
    const key = sessionKey(ctx.chat?.id);
    sessions.set(key, { step: 'awaiting_novosite_url', newSite: {} });
    await ctx.reply('Vamos cadastrar um novo site. Qual a URL pública do site? (ex: https://meusite.com)');
  });

  bot.command('novopost', async (ctx) => {
    const key = sessionKey(ctx.chat?.id);
    const sites = getSites();
    if (sites.length === 0) {
      return ctx.reply('Nenhum site cadastrado. Use /novosite para cadastrar o primeiro site.');
    }
    const siteList = sites.map((s, i) => `${i + 1} - ${s.url}`).join('\n');
    sessions.set(key, { step: 'awaiting_site' });
    await ctx.reply(`Em qual site você deseja publicar?\n${siteList}`);
  });

  bot.command('rewrite', async (ctx) => {
    const key = sessionKey(ctx.chat?.id);
    const state = sessions.get(key);
    if (!state?.generated || !state.postId) return ctx.reply('Não há rascunho ativo para reescrever. Use /novopost tema.');
    await ctx.reply('Reescrevendo artigo com nova abordagem SEO...');
    try {
      await queue.enqueue(async () => {
        const generated = await createGeneratedPost(state.generated!.topic, 'rewrite', false, state.imageStyle || 'Fotorrealista Premium');
        updatePostPayload(state.postId!, generated, 'rewritten');
        sessions.set(key, { ...state, generated });
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
    if (!state?.generated || !state.postId || !state.siteId) return ctx.reply('Não há rascunho ativo para publicar ou site não selecionado.');
    const site = getSiteById(state.siteId);
    if (!site) return ctx.reply('Site selecionado não foi encontrado.');

    await ctx.reply('Publicando no Ghost CMS...');
    try {
      const published = await queue.enqueue(() => publishPostToGhost(state.generated!, site));
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

  const IMAGE_STYLES = [
    'Fotorrealista Premium',
    'Ilustração Vetorial Flat',
    'Minimalista / Clean',
    '3D Render Isométrico',
    'Neon / Dark Mode'
  ];

  bot.on('text', async (ctx, next) => {
    const text = (ctx.message as any).text?.trim();
    if (!text || text.startsWith('/')) return next();

    const key = sessionKey(ctx.chat?.id);
    const state = sessions.get(key);
    if (!state || !state.step) return next();

    if (state.step === 'awaiting_novosite_url') {
      state.newSite!.url = text;
      state.step = 'awaiting_novosite_api';
      sessions.set(key, state);
      return ctx.reply('Qual a Admin API URL do Ghost? (ex: https://meusite.com/ghost/api/admin)');
    }
    if (state.step === 'awaiting_novosite_api') {
      state.newSite!.apiUrl = text;
      state.step = 'awaiting_novosite_key';
      sessions.set(key, state);
      return ctx.reply('Qual a Admin API Key?');
    }
    if (state.step === 'awaiting_novosite_key') {
      state.newSite!.adminKey = text;
      state.step = 'awaiting_novosite_author';
      sessions.set(key, state);
      return ctx.reply('Qual o ID do Autor para este site?');
    }
    if (state.step === 'awaiting_novosite_author') {
      state.newSite!.authorId = text;
      saveSite(state.newSite as Omit<SiteConfig, 'id'>);
      sessions.delete(key);
      return ctx.reply('Site cadastrado com sucesso! Use /novopost para iniciar.');
    }

    if (state.step === 'awaiting_site') {
      const index = parseInt(text) - 1;
      const sites = getSites();
      if (isNaN(index) || index < 0 || index >= sites.length) {
        return ctx.reply('Número inválido. Por favor, escolha um número da lista.');
      }
      state.siteId = sites[index].id;
      state.step = 'awaiting_topic';
      sessions.set(key, state);
      return ctx.reply('Sobre o que quer escrever?');
    }
    
    if (state.step === 'awaiting_topic') {
      state.topic = text;
      if (!state.topic || state.topic.length < 5) return ctx.reply('Envie um tema válido (mín. 5 caracteres).');
      state.step = 'awaiting_style';
      sessions.set(key, state);
      
      const styleList = IMAGE_STYLES.map((s, i) => `${i + 1} - ${s}`).join('\n');
      return ctx.reply(`Qual estilo de imagem deseja usar? (Escolha o número)\n${styleList}`);
    }

    if (state.step === 'awaiting_style') {
      const index = parseInt(text) - 1;
      if (isNaN(index) || index < 0 || index >= IMAGE_STYLES.length) {
        return ctx.reply('Número inválido. Escolha um número da lista de estilos.');
      }
      state.imageStyle = IMAGE_STYLES[index];
      state.step = undefined; 
      sessions.set(key, state);
      
      const site = getSiteById(state.siteId!);
      await ctx.reply(`Gerando artigo SEO para o site ${site?.url} com estilo ${state.imageStyle}. Isso pode levar alguns minutos...`);
      
      const topic = state.topic!;
      const imageStyle = state.imageStyle;
      
      try {
        await queue.enqueue(async () => {
          const generated = await createGeneratedPost(topic, 'new', true, imageStyle);
          const postId = saveGeneratedPost(String(ctx.from?.id), key, generated);
          sessions.set(key, { ...state, postId, generated, step: undefined });
          addEvent('info', 'Post gerado com sucesso', { topic }, postId);
          await sendPreview(ctx, generated);
          await ctx.reply('Deseja publicar? Responda com /postar, /rewrite ou /cancelar. Também aceito: poste, reescreva, cancelar.');
        });
      } catch (error) {
        logger.error('Falha ao gerar novo post', { error, topic });
        await ctx.reply('Falha ao gerar o post. Verifique as chaves de API, logs e tente novamente.');
      }
      return;
    }

    return next();
  });

  bot.catch((error, ctx) => {
    logger.error('Erro global do bot', { error, update: ctx.update });
  });

  return bot;
}
