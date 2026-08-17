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
          console.log('\\n==================== TL: ' + tl.name + ' (' + tl._id + ') ====================');
          const assignments = await TeamMember.find({ teamLeaderId: tl._id, removedAt: null }).populate('memberId').lean();
          const members = assignments.map(a => a.memberId).filter(Boolean);
          const allTeamUsers = [tl, ...members];
          const userIds = allTeamUsers.map(u => u._id);
          const userNames = allTeamUsers.map(u => u.name).filter(Boolean);

          console.log('Team User Names:', userNames);

          // 1. Match by assignedRecruiter ObjectId only
          const countByObjId = await Candidate.countDocuments({
            division: 'BPO',
            status: { $in: ['Eligible', 'Eligible Candidates'] },
            assignedRecruiter: { $in: userIds }
          });

          // 2. Match by assignedRecruiter OR assignedRecruiterName OR sourcedBy OR recruiterName
          const countByNameOrId = await Candidate.countDocuments({
            division: 'BPO',
            status: { $in: ['Eligible', 'Eligible Candidates'] },
            $or: [
              { assignedRecruiter: { $in: userIds } },
              { assignedRecruiterName: { $in: userNames } },
              { sourcedBy: { $in: userNames } },
              { recruiterName: { $in: userNames } }
            ]
          });

          // 3. Status breakdown with name/id matching
          const statusBreakdown = await Candidate.aggregate([
            {
              $match: {
                division: 'BPO',
                $or: [
                  { assignedRecruiter: { $in: userIds } },
                  { assignedRecruiterName: { $in: userNames } },
                  { sourcedBy: { $in: userNames } },
                  { recruiterName: { $in: userNames } }
                ]
              }
            },
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ]);

          console.log('Eligible by ObjectId only:', countByObjId);
          console.log('Eligible by Name or Id:', countByNameOrId);
          console.log('Status Breakdown (Name or Id):', statusBreakdown);
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
