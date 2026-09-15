const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function deploy() {
  try {
    console.log('1. Connecting to Hostinger production server (ats.whitehorsemanpower.in)...');
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
      { local: 'src/app/utils/useDraggableFloating.ts', remote: `${remoteBase}/src/app/utils/useDraggableFloating.ts` },
      { local: 'src/app/components/chat/FloatingChatWidget.tsx', remote: `${remoteBase}/src/app/components/chat/FloatingChatWidget.tsx` },
      { local: 'src/app/components/ui/ChatbotWidget.tsx', remote: `${remoteBase}/src/app/components/ui/ChatbotWidget.tsx` },
    ];

    console.log('\n2. Uploading modified frontend components...');
    for (const f of filesToUpload) {
      console.log(` -> Uploading ${f.local}`);
      await ssh.putFile(path.join(localBase, f.local), f.remote);
    }
    console.log('All files uploaded successfully.');

    console.log('\n3. Building frontend on remote server...');
    const buildRes = await ssh.execCommand(`${setupEnv} && npm run build`, { cwd: remoteBase });
    console.log(buildRes.stdout);
    if (buildRes.stderr && !buildRes.stdout.includes('built in')) {
      console.warn('Build stderr:', buildRes.stderr);
    }

    const findLatest = await ssh.execCommand('ls -t dist/assets/index-*.js | head -n 1', { cwd: remoteBase });
    const latestJs = findLatest.stdout.trim();
    if (latestJs) {
      console.log(`Copying fallback aliases from ${latestJs}...`);
      await ssh.execCommand(`cp ${latestJs} dist/assets/index-u4-EBceP.js`, { cwd: remoteBase });
      await ssh.execCommand(`cp ${latestJs} dist/assets/index-DlaNMFSS.js`, { cwd: remoteBase });
      await ssh.execCommand(`cp ${latestJs} dist/assets/index-C-142vQV.js`, { cwd: remoteBase });
    }

    console.log('\n4. Verifying live deployment files...');
    const verifyDist = await ssh.execCommand('ls -l dist/assets/index-*.js', { cwd: remoteBase });
    console.log(verifyDist.stdout);

    console.log('\nDeployment completed successfully!');
  } catch (err) {
    console.error('Deployment error:', err);
    process.exit(1);
  } finally {
    ssh.dispose();
  }
}

deploy();
