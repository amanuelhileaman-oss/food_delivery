import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDatabase() {
  console.log('Testing Complete Database Architecture...\n');
  
  let passes = 0;
  let fails = 0;

  const runTest = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passes++;
    } catch (error) {
      console.error(`[FAIL] ${name}:`, error);
      fails++;
    }
  };

  try {
    await runTest('DATABASE CONNECTION', async () => {
      await prisma.$queryRaw`SELECT 1`;
    });

    await runTest('ROLES', async () => {
      const roles = await prisma.role.findMany();
      if (roles.length === 0) throw new Error('No roles found');
    });

    await runTest('USERS', async () => {
      const users = await prisma.user.findMany();
      if (users.length === 0) throw new Error('No users found');
    });

    await runTest('RESTAURANTS', async () => {
      await prisma.restaurant.findMany();
    });

    await runTest('DRIVERS', async () => {
      await prisma.driver.findMany();
    });

    await runTest('CATEGORIES', async () => {
      const cats = await prisma.category.findMany();
      if (cats.length === 0) throw new Error('No categories found');
    });

    await runTest('FOODS', async () => {
      await prisma.food.findMany();
    });

    await runTest('ADDRESSES', async () => {
      await prisma.address.findMany();
    });

    await runTest('CARTS', async () => {
      await prisma.cart.findMany();
    });

    await runTest('ORDERS', async () => {
      await prisma.order.findMany();
    });

    await runTest('ORDER ITEMS', async () => {
      await prisma.orderItem.findMany();
    });

    await runTest('ORDER STATUS HISTORY', async () => {
      await prisma.orderStatusHistory.findMany();
    });

    await runTest('PAYMENTS', async () => {
      await prisma.payment.findMany();
    });

    await runTest('REVIEWS', async () => {
      await prisma.review.findMany();
    });

    await runTest('NOTIFICATIONS', async () => {
      await prisma.notification.findMany();
    });

    await runTest('SUPPORT TICKETS', async () => {
      await prisma.supportTicket.findMany();
    });

    await runTest('AUDIT LOGS', async () => {
      await prisma.auditLog.findMany();
    });

    console.log(`\n========================================`);
    console.log(`TEST SUMMARY: ${passes} PASSED, ${fails} FAILED`);
    console.log(`========================================\n`);

  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
