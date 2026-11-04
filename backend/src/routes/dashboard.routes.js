const router = require('express').Router();
const ctrl = require('../controllers/dashboard.controller');
const { auth, authorize } = require('../middleware/auth.middleware');

router.use(auth);

router.get('/recruiter', authorize('recruiter', 'tl', 'admin', 'view_only_admin'), ctrl.recruiterDashboard);
router.get('/tl', authorize('tl', 'admin', 'view_only_admin'), ctrl.tlDashboard);
router.get('/manager', authorize('manager', 'admin', 'view_only_admin'), ctrl.managerDashboard);
router.get('/admin', authorize('admin', 'view_only_admin'), ctrl.adminDashboard);
router.get('/admin/all-teams', authorize('admin', 'view_only_admin'), ctrl.allTeamsDashboard);
router.get('/manager/reports', authorize('manager', 'admin', 'view_only_admin'), ctrl.managerReports);
router.get('/division', ctrl.divisionDashboard);
router.get('/reports/advanced', ctrl.advancedReports);

module.exports = router;
