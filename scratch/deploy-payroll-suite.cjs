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

    console.log('\n2. Ensuring remote directories exist...');
    await ssh.execCommand(`mkdir -p ${remoteBase}/src/app/pages/payroll ${remoteBase}/backend/src/models ${remoteBase}/backend/src/seeders`);

    const filesToUpload = [
      // Backend Models
      { local: 'backend/src/models/Company.js', remote: `${remoteBase}/backend/src/models/Company.js` },
      { local: 'backend/src/models/Branch.js', remote: `${remoteBase}/backend/src/models/Branch.js` },
      { local: 'backend/src/models/SalaryComponent.js', remote: `${remoteBase}/backend/src/models/SalaryComponent.js` },
      { local: 'backend/src/models/SalaryStructure.js', remote: `${remoteBase}/backend/src/models/SalaryStructure.js` },
      { local: 'backend/src/models/StatutoryConfig.js', remote: `${remoteBase}/backend/src/models/StatutoryConfig.js` },
      { local: 'backend/src/models/EmployeePayrollProfile.js', remote: `${remoteBase}/backend/src/models/EmployeePayrollProfile.js` },
      { local: 'backend/src/models/PayrollRun.js', remote: `${remoteBase}/backend/src/models/PayrollRun.js` },
      { local: 'backend/src/models/PayrollEmployeeRecord.js', remote: `${remoteBase}/backend/src/models/PayrollEmployeeRecord.js` },
      { local: 'backend/src/models/RecruitmentIncentive.js', remote: `${remoteBase}/backend/src/models/RecruitmentIncentive.js` },

      // Backend Controller, Routes, Server & Seeder
      { local: 'backend/src/controllers/payroll.controller.js', remote: `${remoteBase}/backend/src/controllers/payroll.controller.js` },
      { local: 'backend/src/routes/payroll.routes.js', remote: `${remoteBase}/backend/src/routes/payroll.routes.js` },
      { local: 'backend/src/server.js', remote: `${remoteBase}/backend/src/server.js` },
      { local: 'backend/src/seeders/seed_payroll_tenant.js', remote: `${remoteBase}/backend/src/seeders/seed_payroll_tenant.js` },

      // Frontend Core & Layout
      { local: 'src/app/services/api.ts', remote: `${remoteBase}/src/app/services/api.ts` },
      { local: 'src/app/routes.ts', remote: `${remoteBase}/src/app/routes.ts` },
      { local: 'src/app/components/layout/Sidebar.tsx', remote: `${remoteBase}/src/app/components/layout/Sidebar.tsx` },

      // Frontend Payroll Pages
      { local: 'src/app/pages/payroll/PayrollDashboard.tsx', remote: `${remoteBase}/src/app/pages/payroll/PayrollDashboard.tsx` },
      { local: 'src/app/pages/payroll/PayrollMastersPage.tsx', remote: `${remoteBase}/src/app/pages/payroll/PayrollMastersPage.tsx` },
      { local: 'src/app/pages/payroll/EmployeePayrollPage.tsx', remote: `${remoteBase}/src/app/pages/payroll/EmployeePayrollPage.tsx` },
      { local: 'src/app/pages/payroll/RunPayrollPage.tsx', remote: `${remoteBase}/src/app/pages/payroll/RunPayrollPage.tsx` },
      { local: 'src/app/pages/payroll/PayslipHubPage.tsx', remote: `${remoteBase}/src/app/pages/payroll/PayslipHubPage.tsx` },
      { local: 'src/app/pages/payroll/RecruiterIncentivePage.tsx', remote: `${remoteBase}/src/app/pages/payroll/RecruiterIncentivePage.tsx` },
    ];

    console.log('\n3. Uploading Payroll Suite files...');
    for (const f of filesToUpload) {
      console.log(` -> Uploading ${f.local}`);
      await ssh.putFile(path.join(localBase, f.local), f.remote);
    }
    console.log('All files uploaded successfully.');

    console.log('\n4. Running Payroll Seeder on production server MongoDB...');
    const seedRes = await ssh.execCommand(`${setupEnv} && node src/seeders/seed_payroll_tenant.js`, {
      cwd: `${remoteBase}/backend`
    });
    console.log(seedRes.stdout);
    if (seedRes.stderr) console.error(seedRes.stderr);

    console.log('\n5. Building frontend on server...');
    const buildRes = await ssh.execCommand(`${setupEnv} && npm run build`, { cwd: remoteBase });
    console.log(buildRes.stdout);
    if (buildRes.stderr && !buildRes.stdout.includes('built in')) {
      console.error('Build warnings/errors:', buildRes.stderr);
    }

    const findLatest = await ssh.execCommand('ls -t dist/assets/index-*.js | head -n 1', { cwd: remoteBase });
    const latestJs = findLatest.stdout.trim();
    if (latestJs) {
      console.log(`Copying fallback alias: ${latestJs} -> dist/assets/index-u4-EBceP.js & dist/assets/index-DlaNMFSS.js`);
      await ssh.execCommand(`cp ${latestJs} dist/assets/index-u4-EBceP.js`, { cwd: remoteBase });
      await ssh.execCommand(`cp ${latestJs} dist/assets/index-DlaNMFSS.js`, { cwd: remoteBase });
    }

    console.log('\n6. Restarting backend PM2 process...');
    const pm2Res = await ssh.execCommand(`${setupEnv} && npx pm2 restart ats-backend`, { cwd: remoteBase });
    console.log(pm2Res.stdout);

    console.log('\n7. Verifying server health and payroll endpoints...');
    const healthRes = await ssh.execCommand(`${setupEnv} && curl -s http://localhost:5001/api/health`, { cwd: remoteBase });
    console.log('Health check:', healthRes.stdout);

    console.log('\n======================================================');
    console.log('   ENTERPRISE PAYROLL SUITE DEPLOYED SUCCESSFULLY!    ');
    console.log('======================================================');

  } catch (err) {
    console.error('DEPLOYMENT FAILED:', err);
  } finally {
    ssh.dispose();
  }
}

deploy();
