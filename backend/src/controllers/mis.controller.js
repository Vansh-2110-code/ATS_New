const Candidate = require('../models/Candidate');
const AtsRecord = require('../models/AtsRecord');
const User = require('../models/User');
const mongoose = require('mongoose');

// Helper to calculate start & end timestamps based on range filter
function getDateRange(range, customStart, customEnd) {
  const now = new Date();
  let start = new Date();
  let end = new Date();

  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      // Last 7 days
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'month':
      // Last 30 days
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'custom':
      if (customStart) start = new Date(customStart);
      if (customEnd) {
        end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
      }
      break;
    case 'all':
    default:
      return { start: null, end: null };
  }

  return { start, end };
}

// Candidate statuses that mean "Selected"
const SELECTED_STATUSES = [
  'Selected', 'Selected – First Round', 'Selected – Second Round',
  'Shortlisted', 'Client Shortlisted', 'Interview Scheduled',
  'Offered', 'Offer Accepted', 'Joined'
];

/**
 * GET /api/mis/stats
 * Query params:
 * - range: 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom'
 * - startDate, endDate
 * - userId (for admin to filter specific user)
 */
exports.getStats = async (req, res, next) => {
  try {
    const { range = 'today', startDate, endDate, userId: filterUserId } = req.query;
    const isSuperOrAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    let dateFilter = {};
    if (range !== 'all') {
      const { start, end } = getDateRange(range, startDate, endDate);
      if (start && end) {
        dateFilter = {
          $or: [
            { scannedDate: { $gte: start, $lte: end } },
            { createdAt: { $gte: start, $lte: end } }
          ]
        };
      }
    }

    // Determine target user(s)
    let targetUserId = null;
    let targetUser = null;
    if (!isSuperOrAdmin) {
      // MIS users can only see their own stats
      targetUserId = req.user._id;
      targetUser = req.user;
    } else if (filterUserId && mongoose.Types.ObjectId.isValid(filterUserId)) {
      targetUserId = new mongoose.Types.ObjectId(filterUserId);
      targetUser = await User.findById(targetUserId).select('name email role employeeId').lean();
    }

    const { start, end } = getDateRange(range, startDate, endDate);

    // If Admin and no specific user filter: overall dashboard + team breakdown
    if (isSuperOrAdmin && !targetUserId) {
      // 1. Per-User Breakdown (e.g. Sohail, Wasiq, Babul, etc.)
      const allTrackedUsers = await User.find({
        $or: [
          { role: { $in: ['mis', 'data_entry'] } },
          { roles: { $in: ['mis', 'data_entry'] } },
          { email: { $in: ['whitehorsesohail@gmail.com', 'wasiq@whitehorsemanpower.in', 'babul@whitehorsemanpower.in'] } },
          { name: { $regex: 'suhail|sohail|wasiq|babul', $options: 'i' } }
        ]
      }).select('_id name email employeeId role').lean();

      // Deduplicate by ID or email
      const seenIds = new Set();
      const uniqueUsers = allTrackedUsers.filter(u => {
        const idStr = String(u._id);
        if (seenIds.has(idStr)) return false;
        seenIds.add(idStr);
        return true;
      });

      const userBreakdown = await Promise.all(
        uniqueUsers.map(async (u) => {
          const rawName = (u.name || '').trim();
          const nameRegex = rawName.toLowerCase().includes('hail')
            ? /s[uo]hail/i
            : new RegExp(rawName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

          // 1. AtsRecord scan counts
          const atsDateFilter = (start && end) ? { $or: [{ scanDate: { $gte: start, $lte: end } }, { createdAt: { $gte: start, $lte: end } }] } : {};
          const atsUserFilter = { $or: [{ scannedBy: u._id }, { scannedByName: nameRegex }] };
          const atsQuery = Object.keys(atsDateFilter).length > 0 ? { $and: [atsDateFilter, atsUserFilter] } : atsUserFilter;
          const atsCount = await AtsRecord.countDocuments(atsQuery);

          // 2. Candidate collection counts
          const candDateFilter = (start && end) ? { $or: [{ scannedDate: { $gte: start, $lte: end } }, { createdAt: { $gte: start, $lte: end } }] } : {};
          const candUserFilter = { $or: [{ scannedBy: u._id }, { scannedByName: nameRegex }, { sourcedBy: nameRegex }] };
          const candQuery = Object.keys(candDateFilter).length > 0 ? { $and: [candDateFilter, candUserFilter] } : candUserFilter;
          const candCount = await Candidate.countDocuments(candQuery);

          const uTotal = Math.max(atsCount, candCount);

          // 3. Utilised by recruiters
          const uUtilised = await Candidate.countDocuments({
            $and: [
              candUserFilter,
              {
                $or: [
                  { firstCallSubmitted: true },
                  { candidateContacted: true },
                  { status: { $nin: ['Screening', 'New', 'Unassigned'] } }
                ]
              }
            ]
          });

          // 4. Selections
          const uSelected = await Candidate.countDocuments({
            $and: [
              candUserFilter,
              {
                $or: [
                  { status: { $in: SELECTED_STATUSES } },
                  { finalInterviewStatus: 'Selected' },
                  { recruiterStatus: 'Selected' }
                ]
              }
            ]
          });

          // 5. Joinings
          const uJoined = await Candidate.countDocuments({
            $and: [
              candUserFilter,
              { status: 'Joined' }
            ]
          });

          return {
            userId: u._id,
            name: u.name,
            employeeId: u.employeeId || '—',
            email: u.email,
            role: u.role,
            scanned: uTotal,
            utilised: uUtilised,
            unused: Math.max(0, uTotal - uUtilised),
            selected: uSelected,
            joined: uJoined,
            utilizationRate: uTotal ? Math.round((uUtilised / uTotal) * 100) : 0
          };
        })
      );

      // Sort by scanned count descending
      userBreakdown.sort((a, b) => b.scanned - a.scanned);

      // Overall Summary accurately matches the team's combined productivity
      const totalScanned = userBreakdown.reduce((sum, u) => sum + u.scanned, 0);
      const utilised = userBreakdown.reduce((sum, u) => sum + u.utilised, 0);
      const unused = userBreakdown.reduce((sum, u) => sum + u.unused, 0);
      const selected = userBreakdown.reduce((sum, u) => sum + u.selected, 0);
      const joined = userBreakdown.reduce((sum, u) => sum + u.joined, 0);

      // Fetch 20 recent scanned candidates
      let recentCandidates = await Candidate.find({
        $or: [
          { sourcedBy: { $regex: 'suhail|sohail|wasiq|babul', $options: 'i' } },
          { scannedByName: { $regex: 'suhail|sohail|wasiq|babul', $options: 'i' } }
        ]
      })
        .sort({ scannedDate: -1, createdAt: -1 })
        .limit(20)
        .select('name email phone positionApplied status scannedByName sourcedBy scannedDate firstCallSubmitted candidateContacted createdAt')
        .lean();

      if (!recentCandidates || recentCandidates.length === 0) {
        const recentAts = await AtsRecord.find({})
          .sort({ scanDate: -1, createdAt: -1 })
          .limit(20)
          .lean();
        recentCandidates = recentAts.map(r => ({
          _id: r._id,
          name: r.name,
          email: r.email,
          phone: r.phone,
          positionApplied: r.role || r.jobTitle || 'Scanned Resume',
          status: r.atsStatus || 'Scanned',
          scannedByName: r.scannedByName || 'MIS Team',
          sourcedBy: r.scannedByName || 'MIS Team',
          scannedDate: r.scanDate || r.createdAt,
          createdAt: r.createdAt,
          firstCallSubmitted: false,
          candidateContacted: false,
        }));
      }

      return res.json({
        summary: {
          totalScanned,
          utilised,
          unused,
          selected,
          joined,
          utilizationRate: totalScanned ? Math.round((utilised / totalScanned) * 100) : 0
        },
        userBreakdown,
        recentCandidates,
        range
      });
    }

    // Individual MIS / Data Entry user view (or Admin filtered to 1 specific user)
    const activeUserName = targetUser?.name || req.user.name;
    const nameRegex = activeUserName.toLowerCase().includes('hail')
      ? /s[uo]hail/i
      : new RegExp(activeUserName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const atsDate = (start && end) ? { $or: [{ scanDate: { $gte: start, $lte: end } }, { createdAt: { $gte: start, $lte: end } }] } : {};
    const atsUser = { $or: [{ scannedBy: targetUserId }, { scannedByName: nameRegex }] };
    const atsCount = await AtsRecord.countDocuments(Object.keys(atsDate).length > 0 ? { $and: [atsDate, atsUser] } : atsUser);

    const candDate = (start && end) ? { $or: [{ scannedDate: { $gte: start, $lte: end } }, { createdAt: { $gte: start, $lte: end } }] } : {};
    const candUser = { $or: [{ scannedBy: targetUserId }, { scannedByName: nameRegex }, { sourcedBy: nameRegex }] };
    const candCount = await Candidate.countDocuments(Object.keys(candDate).length > 0 ? { $and: [candDate, candUser] } : candUser);

    const totalScanned = Math.max(atsCount, candCount);

    const utilised = await Candidate.countDocuments({
      $and: [
        candUser,
        {
          $or: [
            { firstCallSubmitted: true },
            { candidateContacted: true },
            { status: { $nin: ['Screening', 'New', 'Unassigned'] } }
          ]
        }
      ]
    });

    const unused = Math.max(0, totalScanned - utilised);

    const selected = await Candidate.countDocuments({
      $and: [
        candUser,
        {
          $or: [
            { status: { $in: SELECTED_STATUSES } },
            { finalInterviewStatus: 'Selected' },
            { recruiterStatus: 'Selected' }
          ]
        }
      ]
    });

    const joined = await Candidate.countDocuments({
      $and: [
        candUser,
        { status: 'Joined' }
      ]
    });

    // Fetch recent candidates for this specific user
    let recentCandidates = await Candidate.find(candUser)
      .sort({ scannedDate: -1, createdAt: -1 })
      .limit(20)
      .select('name email phone positionApplied status scannedByName sourcedBy scannedDate firstCallSubmitted candidateContacted createdAt')
      .lean();

    if (!recentCandidates || recentCandidates.length === 0) {
      const recentAts = await AtsRecord.find(atsUser)
        .sort({ scanDate: -1, createdAt: -1 })
        .limit(20)
        .lean();
      recentCandidates = recentAts.map(r => ({
        _id: r._id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        positionApplied: r.role || r.jobTitle || 'Scanned Resume',
        status: r.atsStatus || 'Scanned',
        scannedByName: r.scannedByName || activeUserName,
        sourcedBy: r.scannedByName || activeUserName,
        scannedDate: r.scanDate || r.createdAt,
        createdAt: r.createdAt,
        firstCallSubmitted: false,
        candidateContacted: false,
      }));
    }

    return res.json({
      summary: {
        totalScanned,
        utilised,
        unused,
        selected,
        joined,
        utilizationRate: totalScanned ? Math.round((utilised / totalScanned) * 100) : 0
      },
      userBreakdown: [],
      recentCandidates,
      range
    });
  } catch (err) {
    next(err);
  }
};
