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

    const scriptCode = `
      const mongoose = require('mongoose');
      const Candidate = require('./src/models/Candidate');
      const User = require('./src/models/User');
      const TeamMember = require('./src/models/TeamMember');
      
      mongoose.connect('mongodb://127.0.0.1:27017/ats_db').then(async () => {
        const tls = await User.find({ role: { $in: ['tl', 'team_lead', 'team leader'] } }).lean();

        for (const tl of tls) {
          const teamAssignments = await TeamMember.find({ teamLeaderId: tl._id, removedAt: null }).populate('memberId', 'name email employeeId status').lean();
          const targetTlUser = await User.findById(tl._id).select('name email employeeId status').lean();
          
          let recruiters = teamAssignments
            .map(ta => ta.memberId)
            .filter(u => u && u.status === 'Active');
          
          if (targetTlUser && !recruiters.some(r => String(r._id) === String(tl._id))) {
            recruiters.unshift(targetTlUser);
          }

          const teamStats = await Promise.all(recruiters.map(async (r) => {
            const rId = r._id;
            const rName = r.name;
            const recruiterCond = {
              $and: [
                {
                  $or: [
                    { assignedRecruiter: rId },
                    { assignedRecruiterName: rName },
                    { sourcedBy: rName },
                    { recruiterName: rName }
                  ]
                },
                { division: 'BPO' }
              ]
            };

            const eligible = await Candidate.countDocuments({ ...recruiterCond, status: { $in: ['Eligible', 'Eligible Candidates'] } });
            const finalSelect = await Candidate.countDocuments({ ...recruiterCond, status: { $in: ['Final Select', 'Final Round Scheduled', 'Final Round Completed', 'L1 Select', 'Client Select', 'Selected'] } });
            const docCompleted = await Candidate.countDocuments({ ...recruiterCond, status: { $in: ['Documentation Completed', 'Documentation Incomplete', 'Document Initialized', 'Documennt Initialted', 'Documentation'] } });
            const offerAccept = await Candidate.countDocuments({ ...recruiterCond, status: { $in: ['Offer Accept', 'Offer Accepted', 'Offered', 'Offer Released', 'Yet To Join'] } });
            const joined = await Candidate.countDocuments({ ...recruiterCond, status: 'Joined' });

            const totalCalls = await Candidate.countDocuments({
              $and: [
                recruiterCond,
                {
                  $or: [
                    { firstCallDate: { $ne: null, $ne: '' } },
                    { firstCallStatus: { $ne: null, $ne: '' } },
                    { 'notes.0': { $exists: true } }
                  ]
                }
              ]
            });

            return {
              id: rId,
              name: rName,
              totalCalls,
              eligible,
              finalSelect,
              docCompleted,
              offerAccept,
              joined
            };
          }));

          console.log('\\nRecruiter Table for ' + tl.name + ':');
          console.table(teamStats);
        }

        process.exit(0);
      });
    `;
    const b64 = Buffer.from(scriptCode).toString('base64');
    const res = await ssh.execCommand(
      `/home/whitehorsemanpower/.nvm/versions/node/v22.23.1/bin/node -e "eval(Buffer.from('${b64}', 'base64').toString('utf8'))"`,
      { cwd: '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in/backend' }
    );
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
  } catch (err) {
    console.error('SSH Error:', err);
  } finally {
    ssh.dispose();
  }
}

run();
