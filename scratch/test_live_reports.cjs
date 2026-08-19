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
        
        const start = new Date('2026-08-01T00:00:00.000Z');
        const end = new Date('2026-08-19T23:59:59.999Z');
        
        const joinedDateFilter = {
          \\$or: [
            { dateOfJoining: { \\$gte: start, \\$lt: end } },
            { 'offerDetails.dateOfJoining': { \\$gte: start, \\$lt: end } },
            { expectedDateOfJoining: { \\$gte: start, \\$lt: end } },
            { 'offerDetails.expectedDateOfJoining': { \\$gte: start, \\$lt: end } },
            { updatedAt: { \\$gte: start, \\$lt: end } },
            { createdAt: { \\$gte: start, \\$lt: end } }
          ]
        };

        const joined = await Candidate.find({ status: 'Joined', ...joinedDateFilter }).select('name phone email clientName companyName status joiningSalary dateOfJoining updatedAt createdAt').lean();
        console.log('JOINED CANDIDATES MATCHED FOR AUGUST REPORT:', joined.length);
        
        const checkNames = ['Rushabh J Sheth', 'PRATIK KIRAN KUSHARE', 'Sunay Kumar', 'ABHISHEK J H'];
        checkNames.forEach(n => {
          const c = joined.find(x => x.name.toLowerCase().includes(n.toLowerCase().split(' ')[0]));
          console.log('FOUND ' + n + '?:', c ? { name: c.name, phone: c.phone, email: c.email, status: c.status, client: c.clientName || c.companyName } : 'NO');
        });
        
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
