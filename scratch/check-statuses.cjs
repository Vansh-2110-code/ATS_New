const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  try {
    await ssh.connect({
      host: 'ats.whitehorsemanpower.in',
      username: 'whitehorsemanpower',
      password: 'Whitehorse@2026blr',
      port: 22
    });

    const setupEnv = 'export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v20.20.2/bin';
    const script = `
require('dotenv').config();
const mongoose = require('mongoose');
require('./src/models/Candidate');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ats').then(async () => {
  const statuses = await mongoose.model('Candidate').aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log('--- ALL CANDIDATE STATUSES ---');
  console.log(JSON.stringify(statuses, null, 2));
  process.exit(0);
});
`;
    await ssh.execCommand(`cat << 'EOF' > backend/check_db.cjs\n${script}\nEOF`, { cwd: '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in' });
    const res = await ssh.execCommand(`${setupEnv} && node check_db.cjs`, { cwd: '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in/backend' });
    console.log(res.stdout || res.stderr);
    await ssh.execCommand(`rm -f backend/check_db.cjs`, { cwd: '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in' });
  } catch (err) {
    console.error(err);
  } finally {
    ssh.dispose();
  }
}
run();
