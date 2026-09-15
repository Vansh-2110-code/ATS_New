const { NodeSSH } = require('node-ssh');
const path = require('path');
const https = require('https');
const ssh = new NodeSSH();

async function deployPreview() {
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
    const localBase = path.join(__dirname, '..', 'website_redesign');

    console.log('\n2. Creating remote preview directories...');
    await ssh.execCommand(`rm -rf ${remoteBase}/dist/test_dir`);
    await ssh.execCommand(`mkdir -p ${remoteBase}/dist/preview/css`);
    await ssh.execCommand(`mkdir -p ${remoteBase}/dist/preview/js`);
    await ssh.execCommand(`mkdir -p ${remoteBase}/dist/preview/assets/images`);
    await ssh.execCommand(`mkdir -p ${remoteBase}/website_redesign/css`);
    await ssh.execCommand(`mkdir -p ${remoteBase}/website_redesign/js`);
    await ssh.execCommand(`mkdir -p ${remoteBase}/website_redesign/assets/images`);

    console.log('\n3. Uploading redesigned website files...');
    const filesToUpload = [
      { local: 'index.html', remote: 'index.html' },
      { local: 'css/style.css', remote: 'css/style.css' },
      { local: 'css/responsive.css', remote: 'css/responsive.css' },
      { local: 'js/main.js', remote: 'js/main.js' },
      { local: 'js/jobModal.js', remote: 'js/jobModal.js' },
      { local: 'assets/images/logo.png', remote: 'assets/images/logo.png' },
      { local: 'assets/images/whitehorse-official-logo.png', remote: 'assets/images/whitehorse-official-logo.png' },
      { local: 'assets/images/whitehorse-logo.png', remote: 'assets/images/whitehorse-logo.png' },
      { local: 'assets/images/whitehorse-logo-clean.png', remote: 'assets/images/whitehorse-logo-clean.png' },
      { local: 'assets/images/logo-transparent.png', remote: 'assets/images/logo-transparent.png' },
      { local: 'assets/images/nexora-logo.png', remote: 'assets/images/nexora-logo.png' },
      { local: 'assets/images/client-associations-flyer.png', remote: 'assets/images/client-associations-flyer.png' }
    ];

    for (const f of filesToUpload) {
      const localPath = path.join(localBase, f.local);
      const remoteDist = `${remoteBase}/dist/preview/${f.remote}`;
      const remoteBackup = `${remoteBase}/website_redesign/${f.remote}`;

      await ssh.putFile(localPath, remoteDist);
      await ssh.putFile(localPath, remoteBackup);
      console.log(`Uploaded ${f.local} -> dist/preview/${f.remote}`);
    }

    console.log('\n4. Verifying remote preview files...');
    const lsRes = await ssh.execCommand(`ls -la ${remoteBase}/dist/preview`);
    console.log(lsRes.stdout);

    ssh.dispose();

    console.log('\n5. Testing live HTTPS preview endpoint...');
    https.get('https://ats.whitehorsemanpower.in/preview/index.html', (res) => {
      console.log(`HTTP Status: ${res.statusCode}`);
      console.log(`Content-Type: ${res.headers['content-type']}`);
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        if (body.includes('White Horse Manpower')) {
          console.log('\n======================================================');
          console.log('🚀 LIVE PREVIEW IS ONLINE AND READY FOR THE CLIENT!');
          console.log('Shareable Link: https://ats.whitehorsemanpower.in/preview/');
          console.log('======================================================');
        } else {
          console.log('Warning: HTML does not match expected title');
        }
      });
    });

  } catch (err) {
    console.error('Error during preview deployment:', err);
    process.exit(1);
  }
}

deployPreview();
