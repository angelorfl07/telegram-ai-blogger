import type { GeneratedPost } from '../types';

export function buildTelegramPreview(generated: GeneratedPost): string {
  const a = generated.article;
  return [
    `Título: ${a.title}`,
    `Título SEO: ${a.seoTitle}`,
    `Slug: ${a.slug}`,
    `SEO score estimado: ${a.estimatedSeoScore}/100`,
    `Meta description: ${a.metaDescription}`,
    `Resumo: ${a.summary}`,
    `Tags: ${a.tags.join(', ')}`,
    `Keywords: ${a.keywords.slice(0, 10).join(', ')}`,
    '',
    'Comandos disponíveis:',
    '/postar — publicar no Ghost CMS',
    '/rewrite — gerar nova versão mantendo SEO',
    '/cancelar — cancelar este rascunho',
  ].join('\n');
}
