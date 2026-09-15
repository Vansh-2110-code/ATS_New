const { NodeSSH } = require('node-ssh');
const https = require('https');
const ssh = new NodeSSH();

async function test() {
  await ssh.connect({
    host: 'ats.whitehorsemanpower.in',
    username: 'whitehorsemanpower',
    password: 'Whitehorse@2026blr',
    port: 22
  });

  await ssh.execCommand('mkdir -p /home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in/dist/test_dir');
  await ssh.execCommand('echo "hello from test" > /home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in/dist/test_dir/index.html');
  ssh.dispose();

  setTimeout(() => {
    https.get('https://ats.whitehorsemanpower.in/test_dir/index.html', (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => console.log('HTTP Status:', res.statusCode, 'Body:', body.trim()));
    });
  }, 1000);
}

test();
