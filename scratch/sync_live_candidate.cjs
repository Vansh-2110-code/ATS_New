const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
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

      async function sync() {
        await mongoose.connect(process.env.MONGODB_URI);
        const cand = await Candidate.findOne({ phone: '6362962733' });
        if (cand) {
          cand.joiningSalary = '300000';
          cand.offeredCTC = 300000;
          cand.placementPercentage = 8.33;
          cand.revenueGenerated = 24990;
          if (!cand.offerDetails) cand.offerDetails = {};
          cand.offerDetails.joiningSalary = '300000';
          cand.offerDetails.offeredCTC = 300000;
          cand.offerDetails.placementPercentage = 8.33;
          cand.offerDetails.revenueGenerated = 24990;
          await cand.save();
          console.log('SYNCED CANDIDATE:', cand.name, cand.phone, cand.offeredCTC, cand.revenueGenerated);
        } else {
          console.log('Candidate not found');
        }
        await mongoose.disconnect();
      }
      sync();
    `;

    const res = await ssh.execCommand(`${setupEnv} && node -e "${script.replace(/\n/g, ' ')}"`, { cwd: `${remoteBase}/backend` });
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
  } finally {
    ssh.dispose();
  }
}

run();
