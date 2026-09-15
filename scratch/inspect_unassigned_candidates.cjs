const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function inspect() {
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

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);

  // Sample candidates from screenshot
  const phones = ['7559271288', '8669656878', '9579366456', '9544989917', '9399745418', '8123831137', '6302561145'];
  const samples = await Candidate.find({ phone: { $in: phones } }).lean();

  console.log('--- SAMPLE CANDIDATES FROM SCREENSHOT ---');
  samples.forEach(c => {
    console.log({
      name: c.name,
      phone: c.phone,
      source: c.source,
      importedFrom: c.importedFrom,
      ownershipStatus: c.ownershipStatus,
      assignedRecruiter: c.assignedRecruiter,
      assignedRecruiterName: c.assignedRecruiterName,
      sourcedBy: c.sourcedBy,
      createdAt: c.createdAt,
      assignedAt: c.assignedAt,
      jrNumber: c.jrNumber,
      status: c.status
    });
  });

  // Overall count of unassigned candidates and breakdown of their sources / creation paths
  const unassigned = await Candidate.find({
    $or: [
      { assignedRecruiter: null },
      { assignedRecruiter: { $exists: false } },
      { assignedRecruiterName: null },
      { assignedRecruiterName: '' },
      { assignedRecruiterName: 'Unassigned' },
      { ownershipStatus: 'Unassigned' },
      { ownershipStatus: 'Expired' }
    ]
  }).select('name phone source importedFrom ownershipStatus assignedRecruiter assignedRecruiterName createdAt jrNumber').lean();

  console.log('\\n--- OVERALL UNASSIGNED STATS ---');
  console.log('Total Unassigned Candidates:', unassigned.length);

  const sourceCounts = {};
  const importedFromCounts = {};
  const ownershipCounts = {};

  unassigned.forEach(c => {
    const src = c.source || 'No Source';
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;

    const imp = c.importedFrom || 'Direct/Manual/Apply';
    importedFromCounts[imp] = (importedFromCounts[imp] || 0) + 1;

    const own = c.ownershipStatus || 'None';
    ownershipCounts[own] = (ownershipCounts[own] || 0) + 1;
  });

  console.log('Source breakdown:', sourceCounts);
  console.log('Imported From breakdown:', importedFromCounts);
  console.log('Ownership status breakdown:', ownershipCounts);

  await mongoose.disconnect();
}
check();
`;

    await ssh.execCommand(`echo "${Buffer.from(scriptContent).toString('base64')}" | base64 -d > ${remoteBase}/backend/test_unassigned.js`);
    const res = await ssh.execCommand(`${setupEnv} && node test_unassigned.js`, { cwd: `${remoteBase}/backend` });
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
    await ssh.execCommand(`rm -f ${remoteBase}/backend/test_unassigned.js`);
  } finally {
    ssh.dispose();
  }
}

inspect();
