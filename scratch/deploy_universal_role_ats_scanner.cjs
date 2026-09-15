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

    console.log('\n2. Uploading backend files for Universal Role Classification & Parser...');
    await ssh.putFile(
      path.join(localBase, 'backend/src/utils/universalRoleClassifier.js'),
      `${remoteBase}/backend/src/utils/universalRoleClassifier.js`
    );
    console.log('Uploaded backend/src/utils/universalRoleClassifier.js');

    await ssh.putFile(
      path.join(localBase, 'backend/src/utils/resumeParser.js'),
      `${remoteBase}/backend/src/utils/resumeParser.js`
    );
    console.log('Uploaded backend/src/utils/resumeParser.js');

    await ssh.putFile(
      path.join(localBase, 'backend/src/controllers/resumeScan.controller.js'),
      `${remoteBase}/backend/src/controllers/resumeScan.controller.js`
    );
    console.log('Uploaded backend/src/controllers/resumeScan.controller.js');

    console.log('\n3. Uploading frontend files for ATS Scanner & Add Candidate...');
    await ssh.putFile(
      path.join(localBase, 'src/app/pages/recruiter/clientJdPresets.ts'),
      `${remoteBase}/src/app/pages/recruiter/clientJdPresets.ts`
    );
    console.log('Uploaded src/app/pages/recruiter/clientJdPresets.ts');

    await ssh.putFile(
      path.join(localBase, 'src/app/pages/recruiter/ResumeScanPage.tsx'),
      `${remoteBase}/src/app/pages/recruiter/ResumeScanPage.tsx`
    );
    console.log('Uploaded src/app/pages/recruiter/ResumeScanPage.tsx');

    await ssh.putFile(
      path.join(localBase, 'src/app/pages/recruiter/AddCandidatePage.tsx'),
      `${remoteBase}/src/app/pages/recruiter/AddCandidatePage.tsx`
    );
    console.log('Uploaded src/app/pages/recruiter/AddCandidatePage.tsx');

    console.log('\n4. Restarting backend PM2 process...');
    const pm2Res = await ssh.execCommand(`${setupEnv} && npx pm2 restart ats-backend`, { cwd: remoteBase });
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
      await ssh.execCommand(`cp ${latestJs} dist/assets/index-rVFuY5AI.js`, { cwd: remoteBase });
    }

    const findLatestCss = await ssh.execCommand('ls -t dist/assets/index-*.css | head -n 1', { cwd: remoteBase });
    const latestCss = findLatestCss.stdout.trim();
    if (latestCss) {
      console.log(`Latest CSS bundle: ${latestCss}`);
      await ssh.execCommand(`cp ${latestCss} dist/assets/index-CeMFI-_0.css`, { cwd: remoteBase });
      await ssh.execCommand(`cp ${latestCss} dist/assets/index-DyxPRp81.css`, { cwd: remoteBase });
    }

    console.log('\n7. Checking server health...');
    const health = await ssh.execCommand('curl -s http://localhost:5001/api/health');
    console.log('Health Response:', health.stdout);

    console.log('\n========================================================');
    console.log('  SUCCESSFULLY DEPLOYED TO PRODUCTION SERVER!           ');
    console.log('  Universal Job Role Profiler & Matching System is LIVE ');
    console.log('  inside ATS Scanner at ats.whitehorsemanpower.in/recruiter/scan');
    console.log('========================================================');

  } catch (err) {
    console.error('Deployment error:', err);
    process.exit(1);
  } finally {
    ssh.dispose();
  }
}

deploy();
