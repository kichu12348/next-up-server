import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create preset admin accounts
  const adminEmails = [
    "rmahadevan574@gmail.com","aaminas402@gmail.com","iedclbsitw@gmail.com"
  ];

  for (const email of adminEmails) {
    try {
      await prisma.admin.upsert({
        where: { email },
        create: {
          email,
        },
        update: {}, // Don't update anything if admin already exists
      });
      console.log(`✓ Admin account created/verified: ${email}`);
    } catch (error) {
      console.error(`✗ Failed to create admin account: ${email}`, error);
    }
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
