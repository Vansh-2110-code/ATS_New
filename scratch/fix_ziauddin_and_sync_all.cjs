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

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI);

  // 1. Specifically fix Ziauddin
  await Candidate.updateOne(
    { phone: '7842483415' },
    {
      $set: {
        joiningSalary: '400000',
        offeredCTC: 400000,
        placementPercentage: 8.33,
        revenueGenerated: 33320,
        'offerDetails.joiningSalary': '400000',
        'offerDetails.offeredCTC': 400000,
        'offerDetails.placementPercentage': 8.33,
        'offerDetails.revenueGenerated': 33320
      }
    }
  );

  const zia = await Candidate.findOne({ phone: '7842483415' }).lean();
  console.log('Fixed Ziauddin:', {
    name: zia.name,
    phone: zia.phone,
    joiningSalary: zia.joiningSalary,
    offeredCTC: zia.offeredCTC,
    placementPercentage: zia.placementPercentage,
    revenueGenerated: zia.revenueGenerated,
    offerDetails: zia.offerDetails
  });

  // 2. Sync all other Joined candidates where offerDetails salary was updated
  const joinedCandidates = await Candidate.find({ status: 'Joined' }).lean();
  let syncCount = 0;
  for (const c of joinedCandidates) {
    const s1 = parseInt(String(c.offerDetails?.joiningSalary || '').replace(/\\D/g, ''), 10) || 0;
    const s2 = parseInt(String(c.offerDetails?.offeredCTC || '').replace(/\\D/g, ''), 10) || 0;
    const s3 = parseInt(String(c.joiningSalary || '').replace(/\\D/g, ''), 10) || 0;
    const s4 = parseInt(String(c.offeredCTC || '').replace(/\\D/g, ''), 10) || 0;

    // Effective CTC is the highest non-zero salary (e.g. 400000 instead of old 65000 or 0)
    const validSalaries = [s1, s2, s3, s4].filter(s => s >= 10000);
    if (validSalaries.length > 0) {
      // If offerDetails has a higher/newer salary
      const bestSalary = (s1 >= 10000) ? s1 : ((s2 >= 10000) ? s2 : Math.max(...validSalaries));
      const pct = parseFloat(c.placementPercentage) || parseFloat(c.offerDetails?.placementPercentage) || 8.33;
      const rev = Math.round(bestSalary * (pct / 100));

      if (c.joiningSalary !== String(bestSalary) || c.offeredCTC !== bestSalary || c.revenueGenerated !== rev) {
        await Candidate.updateOne(
          { _id: c._id },
          {
            $set: {
              joiningSalary: String(bestSalary),
              offeredCTC: bestSalary,
              placementPercentage: pct,
              revenueGenerated: rev,
              'offerDetails.joiningSalary': String(bestSalary),
              'offerDetails.offeredCTC': bestSalary,
              'offerDetails.placementPercentage': pct,
              'offerDetails.revenueGenerated': rev
            }
          }
        );
        syncCount++;
        console.log('Synced candidate:', c.name, '-> CTC:', bestSalary, 'Revenue:', rev);
      }
    }
  }

  console.log('Total Joined Candidates Synced:', syncCount);

  await mongoose.disconnect();
}
fix();
`;

    await ssh.execCommand(`echo "${Buffer.from(script).toString('base64')}" | base64 -d > ${remoteBase}/backend/test_fix_sync.js`);
    const res = await ssh.execCommand(`${setupEnv} && node test_fix_sync.js`, { cwd: `${remoteBase}/backend` });
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
    await ssh.execCommand(`rm -f ${remoteBase}/backend/test_fix_sync.js`);
  } finally {
    ssh.dispose();
  }
}

run();
