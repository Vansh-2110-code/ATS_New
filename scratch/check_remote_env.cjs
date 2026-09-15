const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'ats.whitehorsemanpower.in',
    username: 'whitehorsemanpower',
    password: 'Whitehorse@2026blr',
    port: 22
  });

  const setupEnv = 'export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v22.23.1/bin:~/.npm-global/bin';
  const res1 = await ssh.execCommand(`${setupEnv} && which node && which npm && which npx`);
  console.log('which:', res1.stdout || res1.stderr);

  const res2 = await ssh.execCommand(`${setupEnv} && npx pm2 status`);
  console.log('pm2 status:', res2.stdout || res2.stderr);

  ssh.dispose();
}

run();
