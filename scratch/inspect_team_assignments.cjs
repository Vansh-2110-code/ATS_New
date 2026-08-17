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
      const User = require('./src/models/User');
      const TeamMember = require('./src/models/TeamMember');
      
      mongoose.connect('mongodb://127.0.0.1:27017/ats_db').then(async () => {
        const tls = await User.find({ role: { $in: ['tl', 'team_lead', 'team leader'] } }).lean();
        console.log('=== TL USERS ===');
        tls.forEach(t => console.log(t._id, t.name, t.email, t.role, t.status));

        const assignments = await TeamMember.find({}).populate('teamLeaderId', 'name email role').populate('memberId', 'name email role').lean();
        console.log('=== ALL TEAM ASSIGNMENTS (' + assignments.length + ') ===');
        assignments.forEach(a => {
          console.log('TL:', a.teamLeaderId?.name || a.teamLeaderId, '--> Member:', a.memberId?.name || a.memberId, 'RemovedAt:', a.removedAt);
        });

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
