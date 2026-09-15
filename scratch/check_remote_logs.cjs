const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function checkLogs() {
  await ssh.connect({
    host: 'ats.whitehorsemanpower.in',
    username: 'whitehorsemanpower',
    password: 'Whitehorse@2026blr',
    port: 22,
  });
  const setupEnv = 'export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v22.23.1/bin:~/.npm-global/bin';
  const pm2Logs = await ssh.execCommand(`${setupEnv} && npx pm2 logs ats-backend --lines 40 --nostream`);
  console.log('PM2 LOGS:\n' + pm2Logs.stdout);
  console.log('\nPM2 ERRORS:\n' + pm2Logs.stderr);
  
  const status = await ssh.execCommand(`${setupEnv} && npx pm2 list`);
  console.log('PM2 STATUS:\n' + status.stdout);

  ssh.dispose();
}
checkLogs().catch(console.error);
