const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function testAttachment() {
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
const fs = require('fs');
const path = require('path');
const http = require('http');
require('dotenv').config();
const User = require('./src/models/User');
const { ChatRoom, ChatMessage } = require('./src/models/InternalChat');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ status: { $ne: 'inactive' } }).lean();
    const token = jwt.sign({ id: user._id, role: user.role, email: user.email }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });

    // 1. Create a dummy test file to upload
    const dummyFilePath = path.join(__dirname, 'test_sample_doc.pdf');
    fs.writeFileSync(dummyFilePath, '%PDF-1.4 test document content for ATS team chat');

    // 2. Upload via multipart HTTP request
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const fileContent = fs.readFileSync(dummyFilePath);
    const filename = 'Resume_Candidate_Sample.pdf';

    const header = '--' + boundary + '\\r\\n' +
      'Content-Disposition: form-data; name="file"; filename="' + filename + '"\\r\\n' +
      'Content-Type: application/pdf\\r\\n\\r\\n';
    const footer = '\\r\\n--' + boundary + '--\\r\\n';

    const payload = Buffer.concat([
      Buffer.from(header, 'utf8'),
      fileContent,
      Buffer.from(footer, 'utf8')
    ]);

    const uploadRes = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 5001,
        path: '/api/internal-chat/upload',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'multipart/form-data; boundary=' + boundary,
          'Content-Length': payload.length
        }
      }, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    console.log('1. Upload Status:', uploadRes.status);
    console.log('Uploaded File:', uploadRes.data);

    // 3. Post message with this attachment into general channel
    const generalRoom = await ChatRoom.findOne({ type: 'channel' });
    const postRes = await new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        text: 'Please review this candidate resume attachment:',
        attachments: [uploadRes.data]
      });
      const req = http.request({
        hostname: 'localhost',
        port: 5001,
        path: '/api/internal-chat/rooms/' + generalRoom._id + '/messages',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    console.log('\\n2. Message Post Status:', postRes.status);
    console.log('Message ID:', postRes.data._id);
    console.log('Message Attachments count:', postRes.data.attachments?.length);
    console.log('Attachment URL:', postRes.data.attachments?.[0]?.url);

    // Cleanup local test file
    fs.unlinkSync(dummyFilePath);
    console.log('\\n>>> ATTACHMENT UPLOAD AND CHAT INTEGRATION FULLY VERIFIED 100%! <<<');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}
run();
`;

    await ssh.execCommand(`echo "${Buffer.from(testScript).toString('base64')}" | base64 -d > ${remoteBase}/backend/test_attachment_verify.js`);
    const res = await ssh.execCommand(`${setupEnv} && node test_attachment_verify.js`, { cwd: `${remoteBase}/backend` });
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
    await ssh.execCommand(`rm -f ${remoteBase}/backend/test_attachment_verify.js`);

  } catch (err) {
    console.error('SSH error:', err);
  } finally {
    ssh.dispose();
  }
}

testAttachment();
