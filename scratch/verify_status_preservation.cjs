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

        const nonNewCandidates = await Candidate.find({ status: { \\$ne: 'New' } }).limit(5).select('name status firstCallStatus createdAt').lean();
        console.log('Candidates with non-New status in DB:', nonNewCandidates);

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
