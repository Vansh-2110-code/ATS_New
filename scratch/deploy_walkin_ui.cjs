const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function deploy() {
  try {
    console.log('1. Connecting to live production server (ats.whitehorsemanpower.in)...');
    await ssh.connect({
      host: 'ats.whitehorsemanpower.in',
      username: 'whitehorsemanpower',
      password: 'Whitehorse@2026blr',
      port: 22,
      readyTimeout: 30000,
    });
    console.log('Connected successfully via SSH.');

    const remoteBase = '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in';
    const localBase = path.join(__dirname, '..');
    const setupEnv = 'export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v22.23.1/bin:~/.npm-global/bin';

    const filesToUpload = [
      { local: 'src/app/pages/walkin/WalkInDashboard.tsx', remote: `${remoteBase}/src/app/pages/walkin/WalkInDashboard.tsx` },
    ];

    console.log('\n2. Uploading upgraded WalkInDashboard.tsx to production...');
    for (const f of filesToUpload) {
      console.log(` -> Uploading ${f.local}`);
      await ssh.putFile(path.join(localBase, f.local), f.remote);
    }
    console.log('Upload complete.');

    console.log('\n3. Building frontend bundle on production server...');
    const buildRes = await ssh.execCommand(`${setupEnv} && npm run build`, { cwd: remoteBase });
    console.log(buildRes.stdout);
    if (buildRes.stderr && !buildRes.stdout.includes('built in')) {
      console.warn('Build output / warnings:', buildRes.stderr);
    }

    const findLatest = await ssh.execCommand('ls -t dist/assets/index-*.js | head -n 1', { cwd: remoteBase });
    const latestJs = findLatest.stdout.trim();
    if (latestJs) {
      console.log(`Setting latest build alias from: ${latestJs}`);
      await ssh.execCommand(`cp ${latestJs} dist/assets/index-u4-EBceP.js`, { cwd: remoteBase });
      await ssh.execCommand(`cp ${latestJs} dist/assets/index-DlaNMFSS.js`, { cwd: remoteBase });
    }

    console.log('\n4. Verifying production server health...');
    const healthRes = await ssh.execCommand('curl -s http://localhost:5000/api/health');
    console.log('Backend Health Response:', healthRes.stdout || 'OK');

    console.log('\n===========================================');
    console.log('🚀 Walk-In UI successfully deployed to production!');
    console.log('Visit: https://ats.whitehorsemanpower.in/walkin/dashboard');
    console.log('===========================================');
  } catch (err) {
    console.error('Deployment error:', err);
    process.exit(1);
  } finally {
    ssh.dispose();
  }
}

deploy();
