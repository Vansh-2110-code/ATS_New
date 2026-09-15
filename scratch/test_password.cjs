const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function testPassword() {
  try {
    await ssh.connect({
      host: 'ats.whitehorsemanpower.in',
      username: 'whitehorsemanpower',
      password: 'Whitehorse@2026blr',
      port: 22,
      readyTimeout: 30000
    });

    const setupEnv = 'export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v22.23.1/bin:~/.npm-global/bin';
    const remoteBase = '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in';

    const script = `
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('./src/models/User');
const WalkIn = require('./src/models/WalkIn');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne({ email: 'walkin@whitehorsemanpower.in' });
  console.log('User found:', user ? user.email : 'null');
  
  if (user) {
    const p1 = 'Walkin123$$';
    const match1 = await bcrypt.compare(p1, user.password);
    console.log('Testing "Walkin123$$":', match1);

    const p2 = 'walkin123$$';
    const match2 = await bcrypt.compare(p2, user.password);
    console.log('Testing "walkin123$$":', match2);

    const p3 = 'Walkin@123';
    const match3 = await bcrypt.compare(p3, user.password);
    console.log('Testing "Walkin@123":', match3);

    const p4 = 'Walkin123';
    const match4 = await bcrypt.compare(p4, user.password);
    console.log('Testing "Walkin123":', match4);
  }
  process.exit(0);
}
run();
`;

    await ssh.execCommand(`echo "${Buffer.from(script).toString('base64')}" | base64 -d > ${remoteBase}/backend/test_pass.js`);
    const res = await ssh.execCommand(`${setupEnv} && node test_pass.js`, { cwd: `${remoteBase}/backend` });
    console.log('OUTPUT:\n', res.stdout);
    if (res.stderr) console.error('STDERR:\n', res.stderr);

    await ssh.execCommand(`rm -f ${remoteBase}/backend/test_pass.js`);
    ssh.dispose();
  } catch (err) {
    console.error('Error:', err);
  }
}

testPassword();
