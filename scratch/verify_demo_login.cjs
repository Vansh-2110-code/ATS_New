const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Connected.');
  const script = `
    export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v22.23.1/bin:~/.npm-global/bin
    node -e "
      const mongoose = require('/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in/backend/node_modules/mongoose');
      const bcrypt = require('/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in/backend/node_modules/bcryptjs');
      require('/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in/backend/node_modules/dotenv').config({ path: '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in/backend/.env' });
      async function run() {
        await mongoose.connect(process.env.MONGODB_URI);
        const User = require('/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in/backend/src/models/User');

        const demoUser = await User.findOne({ email: 'demo@whitehorsemanpower.in' });
        if (!demoUser) {
          console.log('❌ Demo user not found.');
        } else {
          const match = await bcrypt.compare('DemoAdmin@2026', demoUser.password);
          console.log('Demo User Verified:', {
            id: demoUser._id,
            email: demoUser.email,
            name: demoUser.name,
            role: demoUser.role,
            isDemoAccount: demoUser.isDemoAccount,
            passwordMatch: match ? '✅ PASSED' : '❌ FAILED'
          });
        }

        await mongoose.disconnect();
      }
      run().catch(console.error);
    "
  `;

  conn.exec(script, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      console.log(data.toString());
    }).stderr.on('data', (data) => {
      console.error('STDERR: ' + data.toString());
    });
  });
}).connect({
  host: 'ats.whitehorsemanpower.in',
  port: 22,
  username: 'whitehorsemanpower',
  password: 'Whitehorse@2026blr',
});
