export type PostStatus = 'draft_generated' | 'rewritten' | 'published' | 'cancelled' | 'failed';

export interface SeoFaqItem {
  question: string;
  answer: string;
}

export interface SeoArticle {
  title: string;
  seoTitle: string;
  slug: string;
  metaDescription: string;
  keywords: string[];
  summary: string;
  excerpt: string;
  contentMarkdown: string;
  contentHtml: string;
  h1: string;
  h2: string[];
  h3: string[];
  faq: SeoFaqItem[];
  jsonLd: Record<string, unknown>;
  tags: string[];
  cta: string;
  estimatedSeoScore: number;
  imagePrompt: string;
}

export interface GeneratedImage {
  localPath: string;
  fileName: string;
  mimeType: 'image/webp';
  width: number;
  height: number;
}

export interface GeneratedPost {
  topic: string;
  article: SeoArticle;
  image?: GeneratedImage;
  createdAt: string;
}

export interface StoredPost {
  id: number;
  telegram_user_id: string;
  chat_id: string;
  topic: string;
  slug: string;
  title: string;
  status: PostStatus;
  seo_score: number;
  ghost_url?: string;
  image_path?: string;
  payload_json: string;
  created_at: string;
  updated_at: string;
}

export interface GhostPublishedPost {
  id: string;
  title: string;
  slug: string;
  url: string;
  status: string;
}
