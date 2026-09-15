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
        
        function cleanName(name) {
          if (!name) return name;
          return name
            .replace(/\\s*\\((recruiter|tl|admin|manager)\\)\\s*/gi, '')
            .replace(/\\s*\\[(recruiter|tl|admin|manager)\\]\\s*/gi, '')
            .trim();
        }

        const candidates = await Candidate.find({
          \\$or: [
            { assignedRecruiterName: /\\(recruiter\\)|\\(tl\\)|\\(admin\\)|\\(manager\\)/i },
            { assignedRecruiterName: /\\[recruiter\\]|\\[tl\\]|\\[admin\\]|\\[manager\\]/i }
          ]
        }).select('_id assignedRecruiterName');

        console.log('Found candidates to clean:', candidates.length);
        let cleaned = 0;
        for (const c of candidates) {
          const newName = cleanName(c.assignedRecruiterName);
          c.assignedRecruiterName = newName;
          await c.save();
          cleaned++;
        }
        console.log('Successfully cleaned candidate records:', cleaned);

        const distinctNames = await Candidate.distinct('assignedRecruiterName');
        console.log('New distinct recruiter names count:', distinctNames.length);
        console.log('Sample distinct names:', distinctNames.slice(0, 15));

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
