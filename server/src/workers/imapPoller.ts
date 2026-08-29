import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import { env } from '../config/env';
import { isEmailEnabled } from '../lib/email';
import { prisma } from '../lib/prisma';
import { boss } from '../lib/queue';
import EmailReplyParser from 'email-reply-parser';

// ─── IMAP Poller Worker ────────────────────────────────────────────────────────
// Runs on a pg-boss cron schedule (every EMAIL_POLL_INTERVAL seconds).
// Connects to the support inbox, fetches all UNSEEN messages, marks them as
// SEEN immediately (idempotency), and ingests each as a ticket.

export async function imapPollerWorker(): Promise<void> {
  if (!isEmailEnabled()) {
    console.log('[imap-poll] Email subsystem disabled — skipping poll');
    return;
  }

  console.log('[imap-poll] Starting inbox poll...');

  const config: imaps.ImapSimpleOptions = {
    imap: {
      user: env.EMAIL_USER!,
      password: env.EMAIL_APP_PASSWORD!,
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 10000,
    },
  };

  let connection: imaps.ImapSimple | null = null;

  try {
    connection = await imaps.connect(config);
    await connection.openBox('INBOX');

    // Fetch all messages not yet seen by this poller
    const searchCriteria = ['UNSEEN'];
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      markSeen: true, // Mark as SEEN immediately — prevents double-ingestion
      struct: true,
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    console.log(`[imap-poll] Found ${messages.length} unseen message(s)`);

    for (const message of messages) {
      await processMessage(message);
    }
  } catch (err) {
    console.error('[imap-poll] Error during poll:', err instanceof Error ? err.message : err);
  } finally {
    try {
      connection?.end();
    } catch {
      // Ignore close errors
    }
  }
}

// ─── Process a single IMAP message ────────────────────────────────────────────

async function processMessage(message: imaps.Message): Promise<void> {
  try {
    // Get the full RFC 2822 message body for mailparser
    const allPart = message.parts.find((p) => p.which === '');
    if (!allPart) {
      console.warn('[imap-poll] Message has no body part — skipping');
      return;
    }

    const parsed = await simpleParser(allPart.body as string);

    const fromHeader = parsed.from?.value?.[0];
    const fromEmail = fromHeader?.address;
    const fromName = fromHeader?.name ?? null;
    const subject = parsed.subject ?? '(No Subject)';
    let body = (parsed.text || parsed.html || '').toString();
    const parser = new EmailReplyParser();
    body = parser.read(body).getVisibleText();
    const messageId = parsed.messageId ?? undefined;

    if (!fromEmail) {
      console.warn('[imap-poll] Could not extract sender email — skipping message');
      return;
    }

    // Skip emails sent FROM our own support address (prevents reply loops)
    if (fromEmail.toLowerCase() === env.EMAIL_USER?.toLowerCase()) {
      console.log(`[imap-poll] Skipping self-sent email from ${fromEmail}`);
      return;
    }

    console.log(`[imap-poll] Ingesting email from ${fromEmail} — subject: "${subject}"`);

    // ── Idempotency check: skip if we already have a ticket for this Message-ID ─
    if (messageId) {
      const existing = await prisma.ticket.findUnique({
        where: { emailThreadId: messageId },
        select: { id: true },
      });
      if (existing) {
        console.log(`[imap-poll] Duplicate Message-ID ${messageId} — skipping`);
        return;
      }
    }

    // ── Create ticket directly (same logic as POST /api/tickets/ingest) ─────────
    const ticket = await prisma.ticket.create({
      data: {
        subject,
        body,
        fromEmail,
        fromName,
        emailThreadId: messageId ?? null,
        status: 'NEW',
        category: 'GENERAL_QUESTION', // Overwritten async by classify-ticket worker
      },
      select: { id: true, subject: true, body: true, fromName: true },
    });

    console.log(`[imap-poll] Created ticket ${ticket.id} for email from ${fromEmail}`);

    // ── Enqueue AI jobs (same as ingest route) ──────────────────────────────────
    const payload = {
      ticketId: ticket.id,
      subject: ticket.subject,
      body: ticket.body,
      fromName: ticket.fromName ?? null,
    };

    await boss.send('classify-ticket', { ticketId: ticket.id, subject, body }).catch((err: unknown) => {
      console.error('[imap-poll] Failed to enqueue classify-ticket:', err instanceof Error ? err.message : err);
    });

    await boss.send('auto-resolve-ticket', payload).catch((err: unknown) => {
      console.error('[imap-poll] Failed to enqueue auto-resolve-ticket:', err instanceof Error ? err.message : err);
    });
  } catch (err) {
    // Per-message error: log and continue to next message
    console.error('[imap-poll] Error processing message:', err instanceof Error ? err.message : err);
  }
}
