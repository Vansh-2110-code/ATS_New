const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
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
require('dotenv').config();
const User = require('./src/models/User');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await User.find({ name: { $in: [/mounika/i, /kishore/i, /kishor/i] } }).select('name email employeeId role roles').lean();
  console.log('Current DB Users:', JSON.stringify(users, null, 2));
  await mongoose.disconnect();
}
test();
`;
    await ssh.execCommand(`echo "${Buffer.from(script).toString('base64')}" | base64 -d > ${remoteBase}/backend/test_check_users.js`);
    const res = await ssh.execCommand(`${setupEnv} && node test_check_users.js`, { cwd: `${remoteBase}/backend` });
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
    await ssh.execCommand(`rm -f ${remoteBase}/backend/test_check_users.js`);
  } finally {
    ssh.dispose();
  }
}

check();
