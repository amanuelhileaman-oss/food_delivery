import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const API_URL = 'http://127.0.0.1:5000/api/v1';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

const setupData = async () => {
  // Retry logic for DB
  let retries = 5;
  while (retries > 0) {
    try {
      await prisma.$connect();
      await prisma.review.deleteMany();
      break;
    } catch (e: any) {
      if (retries === 1) throw e;
      console.log('Database waking up... Retrying in 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      retries--;
    }
  }
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.restaurantStaff.deleteMany();
  await prisma.restaurantDocument.deleteMany();
  await prisma.food.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.user.deleteMany({
    where: { email: { in: ['admin@test.com', 'owner1@test.com', 'owner2@test.com', 'customer@test.com'] } }
  });

  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
  const ownerRole = await prisma.role.findUnique({ where: { name: 'RESTAURANT_OWNER' } });
  const customerRole = await prisma.role.findUnique({ where: { name: 'CUSTOMER' } });
  
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      firstName: 'Admin', lastName: 'Test', email: 'admin@test.com', password: hashedPassword, roleId: adminRole!.id, isVerified: true, accountStatus: 'ACTIVE'
    }
  });

  const customer = await prisma.user.create({
    data: {
      firstName: 'Customer', lastName: 'Test', email: 'customer@test.com', password: hashedPassword, roleId: customerRole!.id, isVerified: true, accountStatus: 'ACTIVE'
    }
  });

  return { admin, customer };
};

const loginUser = async (email: string) => {
  const res = await axios.post(`${API_URL}/auth/login`, { email, password: 'password123' });
  return res.data.accessToken;
};

const main = async () => {
  console.log('Testing Restaurant Onboarding Features...\n');

  try {
    await setupData();

    // 1. Registration
    let res = await axios.post(`${API_URL}/auth/register/owner`, {
      firstName: 'Owner1', lastName: 'Test', email: 'owner1@test.com', password: 'password123',
      restaurantName: 'Test Restaurant 1', restaurantDescription: 'Pending Restaurant description'
    });
    await prisma.user.update({ where: { email: 'owner1@test.com' }, data: { isVerified: true, accountStatus: 'ACTIVE' } });
    
    await axios.post(`${API_URL}/auth/register/owner`, {
      firstName: 'Owner2', lastName: 'Test', email: 'owner2@test.com', password: 'password123',
      restaurantName: 'Test Restaurant 2', restaurantDescription: 'Another description'
    });
    await prisma.user.update({ where: { email: 'owner2@test.com' }, data: { isVerified: true, accountStatus: 'ACTIVE' } });

    const owner1Token = await loginUser('owner1@test.com');
    const owner2Token = await loginUser('owner2@test.com');
    const customerToken = await loginUser('customer@test.com');
    const adminToken = await loginUser('admin@test.com');

    const auth1 = { headers: { Authorization: `Bearer ${owner1Token}` } };
    const auth2 = { headers: { Authorization: `Bearer ${owner2Token}` } };
    const authCust = { headers: { Authorization: `Bearer ${customerToken}` } };
    const authAdmin = { headers: { Authorization: `Bearer ${adminToken}` } };

    // Initial Status
    res = await axios.get(`${API_URL}/owner/restaurant`, auth1);
    const restaurant1 = res.data.data;
    assert(restaurant1.status === 'PENDING', 'New restaurant should be PENDING');

    try {
      await axios.get(`${API_URL}/customer/restaurants/${restaurant1.id}`, authCust);
      assert(false, 'Customer should not be able to access PENDING restaurant');
    } catch (e: any) {
      assert(e.response.status === 404, 'Pending restaurant cannot receive normal orders (not found)');
    }

    // ==================================================
    // 1. REQUIRED RESTAURANT INFORMATION
    // ==================================================
    const validApp = {
      name: 'Valid Name',
      description: 'Valid Description 123',
      email: 'valid@test.com',
      phone: '1234567890',
      address: '123 Valid St',
      latitude: 10,
      longitude: 10,
      imageLogo: 'http://example.com/logo.png',
      openingTime: '08:00',
      closingTime: '22:00'
    };

    // ==================================================
    // 5. OWNER APPLICATION OWNERSHIP
    // ==================================================
    try {
      await axios.post(`${API_URL}/owner/restaurant/${restaurant1.id}/application`, validApp, auth2);
      assert(false, 'Owner should only access their own restaurant');
    } catch (e: any) {
      assert(e.response.status === 403, 'Owner B cannot modify Owner A\'s application');
    }

    try {
      await axios.get(`${API_URL}/owner/restaurant/${restaurant1.id}/documents`, auth2);
      assert(false, 'Owner B should not view Owner A documents');
    } catch (e: any) {
      assert(e.response.status === 403, 'Owner B cannot view Owner A\'s documents');
    }

    const expectValidationFail = async (fieldOverride: any, message: string) => {
      try {
        await axios.post(`${API_URL}/owner/restaurant/${restaurant1.id}/application`, { ...validApp, ...fieldOverride }, auth1);
        assert(false, message + ' (Should have failed)');
      } catch (e: any) {
        assert(e.response.status === 400, message);
      }
    };

    await expectValidationFail({ name: '' }, 'Missing restaurant name validation');
    await expectValidationFail({ phone: '123' }, 'Missing/invalid phone validation');
    await expectValidationFail({ email: 'notanemail' }, 'Invalid email validation');
    await expectValidationFail({ address: '12' }, 'Missing/invalid address validation');
    await expectValidationFail({ latitude: 1000 }, 'Invalid location validation');
    await expectValidationFail({ openingTime: '25:00' }, 'Invalid opening hours validation');

    // Missing business documents validation
    try {
      await axios.post(`${API_URL}/owner/restaurant/${restaurant1.id}/application`, validApp, auth1);
      assert(false, 'Should fail without business info/documents');
    } catch (e: any) {
      assert(e.response.status === 400 && e.response.data.message.includes('documents'), 'Missing required business information validation');
    }

    // ==================================================
    // 2. REQUIRED DOCUMENTS
    // ==================================================
    // Upload required documents
    await axios.post(`${API_URL}/owner/restaurant/${restaurant1.id}/documents`, { type: 'BUSINESS_LICENSE', url: 'http://example.com/doc1.png' }, auth1);
    await axios.post(`${API_URL}/owner/restaurant/${restaurant1.id}/documents`, { type: 'FOOD_SAFETY_CERTIFICATE', url: 'http://example.com/doc2.png' }, auth1);
    
    // Now application should succeed
    res = await axios.post(`${API_URL}/owner/restaurant/${restaurant1.id}/application`, validApp, auth1);
    assert(res.data.data.status === 'UNDER_REVIEW', 'Application submitted with all required info and documents');

    // ==================================================
    // 4. ADMIN REVIEW AUTHORIZATION
    // ==================================================
    const expectAuthFail = async (auth: any, role: string) => {
      try {
        await axios.put(`${API_URL}/admin/restaurants/${restaurant1.id}/review`, { status: 'APPROVED' }, auth);
        assert(false, `${role} should not be able to review`);
      } catch (e: any) {
        assert(e.response.status === 403 || e.response.status === 401, `${role} cannot perform review actions`);
      }
    };
    
    await expectAuthFail(authCust, 'Customer');
    await expectAuthFail(auth1, 'Owner');
    await expectAuthFail({}, 'Unauthenticated user');

    // ==================================================
    // 3. STATUS TRANSITION SECURITY
    // ==================================================
    try {
      await axios.put(`${API_URL}/admin/restaurants/${restaurant1.id}/review`, { status: 'INVALID_STATUS' }, authAdmin);
      assert(false, 'Should fail with invalid status');
    } catch (e: any) {
      assert(e.response.status === 400, 'Arbitrary invalid status values are rejected');
    }

    // Rejecting works
    res = await axios.put(`${API_URL}/admin/restaurants/${restaurant1.id}/review`, { status: 'REJECTED' }, authAdmin);
    assert(res.data.data.status === 'REJECTED', 'Admin can reject UNDER_REVIEW restaurant');

    // Owner cannot operate while rejected
    try {
      await axios.put(`${API_URL}/owner/restaurant/${restaurant1.id}/operating-status`, { isOpen: true }, auth1);
      assert(false, 'Owner should not operate when rejected');
    } catch (e: any) {
      assert(e.response.status === 403, 'Operational access enforcement: REJECTED cannot operate');
    }

    // Owner fixes and resubmits
    await axios.post(`${API_URL}/owner/restaurant/${restaurant1.id}/application`, validApp, auth1);

    // Invalid transition: Admin cannot suspend UNDER_REVIEW
    try {
      await axios.put(`${API_URL}/admin/restaurants/${restaurant1.id}/review`, { status: 'SUSPENDED' }, authAdmin);
      assert(false, 'Should fail transition to SUSPENDED');
    } catch (e: any) {
      assert(e.response.status === 400, 'Invalid status transitions are prevented (UNDER_REVIEW -> SUSPENDED)');
    }

    // Admin approves
    res = await axios.put(`${API_URL}/admin/restaurants/${restaurant1.id}/review`, { status: 'APPROVED' }, authAdmin);
    assert(res.data.data.status === 'APPROVED', 'Admin can approve UNDER_REVIEW restaurant');

    // ==================================================
    // 6. OPERATIONAL ACCESS ENFORCEMENT
    // ==================================================
    res = await axios.put(`${API_URL}/owner/restaurant/${restaurant1.id}/operating-status`, { isOpen: true }, auth1);
    assert(res.data.success === true, 'Operational access enforcement: APPROVED can operate normally');

    // Customer can now access
    res = await axios.get(`${API_URL}/customer/restaurants/${restaurant1.id}`, authCust);
    assert(res.data.data.id === restaurant1.id, 'Approved restaurant becomes active and accessible to customers');

    // Admin suspends
    res = await axios.put(`${API_URL}/admin/restaurants/${restaurant1.id}/review`, { status: 'SUSPENDED' }, authAdmin);
    assert(res.data.data.status === 'SUSPENDED', 'Admin can suspend APPROVED restaurant');

    try {
      await axios.put(`${API_URL}/owner/restaurant/${restaurant1.id}/operating-status`, { isOpen: true }, auth1);
      assert(false, 'Owner should not operate when suspended');
    } catch (e: any) {
      assert(e.response.status === 403, 'Operational access enforcement: SUSPENDED cannot operate');
    }

    console.log(`\n========================================`);
    console.log(`TOTAL: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);
  } catch (error: any) {
    console.error('Test Execution Failed:');
    if (error.response) {
      console.error(error.response.status, error.response.data);
    } else {
      console.error(error);
    }
  }
};

main();
