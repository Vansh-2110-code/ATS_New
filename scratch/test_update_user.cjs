const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'ats.whitehorsemanpower.in',
    username: 'whitehorsemanpower',
    password: 'Whitehorse@2026blr',
    port: 22
  });

  const setupEnv = 'export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v22.23.1/bin:~/.npm-global/bin';
  
  // Test updating the user via mongoose directly to see what happened or what error occurred
  const script = `
    const mongoose = require('mongoose');
    require('dotenv').config();
    async function main() {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ats');
      const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
      const u = await User.findOne({ email: 'walkin@whitehorsemanpower.in' });
      console.log('Current Walkin User:', u._id, u.employeeId, u.disableBiometric);
      const updated = await User.findByIdAndUpdate(u._id, { disableBiometric: true }, { new: true });
      console.log('Updated User disableBiometric:', updated.disableBiometric);
      process.exit(0);
    }
    main().catch(err => { console.error(err); process.exit(1); });
  `;

  const res = await ssh.execCommand(`${setupEnv} && node -e "${script.replace(/\n/g, ' ')}"`, {
    cwd: '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in/backend'
  });
  console.log(res.stdout);
  if (res.stderr) console.error(res.stderr);
  ssh.dispose();
}

run().catch(console.error);
