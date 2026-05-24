import { db } from '../database/client';

export function getAnalyticsSummary() {
  const totals = db.prepare(`SELECT status, COUNT(*) as count FROM posts GROUP BY status`).all() as Array<{ status: string; count: number }>;
  const avg = db.prepare(`SELECT ROUND(AVG(seo_score), 1) as avgScore FROM posts`).get() as { avgScore: number | null };
  const last = db.prepare(`SELECT title, slug, status, ghost_url, created_at FROM posts ORDER BY created_at DESC LIMIT 5`).all();
  return { totals, avgSeoScore: avg.avgScore ?? 0, last };
}
