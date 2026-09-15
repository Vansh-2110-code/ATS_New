const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/offerLetter.controller');
const { auth, authorize } = require('../middleware/auth.middleware');

// All offer letter endpoints are strictly restricted to admin only
router.use(auth);
router.use(authorize('admin'));

router.get('/templates', ctrl.getTemplates);
router.get('/', ctrl.getOfferLetters);
router.post('/', ctrl.createOfferLetter);
router.get('/:id', ctrl.getOfferLetterById);
router.put('/:id', ctrl.updateOfferLetter);
router.delete('/:id', ctrl.deleteOfferLetter);
router.get('/:id/download-docx', ctrl.downloadDocx);
router.post('/:id/send-email', ctrl.sendOfferEmail);

module.exports = router;
