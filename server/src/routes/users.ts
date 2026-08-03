import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { prisma } from '../lib/prisma';

export const usersRouter = Router();

// ─── GET /api/users ───────────────────────────────────────────────────────────
// Returns all users (id, name, email, role, createdAt, emailVerified).
// Admin-only. Supports optional ?role=admin|agent query param.
// Express 5 natively propagates async rejections to the error handler.
usersRouter.get('/', requireAuth({ role: 'admin' }), async (req, res) => {
  const roleFilter = req.query.role as string | undefined;

  const users = await prisma.user.findMany({
    where: roleFilter ? { role: roleFilter } : undefined,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  res.json({ success: true, data: users });
});
