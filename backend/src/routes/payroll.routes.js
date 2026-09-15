const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/payroll.controller');
const { auth } = require('../middleware/auth.middleware');

// Company & Tenancy
router.get('/companies', auth, ctrl.getCompanies);
router.post('/companies', auth, ctrl.createCompany);

// Branches
router.get('/branches', auth, ctrl.getBranches);
router.post('/branches', auth, ctrl.createBranch);

// Components
router.get('/components', auth, ctrl.getComponents);
router.post('/components', auth, ctrl.saveComponent);

// Structures
router.get('/structures', auth, ctrl.getStructures);
router.post('/structures', auth, ctrl.saveStructure);

// Statutory Config
router.get('/statutory', auth, ctrl.getStatutoryConfig);
router.post('/statutory', auth, ctrl.saveStatutoryConfig);

// Employee Profiles
router.get('/employees', auth, ctrl.getEmployeeProfiles);
router.put('/employees/:id', auth, ctrl.updateEmployeeProfile);

// Dashboard
router.get('/dashboard', auth, ctrl.getDashboardStats);

// Run & Calculations
router.post('/calculate', auth, ctrl.calculatePayroll);
router.post('/status', auth, ctrl.updatePayrollStatus);
router.get('/runs/:runId/records', auth, ctrl.getRunRecords);
router.get('/payslips', auth, ctrl.getPayslips);
router.get('/payslips/:id', auth, ctrl.getPayslipById);
router.post('/payslips/:id/downloaded', auth, ctrl.markPayslipDownloaded);

// Recruitment Incentives & 90-Day Retention Milestones
router.get('/incentives', auth, ctrl.getIncentives);
router.post('/incentives/sync', auth, ctrl.syncJoinedCandidatesToIncentives);
router.put('/incentives/:id/status', auth, ctrl.updateIncentiveStatus);

module.exports = router;
