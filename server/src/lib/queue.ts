import { PgBoss } from 'pg-boss';
import { env } from '../config/env';

export const boss = new PgBoss(env.DATABASE_URL);

boss.on('error', (error: Error) => {
  console.error('[pg-boss] error:', error);
});
