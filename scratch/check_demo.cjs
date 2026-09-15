const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
  await ssh.connect({
    host: 'ats.whitehorsemanpower.in',
    username: 'whitehorsemanpower',
    password: 'Whitehorse@2026blr',
    port: 22,
    readyTimeout: 30000
  });

  const grepRes = await ssh.execCommand('grep -rn "reset-demo-data" /home/whitehorsemanpower/.pm2/logs/');
  console.log('--- GREP PM2 LOGS ---');
  console.log(grepRes.stdout);

  const lastErr = await ssh.execCommand('tail -n 80 /home/whitehorsemanpower/.pm2/logs/ats-backend-error.log');
  console.log('--- LAST 80 ERRORS ---');
  console.log(lastErr.stdout);

  ssh.dispose();
}

check().catch(console.error);
