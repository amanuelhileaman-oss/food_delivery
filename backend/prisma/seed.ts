import { PrismaClient } from '@prisma/client';
import { env } from '../src/config/env';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // Seed Roles
  const roles = ['CUSTOMER', 'RESTAURANT_OWNER', 'DRIVER', 'ADMIN'];
  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, permissions: [] },
    });
  }
  console.log('Roles seeded.');

  if (env.nodeEnv === 'development') {
    // Add safe development data
    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    const customerRole = await prisma.role.findUnique({ where: { name: 'CUSTOMER' } });

    if (adminRole && customerRole) {
      // Seed Admin
      await prisma.user.upsert({
        where: { email: 'admin@dev.local' },
        update: {},
        create: {
          email: 'admin@dev.local',
          password: 'hashed_password_placeholder', // Should be hashed in real scenarios
          firstName: 'Admin',
          lastName: 'User',
          roleId: adminRole.id,
          isVerified: true,
        }
      });

      // Seed Customer
      const customer = await prisma.user.upsert({
        where: { email: 'customer@dev.local' },
        update: {},
        create: {
          email: 'customer@dev.local',
          password: 'hashed_password_placeholder',
          firstName: 'John',
          lastName: 'Doe',
          roleId: customerRole.id,
          isVerified: true,
        }
      });
      console.log('Dev users seeded.');
      
      // Seed Categories
      const category = await prisma.category.upsert({
        where: { name: 'Fast Food' },
        update: {},
        create: { name: 'Fast Food', description: 'Quick and tasty' }
      });
      console.log('Dev categories seeded.');
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Seeding completed successfully.');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
