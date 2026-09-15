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

  const admin = await User.findOne({ role: 'admin' }).lean();
  const gowthami = await User.findOne({ name: /gowthami/i }).lean();

  const testCases = [
    { label: 'Day (Today)', user: gowthami, query: { range: 'day', division: 'BPO' } },
    { label: 'Week (Last 7 Days)', user: gowthami, query: { range: 'week', division: 'BPO' } },
    { label: 'Month (Current Month)', user: gowthami, query: { range: 'month', division: 'BPO' } },
    { label: 'Quarter (Q3)', user: gowthami, query: { range: 'quarter', division: 'BPO' } },
    { label: 'Custom (Aug 01 to Aug 15)', user: gowthami, query: { range: 'custom', from: '2026-08-01', to: '2026-08-15', division: 'BPO' } },
    { label: 'Custom (Aug 16 to Aug 31)', user: gowthami, query: { range: 'custom', from: '2026-08-16', to: '2026-08-31', division: 'BPO' } },
  ];

  console.log('=== VERIFYING LIVE TL OVERVIEW METRICS FOR GOWTHAMI (BPO) ===');
  for (const tc of testCases) {
    const req = { user: tc.user, query: tc.query };
    let summary = null;
    const res = {
      json: function(d) { summary = d.summary; },
      status: function() { return this; }
    };
    await tlDashboard(req, res, () => {});
    console.log(tc.label, '=>', summary);
  }

  await mongoose.disconnect();
}
test();
`;

    await ssh.execCommand(`echo "${Buffer.from(script).toString('base64')}" | base64 -d > ${remoteBase}/backend/test_verify_tl.js`);
    const res = await ssh.execCommand(`${setupEnv} && node test_verify_tl.js`, { cwd: `${remoteBase}/backend` });
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
    await ssh.execCommand(`rm -f ${remoteBase}/backend/test_verify_tl.js`);
  } finally {
    ssh.dispose();
  }
}

run();
