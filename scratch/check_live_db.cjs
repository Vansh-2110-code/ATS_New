const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  try {
    await ssh.connect({
      host: 'ats.whitehorsemanpower.in',
      username: 'whitehorsemanpower',
      password: 'Whitehorse@2026blr',
      port: 22,
      readyTimeout: 30000
    });
    console.log('Connected to server via SSH.');

    const scriptCode = `
      const mongoose = require('mongoose');
      const ctrl = require('./src/controllers/candidate.controller');
      mongoose.connect('mongodb://127.0.0.1:27017/ats_db').then(async () => {
        const req = { query: { recruiter: 'Geetha G', limit: '1000' }, user: { role: 'admin' } };
        const res = {
          json: (data) => {
            console.log('Geetha G Total:', data.totalCount, 'statusCounts:', data.statusCounts);
            const sum = Object.values(data.statusCounts).reduce((a, b) => a + b, 0);
            console.log('Sum of Status Counts:', sum, 'Matches Total:', sum === data.totalCount);
            process.exit(0);
          }
        };
        await ctrl.list(req, res, (e) => { console.error(e); process.exit(1); });
      });
    `;
    const b64 = Buffer.from(scriptCode).toString('base64');
    const res = await ssh.execCommand(
      `/home/whitehorsemanpower/.nvm/versions/node/v22.23.1/bin/node -e "eval(Buffer.from('${b64}', 'base64').toString('utf8'))"`,
      { cwd: '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in/backend' }
    );
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
  } catch (err) {
    console.error('SSH Error:', err);
  } finally {
    ssh.dispose();
  }
}

run();
