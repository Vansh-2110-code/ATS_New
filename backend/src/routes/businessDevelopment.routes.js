const router = require('express').Router();
const ctrl = require('../controllers/businessDevelopment.controller');
const { auth, authorize } = require('../middleware/auth.middleware');

router.use(auth);

router.get('/', authorize('admin', 'bd', 'business_developer', 'manager', 'tl'), ctrl.list);
router.get('/stats', authorize('admin', 'bd', 'business_developer', 'manager', 'tl'), ctrl.getStats);
router.get('/export', authorize('admin', 'bd', 'business_developer', 'manager', 'tl'), ctrl.exportExcel);
router.get('/:id', authorize('admin', 'bd', 'business_developer', 'manager', 'tl'), ctrl.getOne);
router.post('/', authorize('admin', 'bd', 'business_developer', 'manager', 'tl'), ctrl.create);
router.put('/:id', authorize('admin', 'bd', 'business_developer', 'manager', 'tl'), ctrl.update);
router.delete('/:id', authorize('admin', 'bd', 'business_developer', 'manager', 'tl'), ctrl.delete);

module.exports = router;
