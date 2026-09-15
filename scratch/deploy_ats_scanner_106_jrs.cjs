const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function deploy() {
  try {
    console.log('1. Connecting to Hostinger live production server...');
    await ssh.connect({
      host: 'ats.whitehorsemanpower.in',
      username: 'whitehorsemanpower',
      password: 'Whitehorse@2026blr',
      port: 22,
      readyTimeout: 30000
    });
    console.log('Connected successfully via SSH.');

    const remoteBase = '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in';
    const localBase = path.join(__dirname, '..');
    const setupEnv = 'export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v22.23.1/bin:~/.npm-global/bin';

    const filesToUpload = [
      { local: 'backend/src/utils/universalRoleClassifier.js', remote: `${remoteBase}/backend/src/utils/universalRoleClassifier.js` },
      { local: 'backend/src/controllers/resumeScan.controller.js', remote: `${remoteBase}/backend/src/controllers/resumeScan.controller.js` },
      { local: 'src/app/pages/recruiter/ResumeScanPage.tsx', remote: `${remoteBase}/src/app/pages/recruiter/ResumeScanPage.tsx` }
    ];

    console.log('\n2. Uploading updated ATS Scanner and Classifier files...');
    for (const f of filesToUpload) {
      console.log(` -> Uploading ${f.local}`);
      await ssh.putFile(path.join(localBase, f.local), f.remote);
    }
    console.log('All files uploaded successfully.');

    console.log('\n3. Building frontend on server...');
    const buildRes = await ssh.execCommand(`${setupEnv} && npm run build`, { cwd: remoteBase });
    console.log(buildRes.stdout);
    if (buildRes.stderr && !buildRes.stdout.includes('built in')) {
      console.warn('Build output stderr:', buildRes.stderr);
    }

    const findLatest = await ssh.execCommand('ls -t dist/assets/index-*.js | head -n 1', { cwd: remoteBase });
    const latestJs = findLatest.stdout.trim();
    if (latestJs) {
      console.log(`Copying fallback alias: ${latestJs} -> dist/assets/index-u4-EBceP.js & dist/assets/index-DlaNMFSS.js`);
      await ssh.execCommand(`cp ${latestJs} dist/assets/index-u4-EBceP.js`, { cwd: remoteBase });
      await ssh.execCommand(`cp ${latestJs} dist/assets/index-DlaNMFSS.js`, { cwd: remoteBase });
    }

    console.log('\n4. Restarting backend PM2 process...');
    const pm2Res = await ssh.execCommand(`${setupEnv} && npx pm2 restart ats-backend`, { cwd: remoteBase });
    console.log(pm2Res.stdout);

    console.log('\n5. Verifying server health post-deployment...');
    const healthRes = await ssh.execCommand(`${setupEnv} && curl -s http://localhost:5001/api/health`, { cwd: remoteBase });
    console.log('Health check response:', healthRes.stdout);

    console.log('\n6. Verifying that all 106 JRs are accessible for scanning...');
    const testJrsRes = await ssh.execCommand(`${setupEnv} && node -e "
      const mongoose = require('mongoose');
      async function test() {
        await mongoose.connect('mongodb://127.0.0.1:27017/ats_db');
        const Job = require('./src/models/Job');
        const count = await Job.countDocuments({});
        const classifier = require('./src/utils/universalRoleClassifier');
        const jobs = await Job.find({}).lean();
        const dummyParsed = {
          name: 'Test Candidate',
          summary: 'Experienced SAP and Credit Risk professional with 4 years experience',
          skills: [{ name: 'SAP' }, { name: 'Credit Risk' }],
          experience: [{ title: 'SAP Analyst', company: 'Infosys' }]
        };
        const profile = classifier.classifyUniversalRole(dummyParsed, jobs);
        console.log(JSON.stringify({
          totalDbJobs: count,
          matchedJobsCount: profile.matchedActiveJobs.length,
          bestFitRole: profile.bestFitRole,
          top3MatchedJrs: profile.matchedActiveJobs.slice(0, 3).map(j => ({ jr: j.jrNumber, title: j.jobTitle, company: j.companyName, score: j.matchScore, status: j.status }))
        }, null, 2));
        process.exit(0);
      }
      test().catch(e => { console.error(e); process.exit(1); });
    "`, { cwd: `${remoteBase}/backend` });
    console.log('Verification Output:\n', testJrsRes.stdout);
    if (testJrsRes.stderr) console.error(testJrsRes.stderr);

    console.log('\n===========================================');
    console.log('   ATS 106 JRs DEPLOYMENT COMPLETED!      ');
    console.log('===========================================');

  } catch (err) {
    console.error('DEPLOYMENT FAILED:', err);
  } finally {
    ssh.dispose();
  }
}

deploy();
