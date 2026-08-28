import { PgBoss } from 'pg-boss';
import { classifyTicketWorker } from './classifyTicket';

export async function startWorkers(boss: PgBoss) {
  // Register the classify-ticket worker
  await boss.work('classify-ticket', classifyTicketWorker);
  
  console.log('[pg-boss] Workers registered');
}
