const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/chat.controller');
const { auth } = require('../middleware/auth.middleware');
const { uploadChatAttachment } = require('../middleware/upload.middleware');

// All chat routes require valid employee authentication
router.use(auth);

// ── File Attachments ──────────────────────────────────────────
router.post('/upload', uploadChatAttachment.single('file'), ctrl.uploadAttachment);

// ── Room & Direct Message routes ──────────────────────────────
router.get('/rooms', ctrl.getRooms);
router.post('/rooms/direct', ctrl.getOrCreateDirectRoom);
router.get('/rooms/:roomId/messages', ctrl.getMessages);
router.post('/rooms/:roomId/messages', ctrl.sendMessage);
router.post('/rooms/:roomId/read', ctrl.markRoomAsRead);

// ── Directory & Notifications ─────────────────────────────────
router.get('/colleagues', ctrl.getColleagues);
router.get('/unread-total', ctrl.getUnreadTotal);

// ── Real-time SSE Stream ──────────────────────────────────────
router.get('/stream', ctrl.chatStream);

module.exports = router;
