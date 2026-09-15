const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function inspectData() {
  await ssh.connect({
    host: 'ats.whitehorsemanpower.in',
    username: 'whitehorsemanpower',
    password: 'Whitehorse@2026blr',
    port: 22,
  });

  const setupEnv = 'export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v22.23.1/bin:~/.npm-global/bin';
  const remoteBase = '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in';

  const res = await ssh.execCommand(`${setupEnv} && node -e "
    const mongoose = require('mongoose');
    require('dotenv').config();
    async function run() {
      await mongoose.connect(process.env.MONGODB_URI);
      const Employee = require('./src/models/Employee');
      const total = await Employee.countDocuments();
      const testRecords = await Employee.find({ fullName: /test|multipart/i }).select('fullName employeeId email');
      console.log('TOTAL EMPLOYEES:', total);
      console.log('TEST RECORDS FOUND (' + testRecords.length + '):', testRecords);
      process.exit(0);
    }
    run();
  "`, { cwd: `${remoteBase}/backend` });

  console.log(res.stdout);
  ssh.dispose();
}

inspectData();
