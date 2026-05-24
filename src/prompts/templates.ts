export type SeoTemplateName = 'technical_guide' | 'google_discover' | 'comparison' | 'trend_analysis';

export interface SeoTemplate {
  name: SeoTemplateName;
  intent: string;
  structure: string[];
  discoverAngle: string;
}

export const seoTemplates: Record<SeoTemplateName, SeoTemplate> = {
  technical_guide: {
    name: 'technical_guide',
    intent: 'Guia técnico evergreen com profundidade prática, exemplos conceituais e autoridade EEAT.',
    structure: ['Introdução com promessa clara', 'Contexto técnico', 'Passo a passo', 'Boas práticas', 'Erros comuns', 'FAQ', 'CTA'],
    discoverAngle: 'Transformar o tema em aprendizado acionável para profissionais de tecnologia.',
  },
  google_discover: {
    name: 'google_discover',
    intent: 'Artigo com alto potencial de CTR, abordagem jornalística e ângulo atual sem sensacionalismo.',
    structure: ['Gancho forte', 'Por que importa agora', 'Impactos práticos', 'Oportunidades', 'Riscos', 'FAQ', 'CTA'],
    discoverAngle: 'Explorar novidade, impacto e utilidade imediata para leitores de tecnologia.',
  },
  comparison: {
    name: 'comparison',
    intent: 'Comparativo técnico para intenção comercial/informacional, com critérios claros e decisão prática.',
    structure: ['Resumo da comparação', 'Critérios', 'Tabela comparativa', 'Cenários de uso', 'Recomendação', 'FAQ', 'CTA'],
    discoverAngle: 'Ajudar o leitor a tomar decisão objetiva entre alternativas.',
  },
  trend_analysis: {
    name: 'trend_analysis',
    intent: 'Análise de tendência tecnológica com foco em oportunidades, riscos, adoção e próximos passos.',
    structure: ['Contexto da tendência', 'Sinais de adoção', 'Impactos', 'Como se preparar', 'Checklist', 'FAQ', 'CTA'],
    discoverAngle: 'Conectar tendência emergente com decisões práticas para empresas e desenvolvedores.',
  },
};

export function chooseTemplate(topic: string): SeoTemplate {
  const lower = topic.toLowerCase();
  if (/vs|versus|compar|melhor|diferenç/.test(lower)) return seoTemplates.comparison;
  if (/tend[eê]ncia|futuro|2026|novidade|discover|mercado/.test(lower)) return seoTemplates.trend_analysis;
  if (/notícia|lancamento|lançamento|impacto|por que/.test(lower)) return seoTemplates.google_discover;
  return seoTemplates.technical_guide;
}
