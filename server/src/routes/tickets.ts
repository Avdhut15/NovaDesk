import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { prisma } from '../lib/prisma';
import {
  CreateTicketSchema,
  UpdateTicketSchema,
  IngestEmailSchema,
  ListTicketsQuerySchema,
} from '../types/ticketSchemas';

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
