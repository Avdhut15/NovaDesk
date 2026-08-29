import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env';

// Suppress the pg driver deprecation warning when Prisma executes concurrent queries in Bun
const originalEmitWarning = process.emitWarning;
process.emitWarning = function (warning: Error | string, ...args: any[]) {
  const msg = typeof warning === 'string' ? warning : warning.message;
  if (msg.includes('Calling client.query() when the client is already executing a query is deprecated')) {
    return;
  }
  return originalEmitWarning.call(process, warning, ...args);
};

// ─── Driver Adapter (Prisma 7 requires an adapter) ───────────────────────────
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

// ─── Singleton ────────────────────────────────────────────────────────────────
const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
