import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { prisma } from '../lib/prisma';
import { AddReplySchema } from '../types/ticketSchemas';
import { boss } from '../lib/queue';

export const repliesRouter = Router({ mergeParams: true });

// ─── GET /api/tickets/:ticketId/replies ───────────────────────────────────────
// List all replies for a ticket, ordered oldest-first.

repliesRouter.get('/', requireAuth(), async (req, res) => {
  const { ticketId } = req.params as { ticketId: string };

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  const replies = await prisma.ticketReply.findMany({
    where: { ticketId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      body: true,
      fromAgent: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true, role: true } },
    },
  });

  res.json({ success: true, data: replies });
});

// ─── POST /api/tickets/:ticketId/replies ──────────────────────────────────────
// Add a reply to a ticket. Agents set fromAgent=true (default).

repliesRouter.post('/', requireAuth(), async (req, res) => {
  const { ticketId } = req.params as { ticketId: string };

  const parsed = AddReplySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid reply data', details: parsed.error.flatten() });
    return;
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true, status: true } });
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  if (ticket.status === 'CLOSED') {
    res.status(409).json({ error: 'Cannot reply to a closed ticket' });
    return;
  }

  const reply = await prisma.ticketReply.create({
    data: {
      ticketId,
      body: parsed.data.body,
      fromAgent: parsed.data.fromAgent,
      createdById: req.user?.id,
    },
    select: {
      id: true,
      body: true,
      fromAgent: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true, role: true } },
    },
  });

  // Automatically re-open a RESOLVED ticket when a new reply comes in
  if (ticket.status === 'RESOLVED') {
    await prisma.ticket.update({ where: { id: ticketId }, data: { status: 'OPEN' } });
  }

  res.status(201).json({ success: true, data: reply });

  // Send outbound email to the customer (best-effort, fire-and-forget)
  boss.send('send-reply-email', { ticketId, replyId: reply.id }).catch((err: unknown) => {
    console.error('[replies] Failed to enqueue send-reply-email:', err instanceof Error ? err.message : err);
  });
});
