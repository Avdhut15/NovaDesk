import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env';

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
