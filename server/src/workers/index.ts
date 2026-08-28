import { PgBoss } from 'pg-boss';
import { classifyTicketWorker } from './classifyTicket';
import { autoResolveTicketWorker } from './autoResolveTicket';

export async function startWorkers(boss: PgBoss) {
  // Register the classify-ticket worker
  await boss.work('classify-ticket', classifyTicketWorker);
  
  // Register the auto-resolve-ticket worker
  await boss.work('auto-resolve-ticket', autoResolveTicketWorker);

  console.log('[pg-boss] Workers registered');
}
