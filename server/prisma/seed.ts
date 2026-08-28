import { PrismaClient, TicketStatus, TicketCategory } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from 'better-auth/crypto';
import { Role } from '../src/types/roles';
import * as fs from 'fs';
import * as path from 'path';


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

const customers = [
  { name: 'Alice Smith', email: 'alice.smith@example.com' },
  { name: 'Bob Johnson', email: 'bob.johnson@example.com' },
  { name: 'Charlie Brown', email: 'charlie.brown@example.com' },
  { name: 'David Miller', email: 'david.miller@example.com' },
  { name: 'Emily Davis', email: 'emily.davis@example.com' },
  { name: 'Fiona Gallagher', email: 'fiona.g@example.com' },
  { name: 'George Costanza', email: 'george.c@example.com' },
  { name: 'Hannah Abbott', email: 'hannah.a@example.com' },
  { name: 'Ian Malcolm', email: 'ian.m@example.com' },
  { name: 'Jessica Rabbit', email: 'jessica.r@example.com' },
  { name: 'Kevin Malone', email: 'kevin.malone@example.com' },
  { name: 'Laura Croft', email: 'laura.croft@example.com' },
  { name: 'Michael Scott', email: 'michael.scott@example.com' },
  { name: 'Nancy Drew', email: 'nancy.drew@example.com' },
  { name: 'Oscar Martinez', email: 'oscar.m@example.com' },
  { name: 'Pam Beesly', email: 'pam.b@example.com' },
  { name: 'Quincy Jones', email: 'quincy.j@example.com' },
  { name: 'Rachel Green', email: 'rachel.g@example.com' },
  { name: 'Ross Geller', email: 'ross.g@example.com' },
  { name: 'Sheldon Cooper', email: 'sheldon.c@example.com' },
  { name: 'Tony Stark', email: 'tony.stark@example.com' },
  { name: 'Ursula Buffay', email: 'ursula.b@example.com' },
  { name: 'Victor Frankenstein', email: 'victor.f@example.com' },
  { name: 'Wendy Darling', email: 'wendy.d@example.com' },
  { name: 'Xavier Cooper', email: 'xavier.c@example.com' },
  { name: 'Ygritte Snow', email: 'ygritte.s@example.com' },
  { name: 'Zack Morris', email: 'zack.m@example.com' },
  { name: 'Arthur Dent', email: 'arthur.dent@example.com' },
  { name: 'Beatrice Prior', email: 'beatrice.p@example.com' },
  { name: 'Clark Kent', email: 'clark.kent@example.com' },
  { name: 'Bruce Wayne', email: 'bruce.wayne@example.com' },
  { name: 'Diana Prince', email: 'diana.prince@example.com' },
  { name: 'Peter Parker', email: 'peter.parker@example.com' },
  { name: 'Mary Jane', email: 'mary.jane@example.com' },
  { name: 'Tony Soprano', email: 'tony.soprano@example.com' },
  { name: 'Carmela Soprano', email: 'carmela.s@example.com' },
  { name: 'Walter White', email: 'walter.white@example.com' },
  { name: 'Jesse Pinkman', email: 'jesse.pinkman@example.com' },
  { name: 'Saul Goodman', email: 'saul.goodman@example.com' },
  { name: 'Kim Wexler', email: 'kim.wexler@example.com' },
  { name: 'Gus Fring', email: 'gus.fring@example.com' },
  { name: 'Mike Ehrmantraut', email: 'mike.e@example.com' },
  { name: 'Hank Schrader', email: 'hank.s@example.com' },
  { name: 'Marie Schrader', email: 'marie.s@example.com' },
  { name: 'Skyler White', email: 'skyler.w@example.com' },
  { name: 'Ted Beneke', email: 'ted.beneke@example.com' },
  { name: 'Todd Alquist', email: 'todd.a@example.com' },
  { name: 'Lydia Rodarte', email: 'lydia.r@example.com' },
  { name: 'Jack Welker', email: 'jack.w@example.com' },
  { name: 'Jane Margolis', email: 'jane.m@example.com' },
];

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

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create Admin
  const admin = await createUser(SEED_ADMIN_EMAIL, 'Admin', Role.ADMIN, SEED_ADMIN_PASSWORD);
  
  // 2. Create Agent
  const agent = await createUser(SEED_AGENT_EMAIL, 'Agent 1', Role.AGENT, SEED_AGENT_PASSWORD);

  // 3. Seed Knowledge Base
  // Clear old KB articles first
  await prisma.knowledgeBase.deleteMany({});

  const kbPath = path.join(process.cwd(), 'prisma', 'knowledge-base.json');
  const kbData = JSON.parse(fs.readFileSync(kbPath, 'utf8'));

  await prisma.knowledgeBase.createMany({
    data: kbData,
    skipDuplicates: true,
  });
  console.log('✅ Knowledge base seeded from knowledge-base.json');

  // 4. Delete existing tickets to ensure clean repopulation
  console.log('🧹 Clearing old tickets...');
  await prisma.ticket.deleteMany({});

  // 5. Generate 50 realistic support tickets
  const assignees = [null, admin.id, agent.id];
  const statuses = [TicketStatus.OPEN, TicketStatus.RESOLVED, TicketStatus.CLOSED];
  
  console.log('Generating 50 realistic tickets...');
  const generatedData = Array.from({ length: 50 }).map((_, i) => {
    const template = ticketTemplates[i % ticketTemplates.length];
    const status = statuses[i % statuses.length];
    const assignee = assignees[i % assignees.length];
    const customer = customers[i % customers.length];
    
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
      fromEmail: customer.email,
      fromName: customer.name,
      createdAt: date,
      updatedAt: date,
    };
  });

  await prisma.ticket.createMany({ data: generatedData });
  console.log('✅ 50 realistic support tickets created!');

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
