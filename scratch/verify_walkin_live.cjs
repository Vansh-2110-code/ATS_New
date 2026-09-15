const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function verifyWalkinLive() {
  try {
    console.log('Connecting to server...');
    await ssh.connect({
      host: 'ats.whitehorsemanpower.in',
      username: 'whitehorsemanpower',
      password: 'Whitehorse@2026blr',
      port: 22,
      readyTimeout: 30000
    });

    const setupEnv = 'export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v22.23.1/bin:~/.npm-global/bin';
    const remoteBase = '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in';

    const testScript = `
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('./src/models/User');
const WalkIn = require('./src/models/WalkIn');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);

  // 1. Ensure matching WalkIn record exists for walkin@whitehorsemanpower.in
  const user = await User.findOne({ email: 'walkin@whitehorsemanpower.in' });
  console.log('User WH000101 found:', !!user);

  let walkin = await WalkIn.findOne({ email: 'walkin@whitehorsemanpower.in' });
  if (!walkin) {
    console.log('Creating matching WalkIn record for walkin@whitehorsemanpower.in...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Walkin123$$', salt);
    
    walkin = new WalkIn({
      name: 'Walkin Desk',
      email: 'walkin@whitehorsemanpower.in',
      phone: '08041130678',
      referenceId: 'WH-WI-000101',
      isAuthEnabled: true,
      password: hashedPassword,
      status: 'Waiting',
      registeredByUser: user ? user._id : undefined,
    });
    await walkin.save();
    console.log('WalkIn record created successfully!');
  } else {
    console.log('WalkIn record already exists:', walkin.referenceId);
    if (!walkin.isAuthEnabled) {
      walkin.isAuthEnabled = true;
      const salt = await bcrypt.genSalt(10);
      walkin.password = await bcrypt.hash('Walkin123$$', salt);
      await walkin.save();
      console.log('Updated WalkIn record password & auth enabled');
    }
  }

  // 2. Test Walk-In Login API call
  const http = require('http');
  
  function postJson(path, data) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(data);
      const req = http.request({
        hostname: '127.0.0.1',
        port: 5001,
        path: path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body || '{}') }));
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  function getJson(path, token) {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: 5001,
        path: path,
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body || '{}') }));
      });
      req.on('error', reject);
      req.end();
    });
  }

  console.log('\\n--- TEST 1: LOGIN VIA /api/walkin/login (Walk-In Tab) ---');
  const walkinLoginRes = await postJson('/api/walkin/login', {
    email: 'walkin@whitehorsemanpower.in',
    password: 'Walkin123$$'
  });
  console.log('Walk-In Login Status:', walkinLoginRes.status);
  console.log('Token received:', !!walkinLoginRes.data.token);

  console.log('\\n--- TEST 2: LOGIN VIA /api/auth/login (Employee Tab) ---');
  const employeeLoginRes = await postJson('/api/auth/login', {
    employeeId: 'walkin@whitehorsemanpower.in',
    password: 'Walkin123$$'
  });
  console.log('Employee Login Status:', employeeLoginRes.status);
  console.log('Token received:', !!employeeLoginRes.data.token);

  console.log('\\n--- TEST 3: GET /api/walkin/status WITH WALKIN TOKEN ---');
  const statusRes1 = await getJson('/api/walkin/status', walkinLoginRes.data.token);
  console.log('Status HTTP Code:', statusRes1.status);
  console.log('Status Data:', statusRes1.data);

  console.log('\\n--- TEST 4: GET /api/walkin/status WITH EMPLOYEE TOKEN ---');
  const statusRes2 = await getJson('/api/walkin/status', employeeLoginRes.data.token);
  console.log('Status HTTP Code:', statusRes2.status);
  console.log('Status Data:', statusRes2.data);

  process.exit(0);
}

test();
`;

    await ssh.execCommand(`echo "${Buffer.from(testScript).toString('base64')}" | base64 -d > ${remoteBase}/backend/test_walkin_live.js`);
    const res = await ssh.execCommand(`${setupEnv} && node test_walkin_live.js`, { cwd: `${remoteBase}/backend` });
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);

    await ssh.execCommand(`rm -f ${remoteBase}/backend/test_walkin_live.js`);
    ssh.dispose();
  } catch (err) {
    console.error('Error during verification:', err);
  }
}

verifyWalkinLive();
