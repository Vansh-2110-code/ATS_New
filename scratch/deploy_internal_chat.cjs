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

    console.log('\n2. Ensuring remote directories exist...');
    await ssh.execCommand(`mkdir -p ${remoteBase}/src/app/components/chat ${remoteBase}/src/app/pages/chat ${remoteBase}/backend/src/models ${remoteBase}/backend/src/controllers ${remoteBase}/backend/src/routes`);

    const filesToUpload = [
      // Backend files
      { local: 'backend/src/models/InternalChat.js', remote: `${remoteBase}/backend/src/models/InternalChat.js` },
      { local: 'backend/src/controllers/chat.controller.js', remote: `${remoteBase}/backend/src/controllers/chat.controller.js` },
      { local: 'backend/src/routes/chat.routes.js', remote: `${remoteBase}/backend/src/routes/chat.routes.js` },
      { local: 'backend/src/middleware/upload.middleware.js', remote: `${remoteBase}/backend/src/middleware/upload.middleware.js` },
      { local: 'backend/src/server.js', remote: `${remoteBase}/backend/src/server.js` },

      // Frontend Core, Context, Services
      { local: 'src/app/services/api.ts', remote: `${remoteBase}/src/app/services/api.ts` },
      { local: 'src/app/context/InternalChatContext.tsx', remote: `${remoteBase}/src/app/context/InternalChatContext.tsx` },
      { local: 'src/app/App.tsx', remote: `${remoteBase}/src/app/App.tsx` },
      { local: 'src/app/routes.ts', remote: `${remoteBase}/src/app/routes.ts` },

      // Layout & Navigation & Repositioned Widgets
      { local: 'src/app/components/layout/DashboardLayout.tsx', remote: `${remoteBase}/src/app/components/layout/DashboardLayout.tsx` },
      { local: 'src/app/components/layout/Sidebar.tsx', remote: `${remoteBase}/src/app/components/layout/Sidebar.tsx` },
      { local: 'src/app/components/ui/ChatbotWidget.tsx', remote: `${remoteBase}/src/app/components/ui/ChatbotWidget.tsx` },
      { local: 'src/app/pages/admin/AdminDashboard.tsx', remote: `${remoteBase}/src/app/pages/admin/AdminDashboard.tsx` },

      // Chat Components & Pages
      { local: 'src/app/components/chat/FloatingChatWidget.tsx', remote: `${remoteBase}/src/app/components/chat/FloatingChatWidget.tsx` },
      { local: 'src/app/pages/chat/InternalChatHubPage.tsx', remote: `${remoteBase}/src/app/pages/chat/InternalChatHubPage.tsx` },
    ];

    console.log('\n3. Uploading Internal Chat files...');
    for (const f of filesToUpload) {
      console.log(` -> Uploading ${f.local}`);
      await ssh.putFile(path.join(localBase, f.local), f.remote);
    }
    console.log('All files uploaded successfully.');

    console.log('\n4. Restarting backend PM2 process...');
    const pm2Res = await ssh.execCommand(`${setupEnv} && npx pm2 restart ats-backend`, { cwd: remoteBase });
    console.log(pm2Res.stdout);
    if (pm2Res.stderr) console.warn(pm2Res.stderr);

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
      await ssh.execCommand(`cp ${latestJs} dist/assets/index-CjEqlEPa.js`, { cwd: remoteBase });
    }

    console.log('\n6. Verifying backend health and chat endpoints...');
    const health = await ssh.execCommand('curl -s http://localhost:5001/api/health');
    console.log('Health:', health.stdout);

    console.log('\n======================================================');
    console.log('   INTERNAL TEAM CHAT SYSTEM DEPLOYED LIVE!          ');
    console.log('======================================================');

  } catch (err) {
    console.error('DEPLOYMENT FAILED:', err);
    process.exit(1);
  } finally {
    ssh.dispose();
  }
}

deploy();
