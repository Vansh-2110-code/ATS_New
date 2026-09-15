const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkCandidate() {
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
const WalkIn = require('./src/models/WalkIn');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const cand = await Candidate.find({ email: /walkin/i }).lean();
  console.log('Candidates with walkin email:', cand);

  const allWalkIns = await WalkIn.find({}).limit(5).lean();
  console.log('Sample WalkIns in DB:', allWalkIns);

  process.exit(0);
}
run();
`;

    await ssh.execCommand(`echo "${Buffer.from(script).toString('base64')}" | base64 -d > ${remoteBase}/backend/test_cand.js`);
    const res = await ssh.execCommand(`${setupEnv} && node test_cand.js`, { cwd: `${remoteBase}/backend` });
    console.log('OUTPUT:\n', res.stdout);
    if (res.stderr) console.error('STDERR:\n', res.stderr);

    await ssh.execCommand(`rm -f ${remoteBase}/backend/test_cand.js`);
    ssh.dispose();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkCandidate();
