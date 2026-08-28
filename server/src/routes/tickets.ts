import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { prisma } from '../lib/prisma';
import {
  CreateTicketSchema,
  UpdateTicketSchema,
  IngestEmailSchema,
  ListTicketsQuerySchema,
} from '../types/ticketSchemas';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { env } from '../config/env';
import { z } from 'zod';

const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
const AI_MODEL = 'gemini-3.5-flash-lite';

const PolishReplySchema = z.object({
  body: z.string().min(1, 'Reply body is required'),
});

export const ticketsRouter = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Standard ticket select — excludes heavy AI fields from list views */
const ticketListSelect = {
  id: true,
  subject: true,
  status: true,
  category: true,
  fromEmail: true,
  fromName: true,
  emailThreadId: true,
  createdAt: true,
  updatedAt: true,
  assignedAgent: {
    select: { id: true, name: true, email: true },
  },
  createdBy: {
    select: { id: true, name: true, email: true },
  },
  _count: { select: { replies: true } },
} as const;

/** Full ticket select — includes AI fields and replies for detail view */
const ticketDetailSelect = {
  ...ticketListSelect,
  body: true,
  aiSummary: true,
  aiSuggestedReply: true,
  replies: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      body: true,
      fromAgent: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true, role: true } },
    },
  },
} as const;

// ─── GET /api/tickets ─────────────────────────────────────────────────────────
// List all tickets. Supports optional filters: status, category, assignedAgentId.
// Paginated (default: page=1, limit=25).

ticketsRouter.get('/', requireAuth(), async (req, res) => {
  const parsed = ListTicketsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query parameters', details: parsed.error.flatten() });
    return;
  }

  const { status, category, assignedAgentId, page, limit, sortBy, sortOrder } = parsed.data;
  const skip = (page - 1) * limit;

  const where = {
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...(assignedAgentId ? { assignedAgentId } : {}),
  };

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      select: ticketListSelect,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.ticket.count({ where }),
  ]);

  res.json({
    success: true,
    data: tickets,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ─── POST /api/tickets/ingest ─────────────────────────────────────────────────
// PUBLIC endpoint — simulates the inbound webhook an email provider would call
// when a message arrives at the support address (e.g. support@novadesk.com).
//
// Accepts: { fromEmail, fromName?, subject, body, emailThreadId? }
// Creates an OPEN ticket with source tracing fields populated.
//
// TODO: When wiring a real email provider, add signature/HMAC validation here
// (e.g. X-Postmark-Signature or X-SendGrid-HMAC) before creating the ticket.
// Consider reading a shared secret from env.INGEST_SECRET.

ticketsRouter.post('/ingest', async (req, res) => {
  const parsed = IngestEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid ingest payload', details: parsed.error.flatten() });
    return;
  }

  const { fromEmail, fromName, subject, body, emailThreadId } = parsed.data;

  // Guard against duplicate email threads (idempotency for re-delivered webhooks)
  if (emailThreadId) {
    const existing = await prisma.ticket.findUnique({ where: { emailThreadId } });
    if (existing) {
      res.status(409).json({
        error: 'Duplicate thread',
        message: `A ticket for email thread '${emailThreadId}' already exists.`,
        ticketId: existing.id,
      });
      return;
    }
  }

  const ticket = await prisma.ticket.create({
    data: {
      subject,
      body,
      fromEmail,
      fromName,
      emailThreadId,
      status: 'OPEN',
      category: 'GENERAL_QUESTION',
    },
    select: ticketDetailSelect,
  });

  res.status(201).json({ success: true, data: ticket });
});

// ─── GET /api/tickets/:id ─────────────────────────────────────────────────────
// Get a single ticket with all replies and AI fields.

ticketsRouter.get('/:id', requireAuth(), async (req, res) => {
  const id = req.params.id as string;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: ticketDetailSelect,
  });

  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  res.json({ success: true, data: ticket });
});

// ─── POST /api/tickets ────────────────────────────────────────────────────────
// Manually create a ticket (e.g. agent logs a phone call or walk-in).
// The authenticated user is recorded as createdBy.

ticketsRouter.post('/', requireAuth(), async (req, res) => {
  const parsed = CreateTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid ticket data', details: parsed.error.flatten() });
    return;
  }

  const { subject, body, category, fromEmail, fromName, assignedAgentId } = parsed.data;

  // Validate assignedAgentId if provided
  if (assignedAgentId) {
    const agent = await prisma.user.findUnique({ where: { id: assignedAgentId } });
    if (!agent || agent.deletedAt) {
      res.status(400).json({ error: 'Assigned agent not found' });
      return;
    }
  }

  const ticket = await prisma.ticket.create({
    data: {
      subject,
      body,
      category,
      fromEmail,
      fromName,
      status: 'OPEN',
      ...(assignedAgentId ? { assignedAgentId } : {}),
      createdById: req.user!.id,
    },
    select: ticketDetailSelect,
  });

  res.status(201).json({ success: true, data: ticket });
});

// ─── PATCH /api/tickets/:id ───────────────────────────────────────────────────
// Update a ticket's status, category, subject, body, or assigned agent.

ticketsRouter.patch('/:id', requireAuth(), async (req, res) => {
  const id = req.params.id as string;

  const parsed = UpdateTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid update data', details: parsed.error.flatten() });
    return;
  }

  const existing = await prisma.ticket.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  const { assignedAgentId, ...rest } = parsed.data;

  // Validate assignedAgentId if it's being changed
  if (assignedAgentId !== undefined && assignedAgentId !== null) {
    const agent = await prisma.user.findUnique({ where: { id: assignedAgentId } });
    if (!agent || agent.deletedAt) {
      res.status(400).json({ error: 'Assigned agent not found' });
      return;
    }
  }

  const ticket = await prisma.ticket.update({
    where: { id },
    data: {
      ...rest,
      ...(assignedAgentId !== undefined ? { assignedAgentId } : {}),
    },
    select: ticketDetailSelect,
  });

  res.json({ success: true, data: ticket });
});

// ─── DELETE /api/tickets/:id ──────────────────────────────────────────────────
// Hard-delete a ticket (and its replies via cascade). Admin-only.

ticketsRouter.delete('/:id', requireAuth({ role: 'admin' }), async (req, res) => {
  const id = req.params.id as string;

  const existing = await prisma.ticket.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  await prisma.ticket.delete({ where: { id } });

  res.json({ success: true, message: 'Ticket deleted successfully' });
});

// ─── POST /api/tickets/:id/polish-reply ───────────────────────────────────────
// Takes a draft reply from an agent, customizes it with customer/agent names,
// and improves it using Gemini 3.5 Flash Lite.
ticketsRouter.post('/:id/polish-reply', requireAuth(), async (req, res) => {
  const id = req.params.id as string;
  const parsed = PolishReplySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  const { body } = parsed.data;

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: { fromName: true },
    });

    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    const customerFullName = ticket.fromName || 'Customer';
    const customerFirstName = customerFullName.trim().split(/\s+/)[0];
    const agentName = req.user?.name || 'Support Agent';

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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[AI] polish-reply error:', message);
    res.status(500).json({ error: `AI error: ${message}` });
  }
});

// ─── POST /api/tickets/:id/summarize ──────────────────────────────────────────
// Generates (or re-generates) an AI summary of the ticket + conversation thread.
ticketsRouter.post('/:id/summarize', requireAuth(), async (req, res) => {
  const id = req.params.id as string;

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

    // Build a readable conversation transcript for the model
    const conversationLines: string[] = [
      `Subject: ${ticket.subject}`,
      `Category: ${ticket.category.replace(/_/g, ' ')}`,
      `Status: ${ticket.status}`,
      `Customer: ${ticket.fromName ?? 'Unknown'}`,
      '',
      `--- Original Message ---`,
      ticket.body,
    ];

    if (ticket.replies.length > 0) {
      conversationLines.push('', '--- Conversation Thread ---');
      for (const reply of ticket.replies) {
        const author = reply.fromAgent
          ? (reply.createdBy?.name ?? 'Agent')
          : (ticket.fromName ?? 'Customer');
        const date = new Date(reply.createdAt).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        });
        conversationLines.push(`[${author} — ${date}]: ${reply.body}`);
      }
    }

    const transcript = conversationLines.join('\n');

    const { text } = await generateText({
      model: google(AI_MODEL),
      system: `You are a helpful assistant summarizing customer support tickets.
Your summary should be concise (3–5 sentences max) and cover:
1. What the customer's issue or request is.
2. The current status of the resolution.
3. Any key actions taken or next steps (if available).
Write in clear, plain English. Do NOT use bullet points or headers — write as a short paragraph.
Do NOT add any preamble like "Here is a summary:" — return only the summary text itself.`,
      prompt: `Please summarize the following support ticket conversation:\n\n${transcript}`,
    });

    res.json({ success: true, data: { summary: text } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[AI] summarize error:', message);
    res.status(500).json({ error: `AI error: ${message}` });
  }
});
