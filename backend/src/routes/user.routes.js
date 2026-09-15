const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const { auth, authorize } = require('../middleware/auth.middleware');

router.post('/reset-all-faces', ctrl.resetAllFaces);

router.use(auth);

router.post('/register-face', ctrl.registerFace);
router.get('/', authorize('admin', 'tl', 'manager'), ctrl.list);
router.get('/recruiters', ctrl.getRecruiters);
router.post('/', authorize('admin'), ctrl.create);
router.put('/:id', authorize('admin'), ctrl.update);
router.delete('/:id', authorize('admin'), ctrl.remove);
router.patch('/:id/status', authorize('admin'), ctrl.toggleStatus);
router.post('/:id/reset-password', authorize('admin'), ctrl.resetPassword);
router.post('/reset-demo-data', authorize('admin'), ctrl.resetDemoData);

module.exports = router;
