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

    console.log('\n2. Uploading WalkInDashboard.tsx...');
    await ssh.putFile(
      path.join(localBase, 'src/app/pages/walkin/WalkInDashboard.tsx'),
      `${remoteBase}/src/app/pages/walkin/WalkInDashboard.tsx`
    );
    console.log('WalkInDashboard.tsx uploaded successfully.');

    console.log('\n3. Building frontend on production server...');
    const buildRes = await ssh.execCommand(`${setupEnv} && npm run build`, { cwd: remoteBase });
    console.log(buildRes.stdout);
    if (buildRes.stderr && !buildRes.stdout.includes('built in')) {
      console.warn('Build output warning/stderr:', buildRes.stderr);
    }

    console.log('\n4. Syncing asset bundles...');
    const findLatest = await ssh.execCommand('ls -t dist/assets/index-*.js | head -n 1', { cwd: remoteBase });
    const latestJs = findLatest.stdout.trim();
    if (latestJs) {
      console.log(`Latest bundle: ${latestJs}`);
      await ssh.execCommand(`cp ${latestJs} dist/assets/index-u4-EBceP.js`, { cwd: remoteBase });
      await ssh.execCommand(`cp ${latestJs} dist/assets/index-DlaNMFSS.js`, { cwd: remoteBase });
    }

    console.log('\n5. Checking server health...');
    const health = await ssh.execCommand('curl -s http://localhost:5001/api/health');
    console.log('Health:', health.stdout);

    console.log('\n========================================================');
    console.log('  WALK-IN DASHBOARD (ADD CANDIDATE) DEPLOYED LIVE!       ');
    console.log('========================================================');

  } catch (err) {
    console.error('Deployment error:', err);
    process.exit(1);
  } finally {
    ssh.dispose();
  }
}

deploy();
