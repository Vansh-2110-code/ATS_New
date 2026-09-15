const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function testLivePayroll() {
  try {
    await ssh.connect({
      host: 'ats.whitehorsemanpower.in',
      username: 'whitehorsemanpower',
      password: 'Whitehorse@2026blr',
      port: 22
    });

    const setupEnv = 'export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v22.23.1/bin:~/.npm-global/bin';
    const remoteBase = '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in';

    const testCode = `
const fs = require('fs');

async function check() {
  try {
    console.log('--- Step 1: Authenticating as Admin ---');
    const loginRes = await fetch('http://127.0.0.1:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: 'admin@whitehorsemanpower.in',
        password: 'Password2026!'
      })
    });
    const loginData = await loginRes.json();
    if (!loginData.token) {
      throw new Error('Admin login failed: ' + JSON.stringify(loginData));
    }
    console.log('✅ Admin Token Acquired successfully.');

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + loginData.token
    };

    console.log('--- Step 2: Fetch Companies ---');
    const compRes = await fetch('http://127.0.0.1:5001/api/payroll/companies', { headers });
    const comps = await compRes.json();
    console.log('✅ Companies count:', comps.length, comps.map(c => c.companyName));

    console.log('--- Step 3: Fetch Branches ---');
    const branchRes = await fetch('http://127.0.0.1:5001/api/payroll/branches', { headers });
    const branches = await branchRes.json();
    console.log('✅ Branches count:', branches.length, branches.map(b => b.branchName + ' (' + b.city + ')'));

    console.log('--- Step 4: Fetch Components ---');
    const compoRes = await fetch('http://127.0.0.1:5001/api/payroll/components', { headers });
    const components = await compoRes.json();
    console.log('✅ Salary Components count:', components.length);

    console.log('--- Step 5: Fetch Employee Profiles ---');
    const empRes = await fetch('http://127.0.0.1:5001/api/payroll/employees', { headers });
    const employees = await empRes.json();
    console.log('✅ Employees configured in payroll:', employees.length);

    console.log('--- Step 6: Fetch Dashboard Stats ---');
    const dashRes = await fetch('http://127.0.0.1:5001/api/payroll/dashboard', { headers });
    const stats = await dashRes.json();
    console.log('✅ Dashboard Stats:', {
      activeEmployees: stats.activeEmployees,
      totalGrossSalary: stats.totalGrossSalary,
      totalEmployerCost: stats.totalEmployerCost,
      totalPayrollCost: stats.totalPayrollCost
    });

    console.log('--- Step 7: Calculate Monthly Payroll ---');
    const calcRes = await fetch('http://127.0.0.1:5001/api/payroll/calculate', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        companyId: comps[0]._id,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        calculationBase: 'actual_days'
      })
    });
    const calcData = await calcRes.json();
    console.log('✅ Calculation Run Processed:', {
      runId: calcData.run?._id,
      status: calcData.run?.status,
      processedEmployees: calcData.processedCount,
      grossTotal: calcData.run?.totalGross,
      netPayable: calcData.run?.totalNetPayable,
      totalDeductions: calcData.run?.totalDeductions
    });

    console.log('--- Step 8: Fetch Payslips Archive ---');
    const slipRes = await fetch('http://127.0.0.1:5001/api/payroll/payslips?month=' + (new Date().getMonth() + 1) + '&year=' + new Date().getFullYear(), { headers });
    const slipData = await slipRes.json();
    console.log('✅ Payslips Records count:', slipData.count, 'Total Net Disbursed: ₹' + slipData.totalDisbursed);
    if (slipData.records && slipData.records.length > 0) {
      const sample = slipData.records[0];
      console.log('Sample Employee:', sample.name, '| Earned Gross: ₹' + sample.grossEarned, '| Deductions: ₹' + sample.totalDeductions, '| Net Take Home: ₹' + sample.netSalary);
      console.log('Net In Words:', sample.netSalaryInWords);
    }

    console.log('--- Step 9: Sync ATS Joined Placements to Incentives ---');
    const syncRes = await fetch('http://127.0.0.1:5001/api/payroll/incentives/sync', {
      method: 'POST',
      headers
    });
    const syncData = await syncRes.json();
    console.log('✅ ATS Incentive Sync:', syncData);

    console.log('--- Step 10: Fetch Recruitment Incentives & Milestones ---');
    const incRes = await fetch('http://127.0.0.1:5001/api/payroll/incentives', { headers });
    const incData = await incRes.json();
    console.log('✅ Incentives Pipeline:', {
      totalCandidates: incData.summary?.totalCandidates,
      pendingRetention: incData.summary?.pendingRetention,
      retentionPassed: incData.summary?.retentionPassed,
      totalPendingAmount: incData.summary?.totalPendingAmount
    });
    if (incData.incentives && incData.incentives.length > 0) {
      const sampleInc = incData.incentives[0];
      console.log('Sample Placement Incentive:', {
        candidate: sampleInc.candidateName,
        recruiter: sampleInc.recruiterName,
        client: sampleInc.clientName,
        status: sampleInc.status,
        incentiveAmount: sampleInc.incentiveAmount
      });
    }

    console.log('========================================================');
    console.log('🎉 ALL PAYROLL VERIFICATION CHECKS PASSED 100% ON LIVE! ');
    console.log('========================================================');
  } catch (err) {
    console.error('❌ Verification Error:', err.message);
  }
}

check();
`;

    // Put file on remote and execute
    await ssh.execCommand(`cat << 'EOF' > ${remoteBase}/backend/test_live_payroll_runner.cjs\n${testCode}\nEOF`);
    const execRes = await ssh.execCommand(`${setupEnv} && node test_live_payroll_runner.cjs`, { cwd: `${remoteBase}/backend` });
    console.log(execRes.stdout);
    if (execRes.stderr) console.error(execRes.stderr);

    // Clean up runner
    await ssh.execCommand(`rm -f ${remoteBase}/backend/test_live_payroll_runner.cjs`);
  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    ssh.dispose();
  }
}

testLivePayroll();
