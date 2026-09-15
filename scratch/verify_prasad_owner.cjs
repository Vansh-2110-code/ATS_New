const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Connected.');
  const script = `
    export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v22.23.1/bin:~/.npm-global/bin
    node -e "
      const mongoose = require('/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in/backend/node_modules/mongoose');
      require('/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in/backend/node_modules/dotenv').config({ path: '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in/backend/.env' });
      async function run() {
        await mongoose.connect(process.env.MONGODB_URI);
        const Candidate = require('/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in/backend/src/models/Candidate');
        const User = require('/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in/backend/src/models/User');

        const prasad = await User.findOne({ name: /Prasad/i }).lean();
        const cand = await Candidate.findOne({ name: /shabnum/i }).lean();

        console.log('Prasad User Object:', { id: prasad?._id, name: prasad?.name, role: prasad?.role });
        console.log('Shabnum Candidate Object:', { id: cand?._id, name: cand?.name, status: cand?.status, assignedRecruiter: cand?.assignedRecruiter, assignedRecruiterName: cand?.assignedRecruiterName });

        const candRecId = cand?.assignedRecruiter ? String(cand.assignedRecruiter) : '';
        const reqUserId = prasad?._id ? String(prasad._id) : '';
        const candRecName = String(cand?.assignedRecruiterName || '').trim().toLowerCase();
        const reqUserName = String(prasad?.name || '').trim().toLowerCase();

        const isOwner = (candRecId && reqUserId && candRecId === reqUserId) ||
                        (candRecName && reqUserName && candRecName === reqUserName);

        console.log('Is Prasad S recognized as Owner of Shabnum?:', isOwner ? '✅ YES' : '❌ NO');

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
