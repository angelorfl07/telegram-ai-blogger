import type { SeoArticle } from '../types';

export function estimateSeoScore(article: SeoArticle): number {
  let score = 0;
  if (article.seoTitle.length >= 35 && article.seoTitle.length <= 70) score += 12;
  if (article.metaDescription.length >= 110 && article.metaDescription.length <= 160) score += 12;
  if (article.keywords.length >= 5) score += 10;
  if (article.h2.length >= 4) score += 10;
  if (article.h3.length >= 3) score += 8;
  if (article.faq.length >= 3) score += 12;
  if (article.contentMarkdown.length >= 4500) score += 14;
  if (article.slug.length > 0 && article.slug.length <= 90) score += 8;
  if (article.tags.length >= 3) score += 7;
  if (article.cta.length >= 30) score += 7;
  return Math.max(article.estimatedSeoScore || 0, Math.min(score, 100));
}
