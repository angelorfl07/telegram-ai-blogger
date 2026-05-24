import { chooseTemplate } from './templates';

export function buildSeoArticlePrompt(topic: string, mode: 'new' | 'rewrite' = 'new'): string {
  const template = chooseTemplate(topic);
  const rewriteInstruction = mode === 'rewrite'
    ? 'Reescreva completamente a versão anterior implícita, mantendo o tema, elevando clareza, profundidade e SEO sem duplicar frases.'
    : 'Crie uma versão original, completa e publicável.';

  return `Você é especialista sênior em SEO técnico, copywriter, jornalista de tecnologia e estrategista de Google Discover.

Tema: ${topic}
Tarefa: ${rewriteInstruction}
Template SEO selecionado: ${template.name}
Intenção do template: ${template.intent}
Estrutura editorial recomendada: ${template.structure.join(' > ')}
Ângulo Google Discover/NLP: ${template.discoverAngle}

Requisitos editoriais obrigatórios:
- Português do Brasil, estilo profissional, técnico e acessível.
- SEO agressivo, mas natural; sem keyword stuffing.
- Estrutura compatível com RankMath/Yoast, NLP optimization, EEAT, rich snippets, Google Discover e alta legibilidade.
- Conteúdo completo com introdução forte, H2/H3 otimizados, conclusão e CTA final.
- Inclua FAQ schema, JSON-LD Article/FAQPage, tags e keywords estratégicas.
- Não invente dados específicos, datas, estatísticas ou citações sem fonte. Quando faltarem dados externos, escreva de forma conceitual e evergreen.
- Gere também um prompt de imagem sem texto, horizontal, tecnológico moderno, dark mode, neon blue, cyberpunk, IA futurista e minimalista profissional.

Responda exclusivamente em JSON válido, sem markdown fora do JSON, com este schema:
{
  "title": "Título editorial",
  "seoTitle": "Título SEO com CTR",
  "slug": "slug-url",
  "metaDescription": "até 155 caracteres",
  "keywords": ["keyword principal", "secundárias"],
  "summary": "Resumo claro",
  "excerpt": "excerto curto para Ghost",
  "contentMarkdown": "artigo completo em Markdown com H1/H2/H3, FAQ e CTA",
  "h1": "H1 principal",
  "h2": ["H2"],
  "h3": ["H3"],
  "faq": [{"question":"pergunta", "answer":"resposta"}],
  "jsonLd": {"@context":"https://schema.org", "@type":"Article"},
  "tags": ["tag"],
  "cta": "CTA final",
  "estimatedSeoScore": 92,
  "imagePrompt": "prompt de imagem sem texto"
}`;
}
