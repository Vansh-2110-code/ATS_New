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

  const total = await Candidate.countDocuments();
  const joinedTotal = await Candidate.countDocuments({ status: 'Joined' });

  console.log('Total candidates:', total, 'Joined total:', joinedTotal);

  // Sample dates of joined candidates
  const sampleJoined = await Candidate.find({ status: 'Joined' })
    .select('name dateOfJoining offerDetails.dateOfJoining createdAt updatedAt')
    .limit(10)
    .lean();

  console.log('Sample Joined Candidates:');
  sampleJoined.forEach(c => {
    console.log({
      name: c.name,
      doj: c.dateOfJoining,
      offerDoj: c.offerDetails?.dateOfJoining,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    });
  });

  // Check how many candidates were created on different dates
  const createdDistribution = await Candidate.aggregate([
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: -1 } },
    { $limit: 10 }
  ]);
  console.log('Candidate Created Distribution (Top 10):', createdDistribution);

  // Check how many candidates have dateOfJoining on different months
  const dojDistribution = await Candidate.aggregate([
    { $match: { status: 'Joined' } },
    {
      $group: {
        _id: {
          $cond: [
            { $ifNull: ['$dateOfJoining', false] },
            { $dateToString: { format: '%Y-%m-%d', date: '$dateOfJoining' } },
            'No Date'
          ]
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: -1 } }
  ]);
  console.log('Joined DOJ Distribution:', dojDistribution);

  await mongoose.disconnect();
}
test();
`;

    await ssh.execCommand(`echo "${Buffer.from(script).toString('base64')}" | base64 -d > ${remoteBase}/backend/test_dates.js`);
    const res = await ssh.execCommand(`${setupEnv} && node test_dates.js`, { cwd: `${remoteBase}/backend` });
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
    await ssh.execCommand(`rm -f ${remoteBase}/backend/test_dates.js`);
  } finally {
    ssh.dispose();
  }
}

run();
