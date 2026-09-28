import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:5000/api/v1';

async function main() {
  console.log('Testing Customer API Features...\n');

  // Retry logic for DB
  let retries = 5;
  while (retries > 0) {
    try {
      await prisma.$connect();
      break;
    } catch (e: any) {
      if (retries === 1) throw e;
      console.log('Database waking up... Retrying in 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      retries--;
    }
  }
  
  // Clean up previous runs
  await prisma.review.deleteMany({ where: { comment: 'Test Review' } });
  await prisma.favorite.deleteMany({ where: { user: { email: { startsWith: 'customer' } } } });
  
  const role = await prisma.role.findUnique({ where: { name: 'CUSTOMER' } });
  if (!role) throw new Error("Customer role not found");
  
  const hash = await bcrypt.hash('password123', 10);

  // Setup Customer A
  let customerA = await prisma.user.findUnique({ where: { email: 'customerA@test.local' } });
  if (!customerA) {
    customerA = await prisma.user.create({
      data: { email: 'customerA@test.local', password: hash, firstName: 'A', lastName: 'Test', isVerified: true, roleId: role.id }
    });
  } else {
    await prisma.user.update({ where: { id: customerA.id }, data: { password: hash } });
  }

  // Setup Customer B
  let customerB = await prisma.user.findUnique({ where: { email: 'customerB@test.local' } });
  if (!customerB) {
    customerB = await prisma.user.create({
      data: { email: 'customerB@test.local', password: hash, firstName: 'B', lastName: 'Test', isVerified: true, roleId: role.id }
    });
  }

  // Setup Customer C (for empty states)
  let customerC = await prisma.user.findUnique({ where: { email: 'customerC@test.local' } });
  if (!customerC) {
    customerC = await prisma.user.create({
      data: { email: 'customerC@test.local', password: hash, firstName: 'C', lastName: 'Test', isVerified: true, roleId: role.id }
    });
  } else {
    // Clear out data for C in case previous tests left it
    await prisma.favorite.deleteMany({ where: { userId: customerC.id } });
    await prisma.order.deleteMany({ where: { customerId: customerC.id } });
  }

  // Setup generic test data (Restaurant, category, food)
  const ownerRole = await prisma.role.findUnique({ where: { name: 'RESTAURANT_OWNER' } });
  let owner = await prisma.user.findUnique({ where: { email: 'owner@test.local' } });
  if (!owner) {
    owner = await prisma.user.create({ data: { email: 'owner@test.local', password: hash, firstName: 'O', lastName: 'Test', isVerified: true, roleId: ownerRole!.id } });
  }

  let testRest = await prisma.restaurant.findFirst({ where: { name: 'Test Restaurant A' } });
  if (!testRest) {
    testRest = await prisma.restaurant.create({
      data: { ownerId: owner.id, name: 'Test Restaurant A', status: 'APPROVED', isActive: true, latitude: 10, longitude: 10 }
    });
  }

  let testCat = await prisma.category.findFirst({ where: { name: 'TestCat' } });
  if (!testCat) {
    testCat = await prisma.category.create({ data: { name: 'TestCat', isActive: true } });
  }

  let testFood = await prisma.food.findFirst({ where: { name: 'Test Food' } });
  if (!testFood) {
    testFood = await prisma.food.create({
      data: { restaurantId: testRest.id, categoryId: testCat.id, name: 'Test Food', price: 10.00, isAvailable: true }
    });
  }

  // Login
  const loginResA = await axios.post(`${BASE_URL}/auth/login`, { email: 'customerA@test.local', password: 'password123' }, { validateStatus: () => true });
  const loginResB = await axios.post(`${BASE_URL}/auth/login`, { email: 'customerB@test.local', password: 'password123' }, { validateStatus: () => true });
  const loginResC = await axios.post(`${BASE_URL}/auth/login`, { email: 'customerC@test.local', password: 'password123' }, { validateStatus: () => true });
  
  const clientA = axios.create({ baseURL: BASE_URL, headers: { Authorization: `Bearer ${loginResA.data.accessToken}` }, validateStatus: () => true });
  const clientB = axios.create({ baseURL: BASE_URL, headers: { Authorization: `Bearer ${loginResB.data.accessToken}` }, validateStatus: () => true });
  const clientC = axios.create({ baseURL: BASE_URL, headers: { Authorization: `Bearer ${loginResC.data.accessToken}` }, validateStatus: () => true });
  const unauthClient = axios.create({ baseURL: BASE_URL, validateStatus: () => true });

  let passes = 0, fails = 0;
  const runTest = async (name: string, fn: () => Promise<void>) => {
    try { await fn(); console.log(`[PASS] ${name}`); passes++; }
    catch (e: any) { console.error(`[FAIL] ${name}:`, e.message || e); fails++; }
  };

  // -------------------------------------------------------------
  // DISCOVERY
  // -------------------------------------------------------------
  await runTest('Discovery: Get Restaurants List', async () => {
    const res = await clientA.get('/customer/restaurants');
    if (res.status !== 200 || !Array.isArray(res.data.data)) throw new Error('Failed');
  });

  await runTest('Discovery: Search Restaurants', async () => {
    const res = await clientA.get('/customer/restaurants?search=Test Restaurant A');
    if (res.status !== 200 || res.data.data.length === 0) throw new Error('Search failed');
  });

  await runTest('Discovery: Categories List', async () => {
    const res = await clientA.get('/customer/categories');
    if (res.status !== 200 || !Array.isArray(res.data.data)) throw new Error('Failed');
  });

  await runTest('Discovery: Popular Restaurants', async () => {
    const res = await clientA.get('/customer/restaurants?isPopular=true');
    if (res.status !== 200) throw new Error('Failed');
  });

  await runTest('Discovery: Nearby Restaurants', async () => {
    const res = await clientA.get('/customer/restaurants?isNearby=true&lat=10&lng=10');
    if (res.status !== 200) throw new Error('Failed');
  });

  await runTest('Discovery: Recommended Foods', async () => {
    const res = await clientA.get('/customer/recommended-foods');
    if (res.status !== 200) throw new Error('Failed');
  });

  // -------------------------------------------------------------
  // EMPTY STATES
  // -------------------------------------------------------------
  await runTest('Empty States: Search with no matching restaurants', async () => {
    const res = await clientC.get('/customer/restaurants?search=DoesNotExistxyz');
    if (res.status !== 200 || res.data.data.length !== 0) throw new Error('Should be empty');
  });

  await runTest('Empty States: No nearby restaurants', async () => {
    const res = await clientC.get('/customer/restaurants?isNearby=true&lat=80&lng=80');
    if (res.status !== 200 || res.data.data.length !== 0) throw new Error('Should be empty');
  });

  await runTest('Empty States: Customer with no favorite restaurants', async () => {
    const res = await clientC.get('/customer/favorites');
    if (res.status !== 200 || res.data.data.length !== 0) throw new Error('Should be empty');
  });

  await runTest('Empty States: Customer with no current orders', async () => {
    const res = await clientC.get('/customer/orders?type=current');
    if (res.status !== 200 || res.data.data.length !== 0) throw new Error('Should be empty');
  });

  await runTest('Empty States: Customer with no previous orders', async () => {
    const res = await clientC.get('/customer/orders?type=previous');
    if (res.status !== 200 || res.data.data.length !== 0) throw new Error('Should be empty');
  });

  await runTest('Empty States: Customer with no addresses', async () => {
    const res = await clientC.get('/customer/addresses');
    if (res.status !== 200 || res.data.data.length !== 0) throw new Error('Should be empty');
  });

  // -------------------------------------------------------------
  // PROFILE
  // -------------------------------------------------------------
  await runTest('Profile: Get Profile', async () => {
    const res = await clientA.get('/customer/profile');
    if (res.status !== 200) throw new Error('Failed');
  });

  await runTest('Profile: Update Name', async () => {
    const res = await clientA.put('/customer/profile', { firstName: 'UpdatedA' });
    if (res.status !== 200 || res.data.data.firstName !== 'UpdatedA') throw new Error('Failed');
  });

  await runTest('Profile: Update Phone', async () => {
    const res = await clientA.put('/customer/profile', { phone: '+1234567890' });
    if (res.status !== 200 || res.data.data.phone !== '+1234567890') throw new Error('Failed');
  });

  await runTest('Profile: Update Email', async () => {
    const res = await clientA.put('/customer/profile', { email: 'customerA_new@test.local' });
    if (res.status !== 200 || res.data.data.email !== 'customerA_new@test.local') throw new Error('Failed');
    // revert back
    await clientA.put('/customer/profile', { email: 'customerA@test.local' });
  });

  await runTest('Profile: Duplicate Email Protection', async () => {
    const res = await clientA.put('/customer/profile', { email: 'customerB@test.local' });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  await runTest('Profile: Profile Image', async () => {
    const res = await clientA.put('/customer/profile', { profileImage: 'http://example.com/img.jpg' });
    if (res.status !== 200 || res.data.data.profileImage !== 'http://example.com/img.jpg') throw new Error('Failed');
  });

  await runTest('Profile: Change Password with Validation', async () => {
    const res = await clientA.put('/customer/profile', { currentPassword: 'password123', newPassword: 'newpassword123' });
    if (res.status !== 200) throw new Error('Failed');
    
    // Test old password fails
    const oldLogin = await axios.post(`${BASE_URL}/auth/login`, { email: 'customerA@test.local', password: 'password123' }, { validateStatus: () => true });
    if (oldLogin.status !== 401) throw new Error('Old password still works');
    
    // Test new password works
    const newLogin = await axios.post(`${BASE_URL}/auth/login`, { email: 'customerA@test.local', password: 'newpassword123' }, { validateStatus: () => true });
    if (newLogin.status !== 200) throw new Error('New password failed');
    
    // revert back for subsequent tests
    await prisma.user.update({ where: { id: customerA!.id }, data: { password: hash } });
  });

  await runTest('Profile: Reject incorrect current password', async () => {
    const res = await clientA.put('/customer/profile', { currentPassword: 'wrongpassword', newPassword: 'newpassword123' });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // -------------------------------------------------------------
  // ADDRESSES
  // -------------------------------------------------------------
  let addressIdA = '';
  await runTest('Address: Add Address (A)', async () => {
    const res = await clientA.post('/customer/addresses', { street: '123 A', city: 'City', state: 'S', zipCode: '1', country: 'C', latitude: 10, longitude: 10 });
    if (res.status !== 201) throw new Error('Failed');
    addressIdA = res.data.data.id;
  });

  await runTest('Address: Edit Address (A)', async () => {
    const res = await clientA.put(`/customer/addresses/${addressIdA}`, { street: '456 B', city: 'City', state: 'S', zipCode: '1', country: 'C', latitude: 20, longitude: 20 });
    if (res.status !== 200) throw new Error('Failed');
  });

  await runTest('Address: Set default address', async () => {
    const res = await clientA.put(`/customer/addresses/${addressIdA}`, { street: '456 B', city: 'City', state: 'S', zipCode: '1', country: 'C', isDefault: true });
    if (res.status !== 200 || res.data.data.isDefault !== true) throw new Error('Failed');
  });

  await runTest('Address: Get Addresses', async () => {
    const res = await clientA.get('/customer/addresses');
    if (res.status !== 200) throw new Error('Failed');
  });

  await runTest('Address: Coordinate Validation (Invalid)', async () => {
    const res = await clientA.post('/customer/addresses', { street: '1', city: '2', state: '3', zipCode: '4', country: '5', latitude: 900 });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  await runTest('Address: Security - B cannot edit A address', async () => {
    const res = await clientB.put(`/customer/addresses/${addressIdA}`, { street: 'Hacked', city: 'City', state: 'S', zipCode: '1', country: 'C' });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  await runTest('Address: Security - B cannot delete A address', async () => {
    const res = await clientB.delete(`/customer/addresses/${addressIdA}`);
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  // -------------------------------------------------------------
  // FAVORITES
  // -------------------------------------------------------------
  let favRestId = '';
  await runTest('Favorites: Add Restaurant', async () => {
    const res = await clientA.post('/customer/favorites', { restaurantId: testRest!.id });
    if (res.status !== 201) throw new Error('Failed');
    favRestId = res.data.data.id;
  });

  await runTest('Favorites: Get Restaurant Favorites', async () => {
    const res = await clientA.get('/customer/favorites');
    if (res.status !== 200) throw new Error('Failed');
  });

  await runTest('Favorites: Remove Restaurant Favorite', async () => {
    const res = await clientA.delete(`/customer/favorites/${favRestId}`);
    if (res.status !== 200) throw new Error('Failed');
  });

  let favFoodId = '';
  await runTest('Favorites: Add Food Favorite', async () => {
    const res = await clientA.post('/customer/favorites', { foodId: testFood!.id });
    if (res.status !== 201) throw new Error('Failed');
    favFoodId = res.data.data.id;
  });

  await runTest('Favorites: Security - Prevent Duplicate Food', async () => {
    const res = await clientA.post('/customer/favorites', { foodId: testFood!.id });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  await runTest('Favorites: Security - B cannot remove A favorite', async () => {
    const res = await clientB.delete(`/customer/favorites/${favFoodId}`);
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  // -------------------------------------------------------------
  // ORDERS
  // -------------------------------------------------------------
  const orderA = await prisma.order.create({
    data: {
      customerId: customerA!.id, restaurantId: testRest!.id, addressId: addressIdA,
      subtotal: 10, deliveryFee: 2, total: 12, status: 'DELIVERED',
      items: { create: [{ foodId: testFood!.id, quantity: 1, unitPrice: 10, subtotal: 10 }] }
    }
  });

  await runTest('Orders: Get Current Orders', async () => {
    const res = await clientA.get('/customer/orders?type=current');
    if (res.status !== 200) throw new Error('Failed');
  });

  await runTest('Orders: Get Previous Orders', async () => {
    const res = await clientA.get('/customer/orders?type=previous');
    if (res.status !== 200) throw new Error('Failed');
  });

  await runTest('Orders: Order Details', async () => {
    const res = await clientA.get(`/customer/orders/${orderA.id}`);
    if (res.status !== 200) throw new Error('Failed');
  });

  await runTest('Orders: Security - B cannot view A order', async () => {
    const res = await clientB.get(`/customer/orders/${orderA.id}`);
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  await runTest('Orders: Reorder', async () => {
    const res = await clientA.post(`/customer/orders/${orderA.id}/reorder`);
    if (res.status !== 200) throw new Error('Failed');
  });

  await runTest('Orders: Security - B cannot reorder A order', async () => {
    const res = await clientB.post(`/customer/orders/${orderA.id}/reorder`);
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  const unavailableFood = await prisma.food.create({
    data: { restaurantId: testRest!.id, categoryId: testCat!.id, name: 'Unavailable Food', price: 10.00, isAvailable: false }
  });

  const fakeOrder = await prisma.order.create({
    data: {
      customerId: customerA!.id, restaurantId: testRest!.id, addressId: addressIdA,
      subtotal: 10, deliveryFee: 2, total: 12, status: 'DELIVERED',
      items: { create: [{ foodId: unavailableFood.id, quantity: 1, unitPrice: 10, subtotal: 10 }] }
    }
  });

  await runTest('Orders: Reorder invalid/unavailable item handling', async () => {
    const res = await clientA.post(`/customer/orders/${fakeOrder.id}/reorder`);
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });
  await prisma.order.delete({ where: { id: fakeOrder.id } });
  await prisma.food.delete({ where: { id: unavailableFood.id } });

  // -------------------------------------------------------------
  // REVIEWS
  // -------------------------------------------------------------
  await runTest('Reviews: Submit eligible review', async () => {
    const res = await clientA.post('/customer/reviews', { orderId: orderA.id, restaurantId: testRest!.id, rating: 5, comment: 'Test Review' });
    if (res.status !== 201) throw new Error(`Status ${res.status}`);
  });

  await runTest('Reviews: Security - Duplicate review prevented', async () => {
    const res = await clientA.post('/customer/reviews', { orderId: orderA.id, restaurantId: testRest!.id, rating: 5, comment: 'Test Review' });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  await runTest('Reviews: Security - B cannot review A order', async () => {
    const res = await clientB.post('/customer/reviews', { orderId: orderA.id, restaurantId: testRest!.id, rating: 5 });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  const incompleteOrder = await prisma.order.create({
    data: {
      customerId: customerA!.id, restaurantId: testRest!.id, addressId: addressIdA,
      subtotal: 10, deliveryFee: 2, total: 12, status: 'PENDING'
    }
  });

  await runTest('Reviews: Security - Incomplete order review prevented', async () => {
    const res = await clientA.post('/customer/reviews', { orderId: incompleteOrder.id, restaurantId: testRest!.id, rating: 5 });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  await runTest('Reviews: Invalid rating (6)', async () => {
    const res = await clientA.post('/customer/reviews', { orderId: orderA.id, restaurantId: testRest!.id, rating: 6 });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  await runTest('Reviews: Invalid rating (0)', async () => {
    const res = await clientA.post('/customer/reviews', { orderId: orderA.id, restaurantId: testRest!.id, rating: 0 });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  await runTest('Reviews: Missing order ID', async () => {
    const res = await clientA.post('/customer/reviews', { restaurantId: testRest!.id, rating: 5 });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // -------------------------------------------------------------
  // SECURITY - UNAUTHENTICATED & INVALID IDS
  // -------------------------------------------------------------
  await runTest('Security: Unauthenticated request rejection (Profile)', async () => {
    const res = await unauthClient.get('/customer/profile');
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await runTest('Security: Unauthenticated request rejection (Orders)', async () => {
    const res = await unauthClient.get('/customer/orders');
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await runTest('Security: Invalid Resource ID (Restaurant)', async () => {
    const res = await clientA.get('/customer/restaurants/invalid-id-123');
    if (res.status !== 404 && res.status !== 400) throw new Error(`Expected 400/404, got ${res.status}`);
  });

  await runTest('Security: Invalid Resource ID (Order Details)', async () => {
    const res = await clientA.get('/customer/orders/invalid-id-123');
    if (res.status !== 403 && res.status !== 400 && res.status !== 404) throw new Error(`Expected error, got ${res.status}`);
  });

  // -------------------------------------------------------------
  // CLEANUP & SUMMARY
  // -------------------------------------------------------------
  await prisma.order.deleteMany({ where: { id: { in: [orderA.id, incompleteOrder.id] } } });
  await prisma.favorite.deleteMany({ where: { id: favFoodId } });
  await prisma.address.deleteMany({ where: { id: addressIdA } });

  console.log(`\n========================================`);
  console.log(`TOTAL: ${passes} PASSED, ${fails} FAILED`);
  console.log(`========================================\n`);

  if (fails > 0) process.exit(1);
}

main().catch(console.error).finally(() => prisma.$disconnect());
