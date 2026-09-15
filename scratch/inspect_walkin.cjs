const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'ats.whitehorsemanpower.in',
    username: 'whitehorsemanpower',
    password: 'Whitehorse@2026blr',
    port: 22
  });

  const script = `
    const mongoose = require('mongoose');
    require('dotenv').config();
    async function main() {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ats');
      const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
      const users = await User.find({ email: /walkin/i });
      console.log('WALKIN_USERS:', JSON.stringify(users, null, 2));
      process.exit(0);
    }
    main().catch(err => { console.error(err); process.exit(1); });
  `;

  const setupEnv = 'export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v22.23.1/bin:~/.npm-global/bin';
  const res = await ssh.execCommand(`${setupEnv} && node -e "${script.replace(/\n/g, ' ')}"`, {
    cwd: '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in/backend'
  });
  console.log(res.stdout);
  if (res.stderr) console.error(res.stderr);
  ssh.dispose();
}

run().catch(console.error);
