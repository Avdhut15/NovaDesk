import { Router } from 'express';

export const apiRouter = Router();

// ─── Route modules will be registered here in future phases ──────────────────
// import { authRouter } from './auth';
// import { usersRouter } from './users';
// import { ticketsRouter } from './tickets';

// apiRouter.use('/auth', authRouter);
// apiRouter.use('/users', usersRouter);
// apiRouter.use('/tickets', ticketsRouter);

apiRouter.get('/', (_req, res) => {
  res.json({ message: 'NovaDesk API v1' });
});
