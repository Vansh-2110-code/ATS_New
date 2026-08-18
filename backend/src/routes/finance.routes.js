const router = require('express').Router();
const ctrl = require('../controllers/finance.controller');
const { auth, authorize } = require('../middleware/auth.middleware');

router.use(auth);
router.use(authorize('admin', 'manager'));

router.get('/salary', ctrl.getSalary);
router.get('/revenue/monthly', ctrl.getMonthlyRevenue);
router.get('/revenue/recruiter-contribution', ctrl.getRecruiterContribution);
router.get('/invoices', ctrl.getInvoices);
router.get('/invoices/next-number', ctrl.getNextInvoiceNumber);
router.post('/invoices', authorize('admin'), ctrl.createInvoice);
router.patch('/invoices/:id', authorize('admin'), ctrl.updateInvoice);

// Salary Management (Admin only)
router.post('/salary', authorize('admin'), ctrl.createSalary);
router.put('/salary/:id', authorize('admin'), ctrl.updateSalary);
router.delete('/salary/:id', authorize('admin'), ctrl.deleteSalary);
router.post('/salary/:id/incentives', authorize('admin'), ctrl.addIncentive);
router.delete('/salary/:id/incentives/:incentiveId', authorize('admin'), ctrl.removeIncentive);

// Credit Notes (Admin only)
router.get('/credit-notes', authorize('admin'), ctrl.getCreditNotes);
router.get('/credit-notes/next-number', authorize('admin'), ctrl.getNextCreditNoteNumber);
router.get('/credit-notes/:id', authorize('admin'), ctrl.getCreditNote);
router.post('/credit-notes', authorize('admin'), ctrl.createCreditNote);
router.put('/credit-notes/:id', authorize('admin'), ctrl.updateCreditNote);
router.delete('/credit-notes/:id', authorize('admin'), ctrl.deleteCreditNote);

// Salary Access Control (Recruiters can request, Managers/Admins can approve/reject)
router.post('/salary-access/request', authorize('recruiter', 'tl', 'manager', 'admin'), ctrl.requestSalaryAccess);
router.get('/salary-access/requests', authorize('manager', 'admin'), ctrl.getSalaryAccessRequests);
router.get('/salary-access/check', authorize('recruiter', 'tl', 'manager', 'admin'), ctrl.checkSalarySlipAccess);
router.put('/salary-access/requests/:id/approve', authorize('manager', 'admin'), ctrl.approveSalaryAccess);
router.put('/salary-access/requests/:id/reject', authorize('manager', 'admin'), ctrl.rejectSalaryAccess);

// Salary Download Tracking (Single Download Policy)
router.post('/salary/download-record', authorize('recruiter', 'tl', 'manager', 'admin'), ctrl.recordSalarySlipDownload);
router.get('/salary/download-status', authorize('recruiter', 'tl', 'manager', 'admin'), ctrl.checkSalarySlipDownload);
router.post('/salary/download-reset', authorize('admin', 'manager'), ctrl.resetSalarySlipDownload);

module.exports = router;
