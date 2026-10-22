const { execSync } = require('child_process');
const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');

const ssh = new NodeSSH();
const zipPath = path.join(__dirname, 'deploy-payload.zip');
const remotePath = '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in';

async function run() {
  try {
    console.log('Building project locally...');
    execSync('npm run build', { stdio: 'inherit' });

    console.log('Creating zip archive...');
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    execSync('tar -a -c -f deploy-payload.zip --exclude="node_modules" --exclude=".git" --exclude="scratch" --exclude="*.env*" --exclude="deploy-payload.zip" dist backend src public index.html package.json', { stdio: 'inherit' });
    console.log('Archive created at:', zipPath, 'Size:', (fs.statSync(zipPath).size / (1024 * 1024)).toFixed(2), 'MB');

    console.log('Connecting to SSH...');
    await ssh.connect({
      host: 'ats.whitehorsemanpower.in',
      username: 'whitehorsemanpower',
      password: 'Whitehorse@2026blr',
      port: 22,
      readyTimeout: 30000
    });
    console.log('Connected!');

    console.log('Uploading archive...');
    await ssh.putFile(zipPath, `${remotePath}/deploy-payload.zip`);
    console.log('Upload complete!');

    console.log('Extracting archive on server...');
    const unzipCmd = await ssh.execCommand('unzip -o deploy-payload.zip && rm deploy-payload.zip', { cwd: remotePath });
    console.log('Unzip stdout:', unzipCmd.stdout);
    console.log('Unzip stderr:', unzipCmd.stderr);

    console.log('Restarting PM2...');
    const pm2Restart = await ssh.execCommand('export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v22.23.1/bin:~/.npm-global/bin:~/.nvm/versions/node/v18.17.0/bin:~/.nvm/versions/node/v20.18.0/bin:$(find ~/.nvm -name bin 2>/dev/null | tr "\\n" ":"); pm2 restart ats-backend || pm2 restart all || npx pm2 restart all', { cwd: remotePath });
    console.log('PM2 restart stdout:', pm2Restart.stdout);
    console.log('PM2 restart stderr:', pm2Restart.stderr);

    console.log('Deployment completed successfully!');
  } catch (err) {
    console.error('Deployment failed:', err);
  } finally {
    ssh.dispose();
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
  }
}

run();
