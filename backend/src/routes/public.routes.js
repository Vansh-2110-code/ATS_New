const router = require('express').Router();
const ctrl = require('../controllers/public.controller');
const { auth, authorize } = require('../middleware/auth.middleware');
const { uploadResume } = require('../middleware/upload.middleware');

// Public - no auth required
router.get('/jobs', ctrl.getJobs);
router.post('/apply', uploadResume.single('resume'), ctrl.apply);

// Public resume extraction for walk-in page (no auth)
router.post('/resume-extract', uploadResume.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Resume file is required' });
    const { parseResume } = require('../utils/resumeParser');
    const parsed = await parseResume(req.file.path);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Protected - joining form
router.post('/joining', auth, authorize('recruiter', 'tl', 'admin'), ctrl.joining);
// Admin, Recruiter, and TL: view joining records (filtered by role in controller)
router.get('/joining', auth, authorize('admin', 'recruiter', 'tl', 'manager'), ctrl.listJoining);
// Admin, Recruiter, and TL: single joining record (filtered by role in controller)
router.get('/joining/:id', auth, authorize('admin', 'recruiter', 'tl', 'manager'), ctrl.getJoiningDetail);
// Admin and TL: update joining record
router.put('/joining/:id', auth, authorize('admin', 'tl', 'manager'), ctrl.updateJoining);
// Admin and TL: approve joining form
router.post('/joining/:id/approve', auth, authorize('admin', 'tl', 'manager'), ctrl.approveJoining);
// Admin and TL: reject / request changes on joining form
router.post('/joining/:id/reject', auth, authorize('admin', 'tl', 'manager'), ctrl.rejectJoining);

module.exports = router;
