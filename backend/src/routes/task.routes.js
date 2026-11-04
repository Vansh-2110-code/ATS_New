const router = require('express').Router();
const ctrl = require('../controllers/task.controller');
const { auth, authorize } = require('../middleware/auth.middleware');

router.use(auth);

router.get('/team-summary', authorize('admin', 'manager', 'view_only_admin'), ctrl.teamSummary);
router.get('/for-candidate/:candidateId', ctrl.forCandidate);
router.get('/', ctrl.list);
router.post('/', authorize('admin', 'tl'), ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', authorize('admin'), ctrl.remove);

module.exports = router;
