const router = require('express').Router();
const ctrl = require('../controllers/mis.controller');
const { auth } = require('../middleware/auth.middleware');

router.use(auth);

router.get('/stats', ctrl.getStats);

module.exports = router;
