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

    const script = `
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const BusinessDevelopment = require('./src/models/BusinessDevelopment');
const { getStats, list } = require('./src/controllers/businessDevelopment.controller');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);

  console.log('=== 1. VERIFYING BD USERS IN MONGODB ===');
  const bdUsers = await User.find({ role: 'bd' }).select('name email employeeId role status').lean();
  console.log('Found BD Users:', bdUsers);

  console.log('\\n=== 2. VERIFYING BD STATS BY DATE RANGE SLICERS ===');
  const ranges = ['day', 'week', 'month', 'quarter', 'year', 'all'];

  for (const r of ranges) {
    const req = { query: { range: r } };
    let stats = null;
    const res = {
      json: function(d) { stats = d; },
      status: function() { return this; }
    };
    await getStats(req, res, () => {});
    console.log('Range [' + r.toUpperCase() + '] =>', {
      callsToday: stats.callsToday,
      callsThisWeek: stats.callsThisWeek,
      connectedCalls: stats.connectedCalls,
      followUpsDue: stats.followUpsDue,
      meetingsScheduled: stats.meetingsScheduled,
      proposalsPending: stats.proposalsPending,
      hotLeads: stats.hotLeads,
      convertedClients: stats.convertedClients,
      expectedRevenue: '₹' + stats.expectedRevenue,
      conversionPct: stats.conversionPct + '%',
      avgCallsPerDay: stats.avgCallsPerDay,
      totalLeads: stats.totalLeads
    });
  }

  console.log('\\n=== 3. VERIFYING BD LEADS LIST (TABLE ROWS) ===');
  const reqList = { query: { range: 'all', limit: '5' } };
  let listData = null;
  const resList = {
    json: function(d) { listData = d; },
    status: function() { return this; }
  };
  await list(reqList, resList, () => {});
  console.log('Total Records:', listData.total);
  console.log('Sample Row 1:', {
    company: listData.records[0]?.companyName,
    executive: listData.records[0]?.executiveName,
    contact: listData.records[0]?.contactPerson,
    service: listData.records[0]?.serviceOffered,
    status: listData.records[0]?.callStatus,
    clientStatus: listData.records[0]?.clientStatus
  });

  await mongoose.disconnect();
}

test();
`;

    await ssh.execCommand(`echo "${Buffer.from(script).toString('base64')}" | base64 -d > ${remoteBase}/backend/test_verify_bd.js`);
    const res = await ssh.execCommand(`${setupEnv} && node test_verify_bd.js`, { cwd: `${remoteBase}/backend` });
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
    await ssh.execCommand(`rm -f ${remoteBase}/backend/test_verify_bd.js`);
  } finally {
    ssh.dispose();
  }
}

verify();
