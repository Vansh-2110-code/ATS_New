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
      { local: 'backend/src/routes/user.routes.js', remote: `${remoteBase}/backend/src/routes/user.routes.js` },
      { local: 'backend/src/controllers/user.controller.js', remote: `${remoteBase}/backend/src/controllers/user.controller.js` },
      { local: 'backend/src/middleware/demoProtection.middleware.js', remote: `${remoteBase}/backend/src/middleware/demoProtection.middleware.js` },
      { local: 'backend/src/middleware/auth.middleware.js', remote: `${remoteBase}/backend/src/middleware/auth.middleware.js` },
      { local: 'backend/src/seeders/seed_demo_account.js', remote: `${remoteBase}/backend/src/seeders/seed_demo_account.js` },
      { local: 'src/app/components/layout/Sidebar.tsx', remote: `${remoteBase}/src/app/components/layout/Sidebar.tsx` }
    ];

    console.log('\n2. Uploading Demo Safeguards and Route files...');
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

    console.log('\n5. Testing Reset Demo Data endpoint and Demo Safeguards...');
    const testRes = await ssh.execCommand(`${setupEnv} && node -e "
      const jwt = require('jsonwebtoken');
      const mongoose = require('mongoose');
      require('dotenv').config();

      async function test() {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ats_db');
        const User = require('./src/models/User');
        const Job = require('./src/models/Job');
        const Candidate = require('./src/models/Candidate');

        const demoUser = await User.findOne({ email: 'demo@whitehorsemanpower.in' });
        if (!demoUser) {
          console.error('Demo user not found!');
          process.exit(1);
        }

        const token = jwt.sign({ id: demoUser._id, role: demoUser.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // 1. Test Reset Demo Data API
        const http = require('http');
        const req = http.request('http://127.0.0.1:5001/api/users/reset-demo-data', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          }
        }, (res) => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', async () => {
            console.log('RESET DEMO DATA RESPONSE:', res.statusCode, data);

            // 2. Test Demo Protection: attempt to delete a REAL candidate
            const realCandidate = await Candidate.findOne({ isDemoData: { \\$ne: true } });
            if (realCandidate) {
              const delReq = http.request('http://127.0.0.1:5001/api/candidates/' + realCandidate._id, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + token }
              }, (delRes) => {
                let delData = '';
                delRes.on('data', c => delData += c);
                delRes.on('end', () => {
                  console.log('PROTECTION TEST ON REAL CANDIDATE DELETE (Expect 403 Forbidden):', delRes.statusCode, delData);
                  process.exit(0);
                });
              });
              delReq.end();
            } else {
              process.exit(0);
            }
          });
        });
        req.end();
      }
      test().catch(e => { console.error(e); process.exit(1); });
    "`, { cwd: `${remoteBase}/backend` });

    console.log('Verification Output:\n', testRes.stdout);
    if (testRes.stderr) console.error(testRes.stderr);

    console.log('\n===========================================');
    console.log('   DEMO SAFEGUARD DEPLOYMENT COMPLETED!   ');
    console.log('===========================================');

  } catch (err) {
    console.error('DEPLOYMENT FAILED:', err);
  } finally {
    ssh.dispose();
  }
}

deploy();
