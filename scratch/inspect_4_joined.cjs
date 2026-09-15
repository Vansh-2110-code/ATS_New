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
const TeamMember = require('./src/models/TeamMember');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);

  const phones = ['9104561993', '6362962733', '7994932011', '9980895017'];
  const candidates = await Candidate.find({ phone: { $in: phones } }).lean();

  console.log('=== 4 JOINED CANDIDATES DATA ===');
  for (const c of candidates) {
    let recUser = null;
    if (c.assignedRecruiter) {
      recUser = await User.findById(c.assignedRecruiter).select('name email role').lean();
    }
    console.log({
      name: c.name,
      phone: c.phone,
      email: c.email,
      status: c.status,
      assignedRecruiterId: c.assignedRecruiter,
      assignedRecruiterName: c.assignedRecruiterName,
      recUserInDB: recUser,
      sourcedBy: c.sourcedBy,
      ownershipStatus: c.ownershipStatus,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      stageHistory: c.stageHistory?.map(s => ({ stage: s.stage, subStatus: s.subStatus, changedBy: s.changedBy, changedAt: s.changedAt })),
      notesCount: c.notes?.length
    });
  }

  // Also check all TeamAssignments in DB to see recruiter -> TL mapping
  const teamAssignments = await TeamMember.find({ removedAt: null }).populate('teamLeaderId', 'name').populate('memberId', 'name').lean();
  console.log('\\n=== TEAM ASSIGNMENTS COUNT ===', teamAssignments.length);
  teamAssignments.forEach(ta => {
    console.log('TL:', ta.teamLeaderId?.name, '-> Recruiter:', ta.memberId?.name);
  });

  await mongoose.disconnect();
}
check();
`;

    await ssh.execCommand(`echo "${Buffer.from(scriptContent).toString('base64')}" | base64 -d > ${remoteBase}/backend/test_4_joined.js`);
    const res = await ssh.execCommand(`${setupEnv} && node test_4_joined.js`, { cwd: `${remoteBase}/backend` });
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
    await ssh.execCommand(`rm -f ${remoteBase}/backend/test_4_joined.js`);
  } finally {
    ssh.dispose();
  }
}

inspect();
