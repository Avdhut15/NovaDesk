import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// ─── DB Client ────────────────────────────────────────────────────────────────
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const categories = ['GENERAL_QUESTION', 'TECHNICAL_QUESTION', 'REFUND_REQUEST'] as const;
const statuses = ['OPEN', 'RESOLVED', 'CLOSED'] as const;

const senders = [
  { name: 'Alice Smith', email: 'alice.smith@example.com' },
  { name: 'Bob Johnson', email: 'bob.johnson@example.com' },
  { name: 'Charlie Brown', email: 'charlie.brown@example.com' },
  { name: 'Diana Prince', email: 'diana.prince@example.com' },
  { name: 'Evan Wright', email: 'evan.wright@example.com' },
  { name: 'Fiona Gallagher', email: 'fiona.g@example.com' },
  { name: 'George Costanza', email: 'george.c@example.com' },
  { name: 'Hannah Abbott', email: 'hannah.a@example.com' },
  { name: 'Ian Malcolm', email: 'ian.m@example.com' },
  { name: 'Julia Roberts', email: 'julia.r@example.com' },
];

const ticketTemplates = [
  {
    category: 'TECHNICAL_QUESTION' as const,
    subjectTemplates: [
      'Cannot log into my account',
      'API returning 500 error on checkout',
      'Dashboard layout broken on mobile screen',
      'Password reset link not working',
      'Cannot connect my custom domain',
      'How to setup webhook integrations',
      'SSL certificate renewal failed',
      'Importing CSV data times out',
      'Two-factor authentication code rejected',
      'Session expires too quickly',
    ],
    bodyTemplates: [
      'Every time I try to log in, the page just reloads with no error message. Please assist.',
      'I am receiving a HTTP 500 Internal Server Error when posting to the /api/checkout endpoint. Here is the payload...',
      'On my iPhone 13, the main dashboard navigation overlapping with the content, making it impossible to click options.',
      'I clicked the password reset link in my email, but it says "Token Expired" immediately. Please check.',
      'I updated the DNS records to point to your servers but the status page still says domain unresolved.',
      'Is there any comprehensive guide or documentation for setting up the webhooks on our server?',
      'Our website shows a security warning because the SSL certificate expired yesterday and did not renew auto.',
      'When uploading our contacts CSV file (about 10k rows), the process hangs and then shows a timeout error.',
      'I have my authenticator app synced, but the generated codes are saying invalid. Can we reset my 2FA?',
      'I get logged out every 10 minutes. Is there a "Remember Me" option or a way to increase session duration?',
    ]
  },
  {
    category: 'REFUND_REQUEST' as const,
    subjectTemplates: [
      'Accidental double charge on subscription',
      'Requesting refund for unused annual plan',
      'Charged during trial period',
      'Cancel subscription and refund last payment',
      'Dispute charge on invoice #9988',
      'Promo code not applied on purchase',
      'Incorrect billing amount on credit card',
      'Upgrade refund policy question',
      'Refund request - service downtime',
      'Credit note query for invoice #204',
    ],
    bodyTemplates: [
      'I noticed two identical charges of $49 on my bank statement for this month. Please refund one of them.',
      'I upgraded to the annual plan last week but my company has decided to change direction. Can I get a prorated refund?',
      'My trial was supposed to end tomorrow, but I was charged today. Please refund this amount as I wanted to cancel.',
      'I want to close my account. I was charged today, but I have not used the system this billing cycle.',
      'Invoice #9988 shows an extra user charge that we did not authorize. Please issue a refund for the excess.',
      'I entered the coupon code SAVE20 but was billed the full price. Can you adjust the price and refund the difference?',
      'My card was charged $120 instead of the agreed $90. Please correct this and refund the $30.',
      'What is your refund policy if I decide to upgrade from Pro to Enterprise and change my mind later?',
      'Our team experienced 4 hours of complete downtime on Tuesday. We are requesting a SLA credit/refund.',
      'I received a credit note, but the refund hasn\'t hit my bank card. When should I expect it?',
    ]
  },
  {
    category: 'GENERAL_QUESTION' as const,
    subjectTemplates: [
      'Pricing plans for non-profit organizations',
      'Do you support self-hosting / on-premise?',
      'Looking for sales contact',
      'Data privacy and GDPR compliance info',
      'Exporting historical analytics reports',
      'Do you have a public roadmap?',
      'Feature request: Dark mode support',
      'Question about user seat limits',
      'Difference between Pro and Enterprise tiers',
      'Supported languages and localization options',
    ],
    bodyTemplates: [
      'We are a registered 501(c)(3) charity. Do you offer special discounts or pricing for non-profits?',
      'Our security policy requires us to store data locally. Do you provide a self-hosted Docker image?',
      'We want to buy 150 seats and need to talk to a sales representative. Can someone call me at...',
      'Where can I find your GDPR compliance documentation and sign a Data Processing Addendum (DPA)?',
      'Is it possible to export all of our support tickets and response times into a CSV/PDF for the last year?',
      'We are looking forward to the Slack integration. Is there an public roadmap where we can track progress?',
      'Our team works late at night and a dark mode would be extremely helpful. Are there plans to add one?',
      'If we reach our user seat limit, what happens? Does the system block new users or auto-upgrade us?',
      'Can you clarify what security features are exclusive to the Enterprise tier compared to Pro?',
      'Do you support Spanish or French translations for the customer facing portal/widgets?',
    ]
  }
];

async function main() {
  console.log('🌱 Starting to seed 100 diversified tickets...');

  // Get first user (to optionally assign some tickets or set as manual creator)
  const agent = await prisma.user.findFirst({
    where: { role: 'admin' },
  });
  const agentId = agent?.id ?? null;

  // Let's clear existing tickets to make it fresh and exactly 100
  await prisma.ticketReply.deleteMany({});
  await prisma.ticket.deleteMany({});

  const ticketsData = [];

  for (let i = 0; i < 100; i++) {
    // Pick sender
    const sender = senders[i % senders.length];
    
    // Pick category template
    const templateGroup = ticketTemplates[i % ticketTemplates.length];
    const category = templateGroup.category;
    
    // Pick index for template lists
    const templateIndex = Math.floor(Math.random() * templateGroup.subjectTemplates.length);
    const subjectBase = templateGroup.subjectTemplates[templateIndex];
    const body = templateGroup.bodyTemplates[templateIndex];
    
    // Append index to subject to make it unique and easy to track
    const subject = `${subjectBase} (#${100 - i})`;
    const statusRand = Math.random();
    const status: 'OPEN' | 'RESOLVED' | 'CLOSED' = statusRand < 0.6 ? 'OPEN' : statusRand < 0.8 ? 'RESOLVED' : 'CLOSED';

    // Dates spread over the last 30 days
    const daysAgo = Math.random() * 30;
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const updatedAt = new Date(createdAt.getTime() + Math.random() * 2 * 24 * 60 * 60 * 1000);

    // Some tickets are manually created (no fromEmail/fromName), others are email ingest
    const isManual = Math.random() < 0.15; // 15% manual
    const fromEmail = isManual ? null : sender.email;
    const fromName = isManual ? null : sender.name;
    const emailThreadId = isManual ? null : `<thread-${crypto.randomUUID()}@novadesk.local>`;
    const createdById = isManual ? agentId : null;

    // Assigned agent: 50% chance of being assigned to the seed agent
    const assignedAgentId = (Math.random() < 0.5 && agentId) ? agentId : null;

    ticketsData.push({
      subject,
      body,
      status,
      category,
      fromEmail,
      fromName,
      emailThreadId,
      createdById,
      assignedAgentId,
      createdAt,
      updatedAt,
    });
  }

  // To make sure we have exactly 100
  console.log(`Prepared ${ticketsData.length} tickets. Inserting into database...`);

  await prisma.ticket.createMany({
    data: ticketsData,
  });

  // Let's seed some replies on 30% of the tickets
  const seededTickets = await prisma.ticket.findMany({ select: { id: true } });
  const repliesData = [];

  for (const t of seededTickets) {
    if (Math.random() < 0.3) {
      // 1 to 3 replies
      const numReplies = Math.floor(Math.random() * 3) + 1;
      for (let r = 0; r < numReplies; r++) {
        const replyDaysAfter = Math.random() * 2;
        repliesData.push({
          ticketId: t.id,
          body: `This is a sample reply #${r + 1} addressing this ticket. Let us look into this right away.`,
          fromAgent: Math.random() < 0.7, // 70% agent replies
          createdAt: new Date(Date.now() - (30 - replyDaysAfter) * 24 * 60 * 60 * 1000),
        });
      }
    }
  }

  if (repliesData.length > 0) {
    await prisma.ticketReply.createMany({
      data: repliesData,
    });
    console.log(`✅ Seeded ${repliesData.length} ticket replies.`);
  }

  console.log('🎉 Seed complete! 100 diversified tickets created.');
}

main()
  .catch((e) => {
    console.error('❌ Ticket seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
