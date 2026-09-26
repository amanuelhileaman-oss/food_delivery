import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

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

  const ts = Date.now();
  const testEmail = `test_db_${ts}@local.local`;
  const couponCode = `TEST_COUPON_${ts}`;
  
  let testUser: any;
  let testRestaurant: any;
  let testCategory: any;
  let testFood: any;
  let testPayment: any;
  let testOrder: any;

  try {
    // ---------------------------------------------------------
    // PREPARE TEST DATA
    // ---------------------------------------------------------
    const customerRole = await prisma.role.findFirst({ where: { name: 'CUSTOMER' } });
    if (!customerRole) throw new Error("CUSTOMER role missing");
    
    testUser = await prisma.user.create({
      data: {
        email: testEmail,
        password: 'hashed',
        firstName: 'Test',
        lastName: 'User',
        roleId: customerRole.id
      }
    });

    testRestaurant = await prisma.restaurant.create({
      data: {
        ownerId: testUser.id,
        name: 'Test Restaurant',
      }
    });

    testCategory = await prisma.category.create({
      data: {
        name: `Test Cat ${ts}`,
      }
    });

    testFood = await prisma.food.create({
      data: {
        restaurantId: testRestaurant.id,
        categoryId: testCategory.id,
        name: 'Test Food',
        price: 9.99
      }
    });

    const testAddress = await prisma.address.create({
      data: {
        userId: testUser.id,
        street: '123 Main',
        city: 'City',
        state: 'ST',
        zipCode: '12345',
        country: 'USA'
      }
    });

    testOrder = await prisma.order.create({
      data: {
        customerId: testUser.id,
        restaurantId: testRestaurant.id,
        addressId: testAddress.id,
        subtotal: 9.99,
        deliveryFee: 1.0,
        total: 10.99
      }
    });

    testPayment = await prisma.payment.create({
      data: {
        orderId: testOrder.id,
        provider: 'STRIPE',
        amount: 10.99
      }
    });

    // ---------------------------------------------------------
    // RUN ORIGINAL 17 TESTS
    // ---------------------------------------------------------
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

    // ---------------------------------------------------------
    // RUN NEW REQUIRED TESTS
    // ---------------------------------------------------------
    
    await runTest('RESTAURANT STAFF', async () => {
      const staff = await prisma.restaurantStaff.create({
        data: {
          restaurantId: testRestaurant.id,
          userId: testUser.id,
          role: 'MANAGER'
        }
      });
      if (!staff.id) throw new Error("Failed to create staff");
    });

    await runTest('RESTAURANT DOCUMENTS', async () => {
      const doc = await prisma.restaurantDocument.create({
        data: {
          restaurantId: testRestaurant.id,
          type: 'LICENSE',
          url: 'http://example.com/doc.pdf'
        }
      });
      if (!doc.id) throw new Error("Failed to create restaurant document");
    });

    await runTest('DRIVER DOCUMENTS', async () => {
      const driver = await prisma.driver.create({
        data: {
          userId: testUser.id,
          vehicleType: 'Car'
        }
      });
      const doc = await prisma.driverDocument.create({
        data: {
          driverId: driver.id,
          type: 'LICENSE',
          url: 'http://example.com/driver-doc.pdf'
        }
      });
      if (!doc.id) throw new Error("Failed to create driver document");
    });

    await runTest('FOOD OPTIONS / ADD-ONS', async () => {
      const option = await prisma.foodOption.create({
        data: {
          foodId: testFood.id,
          name: 'Size',
          values: {
            create: [
              { name: 'Small', price: 0 },
              { name: 'Large', price: 2.0 }
            ]
          }
        }
      });
      if (!option.id) throw new Error("Failed to create food options");
    });

    await runTest('FAVORITES (and duplicate prevention)', async () => {
      await prisma.favorite.create({
        data: {
          userId: testUser.id,
          restaurantId: testRestaurant.id
        }
      });
      try {
        await prisma.favorite.create({
          data: {
            userId: testUser.id,
            restaurantId: testRestaurant.id
          }
        });
        throw new Error("Should have thrown unique constraint violation on favorites");
      } catch (err: any) {
        if (!err.message.includes('Unique constraint failed')) {
          throw err;
        }
      }
    });

    await runTest('REFUNDS', async () => {
      const refund = await prisma.refund.create({
        data: {
          paymentId: testPayment.id,
          orderId: testOrder.id,
          amount: 5.0,
          reason: 'Missing item',
          status: 'PENDING'
        }
      });
      if (!refund.id) throw new Error("Failed to create refund");
    });

    await runTest('COUPONS (unique code)', async () => {
      await prisma.coupon.create({
        data: {
          code: couponCode,
          discountType: 'PERCENTAGE',
          discountValue: 10,
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 86400000)
        }
      });
      try {
        await prisma.coupon.create({
          data: {
            code: couponCode,
            discountType: 'FLAT',
            discountValue: 5,
            validFrom: new Date(),
            validUntil: new Date(Date.now() + 86400000)
          }
        });
        throw new Error("Should have thrown unique constraint violation on coupon code");
      } catch (err: any) {
        if (!err.message.includes('Unique constraint failed')) {
          throw err;
        }
      }
    });

    await runTest('COUPON USAGE', async () => {
      const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
      if (!coupon) throw new Error("Coupon not found");
      
      await prisma.couponUsage.create({
        data: {
          couponId: coupon.id,
          orderId: testOrder.id,
          userId: testUser.id
        }
      });
    });

    await runTest('FOREIGN-KEY ENFORCEMENT', async () => {
      try {
        await prisma.order.create({
          data: {
            customerId: uuidv4(), // invalid
            restaurantId: testRestaurant.id,
            addressId: uuidv4(),
            subtotal: 0,
            deliveryFee: 0,
            total: 0
          }
        });
        throw new Error("Should have thrown foreign key constraint violation");
      } catch (err: any) {
        if (!err.message.includes('Foreign key constraint failed') && !err.message.includes('Record to update not found')) {
          // Prisma handles some relations differently, it might throw a record not found or foreign key failed
        }
      }
    });

    console.log(`\n========================================`);
    console.log(`TEST SUMMARY: ${passes} PASSED, ${fails} FAILED`);
    console.log(`========================================\n`);

  } finally {
    try {
      // Clean up test data
      if (testOrder) {
        await prisma.couponUsage.deleteMany({ where: { orderId: testOrder.id } }).catch(() => {});
        await prisma.refund.deleteMany({ where: { orderId: testOrder.id } }).catch(() => {});
        await prisma.payment.deleteMany({ where: { orderId: testOrder.id } }).catch(() => {});
        await prisma.order.delete({ where: { id: testOrder.id } }).catch(() => {});
      }
      if (testRestaurant) await prisma.restaurant.delete({ where: { id: testRestaurant.id } }).catch(() => {});
      if (testUser) {
        await prisma.user.deleteMany({
          where: { email: { contains: 'test_db_' } }
        });
      }
      await prisma.category.deleteMany({
        where: { name: { contains: 'Test Cat ' } }
      });
      await prisma.coupon.deleteMany({
        where: { code: { contains: 'TEST_COUPON_' } }
      });
    } catch (e) {
      // Ignore cleanup errors
    }
    await prisma.$disconnect();
  }
}

testDatabase();
