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
        const Candidate = mongoose.model('Candidate', new mongoose.Schema({}, { strict: false }));
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        
        const eligibleCand = await Candidate.findOne({ status: 'Eligible', assignedRecruiter: { \\$exists: true, \\$ne: null } }).lean();
        if (eligibleCand) {
          console.log('Found Eligible candidate:', eligibleCand.name, '| Assigned to:', eligibleCand.assignedRecruiterName, '| ID:', eligibleCand._id);
        } else {
          console.log('No Eligible candidate found to inspect, looking for any active candidate...');
          const cand = await Candidate.findOne({ assignedRecruiter: { \\$exists: true, \\$ne: null } }).lean();
          console.log('Sample Candidate:', cand?.name, '| Status:', cand?.status, '| Recruiter:', cand?.assignedRecruiterName);
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
