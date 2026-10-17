const router = require('express').Router();
const ctrl   = require('../controllers/atsRecord.controller');
const { auth, authorize } = require('../middleware/auth.middleware');

router.use(auth);

// All authenticated roles can list (filtered by RBAC inside controller)
router.get('/',          authorize('admin', 'manager', 'tl', 'recruiter'), ctrl.list);

// Export — admin only
router.get('/export',    authorize('admin'), ctrl.exportExcel);

// Single record
router.get('/:id',       authorize('admin', 'manager', 'tl', 'recruiter'), ctrl.getOne);

// Download Resume
router.get('/:id/resume', authorize('admin', 'manager', 'tl', 'recruiter', 'spoc'), ctrl.downloadResume);

// Update any field of the record
router.patch('/:id', authorize('admin', 'manager', 'tl', 'recruiter'), ctrl.updateRecord);

module.exports = router;
