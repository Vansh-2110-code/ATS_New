const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function testOutput() {
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
const TeamMember = require('./src/models/TeamMember');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);

  const allAssignments = await TeamMember.find({ removedAt: null }).populate('teamLeaderId', 'name _id').populate('memberId', 'name _id').lean();
  const recruiterToTlMap = {};
  const recruiterNameToTlMap = {};
  const tlUsers = await User.find({ role: 'tl' }).select('_id name').lean();
  tlUsers.forEach(t => {
    recruiterToTlMap[t._id.toString()] = t.name;
    recruiterNameToTlMap[t.name] = t.name;
  });
  allAssignments.forEach(ta => {
    if (ta.memberId && ta.teamLeaderId) {
      const memId = ta.memberId._id ? ta.memberId._id.toString() : ta.memberId.toString();
      recruiterToTlMap[memId] = ta.teamLeaderId.name;
      if (ta.memberId.name) {
        recruiterNameToTlMap[ta.memberId.name] = ta.teamLeaderId.name;
      }
    }
  });

  const phones = ['9104561993', '6362962733', '7994932011', '9980895017'];
  const candidates = await Candidate.find({ phone: { $in: phones } }).lean();

  console.log('=== JOINED CANDIDATES IN EXPECTED REVENUE REPORT ===');
  candidates.forEach(c => {
    const rawRecruiter = c.assignedRecruiterName || c.sourcedBy || '';
    const rawTl = (c.assignedRecruiter && recruiterToTlMap[c.assignedRecruiter.toString()]) || 
                 (c.assignedRecruiterName && recruiterNameToTlMap[c.assignedRecruiterName]) || 
                 (c.sourcedBy && recruiterNameToTlMap[c.sourcedBy]) ||
                 'Unassigned';

    console.log({
      name: c.name,
      phone: c.phone,
      recruiter: rawRecruiter,
      teamLeader: rawTl,
      status: c.status
    });
  });

  await mongoose.disconnect();
}
check();
`;

    await ssh.execCommand(`echo "${Buffer.from(script).toString('base64')}" | base64 -d > ${remoteBase}/backend/test_out.js`);
    const res = await ssh.execCommand(`${setupEnv} && node test_out.js`, { cwd: `${remoteBase}/backend` });
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
    await ssh.execCommand(`rm -f ${remoteBase}/backend/test_out.js`);
  } finally {
    ssh.dispose();
  }
}

testOutput();
