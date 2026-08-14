const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  try {
    console.log('Connecting to Hostinger server...');
    await ssh.connect({
      host: 'ats.whitehorsemanpower.in',
      username: 'whitehorsemanpower',
      password: 'Whitehorse@2026blr',
      port: 22,
    });
    console.log('Connected!');

    const setupEnv = 'export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v20.20.2/bin:/home/whitehorsemanpower/.npm/_npx/5f7878ce38f1eb13/node_modules/pm2/bin';

    let res = await ssh.execCommand(`${setupEnv} && pm2 logs ats-backend --err --lines 50 --nostream`, { cwd: '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in' });
    console.log('PM2 Error Logs:\n', res.stdout || res.stderr);

  } catch (e) {
    console.error(e);
  } finally {
    ssh.dispose();
  }
}

run();
