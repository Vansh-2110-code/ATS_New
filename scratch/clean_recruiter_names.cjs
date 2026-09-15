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
        
        function cleanName(name) {
          if (!name) return name;
          return name
            .replace(/\\s*\\((recruiter|tl|admin|manager)\\)\\s*/gi, '')
            .replace(/\\s*\\[(recruiter|tl|admin|manager)\\]\\s*/gi, '')
            .trim();
        }

        // 1. Find candidates with dirty assignedRecruiterName
        const dirtyCandidates = await Candidate.find({
          \\$or: [
            { assignedRecruiterName: /\\(recruiter\\)|\\(tl\\)|\\(admin\\)|\\(manager\\)/i },
            { assignedRecruiterName: /\\[recruiter\\]|\\[tl\\]|\\[admin\\]|\\[manager\\]/i }
          ]
        }).select('_id name assignedRecruiterName assignedRecruiter').lean();

        console.log('Found dirty candidate records:', dirtyCandidates.length);
        
        let cleanedCount = 0;
        for (const cand of dirtyCandidates) {
          const clean = cleanName(cand.assignedRecruiterName);
          await Candidate.updateOne({ _id: cand._id }, { \\$set: { assignedRecruiterName: clean } });
          cleanedCount++;
        }
        console.log('Cleaned candidate records:', cleanedCount);

        // 2. Also ensure assignedRecruiter populated names are synced
        const allCandidates = await Candidate.find({ assignedRecruiter: { \\$exists: true, \\$ne: null } }).populate('assignedRecruiter', 'name').lean();
        let syncedCount = 0;
        for (const cand of allCandidates) {
          if (cand.assignedRecruiter && cand.assignedRecruiter.name) {
            const cleanRec = cleanName(cand.assignedRecruiter.name);
            if (cand.assignedRecruiterName !== cleanRec) {
              await Candidate.updateOne({ _id: cand._id }, { \\$set: { assignedRecruiterName: cleanRec } });
              syncedCount++;
            }
          }
        }
        console.log('Synced candidate recruiter names from User objects:', syncedCount);

        const newDistinct = await Candidate.distinct('assignedRecruiterName');
        console.log('\\nNew distinct assignedRecruiterName count:', newDistinct.length);
        console.log('New distinct recruiter names:', newDistinct);

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
