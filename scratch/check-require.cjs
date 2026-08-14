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

    const remotePath = '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in/backend';
    const setupEnv = 'export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v20.20.2/bin';

    console.log('1. Trying to run require("./src/models/Candidate") in node on the server...');
    let res = await ssh.execCommand(`${setupEnv} && node -e "try { require('./src/models/Candidate'); console.log('Successfully required Candidate!'); } catch(e) { console.error('Require Error:', e.stack); }"`, { cwd: remotePath });
    console.log(res.stdout || res.stderr);

  } catch (e) {
    console.error(e);
  } finally {
    ssh.dispose();
  }
}

run();
