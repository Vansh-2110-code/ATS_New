const mongoose = require('mongoose');
require('dotenv').config();

const Company = require('../models/Company');
const Branch = require('../models/Branch');
const SalaryComponent = require('../models/SalaryComponent');
const SalaryStructure = require('../models/SalaryStructure');
const StatutoryConfig = require('../models/StatutoryConfig');
const User = require('../models/User');
const EmployeePayrollProfile = require('../models/EmployeePayrollProfile');

async function seedPayroll() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://naveenecerljit_db_user:Navi2026mys@cluster0.trxc9r6.mongodb.net/ats_db?retryWrites=true&w=majority&appName=Cluster0';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    console.log('Connected to MongoDB for Payroll seeding...');

    // 1. Seed or update White Horse Manpower Tenant #1
    let whm = await Company.findOne({
      $or: [
        { code: 'WHM' },
        { companyName: /White Horse/i }
      ]
    });

    if (!whm) {
      whm = new Company({
        companyName: 'White Horse Manpower Consultancy Pvt Ltd',
        code: 'WHM',
        email: 'info@whitehorsemanpower.in',
        phone: '080-41130678',
        address: '12, Commercial Street, Tasker Town, Shivaji Nagar',
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
        isPayrollTenant: true,
        enableATSIntegration: true,
        isActive: true
      });
      await whm.save();
      console.log('✅ Created Tenant #1: White Horse Manpower Consultancy Pvt Ltd');
    } else {
      whm.isPayrollTenant = true;
      whm.enableATSIntegration = true;
      whm.code = whm.code || 'WHM';
      await whm.save();
      console.log('✅ Updated Tenant #1:', whm.companyName);
    }

    // 2. Seed Branches
    const branchesData = [
      {
        company: whm._id,
        name: 'Bangalore HQ',
        code: 'BLR-HQ',
        city: 'Bangalore',
        state: 'Karnataka',
        ptStateRule: 'Karnataka',
        address: '12, Commercial Street, Shivaji Nagar, Bengaluru, Karnataka 560001'
      },
      {
        company: whm._id,
        name: 'Hyderabad Branch',
        code: 'HYD-01',
        city: 'Hyderabad',
        state: 'Telangana',
        ptStateRule: 'Telangana',
        address: 'Begumpet, Hyderabad, Telangana 500016'
      }
    ];

    const branches = [];
    for (const b of branchesData) {
      let branch = await Branch.findOne({ company: whm._id, name: b.name });
      if (!branch) {
        branch = await Branch.create(b);
        console.log(`✅ Created Branch: ${b.name}`);
      }
      branches.push(branch);
    }

    // 3. Seed Salary Components
    const componentsData = [
      {
        company: whm._id,
        name: 'Basic Salary',
        code: 'BASIC',
        type: 'earning',
        calcType: 'percentage',
        percentageOf: 'GROSS',
        percentageValue: 50,
        isTaxable: true,
        isPFApplicable: true,
        isESIApplicable: true,
        isPTApplicable: true,
        isProratedOnLOP: true,
        includeInCTC: true,
        showOnPayslip: true,
        displayOrder: 1
      },
      {
        company: whm._id,
        name: 'House Rent Allowance',
        code: 'HRA',
        type: 'earning',
        calcType: 'percentage',
        percentageOf: 'BASIC',
        percentageValue: 40,
        isTaxable: true,
        isPFApplicable: false,
        isESIApplicable: true,
        isPTApplicable: true,
        isProratedOnLOP: true,
        includeInCTC: true,
        showOnPayslip: true,
        displayOrder: 2
      },
      {
        company: whm._id,
        name: 'Special Allowance',
        code: 'SPL_ALLOW',
        type: 'earning',
        calcType: 'formula',
        formula: 'GROSS - BASIC - HRA',
        isTaxable: true,
        isPFApplicable: false,
        isESIApplicable: true,
        isPTApplicable: true,
        isProratedOnLOP: true,
        includeInCTC: true,
        showOnPayslip: true,
        displayOrder: 3
      },
      {
        company: whm._id,
        name: 'Recruitment Incentive',
        code: 'INCENTIVE',
        type: 'earning',
        calcType: 'manual',
        isTaxable: true,
        isPFApplicable: false,
        isESIApplicable: false,
        isPTApplicable: false,
        isProratedOnLOP: false,
        includeInCTC: false,
        showOnPayslip: true,
        displayOrder: 4
      },
      {
        company: whm._id,
        name: 'Employee Provident Fund (EPF)',
        code: 'PF_EE',
        type: 'deduction',
        calcType: 'system_generated',
        isTaxable: false,
        isPFApplicable: false,
        isESIApplicable: false,
        isPTApplicable: false,
        isProratedOnLOP: false,
        includeInCTC: false,
        showOnPayslip: true,
        displayOrder: 10
      },
      {
        company: whm._id,
        name: 'Employee ESIC',
        code: 'ESI_EE',
        type: 'deduction',
        calcType: 'system_generated',
        isTaxable: false,
        isPFApplicable: false,
        isESIApplicable: false,
        isPTApplicable: false,
        isProratedOnLOP: false,
        includeInCTC: false,
        showOnPayslip: true,
        displayOrder: 11
      },
      {
        company: whm._id,
        name: 'Professional Tax (PT)',
        code: 'PT',
        type: 'deduction',
        calcType: 'system_generated',
        isTaxable: false,
        isPFApplicable: false,
        isESIApplicable: false,
        isPTApplicable: false,
        isProratedOnLOP: false,
        includeInCTC: false,
        showOnPayslip: true,
        displayOrder: 12
      },
      {
        company: whm._id,
        name: 'Income Tax (TDS)',
        code: 'TDS',
        type: 'deduction',
        calcType: 'manual',
        isTaxable: false,
        isPFApplicable: false,
        isESIApplicable: false,
        isPTApplicable: false,
        isProratedOnLOP: false,
        includeInCTC: false,
        showOnPayslip: true,
        displayOrder: 13
      },
      {
        company: whm._id,
        name: 'Employer Provident Fund',
        code: 'PF_ER',
        type: 'employer_contribution',
        calcType: 'system_generated',
        isTaxable: false,
        isPFApplicable: false,
        isESIApplicable: false,
        isPTApplicable: false,
        isProratedOnLOP: false,
        includeInCTC: true,
        showOnPayslip: false,
        displayOrder: 20
      },
      {
        company: whm._id,
        name: 'Employer ESIC',
        code: 'ESI_ER',
        type: 'employer_contribution',
        calcType: 'system_generated',
        isTaxable: false,
        isPFApplicable: false,
        isESIApplicable: false,
        isPTApplicable: false,
        isProratedOnLOP: false,
        includeInCTC: true,
        showOnPayslip: false,
        displayOrder: 21
      }
    ];

    const components = [];
    for (const c of componentsData) {
      let comp = await SalaryComponent.findOne({ company: whm._id, code: c.code });
      if (!comp) {
        comp = await SalaryComponent.create(c);
        console.log(`✅ Created Component: ${c.name} (${c.code})`);
      } else {
        Object.assign(comp, c);
        await comp.save();
      }
      components.push(comp);
    }

    // 4. Seed Standard Salary Structure
    let structure = await SalaryStructure.findOne({ company: whm._id, name: 'Standard Recruiter Structure' });
    const structureComponents = components.map((comp, idx) => ({
      component: comp._id,
      code: comp.code,
      name: comp.name,
      type: comp.type,
      calcType: comp.calcType,
      percentageOf: comp.percentageOf,
      percentageValue: comp.percentageValue,
      formula: comp.formula,
      order: idx + 1
    }));

    if (!structure) {
      structure = await SalaryStructure.create({
        company: whm._id,
        name: 'Standard Recruiter Structure',
        code: 'STD-REC',
        description: 'Standard formula-based salary structure for White Horse recruiters and staff',
        components: structureComponents,
        isDefault: true,
        isActive: true
      });
      console.log('✅ Created Default Salary Structure: Standard Recruiter Structure');
    } else {
      structure.components = structureComponents;
      await structure.save();
      console.log('✅ Updated Default Salary Structure');
    }

    // 5. Seed Statutory Configuration
    let statConfig = await StatutoryConfig.findOne({ company: whm._id });
    if (!statConfig) {
      statConfig = await StatutoryConfig.create({
        company: whm._id,
        epf: {
          employeeRate: 12,
          employerRate: 12,
          wageCeiling: 15000,
          isCappedAtCeiling: true,
          adminChargesRate: 0.5,
          edliRate: 0.5
        },
        esic: {
          employeeRate: 0.75,
          employerRate: 3.25,
          wageCeiling: 21000
        },
        ptSlabs: [
          {
            state: 'Karnataka',
            minSalary: 15000,
            maxSalary: 999999999,
            taxAmount: 200,
            specialFebAmount: 300
          },
          {
            state: 'Telangana',
            minSalary: 15000,
            maxSalary: 20000,
            taxAmount: 150,
            specialFebAmount: 150
          },
          {
            state: 'Telangana',
            minSalary: 20001,
            maxSalary: 999999999,
            taxAmount: 200,
            specialFebAmount: 200
          }
        ]
      });
      console.log('✅ Created Statutory Configuration for Tenant #1');
    }

    // 6. Ensure default EmployeePayrollProfiles exist for existing users (Recruiters, TLs, Managers)
    const users = await User.find({ status: 'Active' });
    let profilesCount = 0;
    for (const u of users) {
      let profile = await EmployeePayrollProfile.findOne({ user: u._id });
      if (!profile) {
        const defaultGross = u.role === 'manager' ? 50000 : (u.role === 'tl' ? 35000 : 25000);
        profile = new EmployeePayrollProfile({
          user: u._id,
          company: whm._id,
          branch: branches[0]._id,
          salaryStructure: structure._id,
          grossSalary: defaultGross,
          annualCTC: Math.round(defaultGross * 12 * 1.15),
          statutory: {
            panNumber: 'ABCDE1234F',
            uanNumber: '100987654321',
            taxRegime: 'new'
          },
          bank: {
            bankName: 'HDFC Bank',
            accountNumber: '501000' + String(u._id).slice(-6),
            ifscCode: 'HDFC0001234',
            accountHolderName: u.name,
            paymentMode: 'bank_transfer'
          },
          status: 'active'
        });
        await profile.save();
        profilesCount++;
      }
    }
    console.log(`✅ Ensured ${profilesCount} Employee Payroll Profiles created for active users.`);

    console.log('\n===========================================');
    console.log('  PAYROLL INITIAL SEEDING COMPLETE!');
    console.log('===========================================');
    return { success: true };
  } catch (err) {
    console.error('Payroll seeding error:', err);
    throw err;
  }
}

if (require.main === module) {
  seedPayroll().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = seedPayroll;
