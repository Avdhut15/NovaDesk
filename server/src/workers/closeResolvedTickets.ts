import { Job } from 'pg-boss';
import { prisma } from '../lib/prisma';

export async function closeResolvedTicketsWorker(jobs: Job[]): Promise<void> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const result = await prisma.ticket.updateMany({
      where: {
        status: 'RESOLVED',
        updatedAt: { lt: oneDayAgo },
      },
      data: {
        status: 'CLOSED',
      },
    });

    if (result.count > 0) {
      console.log(`[close-resolved-tickets] Closed ${result.count} tickets that were resolved over 24 hours ago.`);
    }
  } catch (error) {
    console.error('[close-resolved-tickets] Failed to close old resolved tickets:', error);
  }
}
