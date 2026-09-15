const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function testWorkflow() {
  await ssh.connect({
    host: 'ats.whitehorsemanpower.in',
    username: 'whitehorsemanpower',
    password: 'Whitehorse@2026blr',
    port: 22,
  });

  const setupEnv = 'export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v22.23.1/bin:~/.npm-global/bin';
  const remoteBase = '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in';

  const res = await ssh.execCommand(`${setupEnv} && node -e "
    const jwt = require('jsonwebtoken');
    const mongoose = require('mongoose');
    const http = require('http');
    require('dotenv').config();

    async function run() {
      await mongoose.connect(process.env.MONGODB_URI);
      const User = require('./src/models/User');
      const Employee = require('./src/models/Employee');

      const admin = await User.findOne({ role: 'admin' });
      const token = jwt.sign({ id: admin._id, role: admin.role, name: admin.name }, process.env.JWT_SECRET);

      const emp = await Employee.findOne().sort('-createdAt');
      console.log('Testing with record:', emp.fullName, 'ID:', emp._id);

      // 1. Test Reject with remarks
      const rejReq = http.request('http://127.0.0.1:5001/api/public/joining/' + emp._id + '/reject', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        }
      }, (rejRes) => {
        let body = '';
        rejRes.on('data', c => body += c);
        rejRes.on('end', async () => {
          console.log('Reject API status:', rejRes.statusCode, body);
          const afterRej = await Employee.findById(emp._id);
          console.log('After Rejection -> approvalStatus:', afterRej.approvalStatus, 'remarks:', afterRej.rejectionRemarks);

          // 2. Test Approve
          const appReq = http.request('http://127.0.0.1:5001/api/public/joining/' + emp._id + '/approve', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + token,
              'Content-Type': 'application/json'
            }
          }, (appRes) => {
            let appBody = '';
            appRes.on('data', c => appBody += c);
            appRes.on('end', async () => {
              console.log('Approve API status:', appRes.statusCode, appBody);
              const afterApp = await Employee.findById(emp._id);
              console.log('After Approval -> isApproved:', afterApp.isApproved, 'approvalStatus:', afterApp.approvalStatus, 'approvedByName:', afterApp.approvedByName);
              process.exit(0);
            });
          });
          appReq.end();
        });
      });
      rejReq.write(JSON.stringify({ remarks: 'Test verification: Please re-upload clear Aadhaar card.' }));
      rejReq.end();
    }
    run().catch(e => { console.error(e); process.exit(1); });
  "`, { cwd: `${remoteBase}/backend` });

  console.log(res.stdout);
  if (res.stderr) console.error(res.stderr);
  ssh.dispose();
}

testWorkflow();
