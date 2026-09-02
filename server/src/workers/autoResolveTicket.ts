import { Job } from 'pg-boss';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { google, AI_MODEL } from '../lib/ai';
import { prisma } from '../lib/prisma';
import { boss } from '../lib/queue';

export interface AutoResolveJobData {
  ticketId: string;
  subject: string;
  body: string;
  fromName: string | null;
}

// ─── Structured output schema ─────────────────────────────────────────────────

const AutoResolveOutputSchema = z.object({
  canResolve: z.boolean(),
  shouldEscalate: z.boolean(),
  reply: z.string(),
});

// ─── Worker ───────────────────────────────────────────────────────────────────

export async function autoResolveTicketWorker(jobs: Job<AutoResolveJobData>[]): Promise<void> {
  for (const job of jobs) {
    const { ticketId, subject, body, fromName } = job.data;

    console.log(`[Worker] Auto-resolving ticket ${ticketId}`);

    try {
      // 1. Immediately mark ticket as PROCESSING
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'PROCESSING' },
      });

      // 2. Fetch all knowledge base articles
      const kbArticles = await prisma.knowledgeBase.findMany({
        select: { title: true, content: true },
      });

      if (kbArticles.length === 0) {
        console.warn(`[Worker] No KB articles found — escalating ticket ${ticketId}`);
        await prisma.ticket.update({ where: { id: ticketId }, data: { status: 'OPEN' } });
        continue;
      }

      const kbContext = kbArticles
        .map((a) => `## ${a.title}\n${a.content}`)
        .join('\n\n---\n\n');

      // Derive customer's first name for a friendly greeting
      const firstName = fromName?.trim().split(' ')[0] ?? 'there';

      // 3. Ask AI to decide if it can resolve the ticket
      const { output } = await generateText({
        model: google(AI_MODEL),
        output: Output.object({ schema: AutoResolveOutputSchema }),
        system: `You are a professional and friendly customer support agent for an e-commerce retail platform.
Your job is to decide whether the following customer support ticket can be resolved using the provided Knowledge Base.

KNOWLEDGE BASE:
${kbContext}

INSTRUCTIONS:
- Read the ticket carefully.
- If the Knowledge Base contains a clear, complete answer, set canResolve to true and write a helpful reply.
- If the issue involves ANY of the following, set shouldEscalate to true and canResolve to false:
    * Lost packages or suspected fraud
    * Defective high-value items
    * Legal threats or mentions of legal action
    * Chargebacks or payment disputes
    * Any situation where you are not fully confident in the answer
- Always address the customer by their first name: "${firstName}".
- Keep the tone warm, professional, and concise.
- The reply field must always contain a complete, ready-to-send response even if canResolve is false (in that case, acknowledge receipt and say a specialist will be in touch).

REPLY FORMAT — you MUST follow this structure exactly, with a blank line between each section:
Hi [First Name],

[One or more body paragraphs, each separated by a blank line.]

Best regards,
NovaDesk Agent

EXAMPLE of a correctly formatted reply:
Hi Alex,

Thank you for reaching out! Here is the information you need.

Please let us know if you have any other questions.

Best regards,
NovaDesk Agent`,
        prompt: `Customer first name: ${firstName}
Subject: ${subject}

Message:
${body}`,
      });

      if (!output) {
        console.warn(`[Worker] AI returned no output for ticket ${ticketId} — escalating`);
        await prisma.ticket.update({ where: { id: ticketId }, data: { status: 'OPEN' } });
        continue;
      }

      const { canResolve, shouldEscalate, reply } = output;

      if (canResolve && !shouldEscalate) {
        // 4a. Auto-resolve: post reply and close the ticket
        const createdReply = await prisma.ticketReply.create({
          data: {
            ticketId,
            body: reply,
            fromAgent: true,
            // createdById intentionally omitted — system reply
          },
          select: { id: true },
        });

        const aiAgent = await prisma.user.findUnique({ where: { email: 'ai@novadesk.internal' } });
        await prisma.ticket.update({
          where: { id: ticketId },
          data: { status: 'RESOLVED', assignedAgentId: aiAgent?.id || null },
        });

        // Send the AI reply back to the customer via email (best-effort)
        boss.send('send-reply-email', { ticketId, replyId: createdReply.id }).catch((err: unknown) => {
          console.error('[auto-resolve] Failed to enqueue send-reply-email:', err instanceof Error ? err.message : err);
        });

        console.log(`[Worker] Auto-resolved ticket ${ticketId}`);
      } else {
        // 4b. Escalate: move to OPEN queue for a human agent, remove AI assignment
        await prisma.ticket.update({
          where: { id: ticketId },
          data: { status: 'OPEN', assignedAgentId: null },
        });

        console.log(`[Worker] Escalated ticket ${ticketId} to human queue (shouldEscalate=${shouldEscalate})`);
      }
    } catch (error) {
      console.error(`[Worker] auto-resolve error for ticket ${ticketId}:`, error);
      // Fail safe: move ticket back to OPEN and unassign AI so a human can handle it
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'OPEN', assignedAgentId: null },
      }).catch(() => {/* best-effort */});
    }
  }
}
