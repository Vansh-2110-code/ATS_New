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
  
  // Test calling the actual PUT endpoint as admin
  const script = `
    const jwt = require('jsonwebtoken');
    const mongoose = require('mongoose');
    require('dotenv').config();
    async function main() {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ats');
      const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
      const admin = await User.findOne({ role: 'admin' });
      const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
      
      const payload = {
        name: 'Walkin',
        email: 'walkin@whitehorsemanpower.in',
        role: 'walkin',
        roles: ['walkin'],
        isWFH: false,
        pseudoName: 'WH000001',
        loginStartTime: '09:00',
        loginEndTime: '19:00',
        allowHomeLogin: true,
        disableBiometric: true
      };

      const res = await fetch('http://localhost:5001/api/users/WH000101', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(payload)
      });
      console.log('STATUS_CODE:', res.status);
      const text = await res.text();
      console.log('RESPONSE:', text);
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
