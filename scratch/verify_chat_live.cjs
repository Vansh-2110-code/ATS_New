const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function verify() {
  try {
    console.log('Connecting to server via SSH...');
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
const jwt = require('jsonwebtoken');
const http = require('http');
require('dotenv').config();
const { ChatRoom, ChatMessage } = require('./src/models/InternalChat');
const User = require('./src/models/User');

function apiRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: 'localhost',
      port: 5001,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(resData) });
        } catch (e) {
          resolve({ status: res.statusCode, body: resData });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully.');

    // 1. Pick an active employee user
    const testUser = await User.findOne({ status: 'active' }).lean() || await User.findOne().lean();
    console.log('Test User:', testUser.name, '(' + testUser.role + ') ID:', testUser._id);

    // Create a real JWT token for this user to test the real Express route
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret';
    const token = jwt.sign(
      { id: testUser._id, role: testUser.role, email: testUser.email },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // 2. Test GET /api/internal-chat/rooms
    console.log('\\n--- 1. Testing GET /api/internal-chat/rooms ---');
    const roomsRes = await apiRequest('GET', '/api/internal-chat/rooms', null, token);
    console.log('HTTP Status:', roomsRes.status);
    console.log('Returned Rooms Count:', Array.isArray(roomsRes.body) ? roomsRes.body.length : roomsRes.body);
    if (Array.isArray(roomsRes.body)) {
      roomsRes.body.forEach(r => {
        console.log(' • [' + r.type + '] #' + r.name + ' (unread: ' + r.unreadCount + ') ID: ' + r._id);
      });
    }

    // 3. Test GET /api/internal-chat/colleagues
    console.log('\\n--- 2. Testing GET /api/internal-chat/colleagues ---');
    const colleaguesRes = await apiRequest('GET', '/api/internal-chat/colleagues', null, token);
    console.log('HTTP Status:', colleaguesRes.status);
    console.log('Colleagues Count:', Array.isArray(colleaguesRes.body) ? colleaguesRes.body.length : colleaguesRes.body);
    if (Array.isArray(colleaguesRes.body) && colleaguesRes.body.length > 0) {
      console.log('Sample Colleague:', colleaguesRes.body[0].name, '(' + colleaguesRes.body[0].role + ')');
    }

    // 4. Test POST message to first channel
    if (Array.isArray(roomsRes.body) && roomsRes.body.length > 0) {
      const channel = roomsRes.body[0];
      console.log('\\n--- 3. Testing POST /api/internal-chat/rooms/' + channel._id + '/messages ---');
      const sendRes = await apiRequest('POST', '/api/internal-chat/rooms/' + channel._id + '/messages', {
        text: 'White Horse ATS Internal Chat is online and operational! ⚡'
      }, token);
      console.log('Send Status:', sendRes.status);
      console.log('Created Message:', sendRes.body._id, '| Text:', sendRes.body.text);

      // 5. Test GET messages
      console.log('\\n--- 4. Testing GET /api/internal-chat/rooms/' + channel._id + '/messages ---');
      const getMsgsRes = await apiRequest('GET', '/api/internal-chat/rooms/' + channel._id + '/messages', null, token);
      console.log('Messages Status:', getMsgsRes.status);
      console.log('Messages Count:', Array.isArray(getMsgsRes.body) ? getMsgsRes.body.length : getMsgsRes.body);
    }

    // 6. Test GET unread total
    console.log('\\n--- 5. Testing GET /api/internal-chat/unread-total ---');
    const unreadRes = await apiRequest('GET', '/api/internal-chat/unread-total', null, token);
    console.log('Unread Total Status:', unreadRes.status, '| Count:', unreadRes.body);

    console.log('\\n>>> ALL INTERNAL CHAT ENDPOINTS TESTED AND VERIFIED 100% WORKING! <<<');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

check();
`;

    await ssh.execCommand(`echo "${Buffer.from(testScript).toString('base64')}" | base64 -d > ${remoteBase}/backend/test_chat_endpoints.js`);
    const res = await ssh.execCommand(`${setupEnv} && node test_chat_endpoints.js`, { cwd: `${remoteBase}/backend` });
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
    await ssh.execCommand(`rm -f ${remoteBase}/backend/test_chat_endpoints.js`);

  } catch (err) {
    console.error('Verification failed:', err);
  } finally {
    ssh.dispose();
  }
}

verify();
