import crypto from 'crypto';
import { getCache, setCache } from '../database/client';
import { generateSeoArticle } from '../gemini/geminiService';
import { generateFeatureImage } from '../image/imageService';
import type { GeneratedPost } from '../types';

function cacheKey(topic: string, mode: string): string {
  return crypto.createHash('sha256').update(`${mode}:${topic.toLowerCase().trim()}`).digest('hex');
}

export async function createGeneratedPost(topic: string, mode: 'new' | 'rewrite' = 'new', useCache = true): Promise<GeneratedPost> {
  const key = cacheKey(topic, mode);
  if (useCache && mode === 'new') {
    const cached = getCache<GeneratedPost>(key);
    if (cached) return cached;
  }

  const article = await generateSeoArticle(topic, mode);
  const image = await generateFeatureImage(article.imagePrompt, article.slug);
  const generated: GeneratedPost = { topic, article, image, createdAt: new Date().toISOString() };

  if (mode === 'new') setCache(key, generated, 60 * 60 * 24);
  return generated;
}
