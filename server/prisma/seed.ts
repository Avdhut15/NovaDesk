import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from 'better-auth/crypto';
import { Role } from '../src/types/roles';

// ─── DB Client ────────────────────────────────────────────────────────────────
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// ─── Seed Config from Env ─────────────────────────────────────────────────────
const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'password123';
const SEED_ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? 'Admin';

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Admin User ─────────────────────────────────────────────────────────────
  const existingUser = await prisma.user.findUnique({
    where: { email: SEED_ADMIN_EMAIL },
  });

  if (existingUser) {
    console.log(`⚠️  User ${SEED_ADMIN_EMAIL} already exists — skipping.`);
  } else {
    // Create the user record
    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: SEED_ADMIN_EMAIL,
        name: SEED_ADMIN_NAME,
        emailVerified: true,
        role: Role.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Hash the password using Better Auth's own hasher and link a credential account
    const hashed = await hashPassword(SEED_ADMIN_PASSWORD);
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

    console.log(`✅ Admin user created: ${user.email} (role: ${user.role})`);
  }

  // ─── Knowledge Base ───────────────────────────────────────────────────────
  await prisma.knowledgeBase.createMany({
    data: [
      {
        title: 'How to request a refund',
        content:
          'Refunds are processed within 5-7 business days. Submit your request through the support portal with your order ID.',
        category: 'REFUND_REQUEST',
      },
      {
        title: 'Account login issues',
        content:
          'If you cannot log in, try resetting your password. If the issue persists, contact support with your account email.',
        category: 'TECHNICAL_QUESTION',
      },
      {
        title: 'General FAQ',
        content:
          'Find answers to the most common questions in our help center at help.novadesk.local.',
        category: 'GENERAL_QUESTION',
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Knowledge base seeded');
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
