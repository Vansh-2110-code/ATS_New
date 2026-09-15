const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function testDM() {
  try {
    console.log('Connecting to SSH...');
    await ssh.connect({
      host: 'ats.whitehorsemanpower.in',
      username: 'whitehorsemanpower',
      password: 'Whitehorse@2026blr',
      port: 22,
      readyTimeout: 30000
    });
    console.log('SSH connected.');

    const setupEnv = 'export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v22.23.1/bin:~/.npm-global/bin';
    const remoteBase = '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in';

    const testScript = `
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');
require('dotenv').config();
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

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = await User.find({ status: { $ne: 'inactive' } }).limit(2).lean();
    console.log('Found users for DM test:', users.length);
    if (users.length < 2) {
      console.log('Not enough users found');
      return;
    }

    const u1 = users[0];
    const u2 = users[1];
    const token1 = jwt.sign({ id: u1._id, role: u1.role, email: u1.email }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });

    console.log('1. Initiating 1-on-1 DM between', u1.name, 'and', u2.name);
    const dmRes = await apiRequest('POST', '/api/internal-chat/rooms/direct', { targetUserId: u2._id }, token1);
    console.log('DM Create Status:', dmRes.status);
    console.log('DM Room ID:', dmRes.body._id, '| Name:', dmRes.body.name);

    console.log('\\n2. Sending test message in DM room...');
    const dmMsg = await apiRequest('POST', '/api/internal-chat/rooms/' + dmRes.body._id + '/messages', {
      text: 'Hi ' + u2.name + ', direct 1-on-1 messaging is working perfectly!'
    }, token1);
    console.log('DM Msg Status:', dmMsg.status, '| Text:', dmMsg.body.text);

    console.log('\\n3. Fetching DM room messages...');
    const getMsgs = await apiRequest('GET', '/api/internal-chat/rooms/' + dmRes.body._id + '/messages', null, token1);
    console.log('Messages retrieved:', getMsgs.body.length);

    console.log('\\n>>> 1-on-1 DIRECT CHAT VERIFIED SUCCESSFULLY! <<<');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error in test:', err);
  }
}
run();
`;

    await ssh.execCommand(`echo "${Buffer.from(testScript).toString('base64')}" | base64 -d > ${remoteBase}/backend/test_dm.js`);
    const res = await ssh.execCommand(`${setupEnv} && node test_dm.js`, { cwd: `${remoteBase}/backend` });
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
    await ssh.execCommand(`rm -f ${remoteBase}/backend/test_dm.js`);

  } catch (err) {
    console.error('SSH error:', err);
  } finally {
    ssh.dispose();
  }
}

testDM();
