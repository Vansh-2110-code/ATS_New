const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function clearData() {
  try {
    console.log('1. Connecting to live production server...');
    await ssh.connect({
      host: 'ats.whitehorsemanpower.in',
      username: 'whitehorsemanpower',
      password: 'Whitehorse@2026blr',
      port: 22,
      readyTimeout: 30000
    });
    console.log('Connected successfully via SSH.');

    const setupEnv = 'export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v22.23.1/bin:~/.npm-global/bin';
    const remoteBase = '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in';

    const script = `
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const BusinessDevelopment = require('./src/models/BusinessDevelopment');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  // 1. Clear all sample Business Development leads
  const bdRes = await BusinessDevelopment.deleteMany({});
  console.log('✅ Cleared all Business Development lead entries. Deleted count:', bdRes.deletedCount);

  // 2. Remove the 4 sample BD users so admin can create real users
  const sampleEmails = [
    'rohit.bd@whitehorsemanpower.in',
    'ananya.bd@whitehorsemanpower.in',
    'rajesh.bd@whitehorsemanpower.in',
    'priya.bd@whitehorsemanpower.in'
  ];
  const userRes = await User.deleteMany({ email: { $in: sampleEmails } });
  console.log('✅ Removed sample BD users so Admin can create real users. Deleted count:', userRes.deletedCount);

  await mongoose.disconnect();
}
run();
`;

    await ssh.execCommand(`echo "${Buffer.from(script).toString('base64')}" | base64 -d > ${remoteBase}/backend/clear_bd.js`);
    const res = await ssh.execCommand(`${setupEnv} && node clear_bd.js`, { cwd: `${remoteBase}/backend` });
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
    await ssh.execCommand(`rm -f ${remoteBase}/backend/clear_bd.js`);

    console.log('==============================================');
    console.log('   BUSINESS DEVELOPMENT DATA CLEANED!        ');
    console.log('==============================================');
  } catch (err) {
    console.error('Error clearing data:', err);
  } finally {
    ssh.dispose();
  }
}

clearData();
