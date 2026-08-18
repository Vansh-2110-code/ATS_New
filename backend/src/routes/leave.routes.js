const router = require('express').Router();
const ctrl = require('../controllers/leave.controller');
const { auth, authorize } = require('../middleware/auth.middleware');

router.use(auth);

// Employee routes
router.get('/balance', ctrl.getBalance);
router.post('/apply', ctrl.apply);
router.get('/my', ctrl.getMyRequests);

// TL / Manager / Admin review routes
router.get('/pending', authorize('tl', 'manager', 'admin'), ctrl.getPendingRequests);
router.post('/:id/review', authorize('tl', 'manager', 'admin'), ctrl.reviewRequest);
router.get('/all', authorize('manager', 'admin'), ctrl.getAllRequests);

module.exports = router;
