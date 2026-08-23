import { Router } from 'express';
import { usersRouter } from './users';
import { ticketsRouter } from './tickets';
import { repliesRouter } from './replies';
import { agentsRouter } from './agents';

export const apiRouter = Router();

// ─── Route modules ────────────────────────────────────────────────────────────
apiRouter.use('/users', usersRouter);
apiRouter.use('/tickets', ticketsRouter);
apiRouter.use('/tickets/:ticketId/replies', repliesRouter);
apiRouter.use('/agents', agentsRouter);

// ─── Health / root ────────────────────────────────────────────────────────────
apiRouter.get('/', (_req, res) => {
  res.json({ message: 'NovaDesk API v1' });
});
