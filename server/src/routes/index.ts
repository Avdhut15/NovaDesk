import { Router } from 'express';
import { usersRouter } from './users';
import { ticketsRouter } from './tickets';

export const apiRouter = Router();

// ─── Route modules ────────────────────────────────────────────────────────────
apiRouter.use('/users', usersRouter);
apiRouter.use('/tickets', ticketsRouter);

// ─── Health / root ────────────────────────────────────────────────────────────
apiRouter.get('/', (_req, res) => {
  res.json({ message: 'NovaDesk API v1' });
});
