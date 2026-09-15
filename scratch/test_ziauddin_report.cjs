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
const { advancedReports } = require('./src/controllers/dashboard.controller');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);

  const req = {
    query: {
      from: '2024-01-01',
      to: '2026-12-31'
    }
  };

  const res = {
    json: function(data) {
      const zia = data.expectedRevenueReport?.joinedCandidates?.find(c => c.phone === '7842483415');
      console.log('=== ZIAUDDIN IN EXPECTED REVENUE REPORT ===');
      console.log(zia);
    },
    status: function() { return this; }
  };

  await advancedReports(req, res, () => {});

  await mongoose.disconnect();
}
test();
`;

    await ssh.execCommand(`echo "${Buffer.from(script).toString('base64')}" | base64 -d > ${remoteBase}/backend/test_zia_rep.js`);
    const res = await ssh.execCommand(`${setupEnv} && node test_zia_rep.js`, { cwd: `${remoteBase}/backend` });
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
    await ssh.execCommand(`rm -f ${remoteBase}/backend/test_zia_rep.js`);
  } finally {
    ssh.dispose();
  }
}

run();
