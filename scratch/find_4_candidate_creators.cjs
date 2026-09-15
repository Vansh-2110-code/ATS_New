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
const AuditLog = require('./src/models/AuditLog');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);

  const phones = ['9104561993', '6362962733', '7994932011', '9980895017'];
  const candidates = await Candidate.find({ phone: { $in: phones } }).lean();

  for (const c of candidates) {
    const logs = await AuditLog.find({ target: c._id.toString() }).sort({ createdAt: 1 }).lean();
    console.log('--------------------------------------------------');
    console.log('Candidate:', c.name, 'Phone:', c.phone, 'Status:', c.status);
    console.log('SourcedBy:', c.sourcedBy, 'AssignedRecruiter:', c.assignedRecruiter, 'AssignedName:', c.assignedRecruiterName);
    console.log('Logs history:');
    logs.forEach(l => {
      console.log(' ->', l.createdAt, '| User:', l.userName, 'Role:', l.role, '| Action:', l.action);
    });
  }

  await mongoose.disconnect();
}
test();
`;

    await ssh.execCommand(`echo "${Buffer.from(script).toString('base64')}" | base64 -d > ${remoteBase}/backend/test_creators.js`);
    const res = await ssh.execCommand(`${setupEnv} && node test_creators.js`, { cwd: `${remoteBase}/backend` });
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
    await ssh.execCommand(`rm -f ${remoteBase}/backend/test_creators.js`);
  } finally {
    ssh.dispose();
  }
}

run();
