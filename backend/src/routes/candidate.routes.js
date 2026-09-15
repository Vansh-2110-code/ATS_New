const router = require('express').Router();
const ctrl = require('../controllers/candidate.controller');
const { auth, authorize } = require('../middleware/auth.middleware');
const { uploadResume, uploadDoc, uploadImport, uploadJoining } = require('../middleware/upload.middleware');

router.use(auth);

router.get('/export', authorize('admin', 'manager', 'tl', 'recruiter'), ctrl.exportCandidates);
router.post('/import', authorize('recruiter', 'tl', 'admin'), uploadImport.single('file'), ctrl.importCandidates);
router.post('/bulk-email', authorize('recruiter', 'tl', 'admin'), ctrl.bulkEmail);
router.get('/clients', ctrl.listClientNames);  // Distinct clientName values for filters
router.get('/', ctrl.list);
router.get('/callbacks', ctrl.getCallbacks);
router.get('/check-duplicate', authorize('recruiter', 'tl', 'admin'), ctrl.checkDuplicate); // Must be before /:id
router.get('/flagged', authorize('tl', 'admin'), ctrl.getFlagged);  // Must be before /:id

// ─── Eligible Tracker Routes ───
router.get('/eligible-tracker', authorize('admin', 'manager', 'tl', 'recruiter', 'spoc'), ctrl.getEligibleTracker);
router.get('/eligible-tracker/export', authorize('admin', 'manager', 'tl', 'recruiter', 'spoc'), ctrl.exportEligibleTracker);
router.post('/eligible-tracker', authorize('admin', 'manager', 'tl', 'recruiter', 'spoc'), ctrl.createEligibleCandidate);
router.put('/eligible-tracker/:id', authorize('admin', 'manager', 'tl', 'recruiter', 'spoc'), ctrl.updateEligibleTracker);

router.get('/:id([0-9a-fA-F]{24})', ctrl.getById);
router.post('/', authorize('recruiter', 'tl', 'admin'), uploadResume.single('resume'), ctrl.create);
router.put('/:id', authorize('recruiter', 'tl', 'admin', 'manager'), uploadResume.single('resume'), ctrl.update);
router.put('/:id/status', authorize('recruiter', 'tl', 'admin', 'manager'), ctrl.updateStatus);
router.post('/:id/record-exit', authorize('admin'), ctrl.recordExit);
router.put('/:id/flag', authorize('recruiter', 'tl', 'admin'), ctrl.flag);
router.put('/:id/correction', authorize('tl', 'admin'), ctrl.correction);
router.post('/:id/notes', ctrl.addNote);
router.put('/:id/second-call', authorize('tl', 'admin'), ctrl.secondCallSubmit);
router.post('/:id/reassign', authorize('admin', 'tl', 'manager'), ctrl.reassign);
router.post('/:id/mark-duplicate', authorize('admin'), ctrl.markDuplicate);
router.post('/:id/request-reassign', authorize('recruiter', 'tl', 'manager'), ctrl.requestReassign);
router.post('/:id/tag-new-jr', authorize('recruiter', 'tl', 'admin', 'manager'), ctrl.tagNewJr);
router.post('/:id/documents', authorize('admin'), uploadDoc.single('file'), ctrl.uploadDocument);
router.patch('/:id/documents/:docId/status', authorize('admin'), ctrl.updateDocumentStatus);
router.delete('/:id/documents/:docId', authorize('admin'), ctrl.deleteDocument);

// ─── Company Policy: Candidate Deletion Block ────────────────────
// "No one can delete the data even 1 number duplicate or wrong number."
router.delete('/:id', (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Candidate records cannot be deleted per company policy, even for duplicate or wrong numbers.'
  });
});
router.delete('/', (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Candidate records cannot be deleted per company policy, even for duplicate or wrong numbers.'
  });
});

// ─── Comprehensive Joining Form ───
router.get('/joining-form/autofill', authorize('recruiter', 'tl', 'admin'), ctrl.getJoiningFormAutoFillData);
router.post('/joining-form', authorize('recruiter', 'tl', 'admin'), uploadJoining, ctrl.createOrUpdateJoiningForm);
router.get('/:employeeId/joining-form', authorize('recruiter', 'tl', 'admin'), ctrl.getJoiningForm);
router.post('/:employeeId/joining-form', authorize('recruiter', 'tl', 'admin'), uploadJoining, ctrl.createOrUpdateJoiningForm);

module.exports = router;
