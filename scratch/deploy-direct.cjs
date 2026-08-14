const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function run() {
  try {
    console.log('Connecting to Hostinger server...');
    await ssh.connect({
      host: 'ats.whitehorsemanpower.in',
      username: 'whitehorsemanpower',
      password: 'Whitehorse@2026blr',
      port: 22,
      readyTimeout: 30000
    });
    console.log('Connected!');

    const remoteBase = '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in';
    const localBase = path.join(__dirname, '..');

    console.log('1. Uploading AdminDashboard.tsx directly to server...');
    await ssh.putFile(
      path.join(localBase, 'src/app/pages/admin/AdminDashboard.tsx'),
      `${remoteBase}/src/app/pages/admin/AdminDashboard.tsx`
    );

    console.log('2. Uploading dashboard.controller.js directly to server...');
    await ssh.putFile(
      path.join(localBase, 'backend/src/controllers/dashboard.controller.js'),
      `${remoteBase}/backend/src/controllers/dashboard.controller.js`
    );

    console.log('2b. Uploading TLDashboard.tsx directly to server...');
    await ssh.putFile(
      path.join(localBase, 'src/app/pages/tl/TLDashboard.tsx'),
      `${remoteBase}/src/app/pages/tl/TLDashboard.tsx`
    );

    console.log('2c. Uploading ReportsPage.tsx directly to server...');
    await ssh.putFile(
      path.join(localBase, 'src/app/pages/manager/ReportsPage.tsx'),
      `${remoteBase}/src/app/pages/manager/ReportsPage.tsx`
    );

    console.log('2d. Uploading candidate.controller.js directly to server...');
    await ssh.putFile(
      path.join(localBase, 'backend/src/controllers/candidate.controller.js'),
      `${remoteBase}/backend/src/controllers/candidate.controller.js`
    );

    console.log('2e. Uploading AddCandidatePage.tsx directly to server...');
    await ssh.putFile(
      path.join(localBase, 'src/app/pages/recruiter/AddCandidatePage.tsx'),
      `${remoteBase}/src/app/pages/recruiter/AddCandidatePage.tsx`
    );

    console.log('2f. Uploading CandidateProfilePage.tsx directly to server...');
    await ssh.putFile(
      path.join(localBase, 'src/app/pages/recruiter/CandidateProfilePage.tsx'),
      `${remoteBase}/src/app/pages/recruiter/CandidateProfilePage.tsx`
    );

    console.log('2g. Uploading ResumeListPage.tsx directly to server...');
    await ssh.putFile(
      path.join(localBase, 'src/app/pages/recruiter/ResumeListPage.tsx'),
      `${remoteBase}/src/app/pages/recruiter/ResumeListPage.tsx`
    );

    console.log('2h. Uploading AttendancePage.tsx directly to server...');
    await ssh.putFile(
      path.join(localBase, 'src/app/pages/admin/AttendancePage.tsx'),
      `${remoteBase}/src/app/pages/admin/AttendancePage.tsx`
    );

    console.log('2i. Uploading attendance.controller.js directly to server...');
    await ssh.putFile(
      path.join(localBase, 'backend/src/controllers/attendance.controller.js'),
      `${remoteBase}/backend/src/controllers/attendance.controller.js`
    );

    console.log('2j. Uploading SlicerFilteredDataView.tsx directly to server...');
    await ssh.putFile(
      path.join(localBase, 'src/app/components/SlicerFilteredDataView.tsx'),
      `${remoteBase}/src/app/components/SlicerFilteredDataView.tsx`
    );

    const setupEnv = 'export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v20.20.2/bin:/home/whitehorsemanpower/.npm/_npx/5f7878ce38f1eb13/node_modules/pm2/bin';

    console.log('3. Building frontend on server...');
    let result = await ssh.execCommand(`${setupEnv} && npm run build`, { cwd: remoteBase });
    console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);

    console.log('4. Restarting backend PM2 process on server...');
    result = await ssh.execCommand(`${setupEnv} && pm2 restart ats-backend`, { cwd: remoteBase });
    console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);

    console.log('Direct server deployment completed successfully!');
  } catch (e) {
    console.error('Direct Deployment Error:', e);
  } finally {
    ssh.dispose();
  }
}

run();
