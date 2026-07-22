import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user (password: "admin123" — bcrypt hash)
  // NOTE: In Phase 2, replace this with a proper bcrypt hash
  const admin = await prisma.user.upsert({
    where: { email: 'admin@novadesk.local' },
    update: {},
    create: {
      email: 'admin@novadesk.local',
      name: 'Admin',
      role: 'ADMIN',
      passwordHash: '$2b$10$placeholder_change_in_phase2',
    },
  });

  console.log(`✅ Admin user: ${admin.email}`);

  // Seed some knowledge base entries
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
