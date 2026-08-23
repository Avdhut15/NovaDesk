import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { prisma } from '../lib/prisma';

export const agentsRouter = Router();

// ─── GET /api/agents ──────────────────────────────────────────────────────────
// Returns all non-deleted users as a lightweight list for dropdowns.
// Available to any authenticated user (not admin-only).

agentsRouter.get('/', requireAuth(), async (_req, res) => {
  const agents = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: agents });
});
