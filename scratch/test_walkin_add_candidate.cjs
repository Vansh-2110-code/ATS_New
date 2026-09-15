const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function runTest() {
  try {
    console.log('Connecting to server for Walk-In Add Candidate test...');
    await ssh.connect({
      host: 'ats.whitehorsemanpower.in',
      username: 'whitehorsemanpower',
      password: 'Whitehorse@2026blr',
      port: 22,
      readyTimeout: 30000
    });

    const remoteBase = '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in';
    const setupEnv = 'export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v22.23.1/bin:~/.npm-global/bin';

    const testCode = `
const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body || '{}') });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log('--- 1. Login as Walk-In Reception User ---');
  const loginPayload = JSON.stringify({ email: 'walkin@whitehorsemanpower.in', password: 'Walkin123$$' });
  const loginRes = await request({
    hostname: '127.0.0.1',
    port: 5001,
    path: '/api/walkin/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginPayload)
    }
  }, loginPayload);

  console.log('Login status:', loginRes.status);
  const token = loginRes.data.token;
  if (!token) throw new Error('Failed to get token');

  console.log('\\n--- 2. Register Candidate via Walk-In Desk (NO JR) ---');
  // Construct multipart boundary or urlencoded form data
  const testPhone = '9988' + Math.floor(100000 + Math.random() * 900000);
  const candidatePayload = JSON.stringify({
    candidateName: 'Test Walkin Candidate',
    candidatePhone: testPhone,
    candidateEmail: 'testwalkin@example.com',
    interviewCaller: 'Darshan',
    recruiterEmail: 'darshan@whitehorsemanpower.in',
    experienceYears: '2',
    qualification: 'B.E/B.Tech – Computer Science',
    currentCompany: 'Previous Tech Ltd',
    currentState: 'Karnataka',
    currentCity: 'Bangalore',
    currentSubLocation: 'Koramangala 5th Block',
    noticePeriod: 'Immediate / Serving Notice'
  });

  const regRes = await request({
    hostname: '127.0.0.1',
    port: 5001,
    path: '/api/walkin/register',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(candidatePayload)
    }
  }, candidatePayload);

  console.log('Registration status:', regRes.status);
  console.log('Registration response:', regRes.data);
  const issuedToken = regRes.data.token || regRes.data.tokenNumber;

  console.log('\\n--- 3. Verify Candidate Appears in Queue ---');
  const queueRes = await request({
    hostname: '127.0.0.1',
    port: 5001,
    path: '/api/walkin/queue',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + token
    }
  });

  console.log('Queue status:', queueRes.status);
  const queue = Array.isArray(queueRes.data) ? queueRes.data : (queueRes.data.queue || []);
  const found = queue.find(q => q.token === issuedToken || q.phone === testPhone);
  console.log('Found registered candidate in queue:', !!found);
  if (found) {
    console.log('Candidate Name:', found.name);
    console.log('Token:', found.token);
    console.log('Status:', found.status);
    console.log('Sourced By:', found.interviewCaller);
  }

  // Cleanup test candidate
  const mongoose = require('mongoose');
  require('dotenv').config();
  await mongoose.connect(process.env.MONGODB_URI);
  const WalkIn = require('./src/models/WalkIn');
  const Candidate = require('./src/models/Candidate');
  await WalkIn.deleteOne({ phone: testPhone });
  await Candidate.deleteOne({ phone: testPhone });
  console.log('\\nTest candidate cleaned up successfully.');
  process.exit(0);
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
    `;

    await ssh.execCommand(`cat << 'EOF' > ${remoteBase}/backend/test_walkin_flow.js\n${testCode}\nEOF`);
    const runRes = await ssh.execCommand(`${setupEnv} && node test_walkin_flow.js`, {
      cwd: `${remoteBase}/backend`
    });
    console.log(runRes.stdout);
    if (runRes.stderr) console.error(runRes.stderr);

    await ssh.execCommand(`rm -f ${remoteBase}/backend/test_walkin_flow.js`);

  } catch (err) {
    console.error('Verification failed:', err);
  } finally {
    ssh.dispose();
  }
}

runTest();
