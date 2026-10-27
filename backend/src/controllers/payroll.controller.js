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
const Settlement = require('../models/Settlement');

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
    const User = require('../models/User');
    const Employee = require('../models/Employee');

    // Default tenant company (White Horse)
    const defaultCompany = companyId ? await Company.findById(companyId) : (await Company.findOne({ isPayrollTenant: true }) || await Company.findOne());

    // Exclude demo accounts only (preserve all real users, active and inactive)
    const excludedUsers = await User.find({
      $or: [
        { isDemoAccount: true },
        { employeeId: /^DEMO/i }
      ]
    }).select('_id');
    const excludedIds = excludedUsers.map(u => u._id);

    const isExitedTab = req.query.employmentStatus === 'exited' || req.query.status === 'exited' ||
      req.query.status === 'Former Staff' || req.query.status === 'Former Employee' ||
      req.query.employmentStatus === 'inactive' || req.query.status === 'inactive';

    let userFilter = { _id: { $nin: excludedIds } };
    if (isExitedTab) {
      userFilter.$or = [
        { status: { $in: ['Exited', 'Inactive', 'Suspended', 'Former Employee'] } },
        { employmentStatus: { $in: ['Former Staff', 'Former Employee', 'Exited'] } }
      ];
    } else {
      userFilter.status = { $nin: ['Suspended', 'Exited', 'Inactive', 'Former Employee'] };
      userFilter.employmentStatus = { $nin: ['Former Staff', 'Former Employee', 'Exited'] };
    }

    const targetUsers = await User.find(userFilter)
      .select('name email employeeId role status employmentStatus lastWorkingDay joinedDate avatar branch')
      .lean();

    const targetUserIds = targetUsers.map(u => u._id);
    const userEmails = targetUsers.map(u => (u.email || '').toLowerCase().trim()).filter(Boolean);
    const userEmpIds = targetUsers.map(u => (u.employeeId || '').toUpperCase().trim()).filter(Boolean);

    const empJoiningRecords = await Employee.find({
      $or: [
        { email: { $in: userEmails } },
        { employeeId: { $in: userEmpIds } }
      ]
    }).lean();

    const empByEmail = {};
    const empByEmpId = {};
    empJoiningRecords.forEach(e => {
      if (e.email) empByEmail[e.email.toLowerCase().trim()] = e;
      if (e.employeeId) empByEmpId[e.employeeId.toUpperCase().trim()] = e;
    });

    const getJoiningData = (user) => {
      if (!user) return null;
      if (user.employeeId && empByEmpId[user.employeeId.toUpperCase().trim()]) {
        return empByEmpId[user.employeeId.toUpperCase().trim()];
      }
      if (user.email && empByEmail[user.email.toLowerCase().trim()]) {
        return empByEmail[user.email.toLowerCase().trim()];
      }
      return null;
    };

    const extractMonthlySalary = (joiningData) => {
      if (!joiningData) return 0;
      const cleanNum = (str) => {
        if (!str) return 0;
        if (typeof str === 'number') return str;
        const c = String(str).replace(/[₹,\s]/g, '');
        const n = parseFloat(c);
        return isNaN(n) ? 0 : n;
      };
      let sal = cleanNum(joiningData.salaryOffered || joiningData.offeredCTC || joiningData.currentCTC);
      if (sal > 100000) {
        return Math.round(sal / 12);
      }
      return sal;
    };

    // Ensure all target employees have a payroll profile
    const existingProfiles = await EmployeePayrollProfile.find({ user: { $in: targetUserIds } });
    const existingUserIdsSet = new Set(existingProfiles.map(p => p.user.toString()));

    for (const u of targetUsers) {
      if (!existingUserIdsSet.has(u._id.toString()) && defaultCompany) {
        const joiningData = getJoiningData(u);
        const sal = extractMonthlySalary(joiningData);
        try {
          await EmployeePayrollProfile.create({
            user: u._id,
            company: defaultCompany._id,
            branch: u.branch,
            grossSalary: sal,
            annualCTC: sal * 12,
            statutory: {
              panNumber: joiningData?.panNumber || joiningData?.panCardNumber || joiningData?.pan || 'N/A',
              taxRegime: 'new'
            },
            bank: {
              bankName: joiningData?.bankName || 'HDFC Bank',
              accountNumber: joiningData?.accountNumber || 'N/A',
              ifscCode: joiningData?.ifscCode || 'N/A',
              accountHolderName: joiningData?.accountHolderName || joiningData?.fullName || u.name,
              paymentMode: 'bank_transfer'
            },
            status: isExitedTab ? 'exited' : 'active'
          });
        } catch (_) {}
      }
    }

    const mongoose = require('mongoose');
    const isValidObjectId = (id) => id && id !== 'undefined' && id !== 'null' && id !== '' && mongoose.Types.ObjectId.isValid(id);

    const query = { user: { $in: targetUserIds } };
    if (isValidObjectId(companyId)) query.company = companyId;
    if (isValidObjectId(branchId)) query.branch = branchId;
    if (status && !isExitedTab) query.status = status;

    let profiles = await EmployeePayrollProfile.find(query)
      .populate('user', 'name email employeeId role status employmentStatus lastWorkingDay joinedDate avatar')
      .populate('branch', 'name code state')
      .populate('salaryStructure', 'name code')
      .sort({ createdAt: -1 });

    // Sync bank & salary from Employee joining form if empty
    profiles = profiles.map(p => {
      const pObj = p.toObject();
      const joiningData = getJoiningData(p.user);
      if (joiningData) {
        let modified = false;
        if (!pObj.bank?.accountNumber || pObj.bank.accountNumber === 'N/A') {
          pObj.bank = {
            bankName: joiningData.bankName || pObj.bank?.bankName || 'HDFC Bank',
            accountNumber: joiningData.accountNumber || pObj.bank?.accountNumber || 'N/A',
            ifscCode: joiningData.ifscCode || pObj.bank?.ifscCode || 'N/A',
            accountHolderName: joiningData.accountHolderName || joiningData.fullName || pObj.user?.name || '',
            paymentMode: 'bank_transfer'
          };
          modified = true;
        }
        if (!pObj.grossSalary || pObj.grossSalary === 0) {
          const sal = extractMonthlySalary(joiningData);
          if (sal > 0) {
            pObj.grossSalary = sal;
            pObj.annualCTC = sal * 12;
            modified = true;
          }
        }
        if (!pObj.statutory?.panNumber || pObj.statutory.panNumber === 'N/A') {
          pObj.statutory = {
            ...pObj.statutory,
            panNumber: joiningData.panNumber || joiningData.panCardNumber || joiningData.pan || pObj.statutory?.panNumber || 'N/A'
          };
          modified = true;
        }
        if (modified) {
          EmployeePayrollProfile.updateOne(
            { _id: p._id },
            { $set: { grossSalary: pObj.grossSalary, annualCTC: pObj.annualCTC, bank: pObj.bank, statutory: pObj.statutory } }
          ).catch(() => {});
        }
      }

      // Keep profile status synchronized with user account status
      const uStatus = pObj.user?.status;
      const uEmpStatus = pObj.user?.employmentStatus;
      if (['Suspended', 'Inactive', 'Former Employee', 'Exited'].includes(uStatus) ||
          ['Former Employee', 'Former Staff', 'Exited'].includes(uEmpStatus)) {
        pObj.status = (uStatus === 'Former Employee' || uEmpStatus === 'Former Employee' || uStatus === 'Exited') ? 'exited' : 'inactive';
      } else if (uStatus === 'On Leave' || uEmpStatus === 'On Leave') {
        pObj.status = 'on_hold';
      } else {
        pObj.status = 'active';
      }

      return pObj;
    });

    res.json(profiles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateEmployeeProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    let existing = await EmployeePayrollProfile.findById(id);
    if (!existing) {
      existing = await EmployeePayrollProfile.findOne({ user: id });
    }
    if (!existing) {
      const defaultCompany = await Company.findOne({ isPayrollTenant: true }) || await Company.findOne();
      existing = new EmployeePayrollProfile({
        user: id,
        company: data.company || defaultCompany?._id,
        grossSalary: Number(data.grossSalary) || 0,
        annualCTC: Number(data.annualCTC) || (Number(data.grossSalary) * 12) || 0,
        status: data.status || 'active'
      });
    }

    if (data.grossSalary !== undefined) {
      const newGross = Number(data.grossSalary);
      if (existing.grossSalary !== newGross && newGross > 0) {
        if (!existing.revisions) existing.revisions = [];
        existing.revisions.push({
          effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : new Date(),
          grossSalary: newGross,
          annualCTC: Number(data.annualCTC) || (newGross * 12),
          reason: data.incrementReason || data.reason || 'Increment / Salary Revision',
          revisedBy: req.user?._id,
          createdAt: new Date()
        });
      }
      existing.grossSalary = newGross;
      existing.annualCTC = Number(data.annualCTC) || (newGross * 12);
    }
    if (data.statutory) {
      existing.statutory = {
        ...(existing.statutory ? (typeof existing.statutory.toObject === 'function' ? existing.statutory.toObject() : existing.statutory) : {}),
        ...data.statutory
      };
    }
    if (data.bank) {
      existing.bank = {
        ...(existing.bank ? (typeof existing.bank.toObject === 'function' ? existing.bank.toObject() : existing.bank) : {}),
        ...data.bank
      };
    }
    if (data.status) existing.status = data.status;

    await existing.save();

    // Sync statutory opt-out to Salary collection so Salary and Payroll are always in lockstep
    if (existing.user && data.statutory) {
      try {
        const Salary = require('../models/Salary');
        const syncUpdates = {};
        if (data.statutory.isPFExempt !== undefined) syncUpdates.isPFExempt = Boolean(data.statutory.isPFExempt);
        if (data.statutory.isESIExempt !== undefined) syncUpdates.isESIExempt = Boolean(data.statutory.isESIExempt);
        if (data.statutory.isPTExempt !== undefined) syncUpdates.isPTExempt = Boolean(data.statutory.isPTExempt);
        if (Object.keys(syncUpdates).length > 0) {
          await Salary.updateMany({ user: existing.user }, { $set: syncUpdates });

          const PayrollEmployeeRecord = require('../models/PayrollEmployeeRecord');
          const currentMonth = new Date().getMonth() + 1;
          const currentYear = new Date().getFullYear();
          const payslips = await PayrollEmployeeRecord.find({ user: existing.user, month: currentMonth, year: currentYear });
          for (const ps of payslips) {
            if (!ps.statutoryDetails) ps.statutoryDetails = {};
            if (data.statutory.isPFExempt !== undefined) ps.statutoryDetails.isPFExempt = Boolean(data.statutory.isPFExempt);
            if (data.statutory.isESIExempt !== undefined) ps.statutoryDetails.isESIExempt = Boolean(data.statutory.isESIExempt);

            if (data.statutory.isPFExempt !== undefined) {
              const isExempt = Boolean(data.statutory.isPFExempt);
              if (Array.isArray(ps.deductions)) {
                let pfDed = ps.deductions.find(d => d.code === 'PF_EE');
                if (pfDed) {
                  pfDed.name = isExempt ? 'Provident Fund (Opted Out)' : 'Provident Fund (EPF)';
                  pfDed.amount = isExempt ? 0 : Math.round(((ps.grossEarned || 0) * 0.5 * 0.12));
                }
              }
              if (Array.isArray(ps.employerContributions)) {
                let pfEr = ps.employerContributions.find(d => d.code === 'PF_ER');
                if (pfEr) {
                  pfEr.name = isExempt ? 'Employer EPF (Opted Out)' : 'Employer EPF';
                  pfEr.amount = isExempt ? 0 : Math.round(((ps.grossEarned || 0) * 0.5 * 0.12));
                }
              }
              ps.totalDeductions = (ps.deductions || []).reduce((sum, d) => sum + (d.amount || 0), 0);
              ps.netSalary = Math.max(0, (ps.grossEarned || 0) - ps.totalDeductions);
            }
            await ps.save();
          }
        }
      } catch (_) {}
    }

    // Also update Employee joining form record so both stay 100% in sync
    const populated = await EmployeePayrollProfile.findById(existing._id).populate('user', 'email employeeId name');
    if (populated?.user) {
      const Employee = require('../models/Employee');
      const orFilter = [];
      if (populated.user.employeeId) orFilter.push({ employeeId: populated.user.employeeId });
      if (populated.user.email) orFilter.push({ email: populated.user.email.toLowerCase().trim() });
      if (orFilter.length > 0) {
        await Employee.updateMany(
          { $or: orFilter },
          {
            $set: {
              bankName: existing.bank?.bankName,
              accountNumber: existing.bank?.accountNumber,
              ifscCode: existing.bank?.ifscCode,
              accountHolderName: existing.bank?.accountHolderName,
              panNumber: existing.statutory?.panNumber,
              salaryOffered: String(existing.grossSalary),
              offeredCTC: String(existing.annualCTC)
            }
          }
        );
      }
    }

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
    const { companyId, branchId, month, year, baseDays = 30, includedEmployeeIds } = req.body;
    const calcMonth = Number(month);
    const calcYear = Number(year);

    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    // Exclude suspended and demo users
    const User = require('../models/User');
    const excludedUsers = await User.find({
      $or: [
        { status: 'Suspended' },
        { isDemoAccount: true },
        { employeeId: /^DEMO/i }
      ]
    }).select('_id');
    const excludedIds = excludedUsers.map(u => u._id.toString());

    // Fetch Statutory Config
    const statConfig = await StatutoryConfig.findOne({ company: company._id }) || {
      epf: { employeeRate: 12, employerRate: 12, wageCeiling: 15000, isCappedAtCeiling: true },
      esic: { employeeRate: 0.75, employerRate: 3.25, wageCeiling: 21000 },
      ptSlabs: [{ minSalary: 15000, taxAmount: 200, specialFebAmount: 300 }]
    };

    const mongoose = require('mongoose');
    const isValidObjectId = (id) => id && id !== 'undefined' && id !== 'null' && id !== '' && mongoose.Types.ObjectId.isValid(id);

    // Find or create PayrollRun
    const runFilter = { company: company._id, month: calcMonth, year: calcYear };
    if (isValidObjectId(branchId)) runFilter.branch = branchId;
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

    // Fetch Eligible Profiles (Active, non-suspended, non-demo)
    const profileQuery = { company: company._id, status: 'active' };
    if (isValidObjectId(branchId)) profileQuery.branch = branchId;
    const allProfiles = await EmployeePayrollProfile.find(profileQuery).populate('user');

    // Filter profiles: remove suspended/demo/exited and restrict to includedEmployeeIds if provided
    const profiles = allProfiles.filter(p => {
      if (!p.user) return false;
      const uId = p.user._id ? p.user._id.toString() : '';
      const profId = p._id.toString();
      if (excludedIds.includes(uId)) return false;
      if (p.status === 'exited' || p.exitDetails?.isExited) return false;
      if (['Suspended', 'Exited', 'Inactive', 'Former Employee'].includes(p.user.status)) return false;
      if (['Former Staff', 'Former Employee', 'Exited'].includes(p.user.employmentStatus)) return false;
      if (p.user.isDemoAccount) return false;
      if (p.user.employeeId && p.user.employeeId.toUpperCase().startsWith('DEMO')) return false;

      if (Array.isArray(includedEmployeeIds) && includedEmployeeIds.length > 0) {
        return includedEmployeeIds.includes(uId) || includedEmployeeIds.includes(profId);
      }
      return true;
    });

    // Remove existing draft employee records for this run
    await PayrollEmployeeRecord.deleteMany({ payrollRun: run._id });

    let runTotalGross = 0;
    let runTotalIncentives = 0;
    let runTotalDeductions = 0;
    let runTotalNet = 0;
    let runTotalEmployerCost = 0;

    const startDate = new Date(calcYear, calcMonth - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(calcYear, calcMonth, 0, 23, 59, 59, 999);

    const records = [];

    for (const p of profiles) {
      if (!p.user) continue;

      // Support increment revisions: take the latest revision effective on or before this month's end
      let effectiveGross = p.grossSalary || 0;
      if (Array.isArray(p.revisions) && p.revisions.length > 0) {
        const applicableRevs = p.revisions
          .filter(r => r.effectiveDate && new Date(r.effectiveDate) <= endDate)
          .sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate));
        if (applicableRevs.length > 0 && applicableRevs[0].grossSalary > 0) {
          effectiveGross = applicableRevs[0].grossSalary;
        }
      }

      const monthlyGross = effectiveGross;
      const perDaySalary = monthlyGross / baseDays;

      // Check if employee joined during this month (prorate base days)
      let employeeBaseDays = baseDays;
      if (p.user.joinedDate) {
        const jd = new Date(p.user.joinedDate);
        if (jd > startDate && jd <= endDate) {
          const joinedDay = jd.getDate();
          employeeBaseDays = Math.max(1, baseDays - joinedDay + 1);
        }
      }

      // Sync Attendance for Month from Attendance module
      const attendances = await Attendance.find({
        user: p.user._id,
        date: { $gte: startDate, $lte: endDate }
      });

      let presentCount = 0;
      let lopDays = 0;
      attendances.forEach(a => {
        const st = (a.status || '').toLowerCase().trim();
        if (st === 'present' || st === 'wfh') {
          presentCount++;
        } else if (st === 'absent' || st === 'unpaid_leave') {
          lopDays++;
        } else if (st === 'half day') {
          presentCount += 0.5;
          lopDays += 0.5;
        }
      });

      // Also check approved Unpaid Leave from LeaveRequest
      try {
        const LeaveRequest = require('../models/LeaveRequest');
        const unpaidLeaves = await LeaveRequest.find({
          user: p.user._id,
          leaveType: 'Unpaid Leave',
          status: 'Approved',
          fromDate: { $lte: endDate },
          toDate: { $gte: startDate }
        });
        unpaidLeaves.forEach(ul => {
          lopDays += (ul.daysCount || 1);
        });
      } catch (_) {}

      // Default to employeeBaseDays if attendance records are not explicitly marked absent
      const payableDays = Math.max(0, employeeBaseDays - lopDays);
      const lopDeduction = Math.round(perDaySalary * (baseDays - payableDays));
      const earnedGross = Math.max(0, Math.round(perDaySalary * payableDays));

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

      // Advances deduction for this month
      let advanceDeduction = 0;
      if (Array.isArray(p.advancesAndRecoveries)) {
        p.advancesAndRecoveries.forEach(adv => {
          if (adv.status === 'active' && adv.balanceAmount > 0) {
            const deduct = Math.min(adv.monthlyDeduction || 0, adv.balanceAmount);
            advanceDeduction += deduct;
          }
        });
      }

      // Approved Reimbursements
      let reimbursementEarned = 0;
      const currentMonthKey = `${calcYear}-${String(calcMonth).padStart(2, '0')}`;
      if (Array.isArray(p.reimbursements)) {
        p.reimbursements.forEach(rem => {
          if (rem.status === 'approved' && (!rem.paidInPayrollMonth || rem.paidInPayrollMonth === currentMonthKey)) {
            reimbursementEarned += (rem.approvedAmount || rem.amount || 0);
          }
        });
      }

      const totalEarnedGross = earnedGross + incentiveEarned + reimbursementEarned;

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
      const isEsiExempt = Boolean(p.statutory?.isESIExempt || p.statutory?.isPFExempt);
      if (!isEsiExempt && monthlyGross <= statConfig.esic.wageCeiling) {
        esiEmployee = Math.round((earnedGross * statConfig.esic.employeeRate) / 100);
        esiEmployer = Math.round((earnedGross * statConfig.esic.employerRate) / 100);
      }

      let pt = 0;
      if (!p.statutory?.isPTExempt && earnedGross >= 15000) {
        pt = calcMonth === 2 ? 300 : 200; // Karnataka PT rule: ₹300 in February
      }

      const totalDeductions = pfEmployee + esiEmployee + pt + advanceDeduction;
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
          ...(incentiveEarned > 0 ? [{ code: 'INCENTIVE', name: 'Recruitment Placement Incentive', standardAmount: 0, earnedAmount: incentiveEarned }] : []),
          ...(reimbursementEarned > 0 ? [{ code: 'REIMBURSEMENT', name: 'Expense Reimbursement', standardAmount: 0, earnedAmount: reimbursementEarned }] : [])
        ],
        deductions: [
          { code: 'PF_EE', name: p.statutory?.isPFExempt ? 'Provident Fund (Opted Out)' : 'Provident Fund (EPF)', amount: pfEmployee },
          { code: 'ESI_EE', name: 'Employee State Insurance (ESIC)', amount: esiEmployee },
          { code: 'PT', name: 'Professional Tax (PT)', amount: pt },
          ...(advanceDeduction > 0 ? [{ code: 'ADVANCE_REC', name: 'Salary Advance / Recovery', amount: advanceDeduction }] : [])
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

    // Exclude suspended and demo users unless specifically queried by user
    if (!query.user) {
      const User = require('../models/User');
      const excludedUsers = await User.find({
        $or: [
          { status: 'Suspended' },
          { isDemoAccount: true },
          { employeeId: /^DEMO/i }
        ]
      }).select('_id');
      const excludedIds = excludedUsers.map(u => u._id);
      query.user = { $nin: excludedIds };
    }

    const records = await PayrollEmployeeRecord.find(query)
      .populate('company', 'companyName legalName logo address gstin cin pan')
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

// ─── 12. Payment Tracking & Disbursal ──────────────────────────────────
exports.recordPayment = async (req, res) => {
  try {
    const { recordIds, runId, paymentMode = 'bank_transfer', utrNumber, paymentDate = new Date(), reference } = req.body;
    if (!utrNumber) {
      return res.status(400).json({ message: 'UTR / Transaction Reference number is required for payment tracking' });
    }

    const filter = {};
    if (Array.isArray(recordIds) && recordIds.length > 0) {
      filter._id = { $in: recordIds };
    } else if (runId) {
      filter.payrollRun = runId;
    } else {
      return res.status(400).json({ message: 'Either recordIds or runId must be provided' });
    }

    const updateData = {
      paymentStatus: 'PAID',
      paymentDetails: {
        paymentMode,
        utrNumber,
        paymentDate: new Date(paymentDate),
        reference: reference || utrNumber,
        paidBy: req.user?._id
      }
    };

    const updateResult = await PayrollEmployeeRecord.updateMany(filter, { $set: updateData });

    // If runId provided or records belong to a run, check if all records are paid
    if (runId) {
      const unpaidCount = await PayrollEmployeeRecord.countDocuments({
        payrollRun: runId,
        paymentStatus: { $ne: 'PAID' }
      });
      if (unpaidCount === 0) {
        await PayrollRun.findByIdAndUpdate(runId, {
          status: 'PAID',
          paidAt: new Date(paymentDate)
        });
      }
    }

    res.json({
      success: true,
      message: `Payment recorded successfully for ${updateResult.modifiedCount} payslip records`,
      modifiedCount: updateResult.modifiedCount
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── 13. Permanent Employee Financial History ─────────────────────────
exports.getEmployeeFinancialHistory = async (req, res) => {
  try {
    const { id } = req.params; // Can be user _id or employeeId string
    let user = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id).select('name email employeeId role status employmentStatus joinedDate branch avatar lastWorkingDay');
    }
    if (!user) {
      user = await User.findOne({
        $or: [
          { employeeId: id.trim() },
          { employeeId: { $regex: new RegExp(`^${id.trim()}$`, 'i') } }
        ]
      }).select('name email employeeId role status employmentStatus joinedDate branch avatar lastWorkingDay');
    }

    if (!user) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Role-based access control: regular users only see their own history
    if (req.user && !['admin', 'manager', 'hr'].includes(req.user.role)) {
      if (req.user._id.toString() !== user._id.toString()) {
        return res.status(403).json({ message: 'Unauthorized to view financial history of another employee' });
      }
    }

    const profile = await EmployeePayrollProfile.findOne({ user: user._id })
      .populate('salaryStructure', 'name code')
      .populate('branch', 'name code state')
      .populate('exitDetails.settlementId');

    const payslips = await PayrollEmployeeRecord.find({ user: user._id })
      .sort({ year: -1, month: -1 });

    const lifetimeGross = payslips.reduce((sum, p) => sum + (p.grossEarned || 0), 0);
    const lifetimeNet = payslips.reduce((sum, p) => sum + (p.netSalary || 0), 0);
    const lifetimeDeductions = payslips.reduce((sum, p) => sum + (p.totalDeductions || 0), 0);
    const lifetimeEmployerCost = payslips.reduce((sum, p) => sum + (p.totalEmployerCost || 0), 0);
    const lifetimeIncentives = payslips.reduce((sum, p) => sum + (p.incentiveAmount || 0), 0);

    const settlement = await Settlement.findOne({
      $or: [{ user: user._id }, { employeeId: user.employeeId }]
    });

    const recruiterIncentives = await RecruitmentIncentive.find({ recruiter: user._id })
      .sort({ createdAt: -1 });

    res.json({
      employee: {
        _id: user._id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId,
        role: user.role,
        status: user.status,
        employmentStatus: user.employmentStatus,
        joinedDate: user.joinedDate,
        lastWorkingDay: user.lastWorkingDay
      },
      profile,
      summary: {
        lifetimeGross,
        lifetimeNet,
        lifetimeDeductions,
        lifetimeEmployerCost,
        lifetimeIncentives,
        payslipCount: payslips.length,
        currentGrossSalary: profile?.grossSalary || 0,
        currentAnnualCTC: profile?.annualCTC || 0,
        salaryRevisionsCount: profile?.revisions?.length || 0,
        isExited: Boolean(profile?.exitDetails?.isExited || settlement || user.employmentStatus === 'Former Staff')
      },
      revisions: profile?.revisions || [],
      payslips,
      advances: profile?.advancesAndRecoveries || [],
      reimbursements: profile?.reimbursements || [],
      settlement,
      recruiterIncentives
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── 14. Salary Revisions & Effective Dating ───────────────────────────
exports.addSalaryRevision = async (req, res) => {
  try {
    const { id } = req.params;
    const { grossSalary, annualCTC, effectiveDate = new Date(), reason } = req.body;
    if (!grossSalary || grossSalary <= 0) {
      return res.status(400).json({ message: 'Valid gross salary is required' });
    }

    const profile = await EmployeePayrollProfile.findOne({
      $or: [{ _id: mongoose.Types.ObjectId.isValid(id) ? id : null }, { user: mongoose.Types.ObjectId.isValid(id) ? id : null }]
    });
    if (!profile) return res.status(404).json({ message: 'Employee payroll profile not found' });

    const computedCTC = annualCTC || (grossSalary * 12);
    const revision = {
      effectiveDate: new Date(effectiveDate),
      grossSalary: Number(grossSalary),
      annualCTC: Number(computedCTC),
      reason: reason || 'Annual Increment / Performance Review',
      revisedBy: req.user?._id,
      createdAt: new Date()
    };

    profile.revisions.push(revision);
    profile.grossSalary = Number(grossSalary);
    profile.annualCTC = Number(computedCTC);
    await profile.save();

    // Also update Employee joining form record
    try {
      const Employee = require('../models/Employee');
      await Employee.updateMany(
        { $or: [{ employeeId: profile.user?.employeeId }, { email: profile.user?.email }] },
        { $set: { salaryOffered: String(grossSalary), offeredCTC: String(computedCTC) } }
      );
    } catch (_) {}

    res.json({
      success: true,
      message: `Salary revised to ₹${grossSalary.toLocaleString('en-IN')}/mo effective from ${new Date(effectiveDate).toLocaleDateString()}`,
      profile
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── 15. Advances, Recoveries & Reimbursements ─────────────────────────
exports.addAdvanceOrRecovery = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, totalAmount, monthlyDeduction, disbursedDate = new Date(), notes } = req.body;
    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ message: 'Valid total advance amount is required' });
    }

    const profile = await EmployeePayrollProfile.findOne({
      $or: [{ _id: mongoose.Types.ObjectId.isValid(id) ? id : null }, { user: mongoose.Types.ObjectId.isValid(id) ? id : null }]
    });
    if (!profile) return res.status(404).json({ message: 'Employee payroll profile not found' });

    const newAdvance = {
      title: title || 'Salary Advance',
      totalAmount: Number(totalAmount),
      balanceAmount: Number(totalAmount),
      monthlyDeduction: Number(monthlyDeduction) || Math.round(Number(totalAmount) / 3),
      disbursedDate: new Date(disbursedDate),
      status: 'active',
      notes
    };

    profile.advancesAndRecoveries.push(newAdvance);
    await profile.save();

    res.json({
      success: true,
      message: 'Advance recorded successfully',
      advance: newAdvance,
      advances: profile.advancesAndRecoveries
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.claimReimbursement = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, amount, claimDate = new Date(), remarks } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid reimbursement amount is required' });
    }

    const profile = await EmployeePayrollProfile.findOne({
      $or: [{ _id: mongoose.Types.ObjectId.isValid(id) ? id : null }, { user: mongoose.Types.ObjectId.isValid(id) ? id : null }]
    });
    if (!profile) return res.status(404).json({ message: 'Employee payroll profile not found' });

    const newClaim = {
      category: category || 'Travel & Client Expense',
      amount: Number(amount),
      approvedAmount: Number(amount),
      claimDate: new Date(claimDate),
      status: 'pending',
      remarks
    };

    profile.reimbursements.push(newClaim);
    await profile.save();

    res.json({
      success: true,
      message: 'Reimbursement claim submitted',
      reimbursements: profile.reimbursements
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateReimbursementStatus = async (req, res) => {
  try {
    const { id, reimbursementId } = req.params;
    const { status, approvedAmount, paidInPayrollMonth, remarks } = req.body;

    const profile = await EmployeePayrollProfile.findOne({
      $or: [{ _id: mongoose.Types.ObjectId.isValid(id) ? id : null }, { user: mongoose.Types.ObjectId.isValid(id) ? id : null }]
    });
    if (!profile) return res.status(404).json({ message: 'Employee payroll profile not found' });

    const claim = profile.reimbursements.id(reimbursementId);
    if (!claim) return res.status(404).json({ message: 'Reimbursement claim not found' });

    if (status) claim.status = status;
    if (approvedAmount !== undefined) claim.approvedAmount = Number(approvedAmount);
    if (paidInPayrollMonth) claim.paidInPayrollMonth = paidInPayrollMonth;
    if (remarks) claim.remarks = remarks;

    await profile.save();

    res.json({ success: true, message: 'Reimbursement updated', claim });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── 16. Exit Automation & Full-and-Final Settlement ──────────────────
exports.initiateResignation = async (req, res) => {
  try {
    const { userId, resignationDate, noticePeriodDays = 30, lastWorkingDay, exitReason } = req.body;
    const profile = await EmployeePayrollProfile.findOne({ user: userId });
    if (!profile) return res.status(404).json({ message: 'Employee payroll profile not found' });

    const rDate = resignationDate ? new Date(resignationDate) : new Date();
    let lwd = lastWorkingDay ? new Date(lastWorkingDay) : new Date(rDate);
    if (!lastWorkingDay) {
      lwd.setDate(lwd.getDate() + Number(noticePeriodDays));
    }

    profile.exitDetails = {
      isExited: false,
      resignationDate: rDate,
      lastWorkingDay: lwd,
      exitReason: exitReason || 'Voluntary Resignation',
      exitStatus: 'notice_period'
    };
    await profile.save();

    await User.findByIdAndUpdate(userId, {
      $set: {
        employmentStatus: 'Notice Period',
        lastWorkingDay: lwd
      }
    });

    res.json({
      success: true,
      message: 'Resignation initiated. Notice period active until ' + lwd.toISOString().split('T')[0],
      profile
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.calculateSettlementPreview = async (req, res) => {
  try {
    const {
      userId,
      resignationDate,
      lastWorkingDay,
      noticePeriodDays = 30,
      noticeServedDays = 30,
      unpaidSalaryDays = 0,
      bonus = 0,
      otherPayable = 0,
      otherPayableRemark = '',
      assetDamage = 0,
      otherDeductions = 0,
      otherDeductionRemark = ''
    } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const profile = await EmployeePayrollProfile.findOne({ user: userId });
    const monthlyGross = profile?.grossSalary || 0;
    const basicSalary = Math.round(monthlyGross * 0.50);
    const perDayGross = monthlyGross / 30;
    const perDayBasic = basicSalary / 30;

    // 1. Unpaid salary amount
    const unpaidSalaryAmount = Math.round(perDayGross * (Number(unpaidSalaryDays) || 0));

    // 2. Notice shortfall
    const shortfallDays = Math.max(0, Number(noticePeriodDays) - Number(noticeServedDays));
    const noticeShortfallAmount = Math.round(perDayGross * shortfallDays);

    // 3. Leave Encashment calculation
    let accruedLeaves = 0;
    const joinDate = user.joinedDate ? new Date(user.joinedDate) : new Date();
    const lwdDate = lastWorkingDay ? new Date(lastWorkingDay) : new Date();
    const serviceMonths = Math.max(1, Math.round((lwdDate - joinDate) / (1000 * 60 * 60 * 24 * 30.4375)));
    accruedLeaves = Math.min(18, Math.round(serviceMonths * 1.5));
    const leaveEncashmentAmount = Math.round(perDayBasic * accruedLeaves);

    // 4. Gratuity (if tenure >= 5 years / 60 months)
    let gratuityAmount = 0;
    const completedYears = Math.floor(serviceMonths / 12);
    if (completedYears >= 5) {
      gratuityAmount = Math.round((15 * (basicSalary / 26)) * completedYears);
    }

    // 5. Pending approved placement incentives
    const pendingIncentivesDocs = await RecruitmentIncentive.find({
      recruiter: user._id,
      status: { $in: ['APPROVED_FOR_PAYROLL', 'RETENTION_PASSED'] }
    });
    const pendingIncentives = pendingIncentivesDocs.reduce((s, i) => s + (i.incentiveAmount || 0), 0);

    // 6. Outstanding advances balance
    let advanceRecovery = 0;
    if (profile?.advancesAndRecoveries) {
      advanceRecovery = profile.advancesAndRecoveries
        .filter(a => a.status === 'active')
        .reduce((s, a) => s + (a.balanceAmount || 0), 0);
    }

    // 7. Statutory deductions
    let professionalTax = unpaidSalaryAmount >= 15000 ? 200 : 0;
    let providentFund = 0;
    if (!profile?.statutory?.isPFExempt && unpaidSalaryAmount > 0) {
      const unpaidBasic = Math.round(unpaidSalaryAmount * 0.5);
      providentFund = Math.round(Math.min(unpaidBasic, 15000) * 0.12);
    }

    const totalPayable = unpaidSalaryAmount + leaveEncashmentAmount + gratuityAmount + pendingIncentives + Number(bonus) + Number(otherPayable);
    const totalDeductions = noticeShortfallAmount + advanceRecovery + Number(assetDamage) + professionalTax + providentFund + Number(otherDeductions);
    const netSettlementAmount = Math.max(0, totalPayable - totalDeductions);

    res.json({
      employee: {
        userId: user._id,
        employeeId: user.employeeId,
        name: user.name,
        role: user.role,
        joinedDate: user.joinedDate
      },
      salary: {
        monthlyGross,
        basicSalary,
        perDayGross: Math.round(perDayGross),
        perDayBasic: Math.round(perDayBasic)
      },
      payable: {
        unpaidSalaryDays: Number(unpaidSalaryDays) || 0,
        unpaidSalaryAmount,
        leaveEncashmentDays: accruedLeaves,
        leaveEncashmentAmount,
        gratuityAmount,
        completedYears,
        pendingIncentives,
        bonus: Number(bonus),
        otherPayable: Number(otherPayable),
        otherPayableRemark,
        totalPayable
      },
      deductions: {
        noticePeriodDays: Number(noticePeriodDays),
        noticeServedDays: Number(noticeServedDays),
        noticeShortfallDays: shortfallDays,
        noticeShortfallAmount,
        advanceRecovery,
        assetDamage: Number(assetDamage),
        professionalTax,
        providentFund,
        otherDeductions: Number(otherDeductions),
        otherDeductionRemark,
        totalDeductions
      },
      netSettlementAmount,
      netSettlementInWords: numberToWords(netSettlementAmount)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.finalizeSettlement = async (req, res) => {
  try {
    const {
      userId,
      resignationDate,
      lastWorkingDay,
      exitReason,
      noticePeriodDays,
      noticeServedDays,
      payable,
      deductions,
      netSettlementAmount,
      clearances
    } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const company = await Company.findOne({ isPayrollTenant: true }) || await Company.findOne();

    let settlement = await Settlement.findOne({ user: user._id });
    if (!settlement) {
      settlement = new Settlement({
        user: user._id,
        employeeId: user.employeeId || 'EMP-' + user._id.toString().slice(-4),
        employeeName: user.name,
        designation: user.role,
        department: 'Recruitment & Operations',
        company: company._id,
        branch: user.branch,
        joiningDate: user.joinedDate || new Date(),
        resignationDate: resignationDate ? new Date(resignationDate) : new Date(),
        lastWorkingDay: lastWorkingDay ? new Date(lastWorkingDay) : new Date(),
        exitReason: exitReason || 'Resignation',
        noticePeriodDays: Number(noticePeriodDays) || 30,
        noticeServedDays: Number(noticeServedDays) || 30,
        noticeShortfallDays: Math.max(0, (Number(noticePeriodDays) || 30) - (Number(noticeServedDays) || 30)),
        payable,
        deductions,
        netSettlementAmount: Number(netSettlementAmount) || 0,
        netSettlementInWords: numberToWords(Number(netSettlementAmount) || 0),
        status: 'APPROVED',
        settledBy: req.user?._id,
        approvedBy: req.user?._id,
        approvedAt: new Date(),
        clearances: clearances || { itAssets: true, accounts: true, hr: true, department: true }
      });
    } else {
      settlement.resignationDate = resignationDate ? new Date(resignationDate) : settlement.resignationDate;
      settlement.lastWorkingDay = lastWorkingDay ? new Date(lastWorkingDay) : settlement.lastWorkingDay;
      settlement.exitReason = exitReason || settlement.exitReason;
      settlement.payable = payable;
      settlement.deductions = deductions;
      settlement.netSettlementAmount = Number(netSettlementAmount) || 0;
      settlement.netSettlementInWords = numberToWords(Number(netSettlementAmount) || 0);
      settlement.status = 'APPROVED';
      settlement.approvedBy = req.user?._id;
      settlement.approvedAt = new Date();
      if (clearances) settlement.clearances = clearances;
    }

    await settlement.save();

    // Update EmployeePayrollProfile: mark exited, link settlementId
    await EmployeePayrollProfile.findOneAndUpdate(
      { user: user._id },
      {
        $set: {
          status: 'exited',
          'exitDetails.isExited': true,
          'exitDetails.exitStatus': 'settled',
          'exitDetails.resignationDate': settlement.resignationDate,
          'exitDetails.lastWorkingDay': settlement.lastWorkingDay,
          'exitDetails.exitReason': settlement.exitReason,
          'exitDetails.settlementId': settlement._id
        }
      }
    );

    // Update User: mark employmentStatus 'Former Staff', revoke active login
    user.status = 'Inactive';
    user.employmentStatus = 'Former Staff';
    user.lastWorkingDay = settlement.lastWorkingDay;
    await user.save();

    // Mark any advances as settled/cancelled
    await EmployeePayrollProfile.updateOne(
      { user: user._id },
      { $set: { 'advancesAndRecoveries.$[elem].status': 'repaid' } },
      { arrayFilters: [{ 'elem.status': 'active' }] }
    );

    res.json({
      success: true,
      message: `Full-and-Final Settlement generated and approved for ${user.name}. Account marked Former Staff.`,
      settlement
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.recordSettlementDisbursal = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMode = 'bank_transfer', utrNumber, paymentDate = new Date(), paymentRemarks, relievingLetterIssued = true } = req.body;

    const settlement = await Settlement.findById(id);
    if (!settlement) return res.status(404).json({ message: 'Settlement record not found' });

    settlement.status = 'DISBURSED';
    settlement.paymentDetails = {
      paymentMode,
      utrNumber,
      paymentDate: new Date(paymentDate),
      paymentRemarks: paymentRemarks || `UTR: ${utrNumber}`
    };
    settlement.disbursedAt = new Date(paymentDate);
    if (relievingLetterIssued) {
      settlement.relievingLetterIssued = true;
      settlement.experienceCertificateIssued = true;
      settlement.relievingLetterDate = new Date(paymentDate);
    }
    await settlement.save();

    await EmployeePayrollProfile.updateOne(
      { user: settlement.user },
      { $set: { 'exitDetails.exitStatus': 'relieved' } }
    );

    res.json({
      success: true,
      message: 'Settlement disbursal and UTR recorded. Relieving documentation generated.',
      settlement
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateSettlementClearance = async (req, res) => {
  try {
    const { id } = req.params;
    const { clearances, relievingLetterIssued, experienceCertificateIssued } = req.body;
    const settlement = await Settlement.findById(id);
    if (!settlement) return res.status(404).json({ message: 'Settlement not found' });

    if (clearances) settlement.clearances = clearances;
    if (relievingLetterIssued !== undefined) {
      settlement.relievingLetterIssued = relievingLetterIssued;
      if (relievingLetterIssued && !settlement.relievingLetterDate) settlement.relievingLetterDate = new Date();
    }
    if (experienceCertificateIssued !== undefined) settlement.experienceCertificateIssued = experienceCertificateIssued;

    await settlement.save();
    res.json({ success: true, settlement });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.listSettlements = async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { employeeName: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }
    const settlements = await Settlement.find(query)
      .populate('user', 'email avatar joinedDate')
      .populate('approvedBy', 'name role')
      .sort({ createdAt: -1 });

    res.json(settlements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getSettlementById = async (req, res) => {
  try {
    const { id } = req.params;
    const settlement = await Settlement.findById(id)
      .populate('user', 'email avatar joinedDate address phone')
      .populate('company')
      .populate('branch')
      .populate('approvedBy', 'name role');
    if (!settlement) return res.status(404).json({ message: 'Settlement record not found' });
    res.json(settlement);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── 17. Recruitment Revenue Attribution (Attributed, Invoiced, Collected) ──
exports.getRecruitmentRevenueAttribution = async (req, res) => {
  try {
    // 1. Attributed: Joined Candidates
    const joinedCandidates = await Candidate.find({
      $or: [
        { status: { $in: ['Joined', 'Joining', 'Offer Accept'] } },
        { dateOfJoining: { $exists: true, $ne: null } }
      ]
    }).populate('assignedRecruiter', 'name email employeeId');

    let totalAttributedCandidates = 0;
    let totalAttributedCTC = 0;
    let totalAttributedRevenue = 0;

    const recruiterMap = {};

    joinedCandidates.forEach(c => {
      const salVal = parseFloat(c.joiningSalary || c.offerDetails?.joiningSalary || c.offerDetails?.offeredCTC || 300000);
      const ctc = isNaN(salVal) ? 300000 : salVal;
      const pct = parseFloat(c.placementPercentage || c.offerDetails?.placementPercentage || 8.33);
      const rev = Math.round((ctc * pct) / 100);

      totalAttributedCandidates++;
      totalAttributedCTC += ctc;
      totalAttributedRevenue += rev;

      const recId = c.assignedRecruiter?._id?.toString() || 'unassigned';
      const recName = c.assignedRecruiter?.name || c.assignedRecruiterName || 'Unassigned Recruiter';
      if (!recruiterMap[recId]) {
        recruiterMap[recId] = {
          recruiterId: recId,
          recruiterName: recName,
          attributedCount: 0,
          attributedRevenue: 0,
          invoicedCount: 0,
          invoicedRevenue: 0,
          collectedRevenue: 0,
          incentivesEarned: 0,
          incentivesPaid: 0
        };
      }
      recruiterMap[recId].attributedCount++;
      recruiterMap[recId].attributedRevenue += rev;
    });

    // 2. Invoiced & Collected: Invoices from Invoice model
    const invoices = await Invoice.find().populate('candidateRef', 'assignedRecruiter');
    let totalInvoicedAmount = 0;
    let totalCollectedAmount = 0;
    let invoicedCount = 0;
    let collectedCount = 0;

    invoices.forEach(inv => {
      const amt = Number(inv.grandTotal || inv.totalAmount || inv.subTotal || 0);
      totalInvoicedAmount += amt;
      invoicedCount++;

      const isPaid = (inv.status || '').toLowerCase() === 'paid';
      if (isPaid) {
        totalCollectedAmount += amt;
        collectedCount++;
      }

      const candRecId = inv.candidateRef?.assignedRecruiter?.toString();
      if (candRecId && recruiterMap[candRecId]) {
        recruiterMap[candRecId].invoicedCount++;
        recruiterMap[candRecId].invoicedRevenue += amt;
        if (isPaid) {
          recruiterMap[candRecId].collectedRevenue += amt;
        }
      }
    });

    // 3. Incentives
    const incentives = await RecruitmentIncentive.find();
    incentives.forEach(inc => {
      const recId = inc.recruiter?.toString();
      if (recId && recruiterMap[recId]) {
        if (['APPROVED_FOR_PAYROLL', 'PAID_IN_PAYROLL'].includes(inc.status)) {
          recruiterMap[recId].incentivesEarned += (inc.incentiveAmount || 0);
        }
        if (inc.status === 'PAID_IN_PAYROLL') {
          recruiterMap[recId].incentivesPaid += (inc.incentiveAmount || 0);
        }
      }
    });

    res.json({
      pipeline: {
        attributed: {
          candidatesCount: totalAttributedCandidates,
          totalCTC: totalAttributedCTC,
          estimatedRevenue: totalAttributedRevenue,
          label: 'Attributed Pipeline Revenue'
        },
        invoiced: {
          invoicesCount: invoicedCount,
          totalAmount: totalInvoicedAmount,
          label: 'Invoiced Billed Revenue'
        },
        collected: {
          collectedInvoicesCount: collectedCount,
          totalAmount: totalCollectedAmount,
          label: 'Collected Cash-in-Bank'
        }
      },
      recruiterScorecard: Object.values(recruiterMap).sort((a, b) => b.attributedRevenue - a.attributedRevenue)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── 18. Compliance Reports (EPFO ECR, ESIC Return, Bank NEFT, MoM) ───
exports.getComplianceReports = async (req, res) => {
  try {
    const { month, year, companyId, type = 'summary' } = req.query;
    const calcMonth = Number(month) || (new Date().getMonth() + 1);
    const calcYear = Number(year) || new Date().getFullYear();

    const query = { month: calcMonth, year: calcYear };
    if (companyId) query.company = companyId;

    const records = await PayrollEmployeeRecord.find(query)
      .populate('company', 'companyName legalName logo pan address gstin')
      .populate('user', 'employeeId name uan pfNumber esicNumber panNumber');

    // 1. EPFO ECR Format
    const ecrLines = records
      .filter(r => !r.statutoryDetails?.isPFExempt)
      .map(r => {
        const uan = r.statutoryDetails?.uan || '100000000000';
        const name = (r.name || 'Member').toUpperCase().replace(/#/g, '');
        const gross = r.grossEarned || 0;
        const basic = r.earnings?.find(e => e.code === 'BASIC')?.earnedAmount || Math.round(gross * 0.5);
        const epfWage = Math.min(basic, 15000);
        const eeContrib = Math.round(epfWage * 0.12);
        const erEps = Math.round(epfWage * 0.0833);
        const erEpf = Math.max(0, eeContrib - erEps);
        const ncpDays = r.lopDays || 0;
        return `${uan}#${name}#${gross}#${epfWage}#${epfWage}#${epfWage}#${eeContrib}#${erEps}#${erEpf}#${ncpDays}#0`;
      });
    const ecrRawText = ecrLines.join('\r\n');

    // 2. ESIC Return Summary
    const esicRecords = records
      .filter(r => !r.statutoryDetails?.isPFExempt && (r.grossStandard <= 21000 || r.deductions?.some(d => d.code === 'ESI_EE' && d.amount > 0)))
      .map(r => {
        const ipNumber = r.statutoryDetails?.esicNumber || 'N/A';
        const ipName = r.name;
        const paidDays = r.payableDays || 30;
        const totalWages = r.grossEarned || 0;
        const eeESI = r.deductions?.find(d => d.code === 'ESI_EE')?.amount || Math.round(totalWages * 0.0075);
        const erESI = r.employerContributions?.find(e => e.code === 'ESI_ER')?.amount || Math.round(totalWages * 0.0325);
        return { ipNumber, ipName, paidDays, totalWages, eeESI, erESI, totalESI: eeESI + erESI };
      });

    // 3. Bank NEFT Transfer Batch CSV
    const neftRows = [
      'Beneficiary Name,Account Number,IFSC Code,Amount,Payment Mode,Transaction Reference'
    ];
    records.forEach(r => {
      const bName = `"${r.name.replace(/"/g, '""')}"`;
      const acc = `"${r.bankDetails?.accountNumber || ''}"`;
      const ifsc = `"${r.bankDetails?.ifscCode || ''}"`;
      const amt = r.netSalary || 0;
      const ref = `SAL/${calcYear}${String(calcMonth).padStart(2, '0')}/${r.employeeId || 'EMP'}`;
      neftRows.push(`${bName},${acc},${ifsc},${amt},NEFT,${ref}`);
    });
    const neftCsv = neftRows.join('\r\n');

    // 4. MoM Variance Comparison
    let prevMonth = calcMonth - 1;
    let prevYear = calcYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    const prevRecords = await PayrollEmployeeRecord.find({ month: prevMonth, year: prevYear });
    const currentGross = records.reduce((s, r) => s + (r.grossEarned || 0), 0);
    const prevGross = prevRecords.reduce((s, r) => s + (r.grossEarned || 0), 0);
    const currentNet = records.reduce((s, r) => s + (r.netSalary || 0), 0);
    const prevNet = prevRecords.reduce((s, r) => s + (r.netSalary || 0), 0);

    const variance = {
      currentMonth: `${calcYear}-${String(calcMonth).padStart(2, '0')}`,
      prevMonth: `${prevYear}-${String(prevMonth).padStart(2, '0')}`,
      currentHeadcount: records.length,
      prevHeadcount: prevRecords.length,
      headcountDelta: records.length - prevRecords.length,
      currentGross,
      prevGross,
      grossDelta: currentGross - prevGross,
      currentNet,
      prevNet,
      netDelta: currentNet - prevNet
    };

    res.json({
      month: calcMonth,
      year: calcYear,
      recordCount: records.length,
      ecrCount: ecrLines.length,
      ecrRawText,
      esicRecords,
      esicTotalContribution: esicRecords.reduce((s, e) => s + e.totalESI, 0),
      neftCsv,
      variance
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
