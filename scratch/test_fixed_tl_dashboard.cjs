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
const User = require('./src/models/User');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);

  // 1. Sync dateOfJoining from offerDetails.dateOfJoining for all joined candidates
  const joinedCands = await Candidate.find({ status: 'Joined' }).lean();
  let syncCount = 0;
  for (const c of joinedCands) {
    const offerDoj = c.offerDetails?.dateOfJoining || c.offerDetails?.expectedDateOfJoining;
    if (offerDoj && (!c.dateOfJoining || c.dateOfJoining.toISOString() !== new Date(offerDoj).toISOString())) {
      await Candidate.updateOne({ _id: c._id }, { $set: { dateOfJoining: new Date(offerDoj) } });
      syncCount++;
    }
  }
  console.log('Synced top-level dateOfJoining for candidates:', syncCount);

  // Check counts per range
  const now = new Date('2026-08-31T12:00:00.000Z');
  
  // Day: Aug 31
  const dayStart = new Date(2026, 7, 31, 0, 0, 0);
  const dayEnd = new Date(2026, 8, 1, 0, 0, 0);

  // Week (past 7 days): Aug 24 to Aug 31
  const weekStart = new Date(2026, 7, 24, 0, 0, 0);
  const weekEnd = new Date(2026, 8, 1, 0, 0, 0);

  // Month: Aug 1 to Aug 31
  const monthStart = new Date(2026, 7, 1, 0, 0, 0);
  const monthEnd = new Date(2026, 8, 1, 0, 0, 0);

  // Quarter: Jul 1 to Sep 30
  const qStart = new Date(2026, 6, 1, 0, 0, 0);
  const qEnd = new Date(2026, 9, 1, 0, 0, 0);

  const ranges = [
    { name: 'Day (Today Aug 31)', start: dayStart, end: dayEnd },
    { name: 'Week (Last 7 Days)', start: weekStart, end: weekEnd },
    { name: 'Month (Aug 2026)', start: monthStart, end: monthEnd },
    { name: 'Quarter (Q3 2026)', start: qStart, end: qEnd },
  ];

  for (const r of ranges) {
    const dateFilter = { $gte: r.start, $lt: r.end };
    const bpoMatch = { division: 'BPO', createdAt: dateFilter };
    const totalCalls = await Candidate.countDocuments({
      ...bpoMatch,
      $or: [
        { firstCallDate: { $ne: null, $ne: '' } },
        { firstCallStatus: { $ne: null, $ne: '' } },
        { 'notes.0': { $exists: true } }
      ]
    });
    const eligible = await Candidate.countDocuments({
      division: 'BPO',
      status: { $in: ['Eligible', 'Eligible Candidates', 'Call Back'] },
      createdAt: dateFilter
    });
    const joined = await Candidate.countDocuments({
      division: 'BPO',
      status: 'Joined',
      $or: [
        { dateOfJoining: dateFilter },
        { 'offerDetails.dateOfJoining': dateFilter },
        { createdAt: dateFilter }
      ]
    });
    const finalSelect = await Candidate.countDocuments({
      division: 'BPO',
      status: { $in: ['Final Select', 'L1 Select', 'L2 Select', 'Selected'] },
      createdAt: dateFilter
    });

    console.log(r.name, '-> Calls:', totalCalls, 'Eligible:', eligible, 'Final Select:', finalSelect, 'Joined:', joined);
  }

  await mongoose.disconnect();
}
test();
`;

    await ssh.execCommand(`echo "${Buffer.from(script).toString('base64')}" | base64 -d > ${remoteBase}/backend/test_fixed_tl.js`);
    const res = await ssh.execCommand(`${setupEnv} && node test_fixed_tl.js`, { cwd: `${remoteBase}/backend` });
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
    await ssh.execCommand(`rm -f ${remoteBase}/backend/test_fixed_tl.js`);
  } finally {
    ssh.dispose();
  }
}

run();
