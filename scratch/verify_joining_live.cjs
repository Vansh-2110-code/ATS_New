const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function test() {
  await ssh.connect({
    host: 'ats.whitehorsemanpower.in',
    username: 'whitehorsemanpower',
    password: 'Whitehorse@2026blr',
    port: 22,
  });

  const setupEnv = 'export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v22.23.1/bin:~/.npm-global/bin';
  const remoteBase = '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in';

  const res = await ssh.execCommand(`${setupEnv} && node -e "
    const jwt = require('jsonwebtoken');
    const mongoose = require('mongoose');
    const http = require('http');
    require('dotenv').config();

    async function run() {
      await mongoose.connect(process.env.MONGODB_URI);
      const User = require('./src/models/User');
      const admin = await User.findOne({ role: 'admin' });
      const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET);

      const req = http.request('http://127.0.0.1:5001/api/public/joining?status=all', {
        headers: { 'Authorization': 'Bearer ' + token }
      }, (r) => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => {
          console.log('Joining API HTTP Status:', r.statusCode);
          const j = JSON.parse(d);
          console.log('Total Records:', j.total);
          console.log('Pending Verification Count:', j.pendingCount);
          if (j.employees && j.employees.length > 0) {
            console.log('Sample Record Name:', j.employees[0].fullName, 'Approval Status:', j.employees[0].approvalStatus || 'pending');
          }
          process.exit(0);
        });
      });
      req.end();
    }
    run().catch(e => { console.error(e); process.exit(1); });
  "`, { cwd: `${remoteBase}/backend` });

  console.log(res.stdout);
  if (res.stderr) console.error(res.stderr);
  ssh.dispose();
}

test();
