import { Job } from 'pg-boss';
import { prisma } from '../lib/prisma';
import { sendReplyEmail, isEmailEnabled } from '../lib/email';

// ─── Job Payload ───────────────────────────────────────────────────────────────

export interface SendReplyEmailJobData {
  ticketId: string;
  replyId: string;
}

// ─── Worker ───────────────────────────────────────────────────────────────────
// Sends the outbound reply email to the customer whose ticket was replied to.
// Skips gracefully if:
//  - Email subsystem is disabled (no env vars)
//  - The ticket has no fromEmail (manually created with no customer email)

export async function sendReplyEmailWorker(jobs: Job<SendReplyEmailJobData>[]): Promise<void> {
  for (const job of jobs) {
    const { ticketId, replyId } = job.data;

    if (!isEmailEnabled()) {
      console.log(`[send-reply-email] Email disabled — skipping job for ticket ${ticketId}`);
      continue;
    }

    try {
      // Fetch the ticket and the specific reply together
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: {
          fromEmail: true,
          fromName: true,
          subject: true,
          replies: {
            where: { id: replyId },
            select: { body: true },
          },
        },
      });

      if (!ticket) {
        console.warn(`[send-reply-email] Ticket ${ticketId} not found — skipping`);
        continue;
      }

      if (!ticket.fromEmail) {
        console.log(`[send-reply-email] Ticket ${ticketId} has no fromEmail — skipping (manually created ticket)`);
        continue;
      }

      const reply = ticket.replies[0];
      if (!reply) {
        console.warn(`[send-reply-email] Reply ${replyId} not found on ticket ${ticketId} — skipping`);
        continue;
      }

      await sendReplyEmail({
        to: ticket.fromEmail,
        toName: ticket.fromName,
        subject: ticket.subject,
        body: reply.body,
      });

      console.log(`[send-reply-email] ✅ Reply sent for ticket ${ticketId} → ${ticket.fromEmail}`);
    } catch (err) {
      console.error(
        `[send-reply-email] Failed for ticket ${ticketId}:`,
        err instanceof Error ? err.message : err,
      );
      // Re-throw so pg-boss marks this job as failed and can retry it
      throw err;
    }
  }
}
