import axios from 'axios';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { env } from '../config/env';
import { buildSeoArticlePrompt } from '../prompts/seoPrompt';
import { estimateSeoScore } from '../seo/scorer';
import type { SeoArticle } from '../types';
import { createSlug } from '../utils/slug';
import { withRetry } from '../utils/retry';

function extractJson(text: string): string {
  const trimmed = text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('A resposta do Gemini não contém JSON válido.');
  return trimmed.slice(start, end + 1);
}

function normalizeArticle(raw: Partial<SeoArticle>, topic: string): SeoArticle {
  const markdown = String(raw.contentMarkdown ?? `# ${topic}\n\nConteúdo não retornado corretamente pelo modelo.`);
  const html = sanitizeHtml(marked.parse(markdown) as string, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'script']),
    allowedAttributes: { a: ['href', 'name', 'target', 'rel'], img: ['src', 'alt'], script: ['type'] },
  });

  const article: SeoArticle = {
    title: String(raw.title ?? topic),
    seoTitle: String(raw.seoTitle ?? raw.title ?? topic).slice(0, 80),
    slug: createSlug(String(raw.slug ?? raw.title ?? topic)),
    metaDescription: String(raw.metaDescription ?? `Guia completo sobre ${topic}.`).slice(0, 160),
    keywords: Array.isArray(raw.keywords) ? raw.keywords.map(String).slice(0, 20) : [topic],
    summary: String(raw.summary ?? ''),
    excerpt: String(raw.excerpt ?? raw.summary ?? '').slice(0, 300),
    contentMarkdown: markdown,
    contentHtml: html,
    h1: String(raw.h1 ?? raw.title ?? topic),
    h2: Array.isArray(raw.h2) ? raw.h2.map(String) : [],
    h3: Array.isArray(raw.h3) ? raw.h3.map(String) : [],
    faq: Array.isArray(raw.faq) ? raw.faq.map((f) => ({ question: String(f.question), answer: String(f.answer) })) : [],
    jsonLd: typeof raw.jsonLd === 'object' && raw.jsonLd ? raw.jsonLd : {},
    tags: Array.isArray(raw.tags) ? raw.tags.map(String).slice(0, 12) : ['Tecnologia'],
    cta: String(raw.cta ?? 'Continue acompanhando o blog para mais guias técnicos e tendências de tecnologia.'),
    estimatedSeoScore: Number(raw.estimatedSeoScore ?? 0),
    imagePrompt: String(raw.imagePrompt ?? `Imagem horizontal tecnológica futurista sobre ${topic}, sem texto.`),
  };
  article.estimatedSeoScore = estimateSeoScore(article);
  return article;
}

export async function generateSeoArticle(topic: string, mode: 'new' | 'rewrite' = 'new'): Promise<SeoArticle> {
  return withRetry(async () => {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
    const response = await axios.post(endpoint, {
      contents: [{ role: 'user', parts: [{ text: buildSeoArticlePrompt(topic, mode) }] }],
      generationConfig: {
        temperature: env.GEMINI_TEMPERATURE,
        responseMimeType: 'application/json',
      },
    }, { timeout: env.REQUEST_TIMEOUT_MS });

    const text = response.data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('\n') ?? '';
    const parsed = JSON.parse(extractJson(text)) as Partial<SeoArticle>;
    return normalizeArticle(parsed, topic);
  }, 'gemini.generateSeoArticle', env.RETRY_ATTEMPTS);
}
