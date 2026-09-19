const router = require('express').Router();
const ctrl = require('../controllers/customJd.controller');
const { auth } = require('../middleware/auth.middleware');

router.use(auth);

router.get('/', ctrl.getAll);
router.post('/extract', ctrl.extract);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
