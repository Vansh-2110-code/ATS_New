const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

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

    // Ensure templates directory exists on remote server
    console.log('\n2. Ensuring remote templates directory exists...');
    await ssh.execCommand(`mkdir -p ${remoteBase}/backend/templates/offer_letters`);

    // Upload the 5 official docx templates
    const localTemplatesDir = path.join(localBase, 'backend', 'templates', 'offer_letters');
    const templateFiles = fs.readdirSync(localTemplatesDir).filter(f => f.endsWith('.docx'));
    console.log(`Uploading ${templateFiles.length} official offer letter templates to server...`);
    for (const tf of templateFiles) {
      const localP = path.join(localTemplatesDir, tf);
      const remoteP = `${remoteBase}/backend/templates/offer_letters/${tf}`;
      console.log(` -> Template: ${tf}`);
      await ssh.putFile(localP, remoteP);
    }

    // Files to upload
    const filesToUpload = [
      // Backend files
      { local: 'backend/src/models/OfferLetter.js', remote: `${remoteBase}/backend/src/models/OfferLetter.js` },
      { local: 'backend/src/controllers/offerLetter.controller.js', remote: `${remoteBase}/backend/src/controllers/offerLetter.controller.js` },
      { local: 'backend/src/routes/offerLetter.routes.js', remote: `${remoteBase}/backend/src/routes/offerLetter.routes.js` },
      { local: 'backend/src/controllers/candidate.controller.js', remote: `${remoteBase}/backend/src/controllers/candidate.controller.js` },
      { local: 'backend/src/server.js', remote: `${remoteBase}/backend/src/server.js` },
      
      // Frontend files
      { local: 'src/app/services/api.ts', remote: `${remoteBase}/src/app/services/api.ts` },
      { local: 'src/app/pages/recruiter/JoiningFormPage.tsx', remote: `${remoteBase}/src/app/pages/recruiter/JoiningFormPage.tsx` },
      { local: 'src/app/pages/admin/OfferLettersPage.tsx', remote: `${remoteBase}/src/app/pages/admin/OfferLettersPage.tsx` },
      { local: 'src/app/routes.ts', remote: `${remoteBase}/src/app/routes.ts` },
      { local: 'src/app/components/layout/Sidebar.tsx', remote: `${remoteBase}/src/app/components/layout/Sidebar.tsx` },
      { local: 'src/app/pages/recruiter/CandidateProfilePage.tsx', remote: `${remoteBase}/src/app/pages/recruiter/CandidateProfilePage.tsx` },
    ];

    console.log('\n3. Uploading modified source files...');
    for (const f of filesToUpload) {
      console.log(` -> Uploading ${f.local}`);
      await ssh.putFile(path.join(localBase, f.local), f.remote);
    }
    console.log('All source files uploaded successfully.');

    // Ensure jszip is installed on remote backend
    console.log('\n4. Checking jszip dependency on remote backend...');
    await ssh.execCommand(`${setupEnv} && npm install jszip`, { cwd: `${remoteBase}/backend` });

    // Build frontend
    console.log('\n5. Building frontend on remote production server...');
    const buildRes = await ssh.execCommand(`${setupEnv} && npm run build`, { cwd: remoteBase });
    console.log(buildRes.stdout);
    if (buildRes.stderr && !buildRes.stdout.includes('built in')) {
      console.warn('Build output / warnings:', buildRes.stderr);
    }

    // Copy latest bundle to aliases if needed
    const findLatest = await ssh.execCommand('ls -t dist/assets/index-*.js | head -n 1', { cwd: remoteBase });
    const latestJs = findLatest.stdout.trim();
    if (latestJs) {
      console.log(`Setting latest build alias from: ${latestJs}`);
      await ssh.execCommand(`cp ${latestJs} dist/assets/index-u4-EBceP.js`, { cwd: remoteBase });
      await ssh.execCommand(`cp ${latestJs} dist/assets/index-DlaNMFSS.js`, { cwd: remoteBase });
    }

    // Restart backend PM2
    console.log('\n6. Restarting backend PM2 process (ats-backend)...');
    const pm2Res = await ssh.execCommand(`${setupEnv} && npx pm2 restart ats-backend`, { cwd: remoteBase });
    console.log(pm2Res.stdout);

    // Verify health
    console.log('\n7. Verifying production server health...');
    const healthRes = await ssh.execCommand(`${setupEnv} && curl -s http://localhost:5001/api/health`, { cwd: remoteBase });
    console.log('Health check response:', healthRes.stdout);

    console.log('\n======================================================');
    console.log(' 🚀 DEPLOYMENT COMPLETED SUCCESSFULLY ON ATS PORTAL! ');
    console.log('    https://ats.whitehorsemanpower.in/                ');
    console.log('======================================================');

  } catch (err) {
    console.error('Deployment error:', err);
    process.exit(1);
  } finally {
    ssh.dispose();
  }
}

deploy();
