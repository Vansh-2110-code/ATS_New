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
    const localBase = require('path').join(__dirname, '..');

    await ssh.putFile(
      require('path').join(localBase, 'backend/src/controllers/dashboard.controller.js'),
      `${remoteBase}/backend/src/controllers/dashboard.controller.js`
    );

    const script = `
const mongoose = require('mongoose');
require('dotenv').config();
const { advancedReports, getReports } = require('./src/controllers/dashboard.controller');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);

  const req = {
    query: {
      from: '2026-07-31',
      to: '2026-08-31'
    }
  };

  const res = {
    json: function(data) {
      console.log('--- ADVANCED REPORTS RESPONSE ---');
      console.log('activeJRsReport count:', data.activeJRsReport?.length);
      console.log('activeProfilesReport count:', data.activeProfilesReport?.length);
      console.log('expectedRevenueReport:', {
        joinedCandidatesCount: data.expectedRevenueReport?.joinedCandidates?.length,
        totalExpectedRevenue: data.expectedRevenueReport?.totalExpectedRevenue,
        customerRevenueCount: data.expectedRevenueReport?.customerRevenue?.length,
        monthlyRevenueCount: data.expectedRevenueReport?.monthlyRevenue?.length
      });
      console.log('sample activeJRsReport[0]:', data.activeJRsReport?.[0]);
      console.log('sample activeProfilesReport[0]:', data.activeProfilesReport?.[0]);
    },
    status: function(code) {
      console.log('Status code:', code);
      return this;
    }
  };

  const next = function(err) {
    console.error('Next called with error:', err);
  };

  await advancedReports(req, res, next);

  await mongoose.disconnect();
}
test();
`;

    await ssh.execCommand(`echo "${Buffer.from(script).toString('base64')}" | base64 -d > ${remoteBase}/backend/test_adv_debug.js`);
    const result = await ssh.execCommand(`${setupEnv} && node test_adv_debug.js`, { cwd: `${remoteBase}/backend` });
    console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);
    await ssh.execCommand(`rm -f ${remoteBase}/backend/test_adv_debug.js`);
  } finally {
    ssh.dispose();
  }
}

run();
