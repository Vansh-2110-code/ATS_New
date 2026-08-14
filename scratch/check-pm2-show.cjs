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

    const setupEnv = 'export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v22.23.1/bin:~/.npm-global/bin';

    console.log('1. Showing PM2 list...');
    let res = await ssh.execCommand(`${setupEnv} && npx pm2 list`, { cwd: '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in' });
    console.log(res.stdout || res.stderr);

  } catch (e) {
    console.error(e);
  } finally {
    ssh.dispose();
  }
}

run();
