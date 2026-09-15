const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function verify() {
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

    const scriptContent = `
const mongoose = require('mongoose');
require('dotenv').config();
const Candidate = require('./src/models/Candidate');
const User = require('./src/models/User');
const TeamMember = require('./src/models/TeamMember');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);

  const tls = await User.find({ role: { $in: ['tl', 'admin', 'manager'] } }).select('name email role disableBiometric faceDescriptor status').lean();
  console.log('TL/Admin/Manager Users:');
  tls.forEach(u => {
    console.log({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      disableBiometric: u.disableBiometric,
      hasFaceDescriptor: !!(u.faceDescriptor && u.faceDescriptor.length > 0),
      status: u.status
    });
  });

  await mongoose.disconnect();
}
test();
`;

    await ssh.execCommand(`echo "${Buffer.from(scriptContent).toString('base64')}" | base64 -d > ${remoteBase}/backend/test_verify.js`);
    const res = await ssh.execCommand(`${setupEnv} && node test_verify.js`, { cwd: `${remoteBase}/backend` });
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
    await ssh.execCommand(`rm -f ${remoteBase}/backend/test_verify.js`);
  } finally {
    ssh.dispose();
  }
}

verify();
