const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkStatus() {
  try {
    await ssh.connect({
      host: 'ats.whitehorsemanpower.in',
      username: 'whitehorsemanpower',
      password: 'Whitehorse@2026blr',
      port: 22,
      readyTimeout: 30000
    });

    const checkScript = `
const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const Company = require('./src/models/Company');
  const Branch = require('./src/models/Branch');
  const SalaryComponent = require('./src/models/SalaryComponent');
  const EmployeePayrollProfile = require('./src/models/EmployeePayrollProfile');
  const PayrollRun = require('./src/models/PayrollRun');
  const RecruitmentIncentive = require('./src/models/RecruitmentIncentive');
  const Invoice = require('./src/models/Invoice');

  const [
    companyCount,
    branchCount,
    componentCount,
    employeeProfileCount,
    payrollRunCount,
    incentiveCount,
    invoiceCount
  ] = await Promise.all([
    Company.countDocuments(),
    Branch.countDocuments(),
    SalaryComponent.countDocuments(),
    EmployeePayrollProfile.countDocuments(),
    PayrollRun.countDocuments(),
    RecruitmentIncentive.countDocuments(),
    Invoice.countDocuments()
  ]);

  const latestRun = await PayrollRun.findOne().sort('-createdAt');
  const sampleInvoice = await Invoice.findOne().sort('-createdAt');

  console.log(JSON.stringify({
    companyCount,
    branchCount,
    componentCount,
    employeeProfileCount,
    payrollRunCount,
    incentiveCount,
    invoiceCount,
    latestRun: latestRun ? {
      month: latestRun.month,
      year: latestRun.year,
      totalGross: latestRun.totalGross,
      totalNetPayable: latestRun.totalNetPayable,
      status: latestRun.status
    } : null,
    sampleInvoice: sampleInvoice ? {
      invoiceNumber: sampleInvoice.invoiceNumber,
      clientName: sampleInvoice.clientName || sampleInvoice.companyName,
      status: sampleInvoice.status,
      totalAmount: sampleInvoice.totalAmount
    } : null
  }));

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
    `;

    const remoteBase = '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in';
    const setupEnv = 'export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v22.23.1/bin:~/.npm-global/bin';

    await ssh.execCommand(`cat << 'EOF' > ${remoteBase}/backend/check_summary.js\n${checkScript}\nEOF`);
    const res = await ssh.execCommand(`${setupEnv} && node check_summary.js`, { cwd: `${remoteBase}/backend` });
    console.log('Summary output:', res.stdout);
    await ssh.execCommand(`rm -f ${remoteBase}/backend/check_summary.js`);

  } catch (err) {
    console.error('Error checking:', err);
  } finally {
    ssh.dispose();
  }
}

checkStatus();
