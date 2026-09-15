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

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const existing = await Candidate.findOne({ status: 'Eligible', createdAt: { \\$gte: thirtyDaysAgo } }).lean();
        
        if (!existing) {
          console.log('No recent candidate found created within 30 days.');
          await mongoose.disconnect();
          return;
        }

        console.log('Found Active Recent Candidate in DB:', { id: existing._id, name: existing.name, phone: existing.phone, status: existing.status, recruiter: existing.assignedRecruiterName, createdAt: existing.createdAt });

        const UNLOCKED_REASSIGN_STATUSES = [
          'Not Eligible', 'No Response', 'Call Back', 'Hold', 'No Show',
          'VNA Reject', 'Test Reject', 'Candidate Drop Post L1 Select',
          'Candidate Drop Post L2 Select', 'Candidate Drop During Final Stage',
          'L1 Reject', 'L2 Reject', 'Final Reject', 'Offer Reject'
        ];
        const isUnlockedStatus = UNLOCKED_REASSIGN_STATUSES.some(s => s.toLowerCase() === (existing.status || '').trim().toLowerCase());
        const lastActivity = existing.assignedAt || existing.createdAt;
        const daysSinceAssignment = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));

        const isBlockedForAdmin = !isUnlockedStatus && daysSinceAssignment < 30;
        console.log('Is Duplicate Creation Blocked for Admin?:', isBlockedForAdmin ? '✅ YES (STRICTLY BLOCKED)' : '❌ NO');

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
