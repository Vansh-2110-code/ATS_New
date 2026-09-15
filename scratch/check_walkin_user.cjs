const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
  try {
    await ssh.connect({
      host: 'ats.whitehorsemanpower.in',
      username: 'whitehorsemanpower',
      password: 'Whitehorse@2026blr',
      port: 22,
    });
    const setupEnv = 'export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v22.23.1/bin:~/.npm-global/bin';
    const remoteCode = `
      require('dotenv').config();
      const mongoose = require('mongoose');
      mongoose.connect(process.env.MONGODB_URI).then(async () => {
        const u = await mongoose.connection.collection('users').find({ role: 'walkin' }).toArray();
        console.log('WALKIN USERS:', JSON.stringify(u.map(x => ({ email: x.email, name: x.name, employeeId: x.employeeId, role: x.role }))));
        process.exit(0);
      });
    `;
    const res = await ssh.execCommand(`${setupEnv} && node -e "${remoteCode.replace(/\n/g, ' ')}"`, {
      cwd: '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in/backend'
    });
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
  } finally {
    ssh.dispose();
  }
}
check();
