import { PgBoss } from 'pg-boss';
import { classifyTicketWorker } from './classifyTicket';
import { autoResolveTicketWorker } from './autoResolveTicket';
import { imapPollerWorker } from './imapPoller';
import { sendReplyEmailWorker } from './sendReplyEmail';
import { env } from '../config/env';
import { isEmailEnabled } from '../lib/email';

import { closeResolvedTicketsWorker } from './closeResolvedTickets';

export async function startWorkers(boss: PgBoss) {
  // Register the classify-ticket worker
  await boss.work('classify-ticket', classifyTicketWorker);

  // Register the auto-resolve-ticket worker
  await boss.work('auto-resolve-ticket', autoResolveTicketWorker);

  // Register cron worker for closing old resolved tickets (runs hourly)
  await boss.schedule('close-resolved-tickets', '0 * * * *', {});
  await boss.work('close-resolved-tickets', closeResolvedTicketsWorker);

  // ── Email workers ─────────────────────────────────────────────────────────────
  if (isEmailEnabled()) {
    // IMAP poller: runs on a cron schedule (every EMAIL_POLL_INTERVAL seconds)
    // pg-boss cron uses standard 5-field cron — we convert seconds to minutes (min 1 min)
    const pollMinutes = Math.max(1, Math.floor(env.EMAIL_POLL_INTERVAL / 60));
    const cronExpression = `*/${pollMinutes} * * * *`;

    await boss.schedule('imap-poll', cronExpression, {});
    await boss.work('imap-poll', imapPollerWorker);
    console.log(`[pg-boss] IMAP poller scheduled (cron: ${cronExpression})`);

    // Send-reply-email: triggered on demand when an agent or AI posts a reply
    await boss.work('send-reply-email', sendReplyEmailWorker);
    console.log('[pg-boss] send-reply-email worker registered');
  } else {
    console.log('[pg-boss] Email workers skipped (email subsystem disabled)');
  }

  console.log('[pg-boss] Workers registered');
}

