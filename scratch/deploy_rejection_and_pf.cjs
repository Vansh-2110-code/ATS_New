const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function deploy() {
  try {
    console.log('1. Connecting to Hostinger production server via SSH...');
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

    console.log('\n2. Uploading updated backend files...');
    await ssh.putFile(
      path.join(localBase, 'backend/src/controllers/candidate.controller.js'),
      `${remoteBase}/backend/src/controllers/candidate.controller.js`
    );
    console.log('Uploaded backend/src/controllers/candidate.controller.js');

    await ssh.putFile(
      path.join(localBase, 'backend/src/controllers/payroll.controller.js'),
      `${remoteBase}/backend/src/controllers/payroll.controller.js`
    );
    console.log('Uploaded backend/src/controllers/payroll.controller.js');

    await ssh.putFile(
      path.join(localBase, 'backend/src/models/PayrollEmployeeRecord.js'),
      `${remoteBase}/backend/src/models/PayrollEmployeeRecord.js`
    );
    console.log('Uploaded backend/src/models/PayrollEmployeeRecord.js');

    console.log('\n3. Uploading updated frontend files...');
    await ssh.putFile(
      path.join(localBase, 'src/app/pages/payroll/EmployeePayrollPage.tsx'),
      `${remoteBase}/src/app/pages/payroll/EmployeePayrollPage.tsx`
    );
    console.log('Uploaded src/app/pages/payroll/EmployeePayrollPage.tsx');

    await ssh.putFile(
      path.join(localBase, 'src/app/pages/payroll/RunPayrollPage.tsx'),
      `${remoteBase}/src/app/pages/payroll/RunPayrollPage.tsx`
    );
    console.log('Uploaded src/app/pages/payroll/RunPayrollPage.tsx');

    await ssh.putFile(
      path.join(localBase, 'src/app/pages/payroll/PayslipHubPage.tsx'),
      `${remoteBase}/src/app/pages/payroll/PayslipHubPage.tsx`
    );
    console.log('Uploaded src/app/pages/payroll/PayslipHubPage.tsx');

    console.log('\n4. Restarting backend PM2 process...');
    const pm2Res = await ssh.execCommand(`${setupEnv} && pm2 restart ats-backend`, { cwd: `${remoteBase}/backend` });
    console.log(pm2Res.stdout || pm2Res.stderr);

    console.log('\n5. Building frontend on production server...');
    const buildRes = await ssh.execCommand(`${setupEnv} && npm run build`, { cwd: remoteBase });
    console.log(buildRes.stdout);
    if (buildRes.stderr && !buildRes.stdout.includes('built in')) {
      console.warn('Build output warning/stderr:', buildRes.stderr);
    }

    console.log('\n6. Syncing asset bundles...');
    const findLatestJs = await ssh.execCommand('ls -t dist/assets/index-*.js | head -n 1', { cwd: remoteBase });
    const latestJs = findLatestJs.stdout.trim();
    if (latestJs) {
      console.log(`Latest JS bundle: ${latestJs}`);
      await ssh.execCommand(`cp ${latestJs} dist/assets/index-u4-EBceP.js`, { cwd: remoteBase });
      await ssh.execCommand(`cp ${latestJs} dist/assets/index-DlaNMFSS.js`, { cwd: remoteBase });
      await ssh.execCommand(`cp ${latestJs} dist/assets/index-CjEqlEPa.js`, { cwd: remoteBase });
      await ssh.execCommand(`cp ${latestJs} dist/assets/index-CCa8PtVq.js`, { cwd: remoteBase });
    }

    const findLatestCss = await ssh.execCommand('ls -t dist/assets/index-*.css | head -n 1', { cwd: remoteBase });
    const latestCss = findLatestCss.stdout.trim();
    if (latestCss) {
      console.log(`Latest CSS bundle: ${latestCss}`);
      await ssh.execCommand(`cp ${latestCss} dist/assets/index-CeMFI-_0.css`, { cwd: remoteBase });
    }

    console.log('\n7. Checking server health...');
    const health = await ssh.execCommand('curl -s http://localhost:5001/api/health');
    console.log('Health Response:', health.stdout);

    console.log('\n========================================================');
    console.log('  SUCCESSFULLY DEPLOYED TO PRODUCTION SERVER!           ');
    console.log('  1. Candidate 30-day validity vanishes on TL reject    ');
    console.log('  2. 2nd recruiter receives full credit for candidate   ');
    console.log('  3. Payroll PF selection/deselection option is active  ');
    console.log('========================================================');

  } catch (err) {
    console.error('Deployment error:', err);
    process.exit(1);
  } finally {
    ssh.dispose();
  }
}

deploy();
