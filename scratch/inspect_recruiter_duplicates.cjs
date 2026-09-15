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
        const Job = mongoose.model('Job', new mongoose.Schema({}, { strict: false }));
        
        // 1. Check distinct assignedRecruiterName values in Candidate
        const candRecruiters = await Candidate.distinct('assignedRecruiterName');
        console.log('Distinct Candidate assignedRecruiterName values:', candRecruiters.length);
        console.log('Sample Candidate recruiter names:', candRecruiters);

        // 2. Check Users collection names
        const users = await User.find({ status: 'Active' }).select('name email role').lean();
        console.log('\\nActive Users count:', users.length);
        console.log('Sample User names:', users.map(u => ({ id: u._id, name: u.name, role: u.role })));

        // 3. Check for any (recruiter) or (tl) strings in DB
        const candidatesWithRoleSuffix = await Candidate.find({ assignedRecruiterName: /\\(recruiter\\)|\\(tl\\)/i }).countDocuments();
        console.log('\\nCandidates with (recruiter) or (tl) in assignedRecruiterName:', candidatesWithRoleSuffix);

        // 4. Check Jobs collection assignedRecruiters
        const jobs = await Job.find({}).select('jobTitle assignedRecruiters').lean();
        console.log('\\nSample Jobs assignedRecruiters:', JSON.stringify(jobs.slice(0, 3), null, 2));

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
