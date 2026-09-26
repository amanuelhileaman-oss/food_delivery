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
  const headers = res2.headers;
  console.log("HEADERS:", Object.keys(headers));
  console.log("SET-COOKIE:", headers['set-cookie']);
}
run();
