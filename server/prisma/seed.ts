import { PrismaClient, TicketStatus, TicketCategory } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from 'better-auth/crypto';
import { Role } from '../src/types/roles';

// ─── DB Client ────────────────────────────────────────────────────────────────
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const SEED_ADMIN_EMAIL = 'admin@example.com';
const SEED_ADMIN_PASSWORD = 'password123';
const SEED_AGENT_EMAIL = 'agent1@example.com';
const SEED_AGENT_PASSWORD = 'password123';

async function createUser(email: string, name: string, role: string, password: string) {
  let user = await prisma.user.findUnique({ where: { email } });
  
  if (user) {
    console.log(`⚠️  User ${email} already exists — skipping.`);
    return user;
  }

  user = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email,
      name,
      emailVerified: true,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const hashed = await hashPassword(password);
  await prisma.account.create({
    data: {
      id: crypto.randomUUID(),
      accountId: user.id,
      providerId: 'credential',
      userId: user.id,
      password: hashed,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log(`✅ ${role} user created: ${user.email}`);
  return user;
}

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create Admin
  const admin = await createUser(SEED_ADMIN_EMAIL, 'Admin', Role.ADMIN, SEED_ADMIN_PASSWORD);
  
  // 2. Create Agent
  const agent = await createUser(SEED_AGENT_EMAIL, 'Agent 1', Role.AGENT, SEED_AGENT_PASSWORD);

  // 3. Seed Knowledge Base
  await prisma.knowledgeBase.createMany({
    data: [
      {
        title: 'How to request a refund',
        content: 'Refunds are processed within 5-7 business days. Submit your request through the support portal with your order ID.',
        category: 'REFUND_REQUEST',
      },
      {
        title: 'Account login issues',
        content: 'If you cannot log in, try resetting your password. If the issue persists, contact support with your account email.',
        category: 'TECHNICAL_QUESTION',
      },
      {
        title: 'General FAQ',
        content: 'Find answers to the most common questions in our help center at help.novadesk.local.',
        category: 'GENERAL_QUESTION',
      },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Knowledge base seeded');

  // 4. Generate 50 realistic support tickets
  const ticketCount = await prisma.ticket.count();
  if (ticketCount === 0) {
    const ticketTemplates = [
      { s: "Cannot log into my account", b: "I've been trying to log in for the past hour but it keeps saying invalid credentials even though I just reset my password. Please help.", c: TicketCategory.TECHNICAL_QUESTION },
      { s: "Billing charged twice", b: "I checked my credit card statement and I was charged twice for the pro subscription this month. I would like a refund for the extra charge.", c: TicketCategory.REFUND_REQUEST },
      { s: "How do I export my data?", b: "Is there a way to export all my reports to a CSV file? I couldn't find the option in the dashboard.", c: TicketCategory.GENERAL_QUESTION },
      { s: "App crashes on iOS 17", b: "Ever since I updated my phone, your app crashes immediately after the splash screen.", c: TicketCategory.TECHNICAL_QUESTION },
      { s: "Need help setting up integration", b: "I'm trying to connect my Slack workspace but the OAuth flow just spins endlessly.", c: TicketCategory.TECHNICAL_QUESTION },
      { s: "Cancel my subscription", b: "I am not using the service enough to justify the cost. Please cancel my account and issue a prorated refund if possible.", c: TicketCategory.REFUND_REQUEST },
      { s: "What are your business hours?", b: "Do you offer phone support on weekends?", c: TicketCategory.GENERAL_QUESTION },
      { s: "Incorrect tax on invoice", b: "My latest invoice includes VAT but my company is VAT-exempt. Can you fix this?", c: TicketCategory.GENERAL_QUESTION },
      { s: "Forgot my username", b: "I can't remember the email address I used to sign up. I have my order number though.", c: TicketCategory.GENERAL_QUESTION },
      { s: "Feature request: Dark Mode", b: "It would be great if you could add a dark mode to the web app.", c: TicketCategory.GENERAL_QUESTION }
    ];

    const assignees = [null, admin.id, agent.id];
    const statuses = [TicketStatus.OPEN, TicketStatus.RESOLVED, TicketStatus.CLOSED];
    
    console.log('Generating 50 tickets...');
    const generatedData = Array.from({ length: 50 }).map((_, i) => {
      const template = ticketTemplates[i % ticketTemplates.length];
      const status = statuses[i % statuses.length];
      const assignee = assignees[i % assignees.length];
      // Randomize creation dates within the last 30 days
      const daysAgo = Math.floor(Math.random() * 30);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);

      return {
        subject: `${template.s} (Ticket #${i + 100})`,
        body: template.b,
        category: template.c,
        status,
        assignedAgentId: assignee,
        fromEmail: `customer${i}@example.com`,
        fromName: `Customer ${i}`,
        createdAt: date,
        updatedAt: date,
      };
    });

    await prisma.ticket.createMany({ data: generatedData });
    console.log('✅ 50 realistic support tickets created!');
  } else {
    console.log(`⚠️  Tickets already exist (${ticketCount}) — skipping ticket generation.`);
  }

  console.log('🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
