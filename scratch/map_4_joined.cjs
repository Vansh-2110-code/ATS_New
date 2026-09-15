const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function mapCandidates() {
  try {
    await ssh.connect({
      host: 'ats.whitehorsemanpower.in',
      username: 'whitehorsemanpower',
      password: 'Whitehorse@2026blr',
      port: 22,
      readyTimeout: 30000
    });

    const setupEnv = 'export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v22.23.1/bin:~/.npm-global/bin';
    const remoteBase = '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in';

    const script = `
const mongoose = require('mongoose');
require('dotenv').config();
const Candidate = require('./src/models/Candidate');
const User = require('./src/models/User');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const farjana = await User.findOne({ name: /Farjana Shaik/i });
  const samreen = await User.findOne({ name: /Samreen Shaik/i });
  const nusrath = await User.findOne({ name: /Nusrath/i });

  console.log('Recruiters Found:');
  console.log('Farjana:', farjana ? { id: farjana._id, name: farjana.name } : null);
  console.log('Samreen:', samreen ? { id: samreen._id, name: samreen.name } : null);
  console.log('Nusrath:', nusrath ? { id: nusrath._id, name: nusrath.name } : null);

  if (farjana) {
    await Candidate.updateOne(
      { phone: '9104561993' },
      { $set: { assignedRecruiter: farjana._id, assignedRecruiterName: farjana.name, ownershipStatus: 'Assigned' } }
    );
    console.log('Mapped Rushabh J Sheth -> Farjana Shaik');
  }

  if (samreen) {
    await Candidate.updateOne(
      { phone: '6362962733' },
      { $set: { assignedRecruiter: samreen._id, assignedRecruiterName: samreen.name, ownershipStatus: 'Assigned' } }
    );
    console.log('Mapped ABHISHEK J H -> Samreen Shaik');
  }

  if (nusrath) {
    await Candidate.updateOne(
      { phone: '7994932011' },
      { $set: { assignedRecruiter: nusrath._id, assignedRecruiterName: nusrath.name, ownershipStatus: 'Assigned' } }
    );
    console.log('Mapped NAHIMA NAAZ -> Nusrath Afreen');

    await Candidate.updateOne(
      { phone: '9980895017' },
      { $set: { assignedRecruiter: nusrath._id, assignedRecruiterName: nusrath.name, ownershipStatus: 'Assigned' } }
    );
    console.log('Mapped MOHAMMED HAMMAS -> Nusrath Afreen');
  }

  await mongoose.disconnect();
}
run();
`;

    await ssh.execCommand(`echo "${Buffer.from(script).toString('base64')}" | base64 -d > ${remoteBase}/backend/test_map_4.js`);
    const res = await ssh.execCommand(`${setupEnv} && node test_map_4.js`, { cwd: `${remoteBase}/backend` });
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
    await ssh.execCommand(`rm -f ${remoteBase}/backend/test_map_4.js`);
  } finally {
    ssh.dispose();
  }
}

mapCandidates();
