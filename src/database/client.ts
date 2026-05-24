import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { env } from '../config/env';
import type { GeneratedPost, PostStatus, StoredPost } from '../types';

fs.mkdirSync(path.dirname(env.SQLITE_PATH), { recursive: true });
export const db = new Database(env.SQLITE_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function migrateDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_user_id TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      topic TEXT NOT NULL,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      seo_score INTEGER NOT NULL DEFAULT 0,
      ghost_url TEXT,
      image_path TEXT,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS cache (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
    CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
    CREATE INDEX IF NOT EXISTS idx_events_post_id ON events(post_id);
  `);
}

export function saveGeneratedPost(userId: string, chatId: string, generated: GeneratedPost, status: PostStatus = 'draft_generated'): number {
  const stmt = db.prepare(`
    INSERT INTO posts (telegram_user_id, chat_id, topic, slug, title, status, seo_score, image_path, payload_json)
    VALUES (@telegram_user_id, @chat_id, @topic, @slug, @title, @status, @seo_score, @image_path, @payload_json)
  `);
  const result = stmt.run({
    telegram_user_id: userId,
    chat_id: chatId,
    topic: generated.topic,
    slug: generated.article.slug,
    title: generated.article.title,
    status,
    seo_score: generated.article.estimatedSeoScore,
    image_path: generated.image?.localPath ?? null,
    payload_json: JSON.stringify(generated),
  });
  return Number(result.lastInsertRowid);
}

export function updatePostPayload(postId: number, generated: GeneratedPost, status: PostStatus): void {
  db.prepare(`
    UPDATE posts
    SET topic=@topic, slug=@slug, title=@title, status=@status, seo_score=@seo_score,
        image_path=@image_path, payload_json=@payload_json, updated_at=CURRENT_TIMESTAMP
    WHERE id=@id
  `).run({
    id: postId,
    topic: generated.topic,
    slug: generated.article.slug,
    title: generated.article.title,
    status,
    seo_score: generated.article.estimatedSeoScore,
    image_path: generated.image?.localPath ?? null,
    payload_json: JSON.stringify(generated),
  });
}

export function markPostPublished(postId: number, url: string): void {
  db.prepare(`UPDATE posts SET status='published', ghost_url=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(url, postId);
}

export function markPostStatus(postId: number, status: PostStatus): void {
  db.prepare(`UPDATE posts SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(status, postId);
}

export function getPost(postId: number): StoredPost | undefined {
  return db.prepare('SELECT * FROM posts WHERE id = ?').get(postId) as StoredPost | undefined;
}

export function getRecentPosts(limit = 10): StoredPost[] {
  return db.prepare('SELECT * FROM posts ORDER BY created_at DESC LIMIT ?').all(limit) as StoredPost[];
}

export function addEvent(level: string, message: string, metadata?: Record<string, unknown>, postId?: number): void {
  db.prepare(`INSERT INTO events (post_id, level, message, metadata_json) VALUES (?, ?, ?, ?)`)
    .run(postId ?? null, level, message, metadata ? JSON.stringify(metadata) : null);
}

export function setCache(key: string, value: unknown, ttlSeconds: number): void {
  const expires = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  db.prepare(`REPLACE INTO cache (key, value_json, expires_at) VALUES (?, ?, ?)`).run(key, JSON.stringify(value), expires);
}

export function getCache<T>(key: string): T | null {
  const row = db.prepare('SELECT value_json, expires_at FROM cache WHERE key=?').get(key) as { value_json: string; expires_at: string } | undefined;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM cache WHERE key=?').run(key);
    return null;
  }
  return JSON.parse(row.value_json) as T;
}
