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
const { tlDashboard } = require('./src/controllers/dashboard.controller');
const User = require('./src/models/User');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);

  const adminUser = await User.findOne({ email: 'mathew@whitehorsemanpower.in' }).lean();
  const tlUser = await User.findOne({ role: 'tl' }).lean();

  console.log('Testing for Admin User:', adminUser?.name, adminUser?.email);
  console.log('Testing for TL User:', tlUser?.name, tlUser?.email);

  const ranges = ['day', 'week', 'month', 'quarter', 'all', 'custom'];

  for (const r of ranges) {
    const req = {
      user: adminUser,
      query: {
        range: r,
        division: 'BPO',
        startDate: r === 'custom' ? '2026-08-01' : undefined,
        endDate: r === 'custom' ? '2026-08-31' : undefined
      }
    };

    let resultSummary = null;
    let recruitersCount = 0;
    const res = {
      json: function(data) {
        resultSummary = data.summary;
        recruitersCount = data.teamMembers?.length || 0;
      },
      status: function() { return this; }
    };

    await tlDashboard(req, res, (err) => { console.error('Error on range', r, err); });
    console.log('Range:', r, '-> Summary:', resultSummary, 'Team Count:', recruitersCount);
  }

  // Also test as TL
  console.log('--- AS TL USER ---');
  for (const r of ['day', 'week', 'month', 'custom']) {
    const req = {
      user: tlUser,
      query: {
        range: r,
        division: 'BPO',
        from: r === 'custom' ? '2026-08-01' : undefined,
        to: r === 'custom' ? '2026-08-31' : undefined
      }
    };

    let resultSummary = null;
    const res = {
      json: function(data) {
        resultSummary = data.summary;
      },
      status: function() { return this; }
    };

    await tlDashboard(req, res, (err) => { console.error('Error on range', r, err); });
    console.log('TL Range:', r, '-> Summary:', resultSummary);
  }

  await mongoose.disconnect();
}
test();
`;

    await ssh.execCommand(`echo "${Buffer.from(script).toString('base64')}" | base64 -d > ${remoteBase}/backend/test_tl_filters.js`);
    const res = await ssh.execCommand(`${setupEnv} && node test_tl_filters.js`, { cwd: `${remoteBase}/backend` });
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
    await ssh.execCommand(`rm -f ${remoteBase}/backend/test_tl_filters.js`);
  } finally {
    ssh.dispose();
  }
}

run();
