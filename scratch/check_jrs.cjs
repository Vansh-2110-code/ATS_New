const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
  try {
    await ssh.connect({
      host: 'ats.whitehorsemanpower.in',
      username: 'whitehorsemanpower',
      password: 'Whitehorse@2026blr',
      port: 22,
      readyTimeout: 30000
    });
    console.log('Connected to SSH.');

    const script = `
      const mongoose = require('mongoose');
      async function check() {
        await mongoose.connect('mongodb://127.0.0.1:27017/ats_db');
        const count = await mongoose.connection.db.collection('jobs').countDocuments();
        const openCount = await mongoose.connection.db.collection('jobs').countDocuments({ status: { \\$ne: 'Closed' } });
        const statusCounts = await mongoose.connection.db.collection('jobs').aggregate([{ \\$group: { _id: '\\$status', count: { \\$sum: 1 } } }]).toArray();
        const sample = await mongoose.connection.db.collection('jobs').find({ status: { \\$ne: 'Closed' } }).limit(5).project({ jrNumber: 1, jobTitle: 1, companyName: 1, status: 1, positions: 1, skills: 1, location: 1, experience: 1 }).toArray();
        console.log('TOTAL JOBS:', count);
        console.log('ACTIVE JOBS:', openCount);
        console.log('STATUS COUNTS:', JSON.stringify(statusCounts));
        console.log('SAMPLE JOBS:', JSON.stringify(sample, null, 2));
        process.exit(0);
      }
      check().catch(e => { console.error(e); process.exit(1); });
    `;
    const res = await ssh.execCommand('export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v22.23.1/bin:~/.npm-global/bin && node -e "' + script.replace(/"/g, '\\"') + '"', { cwd: '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in/backend' });

    console.log('Result:', res.stdout);
    if (res.stderr) console.error('Stderr:', res.stderr);
    ssh.dispose();
  } catch (e) {
    console.error('Error:', e);
  }
}

check();
