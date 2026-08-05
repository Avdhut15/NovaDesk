import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { prisma } from '../lib/prisma';
import { hashPassword } from 'better-auth/crypto';
import { Role } from '../types/roles';

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

// ─── POST /api/users ──────────────────────────────────────────────────────────
// Creates a new user. Admin-only.
usersRouter.post('/', requireAuth({ role: 'admin' }), async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already in use' });
    return;
  }

  const userId = crypto.randomUUID();
  const hashedPassword = await hashPassword(password);

  const newUser = await prisma.user.create({
    data: {
      id: userId,
      email,
      name,
      emailVerified: true,
      role: Role.AGENT,
      createdAt: new Date(),
      updatedAt: new Date(),
      accounts: {
        create: {
          id: crypto.randomUUID(),
          accountId: userId,
          providerId: 'credential',
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    },
  });

  res.status(201).json({ success: true, data: { id: newUser.id, name: newUser.name, email: newUser.email } });
});
