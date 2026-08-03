import { Router } from 'express';
import { usersRouter } from './users';

export const apiRouter = Router();

// ─── Route modules ────────────────────────────────────────────────────────────
apiRouter.use('/users', usersRouter);

// ─── Health / root ────────────────────────────────────────────────────────────
apiRouter.get('/', (_req, res) => {
  res.json({ message: 'NovaDesk API v1' });
});
