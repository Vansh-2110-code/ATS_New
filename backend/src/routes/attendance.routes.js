const router = require('express').Router();
const ctrl = require('../controllers/attendance.controller');
const { auth, authorize } = require('../middleware/auth.middleware');

router.use(auth);

router.get('/today', ctrl.todayStatus);
router.post('/mark', ctrl.mark);
router.get('/', ctrl.list);
router.get('/summary', ctrl.summary);
router.get('/holidays', ctrl.getHolidays);
router.post('/holidays', authorize('admin'), ctrl.addHoliday);
router.get('/leave-balance', ctrl.getLeaveBalance);
router.get('/tl-activity', authorize('admin', 'manager', 'view_only_admin'), ctrl.tlActivity);
router.get('/employee/:userId', authorize('admin', 'manager', 'view_only_admin'), ctrl.employeeDetail);
router.get('/export/excel', authorize('admin'), ctrl.exportExcel);

module.exports = router;
