const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
  await ssh.connect({
    host: 'ats.whitehorsemanpower.in',
    username: 'whitehorsemanpower',
    password: 'Whitehorse@2026blr',
    port: 22,
    readyTimeout: 30000
  });

  const cmd = `export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v22.23.1/bin:~/.npm-global/bin
  node -e "
    const mongoose = require('mongoose');
    const User = require('./src/models/User');
    const TeamMember = require('./src/models/TeamMember');
    const Candidate = require('./src/models/Candidate');
    require('dotenv').config();

    async function run() {
      await mongoose.connect(process.env.MONGODB_URI);
      const gowthami = await User.findOne({ name: { \\$regex: 'Gowthami', \\$options: 'i' } });
      console.log('Gowthami:', gowthami ? { _id: gowthami._id, name: gowthami.name, role: gowthami.role } : 'Not found');
      if (gowthami) {
        const members = await TeamMember.find({ teamLeaderId: gowthami._id, removedAt: null }).populate('memberId', 'name role');
        console.log('Live Gowthami members count in TeamMember:', members.length);
        console.log('Live Gowthami members in TeamMember:', members.map(m => m.memberId ? m.memberId.name : 'Unknown'));
      }
      
      const missingNames = ['Samir', 'Geetha G', 'Ruqia Begum', 'Sadia', 'Abdul Adil Kashmiri'];
      for (const n of missingNames) {
        const u = await User.findOne({ name: { \\$regex: n, \\$options: 'i' } });
        console.log('User ' + n + ' in User collection:', u ? { _id: u._id, name: u.name, role: u.role } : 'NOT FOUND IN USER COLLECTION');
        if (u) {
          const tm = await TeamMember.findOne({ memberId: u._id, removedAt: null }).populate('teamLeaderId', 'name');
          console.log('  Assigned to TL:', tm ? tm.teamLeaderId?.name : 'NO TEAM ASSIGNMENT IN TEAMMEMBER');
        }
      }

      // Check Candidate 6362962733
      const cand = await Candidate.findOne({ phone: { \\$regex: '6362962733' } });
      console.log('Candidate 6362962733:', cand ? {
        name: cand.name,
        phone: cand.phone,
        status: cand.status,
        joiningSalary: cand.joiningSalary,
        offeredCTC: cand.offeredCTC,
        placementPercentage: cand.placementPercentage,
        revenueGenerated: cand.revenueGenerated,
        offerDetails: cand.offerDetails,
        assignedRecruiterName: cand.assignedRecruiterName
      } : 'Not found');

      process.exit(0);
    }
    run();
  "`;

  const res = await ssh.execCommand(cmd, { cwd: '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in/backend' });
  console.log(res.stdout);
  console.error(res.stderr);
  ssh.dispose();
}

check().catch(console.error);
