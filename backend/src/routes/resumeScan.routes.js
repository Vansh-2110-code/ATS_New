const router = require('express').Router();
const ctrl = require('../controllers/resumeScan.controller');
const { auth, authorize } = require('../middleware/auth.middleware');
const { uploadResume, uploadBulkZip } = require('../middleware/upload.middleware');

router.use(auth);

router.post('/scan', authorize('recruiter', 'tl', 'admin', 'mis', 'data_entry'), uploadResume.single('resume'), ctrl.scan);
router.post('/scan-with-jd', authorize('recruiter', 'tl', 'admin', 'mis', 'data_entry'), uploadResume.single('resume'), ctrl.scanWithJD);
router.post('/save-candidate', authorize('recruiter', 'tl', 'admin', 'mis', 'data_entry'), ctrl.saveCandidate);

// ── Bulk ZIP / Multi-Resume Scanner Routes ──
router.post('/bulk-scan', authorize('recruiter', 'tl', 'admin', 'mis', 'data_entry'), uploadBulkZip.any(), ctrl.bulkScan);
router.post('/bulk-save', authorize('recruiter', 'tl', 'admin', 'mis', 'data_entry'), ctrl.bulkSaveCandidates);

module.exports = router;

