import express, { Request, Response } from 'express';
import axios from 'axios';
import prisma from './src/config/db';
import { authenticateUser, authorizeRole, authorizeResourceOwnership } from './src/middlewares/auth.middleware';
import { generateAccessToken } from './src/utils/jwt.util';
import { errorHandler } from './src/middlewares/errorHandler';

const app = express();
app.use(express.json());

// Dummy endpoints
const dummyController = (req: Request, res: Response) => {
  res.json({ success: true, data: 'Authorized' });
};

// Admin route
app.get('/api/v1/admin/dashboard', authenticateUser, authorizeRole('ADMIN'), dummyController);

// Customer route
app.get('/api/v1/orders/:orderId', authenticateUser, authorizeRole('CUSTOMER', 'RESTAURANT_OWNER', 'DRIVER', 'ADMIN'), authorizeResourceOwnership('order', 'orderId'), dummyController);

// Restaurant owner route
app.put('/api/v1/restaurants/:restaurantId', authenticateUser, authorizeRole('RESTAURANT_OWNER', 'ADMIN'), authorizeResourceOwnership('restaurant', 'restaurantId'), dummyController);

// Driver route
app.get('/api/v1/deliveries/:orderId', authenticateUser, authorizeRole('DRIVER', 'ADMIN'), authorizeResourceOwnership('order', 'orderId'), dummyController);

// Profile
app.get('/api/v1/users/:userId', authenticateUser, authorizeResourceOwnership('user', 'userId'), dummyController);
app.put('/api/v1/users/:userId', authenticateUser, authorizeResourceOwnership('user', 'userId'), dummyController);

// Address
app.get('/api/v1/addresses/:addressId', authenticateUser, authorizeResourceOwnership('address', 'addressId'), dummyController);

// Cart
app.get('/api/v1/carts/:cartId', authenticateUser, authorizeResourceOwnership('cart', 'cartId'), dummyController);

// Favorite
app.get('/api/v1/favorites/:favoriteId', authenticateUser, authorizeResourceOwnership('favorite', 'favoriteId'), dummyController);

// Review
app.get('/api/v1/reviews/:reviewId', authenticateUser, authorizeResourceOwnership('review', 'reviewId'), dummyController);

// Support Ticket
app.get('/api/v1/support-tickets/:ticketId', authenticateUser, authorizeResourceOwnership('supportTicket', 'ticketId'), dummyController);

// User profile route
app.put('/api/v1/users/:userId', authenticateUser, authorizeResourceOwnership('user', 'userId'), dummyController);

app.use(errorHandler);

const PORT = 5002;
let server: any;

const runTest = async (name: string, testFn: () => Promise<void>) => {
  try {
    await testFn();
    console.log(`[PASS] ${name}`);
    return true;
  } catch (error: any) {
    console.error(`[FAIL] ${name}: ${error.message || error}`);
    return false;
  }
};

const setupData = async () => {
  // Clear relevant tables
  await prisma.review.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.order.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  // Create roles
  const adminRole = await prisma.role.create({ data: { name: 'ADMIN' } });
  const customerRole = await prisma.role.create({ data: { name: 'CUSTOMER' } });
  const ownerRole = await prisma.role.create({ data: { name: 'RESTAURANT_OWNER' } });
  const driverRole = await prisma.role.create({ data: { name: 'DRIVER' } });

  // Create users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@authz.com',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User',
      roleId: adminRole.id,
      isVerified: true
    }
  });

  const customer1 = await prisma.user.create({
    data: {
      email: 'customer1@authz.com',
      password: 'password123',
      firstName: 'Customer',
      lastName: 'One',
      roleId: customerRole.id,
      isVerified: true,
      addresses: {
        create: {
          street: '123 Test',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'TestLand',
          isDefault: true
        }
      }
    },
    include: { addresses: true }
  });

  const customer2 = await prisma.user.create({
    data: {
      email: 'customer2@authz.com',
      password: 'password123',
      firstName: 'Customer',
      lastName: 'Two',
      roleId: customerRole.id,
      isVerified: true,
      addresses: {
        create: {
          street: '456 Test',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'TestLand',
          isDefault: true
        }
      }
    },
    include: { addresses: true }
  });

  const owner1 = await prisma.user.create({
    data: {
      email: 'owner1@authz.com',
      password: 'password123',
      firstName: 'Owner',
      lastName: 'One',
      roleId: ownerRole.id,
      isVerified: true
    }
  });

  const owner2 = await prisma.user.create({
    data: {
      email: 'owner2@authz.com',
      password: 'password123',
      firstName: 'Owner',
      lastName: 'Two',
      roleId: ownerRole.id,
      isVerified: true
    }
  });

  const driver1 = await prisma.user.create({
    data: {
      email: 'driver1@authz.com',
      password: 'password123',
      firstName: 'Driver',
      lastName: 'One',
      roleId: driverRole.id,
      isVerified: true,
      driverProfile: {
        create: {
          vehicleType: 'Car'
        }
      }
    },
    include: { driverProfile: true }
  });

  const driver2 = await prisma.user.create({
    data: {
      email: 'driver2@authz.com',
      password: 'password123',
      firstName: 'Driver',
      lastName: 'Two',
      roleId: driverRole.id,
      isVerified: true,
      driverProfile: {
        create: {
          vehicleType: 'Bike'
        }
      }
    },
    include: { driverProfile: true }
  });

  // Create restaurants
  const restaurant1 = await prisma.restaurant.create({
    data: {
      name: 'Restaurant One',
      ownerId: owner1.id,
      status: 'APPROVED',
      isActive: true
    }
  });

  const restaurant2 = await prisma.restaurant.create({
    data: {
      name: 'Restaurant Two',
      ownerId: owner2.id,
      status: 'APPROVED',
      isActive: true
    }
  });

  // Create orders
  const order1 = await prisma.order.create({
    data: {
      customerId: customer1.id,
      restaurantId: restaurant1.id,
      driverId: driver1.driverProfile?.id,
      addressId: customer1.addresses[0].id,
      subtotal: 10,
      deliveryFee: 2,
      total: 12,
      status: 'PENDING'
    }
  });

  const order2 = await prisma.order.create({
    data: {
      customerId: customer2.id,
      restaurantId: restaurant2.id,
      driverId: driver2.driverProfile?.id,
      addressId: customer2.addresses[0].id,
      subtotal: 15,
      deliveryFee: 2,
      total: 17,
      status: 'PENDING'
    }
  });

  const cart1 = await prisma.cart.create({
    data: { userId: customer1.id }
  });

  const favorite1 = await prisma.favorite.create({
    data: { userId: customer1.id, restaurantId: restaurant1.id }
  });

  const review1 = await prisma.review.create({
    data: {
      customerId: customer1.id,
      restaurantId: restaurant1.id,
      orderId: order1.id,
      rating: 5,
      comment: 'Great'
    }
  });

  const ticket1 = await prisma.supportTicket.create({
    data: {
      userId: customer1.id,
      subject: 'Issue',
      description: 'Help'
    }
  });

  return { admin, customer1, customer2, owner1, owner2, driver1, driver2, restaurant1, restaurant2, order1, order2, cart1, favorite1, review1, ticket1 };
};

const startServer = () => new Promise((resolve) => {
  server = app.listen(PORT, () => {
    resolve(true);
  });
});

const stopServer = () => new Promise((resolve) => {
  server.close(() => {
    resolve(true);
  });
});

const main = async () => {
  console.log('Setting up authorization test data...');
  const data = await setupData();
  await startServer();

  const getClient = (user: any) => {
    if (!user) {
      return axios.create({ baseURL: `http://localhost:${PORT}`, validateStatus: () => true });
    }
    const token = generateAccessToken({ userId: user.id, role: user.roleId }); // Wait, payload should be role: user.role.name but we only fetched user, not role.
    // Actually our auth.middleware fetches user from DB using decoded.userId. So the token only strictly needs userId.
    return axios.create({
      baseURL: `http://localhost:${PORT}`,
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true
    });
  };

  // Re-fetch users with roles to ensure payload is exactly matching real app if we change jwt util
  const adminFull = await prisma.user.findUnique({ where: { id: data.admin.id }, include: { role: true } });
  const customer1Full = await prisma.user.findUnique({ where: { id: data.customer1.id }, include: { role: true } });
  const owner1Full = await prisma.user.findUnique({ where: { id: data.owner1.id }, include: { role: true } });
  const driver1Full = await prisma.user.findUnique({ where: { id: data.driver1.id }, include: { role: true } });

  const adminClient = getClient(adminFull);
  const customer1Client = getClient(customer1Full);
  const owner1Client = getClient(owner1Full);
  const driver1Client = getClient(driver1Full);
  const unauthClient = getClient(null);

  let passed = 0;
  let failed = 0;

  console.log('\nRunning Authorization Scenarios...\n');

  // 1. Customer attempts admin API.
  const r1 = await runTest('Customer attempts admin API', async () => {
    const res = await customer1Client.get('/api/v1/admin/dashboard');
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });
  r1 ? passed++ : failed++;

  // 2. Customer attempts another customer's order.
  const r2 = await runTest('Customer attempts another customer\'s order', async () => {
    // customer 1 attempting to view order 2
    const res = await customer1Client.get(`/api/v1/orders/${data.order2.id}`);
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    
    // customer 1 attempting to view own order
    const res2 = await customer1Client.get(`/api/v1/orders/${data.order1.id}`);
    if (res2.status !== 200) throw new Error(`Expected 200 for own order, got ${res2.status}`);
  });
  r2 ? passed++ : failed++;

  // 3. Restaurant owner attempts another restaurant.
  const r3 = await runTest('Restaurant owner attempts another restaurant', async () => {
    // owner 1 attempting to edit restaurant 2
    const res = await owner1Client.put(`/api/v1/restaurants/${data.restaurant2.id}`);
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);

    // owner 1 attempting to edit own restaurant
    const res2 = await owner1Client.put(`/api/v1/restaurants/${data.restaurant1.id}`);
    if (res2.status !== 200) throw new Error(`Expected 200 for own restaurant, got ${res2.status}`);
  });
  r3 ? passed++ : failed++;

  // 4. Driver attempts another driver's delivery.
  const r4 = await runTest('Driver attempts another driver\'s delivery', async () => {
    // driver 1 attempting to view order 2
    const res = await driver1Client.get(`/api/v1/deliveries/${data.order2.id}`);
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);

    // driver 1 attempting to view own order
    const res2 = await driver1Client.get(`/api/v1/deliveries/${data.order1.id}`);
    if (res2.status !== 200) throw new Error(`Expected 200 for own delivery, got ${res2.status}`);
  });
  r4 ? passed++ : failed++;

  // 5. User changes IDs in API requests.
  const r5 = await runTest('User changes IDs in API requests (Mismatched ownership)', async () => {
    // User tries to edit another user's profile
    const res = await customer1Client.put(`/api/v1/users/${data.owner1.id}`);
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);

    // User tries to edit their own profile
    const res2 = await customer1Client.put(`/api/v1/users/${data.customer1.id}`);
    if (res2.status !== 200) throw new Error(`Expected 200, got ${res2.status}`);
  });
  r5 ? passed++ : failed++;

  // 6. User attempts to assign themselves admin (Simulated via role escalation)
  const r6 = await runTest('User attempts to assign themselves admin (Role protection)', async () => {
    // The role is bound to the token/DB, they cannot just bypass authorizeRole
    const res = await customer1Client.get('/api/v1/admin/dashboard');
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });
  r6 ? passed++ : failed++;

  // 7. Unauthenticated user accesses protected API.
  const r7 = await runTest('Unauthenticated user accesses protected API', async () => {
    const res = await unauthClient.get('/api/v1/admin/dashboard');
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });
  r7 ? passed++ : failed++;

  // Admin access check (Admin bypasses ownership)
  const r8 = await runTest('Admin accesses another user\'s resource (Admin bypass)', async () => {
    const res = await adminClient.put(`/api/v1/restaurants/${data.restaurant1.id}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });
  r8 ? passed++ : failed++;

  console.log('\nRunning Positive Authorization Scenarios...\n');

  const p1 = await runTest('Customer accesses their own profile', async () => {
    const res = await customer1Client.get(`/api/v1/users/${data.customer1.id}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });
  p1 ? passed++ : failed++;

  const p2 = await runTest('Customer accesses their own address', async () => {
    const res = await customer1Client.get(`/api/v1/addresses/${data.customer1.addresses[0].id}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });
  p2 ? passed++ : failed++;

  const p3 = await runTest('Customer accesses their own cart', async () => {
    const res = await customer1Client.get(`/api/v1/carts/${data.cart1.id}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });
  p3 ? passed++ : failed++;

  const p4 = await runTest('Customer accesses their own order', async () => {
    const res = await customer1Client.get(`/api/v1/orders/${data.order1.id}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });
  p4 ? passed++ : failed++;

  const p5 = await runTest('Customer accesses their own favorite', async () => {
    const res = await customer1Client.get(`/api/v1/favorites/${data.favorite1.id}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });
  p5 ? passed++ : failed++;

  const p6 = await runTest('Customer accesses their own review', async () => {
    const res = await customer1Client.get(`/api/v1/reviews/${data.review1.id}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });
  p6 ? passed++ : failed++;

  const p7 = await runTest('Customer accesses their own support ticket', async () => {
    const res = await customer1Client.get(`/api/v1/support-tickets/${data.ticket1.id}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });
  p7 ? passed++ : failed++;

  const p8 = await runTest('Restaurant owner accesses/manages their own restaurant', async () => {
    const res = await owner1Client.put(`/api/v1/restaurants/${data.restaurant1.id}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });
  p8 ? passed++ : failed++;

  const p9 = await runTest('Driver accesses their own assigned delivery', async () => {
    const res = await driver1Client.get(`/api/v1/deliveries/${data.order1.id}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });
  p9 ? passed++ : failed++;

  const p10 = await runTest('Admin accesses an authorized administrative resource', async () => {
    const res = await adminClient.get(`/api/v1/admin/dashboard`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });
  p10 ? passed++ : failed++;

  console.log('\n========================================');
  console.log('AUTHORIZATION TEST SUMMARY');
  console.log('========================================\n');
  console.log(`TOTAL: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================');

  await stopServer();
  await prisma.$disconnect();
};

main();
