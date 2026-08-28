import { Job } from 'pg-boss';
import { generateText } from 'ai';
import { google, AI_MODEL } from '../lib/ai';
import { prisma } from '../lib/prisma';

export interface ClassifyTicketJobData {
  ticketId: string;
  subject: string;
  body: string;
}

export async function classifyTicketWorker(jobs: Job<ClassifyTicketJobData>[]): Promise<void> {
  const categories = ['GENERAL_QUESTION', 'TECHNICAL_QUESTION', 'REFUND_REQUEST'] as const;

  for (const job of jobs) {
    const { ticketId, subject, body } = job.data;

    console.log(`[Worker] Classifying ticket ${ticketId}`);

    try {
      const { text } = await generateText({
        model: google(AI_MODEL),
        system: `You are a customer support ticket classifier.
Classify the given support ticket into EXACTLY one of these categories:
- GENERAL_QUESTION: General inquiries, feature questions, how-to, account questions.
- TECHNICAL_QUESTION: Bugs, crashes, errors, integrations, login/access issues.
- REFUND_REQUEST: Refund requests, billing disputes, cancellations, charge issues.

Respond with ONLY the category name, nothing else. No explanation, no punctuation.`,
        prompt: `Subject: ${subject}\n\n${body}`,
      });

      const category = text.trim().toUpperCase();
      if (!categories.includes(category as (typeof categories)[number])) {
        console.warn(`[Worker] classify: unexpected category "${category}" — skipping update`);
        continue;
      }

      await prisma.ticket.update({
        where: { id: ticketId },
        data: { category: category as (typeof categories)[number] },
      });

      console.log(`[Worker] classify: ticket ${ticketId} → ${category}`);
    } catch (error) {
      console.error(`[Worker] classify error for ticket ${ticketId}:`, error);
    }
  }
}
