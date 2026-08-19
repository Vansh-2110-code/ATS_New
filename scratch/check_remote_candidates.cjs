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
        const allJoined = await Candidate.find({ status: 'Joined' }).select('name phone email clientName companyName joiningSalary dateOfJoining updatedAt createdAt').lean();
        console.log('ALL JOINED COUNT:', allJoined.length);
        allJoined.forEach((c, idx) => {
          console.log(\`\${idx + 1}. [\${c.name}] Phone: \${c.phone} | Email: \${c.email} | Client: \${c.clientName || c.companyName} | Created: \${c.createdAt?.toISOString().split('T')[0]} | Updated: \${c.updatedAt?.toISOString().split('T')[0]} | DOJ: \${c.dateOfJoining}\`);
        });
        
        // Also find if there are candidates with partial names
        const partial = await Candidate.find({ name: { \\$regex: /rushabh|kushare|sunay|abhishek/i } }).select('name status phone email clientName companyName joiningSalary dateOfJoining createdAt updatedAt').lean();
        console.log('PARTIAL FOUND:', JSON.stringify(partial, null, 2));

        // Also check all Joined / Yet To Join counts in DB
        const joinedCount = await Candidate.countDocuments({ status: 'Joined' });
        const ytjCount = await Candidate.countDocuments({ status: { \\$in: ['Yet To Join', 'Offer Accept', 'Offer Accepted', 'Waiting for Offer', 'Joining Date Confirmed', 'Joining Postponed'] } });
        console.log('TOTAL JOINED IN DB:', joinedCount, 'TOTAL YET TO JOIN IN DB:', ytjCount);
        await mongoose.disconnect();
      }
      run().catch(console.error);
    "
  `;

  conn.exec(script, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream closed with code ' + code);
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
