import axios from 'axios';
async function run() {
  const ts = Date.now();
  const res1 = await axios.post('http://localhost:5000/api/v1/auth/register/customer', {
    firstName: 'T', lastName: 'T', email: `test_${ts}@test.local`, password: 'password123', confirmPassword: 'password123'
  });
  await axios.get(`http://localhost:5000/api/v1/auth/verify-email?token=${res1.data.verificationToken}`);
  const res2 = await axios.post('http://localhost:5000/api/v1/auth/login', {
    email: `test_${ts}@test.local`, password: 'password123'
  });
  console.log("SET-COOKIE:", res2.headers['set-cookie']);
  const rawCookie = res2.headers['set-cookie']?.[0] || '';
  const customerCookies = rawCookie.split(';')[0];
  console.log("Extracted:", customerCookies);
  try {
    const res3 = await axios.post('http://localhost:5000/api/v1/auth/refresh-token', {}, { headers: { Cookie: customerCookies }});
    console.log("Refresh:", res3.status);
  } catch (e) {
    console.error("Refresh Error:", e.response?.status, e.response?.data);
  }
}
run();
