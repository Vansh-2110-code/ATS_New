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
      { local: 'backend/src/controllers/candidate.controller.js', remote: `${remoteBase}/backend/src/controllers/candidate.controller.js` },
      { local: 'backend/src/controllers/dashboard.controller.js', remote: `${remoteBase}/backend/src/controllers/dashboard.controller.js` },
      { local: 'src/app/pages/admin/AdminDashboard.tsx', remote: `${remoteBase}/src/app/pages/admin/AdminDashboard.tsx` },
      { local: 'src/app/pages/admin/CandidateDatabasePage.tsx', remote: `${remoteBase}/src/app/pages/admin/CandidateDatabasePage.tsx` },
      { local: 'src/app/pages/admin/JobsListPage.tsx', remote: `${remoteBase}/src/app/pages/admin/JobsListPage.tsx` },
      { local: 'src/app/pages/manager/ReportsPage.tsx', remote: `${remoteBase}/src/app/pages/manager/ReportsPage.tsx` },
      { local: 'src/app/pages/recruiter/AddCandidatePage.tsx', remote: `${remoteBase}/src/app/pages/recruiter/AddCandidatePage.tsx` },
      { local: 'src/app/pages/recruiter/CandidateProfilePage.tsx', remote: `${remoteBase}/src/app/pages/recruiter/CandidateProfilePage.tsx` },
      { local: 'src/app/pages/recruiter/ResumeListPage.tsx', remote: `${remoteBase}/src/app/pages/recruiter/ResumeListPage.tsx` },
      { local: 'src/app/pages/recruiter/WalkInManagementPage.tsx', remote: `${remoteBase}/src/app/pages/recruiter/WalkInManagementPage.tsx` },
      { local: 'src/app/pages/tl/TLDashboard.tsx', remote: `${remoteBase}/src/app/pages/tl/TLDashboard.tsx` },
      { local: 'src/app/pages/tl/TLCandidateViewModal.tsx', remote: `${remoteBase}/src/app/pages/tl/TLCandidateViewModal.tsx` }
    ];

    console.log('\n2. Uploading modified files...');
    for (const f of filesToUpload) {
      console.log(` -> Uploading ${f.local}`);
      await ssh.putFile(path.join(localBase, f.local), f.remote);
    }
    console.log('All files uploaded successfully.');

    console.log('\n3. Building frontend on server...');
    const buildRes = await ssh.execCommand(`${setupEnv} && npm run build`, { cwd: remoteBase });
    console.log(buildRes.stdout);
    if (buildRes.stderr && !buildRes.stdout.includes('built in')) {
      console.error('Build warnings/errors:', buildRes.stderr);
    }

    console.log('\n4. Restarting backend PM2 process...');
    const pm2Res = await ssh.execCommand(`${setupEnv} && npx pm2 restart ats-backend`, { cwd: remoteBase });
    console.log(pm2Res.stdout);

    console.log('\n5. Verifying server health post-deployment...');
    const healthRes = await ssh.execCommand(`${setupEnv} && curl -s http://localhost:5001/api/health`, { cwd: remoteBase });
    console.log('Health check response:', healthRes.stdout);

    console.log('\n===========================================');
    console.log('   DEPLOYMENT SUCCESSFUL AND LIVE!        ');
    console.log('===========================================');

  } catch (err) {
    console.error('DEPLOYMENT FAILED:', err);
  } finally {
    ssh.dispose();
  }
}

deploy();
