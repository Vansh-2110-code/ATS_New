const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { auth, authorize } = require('../middleware/auth.middleware');

router.use(auth);
router.use(authorize('admin', 'tl', 'manager'));

router.get('/', reviewController.getReviews);
router.get('/employee-metrics', reviewController.getEmployeeMetrics);
router.post('/', reviewController.createReview);
router.get('/:id', reviewController.getReview);
router.patch('/:id', reviewController.updateReview);
router.delete('/:id', reviewController.deleteReview);

module.exports = router;
