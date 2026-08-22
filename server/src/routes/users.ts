import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { prisma } from '../lib/prisma';
import { hashPassword } from 'better-auth/crypto';
import { Role } from '../types/roles';

export const usersRouter = Router();

// ─── GET /api/users/agents ────────────────────────────────────────────────────
// Returns all non-deleted users as a lightweight list for dropdowns.
// Available to any authenticated user (not admin-only).
usersRouter.get('/agents', requireAuth(), async (_req, res) => {
  const agents = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: agents });
});

// ─── GET /api/users ───────────────────────────────────────────────────────────
// Returns all users (id, name, email, role, createdAt, emailVerified).
// Admin-only. Supports optional ?role=admin|agent query param.
// Express 5 natively propagates async rejections to the error handler.
usersRouter.get('/', requireAuth({ role: 'admin' }), async (req, res) => {
  const roleFilter = req.query.role as string | undefined;

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      ...(roleFilter ? { role: roleFilter } : {}),
    },
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

// ─── PUT /api/users/:id ───────────────────────────────────────────────────────
// Edits a user. Admin-only.
usersRouter.put('/:id', requireAuth({ role: 'admin' }), async (req, res) => {
  const id = req.params.id as string;
  const { name, email, password } = req.body;
  if (!name || !email) {
    res.status(400).json({ error: 'Name and email are required' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (email !== existing.email) {
    const emailCheck = await prisma.user.findUnique({ where: { email } });
    if (emailCheck) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }
  }

  const updateData: any = { name, email, updatedAt: new Date() };

  if (password) {
    const hashedPassword = await hashPassword(password);
    // Update the credential account
    await prisma.account.updateMany({
      where: { accountId: id, providerId: 'credential' },
      data: { password: hashedPassword, updatedAt: new Date() },
    });
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
  });

  res.json({ success: true, data: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email } });
});

// ─── DELETE /api/users/:id ────────────────────────────────────────────────────
// Soft deletes a user. Admins cannot be deleted. Admin-only.
usersRouter.delete('/:id', requireAuth({ role: 'admin' }), async (req, res) => {
  const id = req.params.id as string;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (existing.role === 'admin') {
    res.status(403).json({ error: 'Admins cannot be deleted' });
    return;
  }

  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  // Terminate active sessions and scramble password to prevent future logins
  await prisma.session.deleteMany({ where: { userId: id } });
  await prisma.account.updateMany({
    where: { userId: id, providerId: 'credential' },
    data: { password: `deleted_${crypto.randomUUID()}`, updatedAt: new Date() },
  });

  // Unassign any tickets currently assigned to this user
  await prisma.ticket.updateMany({
    where: { assignedAgentId: id },
    data: { assignedAgentId: null },
  });

  res.json({ success: true, message: 'User deleted successfully' });
});
