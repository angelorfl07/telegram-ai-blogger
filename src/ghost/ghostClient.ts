import fs from 'fs';
import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { GeneratedPost, GhostPublishedPost, SiteConfig } from '../types';
import { appendJsonLdToHtml, buildMergedJsonLd } from '../seo/jsonLd';
import { withRetry } from '../utils/retry';

function buildAdminToken(site: SiteConfig): string {
  const [id, secret] = site.adminKey.split(':');
  if (!id || !secret) throw new Error('A Admin Key do Ghost deve estar no formato id:secret.');
  return jwt.sign({}, Buffer.from(secret, 'hex'), {
    keyid: id,
    algorithm: 'HS256',
    expiresIn: '5m',
    audience: '/admin/',
  });
}

function client(site: SiteConfig): AxiosInstance {
  return axios.create({
    baseURL: site.apiUrl.replace(/\/$/, ''),
    timeout: env.REQUEST_TIMEOUT_MS,
    headers: { Authorization: `Ghost ${buildAdminToken(site)}` },
  });
}

export async function uploadImageToGhost(imagePath: string, site: SiteConfig): Promise<string> {
  return withRetry(async () => {
    const form = new FormData();
    form.append('file', fs.createReadStream(imagePath));
    form.append('purpose', 'image');
    const response = await client(site).post('/images/upload/', form, { headers: form.getHeaders() });
    return response.data?.images?.[0]?.url as string;
  }, 'ghost.uploadImage', env.RETRY_ATTEMPTS);
}

export async function publishPostToGhost(generated: GeneratedPost, site: SiteConfig): Promise<GhostPublishedPost> {
  return withRetry(async () => {
    let featureImage: string | undefined;
    if (generated.image?.localPath) featureImage = await uploadImageToGhost(generated.image.localPath, site);

    const article = generated.article;
    const schemas = buildMergedJsonLd(article);
    const html = appendJsonLdToHtml(article.contentHtml, schemas);
    const tags = article.tags.map((name) => ({ name }));

    const payload: any = {
      posts: [{
        title: article.title,
        slug: article.slug,
        html,
        feature_image: featureImage,
        meta_title: article.seoTitle,
        meta_description: article.metaDescription,
        tags,
        excerpt: article.excerpt || article.summary,
        status: 'published',
      }],
    };

    if (site.authorId) payload.posts[0].authors = [{ id: site.authorId }];

    const response = await client(site).post('/posts/?source=html', payload);
    const post = response.data?.posts?.[0];
    if (!post?.url) throw new Error('Ghost não retornou URL publicada.');
    return { id: post.id, title: post.title, slug: post.slug, url: post.url, status: post.status };
  }, 'ghost.publishPost', env.RETRY_ATTEMPTS);
}
