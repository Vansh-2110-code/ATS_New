const { NodeSSH } = require('node-ssh');

const host = '103.160.144.225';
const password = String.raw`KB6Vn72p2gS\`(\F`;

const usernames = ['root', 'admin', 'sannainnovations', 'sanna'];

async function testConnection() {
  for (const username of usernames) {
    console.log(`Trying SSH to ${host} with user: ${username}...`);
    const ssh = new NodeSSH();
    try {
      await ssh.connect({
        host,
        username,
        password,
        port: 22,
        readyTimeout: 10000,
      });
      console.log(`>>> SUCCESS: Connected as ${username}!`);
      
      const who = await ssh.execCommand('whoami && hostname && pwd');
      console.log('WHOAMI:\n', who.stdout);
      
      const vhosts = await ssh.execCommand('ls -la /var/www /home /var/www/html /home/* 2>/dev/null');
      console.log('DIRECTORIES:\n', vhosts.stdout);
      
      ssh.dispose();
      return;
    } catch (err) {
      console.log(`Failed for ${username}: ${err.message}`);
    }
  }
}

testConnection();
