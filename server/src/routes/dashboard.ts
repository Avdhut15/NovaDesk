import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { prisma } from '../lib/prisma';

export const dashboardRouter = Router();

// ─── GET /api/dashboard/stats ─────────────────────────────────────────────────
// Returns aggregated KPI metrics + per-day ticket counts for the last 30 days.
// Auth-protected (any authenticated user).

dashboardRouter.get('/stats', requireAuth(), async (_req, res) => {
  // Look up the virtual AI agent so we can count AI-resolved tickets
  const aiAgent = await prisma.user.findUnique({
    where: { email: 'ai@novadesk.internal' },
    select: { id: true },
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
  thirtyDaysAgo.setUTCHours(0, 0, 0, 0);

  // Run all heavy queries in parallel
  const [
    totalTickets,
    openTickets,
    resolvedByAI,
    avgResolutionRaw,
    ticketsPerDayRaw,
  ] = await Promise.all([
    // Total tickets ever
    prisma.ticket.count(),

    // Currently open tickets
    prisma.ticket.count({ where: { status: 'OPEN' } }),

    // Tickets resolved by the AI agent
    aiAgent
      ? prisma.ticket.count({
          where: { assignedAgentId: aiAgent.id, status: 'RESOLVED' },
        })
      : Promise.resolve(0),

    // Average resolution time (ms) for RESOLVED tickets
    prisma.$queryRaw<{ avg_ms: bigint | null }[]>`
      SELECT AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) * 1000)::bigint AS avg_ms
      FROM tickets
      WHERE status = 'RESOLVED'
    `,

    // Tickets created per calendar day over the last 30 days
    prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT
        DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC') AS day,
        COUNT(*)::bigint                                    AS count
      FROM tickets
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
  ]);

  const avgMs = Number(avgResolutionRaw[0]?.avg_ms ?? 0);

  // Format avg resolution time as human-readable string (e.g. "2d 3h")
  const avgResolutionTime = formatDuration(avgMs);

  // AI resolution rate (0 if no tickets at all)
  const aiResolutionRate =
    totalTickets > 0
      ? Math.round((resolvedByAI / totalTickets) * 1000) / 10 // 1 decimal place
      : 0;

  // Normalise per-day data: fill any missing days with 0 so the chart is continuous
  const perDay = buildDayBuckets(thirtyDaysAgo, ticketsPerDayRaw);

  res.json({
    success: true,
    data: {
      totalTickets,
      openTickets,
      resolvedByAI,
      aiResolutionRate,
      avgResolutionTime,
      ticketsPerDay: perDay,
    },
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format milliseconds into a concise human-readable string (e.g. "2d 3h 15m") */
function formatDuration(ms: number): string {
  if (ms <= 0) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 && days === 0) parts.push(`${minutes}m`); // skip minutes when days shown
  return parts.length > 0 ? parts.join(' ') : '<1m';
}

/** Build a 30-day array with a count for every day (0 for days with no tickets) */
function buildDayBuckets(
  from: Date,
  rows: { day: Date; count: bigint }[],
): { date: string; count: number }[] {
  // Build a map from ISO date string (UTC) → count
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = row.day.toISOString().slice(0, 10);
    map.set(key, Number(row.count));
  }

  const result: { date: string; count: number }[] = [];
  // cursor starts at UTC midnight of `from` (already set via setUTCHours)
  const cursor = new Date(from);
  // Include everything up to end of today in UTC so today's bar is always shown
  const todayEnd = new Date();
  todayEnd.setUTCHours(23, 59, 59, 999);

  while (cursor <= todayEnd) {
    const key = cursor.toISOString().slice(0, 10);
    result.push({ date: key, count: map.get(key) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return result;
}
