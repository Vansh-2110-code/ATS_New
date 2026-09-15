const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkReports() {
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
const { getDateRange } = require('./src/utils/helpers');
const mongoose = require('mongoose');
require('dotenv').config();
const Candidate = require('./src/models/Candidate');
const Job = require('./src/models/Job');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);

  // Test inverted dates like in screenshot: 2026-07-31 to 2025-08-31
  const r1 = getDateRange('custom', '2026-07-31', '2025-08-31');
  console.log('Inverted Dates Fixed Range:', r1.start.toISOString(), 'to', r1.end.toISOString());

  // Test normal dates: 2026-07-01 to 2026-08-31
  const r2 = getDateRange('custom', '2026-07-01', '2026-08-31');
  console.log('Normal Dates Range:', r2.start.toISOString(), 'to', r2.end.toISOString());

  // Count active JRs and candidates
  const activeJobs = await Job.countDocuments({ status: { $ne: 'Closed' } });
  const activeCandidates = await Candidate.countDocuments({ status: { $nin: ['Rejected', 'Exited'] } });
  const joinedCandidates = await Candidate.countDocuments({ status: 'Joined' });

  console.log({
    activeJobs,
    activeCandidates,
    joinedCandidates
  });

  await mongoose.disconnect();
}
test();
`;

    await ssh.execCommand(`echo "${Buffer.from(script).toString('base64')}" | base64 -d > ${remoteBase}/backend/test_rep_check.js`);
    const res = await ssh.execCommand(`${setupEnv} && node test_rep_check.js`, { cwd: `${remoteBase}/backend` });
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
    await ssh.execCommand(`rm -f ${remoteBase}/backend/test_rep_check.js`);
  } finally {
    ssh.dispose();
  }
}

checkReports();
