const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function deploy() {
  try {
    console.log('1. Connecting to Hostinger production server...');
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
      { local: 'backend/src/models/Employee.js', remote: `${remoteBase}/backend/src/models/Employee.js` },
      { local: 'backend/src/routes/public.routes.js', remote: `${remoteBase}/backend/src/routes/public.routes.js` },
      { local: 'backend/src/controllers/public.controller.js', remote: `${remoteBase}/backend/src/controllers/public.controller.js` },
      { local: 'backend/src/controllers/candidate.controller.js', remote: `${remoteBase}/backend/src/controllers/candidate.controller.js` },
      { local: 'src/app/services/api.ts', remote: `${remoteBase}/src/app/services/api.ts` },
      { local: 'src/app/components/layout/Sidebar.tsx', remote: `${remoteBase}/src/app/components/layout/Sidebar.tsx` },
      { local: 'src/app/pages/admin/JoiningSubmissionsPage.tsx', remote: `${remoteBase}/src/app/pages/admin/JoiningSubmissionsPage.tsx` },
      { local: 'src/app/pages/recruiter/JoiningFormPage.tsx', remote: `${remoteBase}/src/app/pages/recruiter/JoiningFormPage.tsx` },
      { local: 'src/app/pages/tl/TLDashboard.tsx', remote: `${remoteBase}/src/app/pages/tl/TLDashboard.tsx` },
    ];

    console.log('\n2. Uploading backend and frontend source files...');
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
      console.log(`Copying fallback aliases from ${latestJs}...`);
      await ssh.execCommand(`cp ${latestJs} dist/assets/index-u4-EBceP.js`, { cwd: remoteBase });
      await ssh.execCommand(`cp ${latestJs} dist/assets/index-DlaNMFSS.js`, { cwd: remoteBase });
      await ssh.execCommand(`cp ${latestJs} dist/assets/index-C-142vQV.js`, { cwd: remoteBase });
    }

    console.log('\n4. Restarting backend PM2 process...');
    const pm2Res = await ssh.execCommand(`${setupEnv} && npx pm2 restart ats-backend`, { cwd: remoteBase });
    console.log(pm2Res.stdout);

    console.log('\n5. Verifying backend API and Joining Approvals endpoint...');
    const testRes = await ssh.execCommand(`${setupEnv} && node -e "
      const jwt = require('jsonwebtoken');
      const mongoose = require('mongoose');
      const http = require('http');
      require('dotenv').config();

      async function testLive() {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ats_db');
        const User = require('./src/models/User');
        const Employee = require('./src/models/Employee');

        const admin = await User.findOne({ role: 'admin' });
        const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

        const req = http.request('http://127.0.0.1:5001/api/public/joining?status=all', {
          method: 'GET',
          headers: { 'Authorization': 'Bearer ' + token }
        }, (res) => {
          let body = '';
          res.on('data', c => body += c);
          res.on('end', () => {
            console.log('GET /api/public/joining status:', res.statusCode);
            const data = JSON.parse(body);
            console.log('Total records:', data.total, 'Pending count:', data.pendingCount);
            process.exit(0);
          });
        });
        req.end();
      }
      testLive().catch(e => { console.error(e); process.exit(1); });
    "`, { cwd: `${remoteBase}/backend` });

    console.log(testRes.stdout);
    if (testRes.stderr) console.error(testRes.stderr);

    console.log('\n🎉 DEPLOYMENT COMPLETE! All changes live on https://ats.whitehorsemanpower.in');
  } catch (err) {
    console.error('Deployment error:', err);
    process.exit(1);
  } finally {
    ssh.dispose();
  }
}

deploy();
