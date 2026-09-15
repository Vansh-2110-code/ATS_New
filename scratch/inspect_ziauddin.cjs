const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
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
const Candidate = require('./src/models/Candidate');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);

  const c = await Candidate.findOne({ phone: '7842483415' }).lean();
  console.log('=== CANDIDATE 7842483415 ===');
  console.log({
    name: c.name,
    phone: c.phone,
    email: c.email,
    status: c.status,
    joiningSalary: c.joiningSalary,
    offeredCTC: c.offeredCTC,
    placementPercentage: c.placementPercentage,
    revenueGenerated: c.revenueGenerated,
    expectedSalary: c.expectedSalary,
    currentSalary: c.currentSalary,
    offerDetails: c.offerDetails
  });

  await mongoose.disconnect();
}
test();
`;

    await ssh.execCommand(`echo "${Buffer.from(script).toString('base64')}" | base64 -d > ${remoteBase}/backend/test_zia.js`);
    const res = await ssh.execCommand(`${setupEnv} && node test_zia.js`, { cwd: `${remoteBase}/backend` });
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
    await ssh.execCommand(`rm -f ${remoteBase}/backend/test_zia.js`);
  } finally {
    ssh.dispose();
  }
}

run();
