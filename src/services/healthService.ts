import { db } from '../database/client';

export function getHealth() {
  const dbOk = db.prepare('SELECT 1 as ok').get() as { ok: number };
  return {
    status: dbOk.ok === 1 ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
}
