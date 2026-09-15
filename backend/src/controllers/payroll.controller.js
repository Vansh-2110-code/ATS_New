const mongoose = require('mongoose');
const Company = require('../models/Company');
const Branch = require('../models/Branch');
const SalaryComponent = require('../models/SalaryComponent');
const SalaryStructure = require('../models/SalaryStructure');
const StatutoryConfig = require('../models/StatutoryConfig');
const EmployeePayrollProfile = require('../models/EmployeePayrollProfile');
const PayrollRun = require('../models/PayrollRun');
const PayrollEmployeeRecord = require('../models/PayrollEmployeeRecord');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const RecruitmentIncentive = require('../models/RecruitmentIncentive');
const Candidate = require('../models/Candidate');
const Invoice = require('../models/Invoice');

// Number to words converter for Indian Rupees
function numberToWords(num) {
  if (!num || isNaN(num)) return 'Zero Rupees Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
    if (n < 1000) return inWords(Math.floor(n / 100)) + 'Hundred ' + (n % 100 !== 0 ? inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 !== 0 ? inWords(n % 10000000) : '');
  }

  const rounded = Math.round(num);
  return inWords(rounded).trim() + ' Rupees Only';
}

// ─── 1. Companies & Multi-Tenancy ──────────────────────────────────────
exports.getCompanies = async (req, res) => {
  try {
    const companies = await Company.find({ isPayrollTenant: true }).sort({ companyName: 1 });
    res.json(companies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createCompany = async (req, res) => {
  try {
    const data = req.body;
    data.isPayrollTenant = true;
    const company = await Company.create(data);
    res.status(201).json(company);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ─── 2. Branches ───────────────────────────────────────────────────────
exports.getBranches = async (req, res) => {
  try {
    const { companyId } = req.query;
    const query = companyId ? { company: companyId } : {};
    const branches = await Branch.find(query).populate('company', 'companyName code').sort({ name: 1 });
    res.json(branches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createBranch = async (req, res) => {
  try {
    const branch = await Branch.create(req.body);
    res.status(201).json(branch);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ─── 3. Salary Components ──────────────────────────────────────────────
exports.getComponents = async (req, res) => {
  try {
    const { companyId } = req.query;
    const query = companyId ? { company: companyId } : {};
    const components = await SalaryComponent.find(query).sort({ displayOrder: 1, name: 1 });
    res.json(components);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.saveComponent = async (req, res) => {
  try {
    const { id, ...data } = req.body;
    let component;
    if (id) {
      component = await SalaryComponent.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    } else {
      component = await SalaryComponent.create(data);
    }
    res.json(component);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ─── 4. Salary Structures ──────────────────────────────────────────────
exports.getStructures = async (req, res) => {
  try {
    const { companyId } = req.query;
    const query = companyId ? { company: companyId } : {};
    const structures = await SalaryStructure.find(query).populate('components.component').sort({ name: 1 });
    res.json(structures);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.saveStructure = async (req, res) => {
  try {
    const { id, ...data } = req.body;
    let structure;
    if (id) {
      structure = await SalaryStructure.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    } else {
      structure = await SalaryStructure.create(data);
    }
    res.json(structure);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ─── 5. Statutory Configuration ─────────────────────────────────────────
exports.getStatutoryConfig = async (req, res) => {
  try {
    const { companyId } = req.query;
    let config = await StatutoryConfig.findOne(companyId ? { company: companyId } : {});
    res.json(config);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.saveStatutoryConfig = async (req, res) => {
  try {
    const { companyId, ...data } = req.body;
    let config = await StatutoryConfig.findOneAndUpdate(
      { company: companyId },
      { ...data, company: companyId },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(config);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ─── 6. Employee Payroll Profiles ──────────────────────────────────────
exports.getEmployeeProfiles = async (req, res) => {
  try {
    const { companyId, branchId, status } = req.query;
    const query = {};
    if (companyId) query.company = companyId;
    if (branchId) query.branch = branchId;
    if (status) query.status = status;

    const profiles = await EmployeePayrollProfile.find(query)
      .populate('user', 'name email employeeId role status joinedDate avatar')
      .populate('branch', 'name code state')
      .populate('salaryStructure', 'name code')
      .sort({ createdAt: -1 });

    res.json(profiles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateEmployeeProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const existing = await EmployeePayrollProfile.findById(id);
    if (!existing) return res.status(404).json({ message: 'Payroll profile not found' });

    if (data.statutory) {
      existing.statutory = {
        ...(existing.statutory ? (typeof existing.statutory.toObject === 'function' ? existing.statutory.toObject() : existing.statutory) : {}),
        ...data.statutory
      };
      delete data.statutory;
    }
    if (data.bank) {
      existing.bank = {
        ...(existing.bank ? (typeof existing.bank.toObject === 'function' ? existing.bank.toObject() : existing.bank) : {}),
        ...data.bank
      };
      delete data.bank;
    }
    Object.assign(existing, data);
    await existing.save();
    res.json(existing);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ─── 7. Payroll Dashboard Analytics ────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  try {
    const { companyId, branchId, month, year } = req.query;
    const currentMonth = Number(month) || (new Date().getMonth() + 1);
    const currentYear = Number(year) || new Date().getFullYear();

    // 1. Find Company
    const companyQuery = companyId ? { _id: companyId } : { isPayrollTenant: true };
    const company = await Company.findOne(companyQuery);
    if (!company) {
      return res.json({
        totalActiveEmployees: 0,
        eligibleEmployees: 0,
        processedEmployees: 0,
        pendingEmployees: 0,
        onHoldEmployees: 0,
        totalGross: 0,
        totalIncentives: 0,
        totalDeductions: 0,
        totalEmployerContribution: 0,
        totalNetPayable: 0,
        totalPayrollCost: 0,
        runStatus: 'DRAFT'
      });
    }

    // 2. Count Active Profiles
    const profileQuery = { company: company._id, status: 'active' };
    if (branchId) profileQuery.branch = branchId;
    const totalActive = await EmployeePayrollProfile.countDocuments(profileQuery);
    const onHold = await EmployeePayrollProfile.countDocuments({ company: company._id, status: 'on_hold' });

    // 3. Find Payroll Run for month
    const runQuery = { company: company._id, month: currentMonth, year: currentYear };
    if (branchId) runQuery.branch = branchId;
    const payrollRun = await PayrollRun.findOne(runQuery);

    if (payrollRun) {
      return res.json({
        totalActiveEmployees: totalActive,
        eligibleEmployees: totalActive,
        processedEmployees: payrollRun.totalProcessed,
        pendingEmployees: Math.max(0, totalActive - payrollRun.totalProcessed),
        onHoldEmployees: onHold,
        totalGross: payrollRun.totalGross,
        totalIncentives: payrollRun.totalIncentives,
        totalDeductions: payrollRun.totalDeductions,
        totalEmployerContribution: payrollRun.totalEmployerContribution,
        totalNetPayable: payrollRun.totalNetPayable,
        totalPayrollCost: payrollRun.totalPayrollCost,
        runStatus: payrollRun.status,
        runId: payrollRun._id
      });
    }

    // Default DRAFT projection
    const profiles = await EmployeePayrollProfile.find(profileQuery);
    let projectedGross = 0;
    profiles.forEach(p => projectedGross += (p.grossSalary || 0));

    res.json({
      totalActiveEmployees: totalActive,
      eligibleEmployees: totalActive,
      processedEmployees: 0,
      pendingEmployees: totalActive,
      onHoldEmployees: onHold,
      totalGross: projectedGross,
      totalIncentives: 0,
      totalDeductions: Math.round(projectedGross * 0.12),
      totalEmployerContribution: Math.round(projectedGross * 0.13),
      totalNetPayable: Math.round(projectedGross * 0.88),
      totalPayrollCost: Math.round(projectedGross * 1.13),
      runStatus: 'DRAFT',
      runId: null
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── 8. Calculate & Run Monthly Payroll ─────────────────────────────────
exports.calculatePayroll = async (req, res) => {
  try {
    const { companyId, branchId, month, year, baseDays = 30 } = req.body;
    const calcMonth = Number(month);
    const calcYear = Number(year);

    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    // Fetch Statutory Config
    const statConfig = await StatutoryConfig.findOne({ company: company._id }) || {
      epf: { employeeRate: 12, employerRate: 12, wageCeiling: 15000, isCappedAtCeiling: true },
      esic: { employeeRate: 0.75, employerRate: 3.25, wageCeiling: 21000 },
      ptSlabs: [{ minSalary: 15000, taxAmount: 200, specialFebAmount: 300 }]
    };

    // Find or create PayrollRun
    const runFilter = { company: company._id, month: calcMonth, year: calcYear };
    if (branchId) runFilter.branch = branchId;
    let run = await PayrollRun.findOne(runFilter);

    if (run && run.status === 'LOCKED') {
      return res.status(400).json({ message: 'Payroll for this month is LOCKED and cannot be recalculated.' });
    }

    if (!run) {
      run = new PayrollRun({
        ...runFilter,
        status: 'CALCULATED',
        runBy: req.user?._id
      });
    } else {
      run.status = 'CALCULATED';
    }

    // Fetch Eligible Profiles
    const profileQuery = { company: company._id, status: 'active' };
    if (branchId) profileQuery.branch = branchId;
    const profiles = await EmployeePayrollProfile.find(profileQuery).populate('user');

    // Remove existing draft employee records for this run
    await PayrollEmployeeRecord.deleteMany({ payrollRun: run._id });

    let runTotalGross = 0;
    let runTotalIncentives = 0;
    let runTotalDeductions = 0;
    let runTotalNet = 0;
    let runTotalEmployerCost = 0;

    const records = [];

    for (const p of profiles) {
      if (!p.user) continue;

      const monthlyGross = p.grossSalary || 0;
      const perDaySalary = monthlyGross / baseDays;

      // Sync Attendance for Month
      const startDate = new Date(calcYear, calcMonth - 1, 1);
      const endDate = new Date(calcYear, calcMonth, 0);

      const attendances = await Attendance.find({
        user: p.user._id,
        date: { $gte: startDate, $lte: endDate }
      });

      let presentCount = 0;
      let lopDays = 0;
      attendances.forEach(a => {
        if (a.status === 'present' || a.status === 'wfh') presentCount++;
        if (a.status === 'absent' || a.status === 'unpaid_leave') lopDays++;
      });

      // Default to full payable days if attendance records are not explicitly marked absent
      const payableDays = Math.max(0, baseDays - lopDays);
      const lopDeduction = Math.round(perDaySalary * lopDays);
      const earnedGross = Math.max(0, monthlyGross - lopDeduction);

      // Components breakdown
      const basicEarned = Math.round(earnedGross * 0.50);
      const hraEarned = Math.round(basicEarned * 0.40);
      const splAllowEarned = Math.max(0, earnedGross - basicEarned - hraEarned);

      // Query approved recruitment incentives for this employee
      const approvedIncentives = await RecruitmentIncentive.find({
        recruiter: p.user._id,
        status: 'APPROVED_FOR_PAYROLL'
      });
      const incentiveEarned = approvedIncentives.reduce((s, inc) => s + (inc.incentiveAmount || 0), 0);
      runTotalIncentives += incentiveEarned;
      const totalEarnedGross = earnedGross + incentiveEarned;

      // Statutory Deductions
      let pfEmployee = 0;
      let pfEmployer = 0;
      if (!p.statutory?.isPFExempt) {
        const pfWage = statConfig.epf.isCappedAtCeiling ? Math.min(basicEarned, statConfig.epf.wageCeiling) : basicEarned;
        pfEmployee = Math.round((pfWage * statConfig.epf.employeeRate) / 100);
        pfEmployer = Math.round((pfWage * statConfig.epf.employerRate) / 100);
      }

      let esiEmployee = 0;
      let esiEmployer = 0;
      if (!p.statutory?.isESIExempt && monthlyGross <= statConfig.esic.wageCeiling) {
        esiEmployee = Math.round((earnedGross * statConfig.esic.employeeRate) / 100);
        esiEmployer = Math.round((earnedGross * statConfig.esic.employerRate) / 100);
      }

      let pt = 0;
      if (!p.statutory?.isPTExempt && earnedGross >= 15000) {
        pt = calcMonth === 2 ? 300 : 200; // Karnataka PT rule: ₹300 in February
      }

      const totalDeductions = pfEmployee + esiEmployee + pt;
      const netPayable = Math.max(0, totalEarnedGross - totalDeductions);
      const totalEmployerContrib = pfEmployer + esiEmployer;
      const totalCtc = totalEarnedGross + totalEmployerContrib;

      runTotalGross += totalEarnedGross;
      runTotalDeductions += totalDeductions;
      runTotalNet += netPayable;
      runTotalEmployerCost += totalEmployerContrib;

      if (approvedIncentives.length > 0) {
        await RecruitmentIncentive.updateMany(
          { _id: { $in: approvedIncentives.map(i => i._id) } },
          { includedInPayrollRun: run._id }
        );
      }

      const empRecord = new PayrollEmployeeRecord({
        payrollRun: run._id,
        company: company._id,
        branch: p.branch,
        user: p.user._id,
        employeeId: p.user.employeeId,
        name: p.user.name,
        designation: p.user.role,
        department: 'Recruitment & Operations',
        month: calcMonth,
        year: calcYear,
        calculationBaseDays: baseDays,
        presentDays: presentCount,
        lopDays: lopDays,
        payableDays: payableDays,
        grossStandard: monthlyGross,
        grossEarned: totalEarnedGross,
        incentiveAmount: incentiveEarned,
        lopDeduction: lopDeduction,
        earnings: [
          { code: 'BASIC', name: 'Basic Salary', standardAmount: Math.round(monthlyGross * 0.5), earnedAmount: basicEarned },
          { code: 'HRA', name: 'House Rent Allowance', standardAmount: Math.round(monthlyGross * 0.2), earnedAmount: hraEarned },
          { code: 'SPL_ALLOW', name: 'Special Allowance', standardAmount: Math.round(monthlyGross * 0.3), earnedAmount: splAllowEarned },
          ...(incentiveEarned > 0 ? [{ code: 'INCENTIVE', name: 'Recruitment Placement Incentive', standardAmount: 0, earnedAmount: incentiveEarned }] : [])
        ],
        deductions: [
          { code: 'PF_EE', name: p.statutory?.isPFExempt ? 'Provident Fund (Opted Out)' : 'Provident Fund (EPF)', amount: pfEmployee },
          { code: 'ESI_EE', name: 'Employee State Insurance (ESIC)', amount: esiEmployee },
          { code: 'PT', name: 'Professional Tax (PT)', amount: pt }
        ],
        employerContributions: [
          { code: 'PF_ER', name: p.statutory?.isPFExempt ? 'Employer EPF (Opted Out)' : 'Employer EPF', amount: pfEmployer },
          { code: 'ESI_ER', name: 'Employer ESIC', amount: esiEmployer }
        ],
        totalDeductions,
        netSalary: netPayable,
        netSalaryInWords: numberToWords(netPayable),
        totalEmployerCost: totalEmployerContrib,
        ctc: totalCtc,
        bankDetails: {
          bankName: p.bank?.bankName || 'HDFC Bank',
          accountNumber: p.bank?.accountNumber || 'N/A',
          ifscCode: p.bank?.ifscCode || 'N/A',
          paymentMode: p.bank?.paymentMode || 'bank_transfer'
        },
        statutoryDetails: {
          pan: p.statutory?.panNumber || 'N/A',
          uan: p.statutory?.uanNumber || 'N/A',
          pfNumber: p.statutory?.pfNumber || 'N/A',
          esicNumber: p.statutory?.esicNumber || 'N/A',
          taxRegime: p.statutory?.taxRegime || 'new',
          isPFExempt: Boolean(p.statutory?.isPFExempt)
        }
      });

      records.push(empRecord);
    }

    await PayrollEmployeeRecord.insertMany(records);

    run.totalActiveEmployees = profiles.length;
    run.totalProcessed = records.length;
    run.totalGross = runTotalGross;
    run.totalIncentives = runTotalIncentives;
    run.totalDeductions = runTotalDeductions;
    run.totalEmployerContribution = runTotalEmployerCost;
    run.totalNetPayable = runTotalNet;
    run.totalPayrollCost = runTotalGross + runTotalEmployerCost;
    await run.save();

    res.json({
      message: 'Payroll calculated successfully',
      run,
      processedCount: records.length
    });
  } catch (err) {
    console.error('Calculate payroll error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ─── 9. Update Run Status & Lock ───────────────────────────────────────
exports.updatePayrollStatus = async (req, res) => {
  try {
    const { runId, status, comment } = req.body;
    const run = await PayrollRun.findById(runId);
    if (!run) return res.status(404).json({ message: 'Payroll run not found' });

    if (run.status === 'LOCKED' && status !== 'PAYMENT_INITIATED' && status !== 'PAID') {
      return res.status(400).json({ message: 'Locked payroll cannot be moved back to draft or review.' });
    }

    run.status = status;
    run.approvalHierarchy.push({
      role: req.user?.role || 'admin',
      user: req.user?._id,
      userName: req.user?.name || 'Administrator',
      action: status === 'APPROVED' ? 'APPROVED' : (status === 'UNDER_REVIEW' ? 'SUBMITTED' : 'REVIEWED'),
      comment: comment || `Status updated to ${status}`
    });

    if (status === 'LOCKED') {
      run.lockedAt = new Date();
      run.lockedBy = req.user?._id;
      await PayrollEmployeeRecord.updateMany({ payrollRun: run._id }, { isFrozen: true });
      await RecruitmentIncentive.updateMany(
        { includedInPayrollRun: run._id },
        { status: 'PAID_IN_PAYROLL', paidMonth: run.month, paidYear: run.year }
      );
    } else if (status === 'PAID') {
      run.paidAt = new Date();
    }

    await run.save();
    res.json(run);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPayslips = async (req, res) => {
  try {
    const { companyId, branchId, month, year, search, runId } = req.query;
    const query = {};

    // Role-based access control: regular employees only see their own payslips
    if (req.user && !['admin', 'manager'].includes(req.user.role)) {
      query.user = req.user._id;
    } else if (req.query.userId) {
      query.user = req.query.userId;
    }

    if (companyId) query.company = companyId;
    if (branchId) query.branch = branchId;
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);
    if (runId) query.payrollRun = runId;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    const records = await PayrollEmployeeRecord.find(query)
      .populate('company', 'companyName legalName logo address gstin cin')
      .populate('branch', 'branchName address city state')
      .sort({ year: -1, month: -1, name: 1 });

    const totalDisbursed = records.reduce((acc, r) => acc + (r.netSalary || 0), 0);
    const totalGross = records.reduce((acc, r) => acc + (r.grossEarned || 0), 0);

    res.json({
      records,
      count: records.length,
      totalDisbursed,
      totalGross
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.markPayslipDownloaded = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await PayrollEmployeeRecord.findById(id);
    if (!record) return res.status(404).json({ message: 'Record not found' });

    record.downloadCount = (record.downloadCount || 0) + 1;
    if (!record.firstDownloadedAt) {
      record.firstDownloadedAt = new Date();
    }
    await record.save();

    res.json({ success: true, downloadCount: record.downloadCount, firstDownloadedAt: record.firstDownloadedAt });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getRunRecords = async (req, res) => {
  try {
    const { runId } = req.params;
    const records = await PayrollEmployeeRecord.find({ payrollRun: runId }).sort({ name: 1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPayslipById = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await PayrollEmployeeRecord.findById(id)
      .populate('company')
      .populate('branch');
    if (!record) return res.status(404).json({ message: 'Payslip record not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── 11. Recruitment ATS Incentives & 90-Day Retention ─────────────────
exports.getIncentives = async (req, res) => {
  try {
    const { recruiterId, status, search } = req.query;
    const query = {};

    // Regular recruiters only see their own incentives
    if (req.user && !['admin', 'manager'].includes(req.user.role)) {
      query.recruiter = req.user._id;
    } else if (recruiterId) {
      query.recruiter = recruiterId;
    }

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { candidateName: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } },
        { recruiterName: { $regex: search, $options: 'i' } }
      ];
    }

    const incentives = await RecruitmentIncentive.find(query)
      .populate('candidate', 'name email phone dateOfJoining joiningSalary currentStage status clientName')
      .populate('recruiter', 'name email employeeId')
      .populate('invoice', 'invoiceNumber grandTotal status dueDate paidDate')
      .sort({ createdAt: -1 });

    const summary = {
      totalCandidates: incentives.length,
      pendingRetention: incentives.filter(i => i.status === 'PENDING_RETENTION').length,
      retentionPassed: incentives.filter(i => i.status === 'RETENTION_PASSED').length,
      invoicePaid: incentives.filter(i => i.status === 'INVOICE_PAID').length,
      approvedForPayroll: incentives.filter(i => i.status === 'APPROVED_FOR_PAYROLL').length,
      paidInPayroll: incentives.filter(i => i.status === 'PAID_IN_PAYROLL').length,
      clawedBack: incentives.filter(i => i.status === 'CLAWED_BACK').length,
      totalPendingAmount: incentives.filter(i => ['PENDING_RETENTION', 'RETENTION_PASSED', 'INVOICE_PAID'].includes(i.status)).reduce((s, i) => s + (i.incentiveAmount || 0), 0),
      totalApprovedAmount: incentives.filter(i => i.status === 'APPROVED_FOR_PAYROLL').reduce((s, i) => s + (i.incentiveAmount || 0), 0),
      totalPaidAmount: incentives.filter(i => i.status === 'PAID_IN_PAYROLL').reduce((s, i) => s + (i.incentiveAmount || 0), 0),
    };

    res.json({ incentives, summary });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.syncJoinedCandidatesToIncentives = async (req, res) => {
  try {
    const company = await Company.findOne({ isPayrollTenant: true });
    if (!company) return res.status(404).json({ message: 'Payroll tenant company not found' });

    // Find all joined candidates with assigned recruiter
    const joinedCandidates = await Candidate.find({
      $or: [
        { status: { $in: ['Joined', 'Joining', 'Offer Accept'] } },
        { dateOfJoining: { $exists: true, $ne: null } }
      ],
      assignedRecruiter: { $exists: true, $ne: null }
    }).populate('assignedRecruiter', 'name email employeeId');

    let createdCount = 0;
    let updatedCount = 0;
    const now = new Date();

    for (const cand of joinedCandidates) {
      const doj = cand.dateOfJoining || cand.offerDetails?.dateOfJoining || cand.createdAt;
      const dojDate = new Date(doj);
      const retentionDue = new Date(dojDate);
      retentionDue.setDate(retentionDue.getDate() + 90);

      const daysElapsed = Math.floor((now - dojDate) / (1000 * 60 * 60 * 24));
      const retentionCompleted = daysElapsed >= 90;
      const candidateExited = Boolean(cand.exitDate || cand.status === 'Joined and Abort');

      const salaryVal = parseFloat(cand.joiningSalary || cand.offerDetails?.joiningSalary || cand.offerDetails?.offeredCTC || 300000);
      const ctc = isNaN(salaryVal) ? 300000 : salaryVal;
      const billingPct = parseFloat(cand.placementPercentage || cand.offerDetails?.placementPercentage || 8.33);
      const billingAmt = Math.round((ctc * billingPct) / 100);
      const incentiveAmt = Math.round(billingAmt * 0.05); // 5% of billing revenue

      // Find any linked invoice
      const invoice = await Invoice.findOne({
        $or: [
          { 'candidates.candidateId': cand._id },
          { candidateRef: cand._id }
        ]
      });

      const invoiceStatus = invoice ? (invoice.status || 'Pending') : 'Not Invoiced';
      const isInvoicePaid = invoice && invoice.status === 'Paid';

      let status = 'PENDING_RETENTION';
      if (candidateExited && daysElapsed < 90) {
        status = 'CLAWED_BACK';
      } else if (retentionCompleted) {
        if (isInvoicePaid) {
          status = 'APPROVED_FOR_PAYROLL';
        } else {
          status = 'RETENTION_PASSED';
        }
      }

      let existing = await RecruitmentIncentive.findOne({ candidate: cand._id });
      if (!existing) {
        existing = new RecruitmentIncentive({
          company: company._id,
          recruiter: cand.assignedRecruiter._id,
          recruiterName: cand.assignedRecruiter.name || cand.assignedRecruiterName,
          candidate: cand._id,
          candidateName: cand.name,
          candidateEmployeeId: cand.candidateEmployeeId || cand.candidateId || 'N/A',
          clientName: cand.clientName || 'Partner Client',
          candidateCTC: ctc,
          billingPercentage: billingPct,
          billingAmount: billingAmt,
          incentivePercentage: 5,
          incentiveAmount: incentiveAmt,
          dateOfJoining: dojDate,
          retentionDaysRequired: 90,
          retentionDueDate: retentionDue,
          retentionCompleted,
          candidateExited,
          candidateExitDate: cand.exitDate,
          invoice: invoice?._id,
          invoiceNumber: invoice?.invoiceNumber,
          invoiceStatus,
          status
        });
        await existing.save();
        createdCount++;
      } else {
        if (existing.status !== 'PAID_IN_PAYROLL') {
          if (candidateExited && daysElapsed < 90) {
            existing.status = 'CLAWED_BACK';
          } else if (existing.status !== 'APPROVED_FOR_PAYROLL') {
            existing.status = status;
          }
        }
        existing.retentionCompleted = retentionCompleted;
        existing.candidateExited = candidateExited;
        if (invoice) {
          existing.invoice = invoice._id;
          existing.invoiceNumber = invoice.invoiceNumber;
          existing.invoiceStatus = invoiceStatus;
        }
        await existing.save();
        updatedCount++;
      }
    }

    res.json({
      message: `Sync complete: ${createdCount} created, ${updatedCount} updated`,
      createdCount,
      updatedCount,
      totalScanned: joinedCandidates.length
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateIncentiveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const inc = await RecruitmentIncentive.findById(id);
    if (!inc) return res.status(404).json({ message: 'Incentive record not found' });

    inc.status = status;
    if (notes) inc.notes = notes;
    if (status === 'APPROVED_FOR_PAYROLL') {
      inc.approvedBy = req.user?._id;
      inc.approvedAt = new Date();
    }
    await inc.save();
    res.json(inc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
