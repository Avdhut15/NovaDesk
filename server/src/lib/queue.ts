import { PgBoss } from 'pg-boss';
import { env } from '../config/env';

export const boss = new PgBoss(env.DATABASE_URL);

boss.on('error', (error: Error) => {
  console.error('[pg-boss] error:', error);
});

// ─── Queue Bootstrap ──────────────────────────────────────────────────────────
// Must be called after boss.start() to guarantee queues exist before any
// workers or producers try to use them.

export async function ensureQueues(boss: PgBoss): Promise<void> {
  await boss.createQueue('classify-ticket');
  await boss.createQueue('auto-resolve-ticket');
  console.log('[pg-boss] Queues ensured');
}
