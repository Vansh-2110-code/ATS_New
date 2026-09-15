const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function test() {
  await ssh.connect({
    host: 'ats.whitehorsemanpower.in',
    username: 'whitehorsemanpower',
    password: 'Whitehorse@2026blr',
    port: 22,
    readyTimeout: 30000
  });

  const remoteBase = '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in';
  const setupEnv = 'export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v22.23.1/bin:~/.npm-global/bin';

  const testRes = await ssh.execCommand(`${setupEnv} && node -e "
    const jwt = require('jsonwebtoken');
    const mongoose = require('mongoose');
    const http = require('http');
    require('dotenv').config();

    async function runTest() {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ats_db');
      const User = require('./src/models/User');
      const Candidate = require('./src/models/Candidate');
      const Job = require('./src/models/Job');

      const demoUser = await User.findOne({ email: 'demo@whitehorsemanpower.in' });
      if (!demoUser) {
        console.error('Demo user not found');
        process.exit(1);
      }

      const token = jwt.sign({ id: demoUser._id, role: demoUser.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

      // 1. Test Reset Demo Data endpoint
      const resetReq = http.request('http://127.0.0.1:5001/api/users/reset-demo-data', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        }
      }, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', async () => {
          console.log('1. RESET DEMO DATA STATUS:', res.statusCode);
          console.log('   RESPONSE:', body);

          // 2. Test Demo Protection: attempt to modify a REAL candidate
          const realCand = await Candidate.findOne({ isDemoData: { \\$ne: true } });
          if (realCand) {
            const putReq = http.request('http://127.0.0.1:5001/api/candidates/' + realCand._id, {
              method: 'PUT',
              headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
              }
            }, (putRes) => {
              let putBody = '';
              putRes.on('data', c => putBody += c);
              putRes.on('end', () => {
                console.log('2. DEMO PROTECTION ON REAL CANDIDATE UPDATE (Expect 403):', putRes.statusCode);
                console.log('   PROTECTION MESSAGE:', putBody);
                process.exit(0);
              });
            });
            putReq.write(JSON.stringify({ name: 'Hacked Name' }));
            putReq.end();
          } else {
            process.exit(0);
          }
        });
      });
      resetReq.end();
    }
    runTest().catch(e => { console.error(e); process.exit(1); });
  "`, { cwd: `${remoteBase}/backend` });

  console.log(testRes.stdout);
  if (testRes.stderr) console.error(testRes.stderr);

  ssh.dispose();
}

test();
