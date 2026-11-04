const router = require('express').Router();
const ctrl = require('../controllers/team.controller');
const { auth, authorize } = require('../middleware/auth.middleware');

// ─── Team Member Management (Team Lead) ──────────────────────────
// TL can manage their team members, Admin/Manager can manage ANY team's members
router.get('/members', auth, authorize('tl', 'admin', 'manager', 'view_only_admin'), ctrl.getTeamMembers);
router.post('/members/add', auth, authorize('tl', 'admin', 'manager'), ctrl.addTeamMember);
router.post('/members/remove', auth, authorize('tl', 'admin', 'manager'), ctrl.removeTeamMember);

// ─── Team Leader Management (Admin & Manager) ────────────────────
// Admin/Manager can manage team leaders
router.get('/leaders', auth, authorize('admin', 'manager', 'view_only_admin'), ctrl.getTeamLeaders);
router.post('/leaders/add', auth, authorize('admin', 'manager'), ctrl.addTeamLeader);
router.post('/leaders/remove', auth, authorize('admin', 'manager'), ctrl.removeTeamLeader);

// ─── Available Employees ─────────────────────────────────────────
// Get employees available for team assignment
router.get('/available', auth, ctrl.getAvailableEmployees);

module.exports = router;
