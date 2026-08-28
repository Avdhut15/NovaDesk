import { Router } from 'express';
import { generateText } from 'ai';
import { google, AI_MODEL } from '../lib/ai';
import { prisma } from '../lib/prisma';

export const aiTicketsRouter = Router({ mergeParams: true });

// ─── Helpers ──────────────────────────────────────────────────────────────────

const safeErr = (err: unknown) =>
  err instanceof Error ? err.message : String(err);

// ─── AI: Non-blocking auto-classification ─────────────────────────────────────
// Called after ticket creation — fires in background, never blocks the response.
// Updates the ticket's category once Gemini responds.




// ─── POST /api/tickets/:id/polish-reply ───────────────────────────────────────
// Improves a draft reply using Gemini — addresses the customer by first name
// and signs off with the agent's name.

aiTicketsRouter.post('/polish-reply', async (req, res) => {
  const { id } = req.params as { id: string };
  const body = req.body?.body as string | undefined;

  if (!body?.trim()) {
    res.status(400).json({ error: 'Reply body is required' });
    return;
  }

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: { fromName: true },
    });

    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    const customerFirstName = (ticket.fromName ?? 'Customer').trim().split(/\s+/)[0];
    const agentName = req.user?.name ?? 'Support Agent';

    const { text } = await generateText({
      model: google(AI_MODEL),
      system: `You are a professional customer support agent. 
Your job is to polish and improve draft replies written by support agents.

Requirements:
1. Address the customer by their first name: "${customerFirstName}" at the very beginning of the reply (e.g. "Hi ${customerFirstName},").
2. Ensure the response is professionally signed off with the support agent's name: "${agentName}" at the end (e.g., "Best regards,\n${agentName}").
3. Improve the tone, clarity, grammar, and professionalism of the reply.
4. Keep the same meaning and intent — do NOT add new information or change the core message.
5. Do NOT add any preamble like "Here is the polished version:" — return only the polished support reply text itself.
6. Keep it concise, friendly, and warm.`,
      prompt: `Please polish the following draft support reply:\n\n${body}`,
    });

    res.json({ success: true, data: { polished: text } });
  } catch (err) {
    console.error('[AI] polish-reply error:', safeErr(err));
    res.status(500).json({ error: `AI error: ${safeErr(err)}` });
  }
});

// ─── POST /api/tickets/:id/summarize ──────────────────────────────────────────
// Generates (or re-generates) an AI summary of the ticket + conversation thread.

aiTicketsRouter.post('/summarize', async (req, res) => {
  const { id } = req.params as { id: string };

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        subject: true,
        body: true,
        fromName: true,
        category: true,
        status: true,
        replies: {
          orderBy: { createdAt: 'asc' },
          select: {
            body: true,
            fromAgent: true,
            createdAt: true,
            createdBy: { select: { name: true } },
          },
        },
      },
    });

    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    // Build a readable transcript for the model
    const lines: string[] = [
      `Subject: ${ticket.subject}`,
      `Category: ${ticket.category.replace(/_/g, ' ')}`,
      `Status: ${ticket.status}`,
      `Customer: ${ticket.fromName ?? 'Unknown'}`,
      '',
      '--- Original Message ---',
      ticket.body,
    ];

    if (ticket.replies.length > 0) {
      lines.push('', '--- Conversation Thread ---');
      for (const reply of ticket.replies) {
        const author = reply.fromAgent
          ? (reply.createdBy?.name ?? 'Agent')
          : (ticket.fromName ?? 'Customer');
        const date = new Date(reply.createdAt).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        });
        lines.push(`[${author} — ${date}]: ${reply.body}`);
      }
    }

    const { text } = await generateText({
      model: google(AI_MODEL),
      system: `You are a helpful assistant summarizing customer support tickets.
Your summary should be concise (3–5 sentences max) and cover:
1. What the customer's issue or request is.
2. The current status of the resolution.
3. Any key actions taken or next steps (if available).
Write in clear, plain English. Do NOT use bullet points or headers — write as a short paragraph.
Do NOT add any preamble like "Here is a summary:" — return only the summary text itself.`,
      prompt: `Please summarize the following support ticket conversation:\n\n${lines.join('\n')}`,
    });

    res.json({ success: true, data: { summary: text } });
  } catch (err) {
    console.error('[AI] summarize error:', safeErr(err));
    res.status(500).json({ error: `AI error: ${safeErr(err)}` });
  }
});
