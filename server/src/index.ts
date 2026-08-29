import express from 'express';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { env } from './config/env';
import { auth } from './lib/auth';
import { prisma } from './lib/prisma';
import { apiRouter } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { logEmailStatus } from './lib/email';

const app = express();

// ─── Core Middleware ──────────────────────────────────────────────────────────
const allowedOrigins = [
  env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
];

app.use(
  cors({
    origin: (requestOrigin, callback) => {
      if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Better Auth Handler ──────────────────────────────────────────────────────
// Must be registered BEFORE express.json() so Better Auth can read the raw body.
app.all('/api/auth/*splat', toNodeHandler(auth));

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  let dbStatus = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'error';
  }
  res.status(dbStatus === 'ok' ? 200 : 503).json({
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    db: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', apiRouter);

// ─── Error Handlers ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(env.PORT, async () => {
  console.log(`🚀 NovaDesk server running on http://localhost:${env.PORT}`);
  console.log(`🔐 Auth available at http://localhost:${env.PORT}/api/auth`);
  
  // Start pg-boss queue
  const { boss, ensureQueues } = await import('./lib/queue');
  await boss.start();
  console.log('[pg-boss] Queue started');
  
  // Guarantee both queues exist in the DB before workers or producers use them
  await ensureQueues(boss);
  
  // Register workers
  const { startWorkers } = await import('./workers');
  await startWorkers(boss);

  // Log email subsystem status
  logEmailStatus();
});

export default app;
