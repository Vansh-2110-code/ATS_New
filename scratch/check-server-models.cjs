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

    const remotePath = '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in/backend/src/models';

    console.log('1. Listing files in remote backend/src/models...');
    let res = await ssh.execCommand('ls -la', { cwd: remotePath });
    console.log('Remote models:\n', res.stdout || res.stderr);

  } catch (e) {
    console.error(e);
  } finally {
    ssh.dispose();
  }
}

run();
