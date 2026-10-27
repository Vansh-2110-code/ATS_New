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

// Employee Profiles & History
router.get('/employees', auth, ctrl.getEmployeeProfiles);
router.put('/employees/:id', auth, ctrl.updateEmployeeProfile);
router.get('/employees/:id/history', auth, ctrl.getEmployeeFinancialHistory);
router.post('/employees/:id/revision', auth, ctrl.addSalaryRevision);
router.post('/employees/:id/advance', auth, ctrl.addAdvanceOrRecovery);
router.post('/employees/:id/reimbursement', auth, ctrl.claimReimbursement);
router.put('/employees/:id/reimbursement/:reimbursementId', auth, ctrl.updateReimbursementStatus);

// Dashboard
router.get('/dashboard', auth, ctrl.getDashboardStats);

// Run & Calculations
router.post('/calculate', auth, ctrl.calculatePayroll);
router.post('/status', auth, ctrl.updatePayrollStatus);
router.get('/runs/:runId/records', auth, ctrl.getRunRecords);

// Payslips & Disbursal Tracking
router.get('/payslips', auth, ctrl.getPayslips);
router.get('/payslips/:id', auth, ctrl.getPayslipById);
router.post('/payslips/:id/downloaded', auth, ctrl.markPayslipDownloaded);
router.post('/payment/record', auth, ctrl.recordPayment);

// Full-and-Final Settlements & Exit Automation
router.get('/settlement', auth, ctrl.listSettlements);
router.get('/settlement/:id', auth, ctrl.getSettlementById);
router.post('/settlement/initiate', auth, ctrl.initiateResignation);
router.post('/settlement/preview', auth, ctrl.calculateSettlementPreview);
router.post('/settlement/finalize', auth, ctrl.finalizeSettlement);
router.post('/settlement/:id/disburse', auth, ctrl.recordSettlementDisbursal);
router.put('/settlement/:id/clearance', auth, ctrl.updateSettlementClearance);

// Recruitment Revenue Attribution (Attributed, Invoiced, Collected)
router.get('/recruitment-revenue', auth, ctrl.getRecruitmentRevenueAttribution);

// Statutory Compliance Reports (EPFO ECR, ESIC, Bank NEFT, MoM)
router.get('/reports', auth, ctrl.getComplianceReports);

// Recruitment Incentives & 90-Day Retention Milestones
router.get('/incentives', auth, ctrl.getIncentives);
router.post('/incentives/sync', auth, ctrl.syncJoinedCandidatesToIncentives);
router.put('/incentives/:id/status', auth, ctrl.updateIncentiveStatus);

module.exports = router;
