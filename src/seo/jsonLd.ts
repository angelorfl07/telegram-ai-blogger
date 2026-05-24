import type { SeoArticle } from '../types';

export function buildMergedJsonLd(article: SeoArticle, canonicalUrl?: string): Record<string, unknown>[] {
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.seoTitle,
    description: article.metaDescription,
    mainEntityOfPage: canonicalUrl,
    keywords: article.keywords.join(', '),
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: article.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  return [article.jsonLd && Object.keys(article.jsonLd).length ? article.jsonLd : articleSchema, faqSchema];
}

export function appendJsonLdToHtml(html: string, schemas: Record<string, unknown>[]): string {
  const scripts = schemas.map((schema) => `<script type="application/ld+json">${JSON.stringify(schema)}</script>`).join('\n');
  return `${html}\n\n${scripts}`;
}
