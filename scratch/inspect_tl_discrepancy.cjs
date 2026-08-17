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
    console.log('Connected to server via SSH.');

    const scriptCode = `
      const mongoose = require('mongoose');
      const Candidate = require('./src/models/Candidate');
      const User = require('./src/models/User');
      const TeamMember = require('./src/models/TeamMember');
      
      mongoose.connect('mongodb://127.0.0.1:27017/ats_db').then(async () => {
        console.log('--- ALL USERS WITH ROLE TL/RECRUITER/MANAGER ---');
        const users = await User.find({ role: { $in: ['tl', 'team_lead', 'team leader', 'manager', 'recruiter', 'admin'] } })
          .select('_id name email role status')
          .lean();
        console.log(JSON.stringify(users, null, 2));

        console.log('--- TEAM MEMBER ASSIGNMENTS ---');
        const teamAssignments = await TeamMember.find({}).lean();
        console.log(JSON.stringify(teamAssignments, null, 2));

        console.log('--- CANDIDATE STATUS COUNTS (OVERALL & BPO) ---');
        const overallStatus = await Candidate.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        console.log('Overall Status:', overallStatus);

        const bpoStatus = await Candidate.aggregate([
          { $match: { division: 'BPO' } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        console.log('BPO Status:', bpoStatus);

        console.log('--- CANDIDATE COUNTS BY RECRUITER NAME / ASSIGNED RECRUITER (DIVISION BPO) ---');
        const recCounts = await Candidate.aggregate([
          { $match: { division: 'BPO', status: { $in: ['Eligible', 'Eligible Candidates'] } } },
          { $group: { 
              _id: { 
                recruiterName: '$recruiterName', 
                assignedRecruiterName: '$assignedRecruiterName', 
                sourcedBy: '$sourcedBy',
                assignedRecruiter: '$assignedRecruiter'
              }, 
              count: { $sum: 1 } 
            } 
          }
        ]);
        console.log('BPO Eligible by Recruiter fields:', JSON.stringify(recCounts, null, 2));

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
