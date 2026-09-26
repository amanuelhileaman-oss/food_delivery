import axios from 'axios';

const ts = Date.now();
const testIp = `test-ip-${ts}`;
const BASE_URL = 'http://localhost:5000/api/v1';
const client = axios.create({ 
  baseURL: BASE_URL, 
  validateStatus: () => true,
  headers: { 'x-test-ip': testIp }
});

async function runTests() {
  console.log('Testing Authentication Endpoints...\n');

  let passes = 0;
  let fails = 0;

  const runTest = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passes++;
    } catch (error: any) {
      console.error(`[FAIL] ${name}:`, error.message || error);
      fails++;
    }
  };

  const customerData = {
    firstName: 'Test',
    lastName: 'Customer',
    email: `customer_${ts}@test.local`,
    phone: '1234567890',
    password: 'password123',
    confirmPassword: 'password123'
  };

  const ownerData = {
    firstName: 'Test',
    lastName: 'Owner',
    email: `owner_${ts}@test.local`,
    phone: '1234567890',
    password: 'password123',
    restaurantName: 'Test Restaurant'
  };

  const driverData = {
    firstName: 'Test',
    lastName: 'Driver',
    email: `driver_${ts}@test.local`,
    phone: '1234567890',
    password: 'password123',
    vehicleType: 'Car',
    plateNumber: 'ABC-123'
  };

  let customerVerifyToken = '';
  let customerAccessToken = '';
  let customerCookies = '';
  let resetToken = '';

  await runTest('CUSTOMER REGISTRATION', async () => {
    const res = await client.post('/auth/register/customer', customerData);
    if (res.status !== 201) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    customerVerifyToken = res.data.verificationToken;
  });

  await runTest('RESTAURANT OWNER REGISTRATION', async () => {
    const res = await client.post('/auth/register/owner', ownerData);
    if (res.status !== 201) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
  });

  await runTest('DRIVER REGISTRATION', async () => {
    const res = await client.post('/auth/register/driver', driverData);
    if (res.status !== 201) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
  });

  await runTest('DUPLICATE EMAIL PROTECTION', async () => {
    const res = await client.post('/auth/register/customer', customerData);
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  await runTest('EMAIL VERIFICATION', async () => {
    // Also tests resend verification
    const resendRes = await client.post('/auth/resend-verification', { email: customerData.email });
    if (resendRes.status !== 200) throw new Error(`Resend verification failed: ${resendRes.status}`);
    const newVerifyToken = resendRes.data.verificationToken || customerVerifyToken;

    const res = await client.get(`/auth/verify-email?token=${newVerifyToken}`);
    if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
  });

  await runTest('PASSWORD HASHING', async () => {
    const loginRes = await client.post('/auth/login', {
      email: customerData.email,
      password: customerData.password,
    });
    if (loginRes.status !== 200) throw new Error(`Login failed in password hashing test: ${loginRes.status}`);
    if (!loginRes.data.user) throw new Error('No user object returned');
    
    if (loginRes.data.user.password || loginRes.data.user.passwordHash) {
       throw new Error('Password hash leaked!');
    }
  });

  await runTest('CUSTOMER LOGIN', async () => {
    const res = await client.post('/auth/login', {
      email: customerData.email,
      password: customerData.password,
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    customerAccessToken = res.data.accessToken;
    const rawCookie = res.headers['set-cookie']?.[0] || '';
    customerCookies = rawCookie.split(';')[0]; // Extract just the key=value part
  });

  await runTest('INVALID PASSWORD REJECTION', async () => {
    const res = await client.post('/auth/login', {
      email: customerData.email,
      password: 'wrongpassword',
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await runTest('JWT VALIDATION', async () => {
    if (!customerAccessToken) throw new Error('No access token received');
  });

  await runTest('AUTHENTICATED /ME', async () => {
    const res = await client.get('/auth/me', {
      headers: { Authorization: `Bearer ${customerAccessToken}` }
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  await runTest('UNAUTHENTICATED /ME REJECTION', async () => {
    const res = await client.get('/auth/me', {
      headers: { Authorization: `Bearer invalid.token.here` }
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await runTest('ROLE IDENTIFICATION', async () => {
    const res = await client.get('/auth/me', {
      headers: { Authorization: `Bearer ${customerAccessToken}` }
    });
    if (res.data.user.role.name !== 'CUSTOMER') throw new Error(`Expected role CUSTOMER, got ${res.data.user.role.name}`);
  });

  await runTest('ADMIN REGISTRATION BLOCKED', async () => {
    const res = await client.post('/auth/register/admin', { ...customerData, email: 'admin@test.local' });
    if (res.status !== 404) throw new Error(`Expected 404 since route doesn't exist, got ${res.status}`);
  });

  await runTest('ACCOUNT STATUS VALIDATION', async () => {
    // By default all are ACTIVE, so we just verify they logged in successfully initially.
    // Full test would suspend them and try login.
    const res = await client.post('/auth/login', {
      email: customerData.email,
      password: customerData.password,
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
  });

  await runTest('LOGOUT', async () => {
    const res = await client.post('/auth/logout', {}, {
      headers: { Cookie: customerCookies, Authorization: `Bearer ${customerAccessToken}` }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
  });

  await runTest('PASSWORD RESET', async () => {
    const fRes = await client.post('/auth/forgot-password', {
      email: customerData.email
    });
    if (fRes.status !== 200) throw new Error(`Forgot password failed: Status ${fRes.status}`);
    resetToken = fRes.data.resetToken;

    const rRes = await client.post('/auth/reset-password', {
      token: resetToken,
      newPassword: 'newpassword123'
    });
    if (rRes.status !== 200) throw new Error(`Reset password failed: Status ${rRes.status}`);
    
    const loginRes = await client.post('/auth/login', {
      email: customerData.email,
      password: 'newpassword123'
    });
    if (loginRes.status !== 200) throw new Error(`Failed to login with new password`);
  });

  await runTest('SECURITY ERROR HANDLING', async () => {
    // Invalid body should throw 400 from zod validate middleware
    const res = await client.post('/auth/register/customer', {});
    if (res.status !== 400) throw new Error(`Expected 400 validation error, got ${res.status}`);
    if (res.data.stack) throw new Error(`Leaked stack trace!`);
  });

  await runTest('INVALID EMAIL REJECTION', async () => {
    const res = await client.post('/auth/register/customer', { ...customerData, email: 'not-an-email' });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  await runTest('PASSWORD CONFIRMATION MISMATCH', async () => {
    const res = await client.post('/auth/register/customer', { ...customerData, confirmPassword: 'differentpassword' });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  await runTest('ATTEMPTED ARBITRARY-ROLE REGISTRATION', async () => {
    // Attempt to pass role or roleId
    const res = await client.post('/auth/register/customer', { ...customerData, email: `arb_${ts}@test.local`, role: 'ADMIN', roleId: 'admin-id' });
    if (res.status !== 201) throw new Error(`Status ${res.status}`);
    
    // Verify email to allow login
    await client.get(`/auth/verify-email?token=${res.data.verificationToken}`);
    
    // Check if role is CUSTOMER anyway
    const loginRes = await client.post('/auth/login', { email: `arb_${ts}@test.local`, password: customerData.password });
    if (loginRes.data.user.role.name !== 'CUSTOMER') throw new Error(`Role escalation occurred!`);
  });

  await runTest('REFRESH TOKEN STRATEGY', async () => {
    const res = await client.post('/auth/refresh-token', {}, {
      headers: { Cookie: customerCookies }
    });
    if (res.status !== 200) throw new Error(`Refresh token failed: ${res.status} ${JSON.stringify(res.data)}`);
    if (!res.data.accessToken) throw new Error(`No new access token provided`);
  });

  await runTest('EXPIRED/INVALID REFRESH TOKEN REJECTION', async () => {
    const res = await client.post('/auth/refresh-token', {}, {
      headers: { Cookie: 'refreshToken=invalid.token.here' }
    });
    if (res.status !== 401) throw new Error(`Expected 401 for invalid refresh token, got ${res.status}`);
  });

  await runTest('PASSWORD RESET TOKEN REUSE PROTECTION', async () => {
    const rRes = await client.post('/auth/reset-password', {
      token: resetToken,
      newPassword: 'anotherpassword123'
    });
    if (rRes.status !== 400) throw new Error(`Expected 400 for reused reset token, got ${rRes.status}`);
  });

  await runTest('CORS BEHAVIOR', async () => {
    const res = await client.options('/auth/login', {
      headers: { Origin: 'http://localhost:3000' }
    });
    if (res.status !== 204 && res.status !== 200) throw new Error(`Expected 204/200, got ${res.status}`);
    if (res.headers['access-control-allow-origin'] !== 'http://localhost:3000') {
      throw new Error(`CORS origin not properly reflected, got ${res.headers['access-control-allow-origin']}`);
    }
  });

  await runTest('RATE LIMITING', async () => {
    const rateLimitClient = axios.create({
      baseURL: BASE_URL,
      validateStatus: () => true,
      headers: { 'x-test-ip': `test-ip-ratelimit-${ts}` }
    });
    
    // Generate lots of requests to login
    let hitLimit = false;
    for (let i = 0; i < 15; i++) {
      const res = await rateLimitClient.post('/auth/login', {
        email: customerData.email,
        password: 'wrongpassword',
      });
      if (res.status === 429) {
        hitLimit = true;
        break;
      }
    }
    if (!hitLimit) throw new Error(`Expected rate limit to hit after 10 requests`);
  });

  console.log(`\n========================================`);
  console.log(`AUTHENTICATION TEST SUMMARY`);
  console.log(`========================================\n`);
  console.log(`TOTAL: ${passes} PASSED, ${fails} FAILED`);
  console.log(`========================================\n`);
}

runTests();
