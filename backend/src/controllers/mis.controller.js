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

    // If Admin and no specific user filter: overall dashboard + team breakdown
    if (isSuperOrAdmin && !targetUserId) {
      const matchQuery = Object.keys(dateFilter).length > 0 ? dateFilter : {};

      // 1. Overall Aggregation across candidate collection
      const [totalScanned, utilised, unused, selected, joined] = await Promise.all([
        Candidate.countDocuments(matchQuery),
        Candidate.countDocuments({
          $and: [
            matchQuery,
            {
              $or: [
                { firstCallSubmitted: true },
                { candidateContacted: true },
                { status: { $nin: ['Screening', 'New', 'Unassigned'] } }
              ]
            }
          ]
        }),
        Candidate.countDocuments({
          $and: [
            matchQuery,
            {
              firstCallSubmitted: { $ne: true },
              candidateContacted: { $ne: true },
              status: { $in: ['Screening', 'New', 'Unassigned'] }
            }
          ]
        }),
        Candidate.countDocuments({
          $and: [
            matchQuery,
            {
              $or: [
                { status: { $in: SELECTED_STATUSES } },
                { finalInterviewStatus: 'Selected' },
                { recruiterStatus: 'Selected' }
              ]
            }
          ]
        }),
        Candidate.countDocuments({
          $and: [
            matchQuery,
            { status: 'Joined' }
          ]
        })
      ]);

      // 2. Per-User Breakdown (e.g. Sohail, Wasiq, Babul, etc.)
      const allTrackedUsers = await User.find({
        $or: [
          { role: { $in: ['mis', 'data_entry'] } },
          { roles: { $in: ['mis', 'data_entry'] } }
        ]
      }).select('_id name email employeeId role').lean();

      const userBreakdown = await Promise.all(
        allTrackedUsers.map(async (u) => {
          const rawName = (u.name || '').trim();
          const namePattern = rawName.toLowerCase().includes('hail')
            ? 's[u|o]hail'
            : rawName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

          const userMatch = {
            $or: [
              { scannedBy: u._id },
              { scannedByName: new RegExp(namePattern, 'i') },
              { sourcedBy: new RegExp(namePattern, 'i') }
            ]
          };

          const fullUserFilter = Object.keys(matchQuery).length > 0
            ? { $and: [matchQuery, userMatch] }
            : userMatch;

          const [uTotal, uUtilised, uUnused, uSelected, uJoined] = await Promise.all([
            Candidate.countDocuments(fullUserFilter),
            Candidate.countDocuments({
              $and: [
                fullUserFilter,
                {
                  $or: [
                    { firstCallSubmitted: true },
                    { candidateContacted: true },
                    { status: { $nin: ['Screening', 'New', 'Unassigned'] } }
                  ]
                }
              ]
            }),
            Candidate.countDocuments({
              $and: [
                fullUserFilter,
                {
                  firstCallSubmitted: { $ne: true },
                  candidateContacted: { $ne: true },
                  status: { $in: ['Screening', 'New', 'Unassigned'] }
                }
              ]
            }),
            Candidate.countDocuments({
              $and: [
                fullUserFilter,
                {
                  $or: [
                    { status: { $in: SELECTED_STATUSES } },
                    { finalInterviewStatus: 'Selected' },
                    { recruiterStatus: 'Selected' }
                  ]
                }
              ]
            }),
            Candidate.countDocuments({
              $and: [
                fullUserFilter,
                { status: 'Joined' }
              ]
            })
          ]);

          return {
            userId: u._id,
            name: u.name,
            employeeId: u.employeeId || '—',
            email: u.email,
            role: u.role,
            scanned: uTotal,
            utilised: uUtilised,
            unused: uUnused,
            selected: uSelected,
            joined: uJoined,
            utilizationRate: uTotal ? Math.round((uUtilised / uTotal) * 100) : 0
          };
        })
      );

      // Sort by scanned count descending
      userBreakdown.sort((a, b) => b.scanned - a.scanned);

      // Fetch 20 recent scanned candidates
      const recentCandidates = await Candidate.find(matchQuery)
        .sort({ scannedDate: -1, createdAt: -1 })
        .limit(20)
        .select('name email phone positionApplied status scannedByName sourcedBy scannedDate firstCallSubmitted candidateContacted createdAt')
        .lean();

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
    const namePattern = activeUserName.toLowerCase().includes('hail')
      ? 's[u|o]hail'
      : activeUserName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const userCondition = {
      $or: [
        { scannedBy: targetUserId },
        { scannedByName: new RegExp(namePattern, 'i') },
        { sourcedBy: new RegExp(namePattern, 'i') }
      ]
    };

    const combinedMatch = Object.keys(dateFilter).length > 0
      ? { $and: [dateFilter, userCondition] }
      : userCondition;

    const [totalScanned, utilised, unused, selected, joined] = await Promise.all([
      Candidate.countDocuments(combinedMatch),
      Candidate.countDocuments({
        $and: [
          combinedMatch,
          {
            $or: [
              { firstCallSubmitted: true },
              { candidateContacted: true },
              { status: { $nin: ['Screening', 'New', 'Unassigned'] } }
            ]
          }
        ]
      }),
      Candidate.countDocuments({
        $and: [
          combinedMatch,
          {
            firstCallSubmitted: { $ne: true },
            candidateContacted: { $ne: true },
            status: { $in: ['Screening', 'New', 'Unassigned'] }
          }
        ]
      }),
      Candidate.countDocuments({
        $and: [
          combinedMatch,
          {
            $or: [
              { status: { $in: SELECTED_STATUSES } },
              { finalInterviewStatus: 'Selected' },
              { recruiterStatus: 'Selected' }
            ]
          }
        ]
      }),
      Candidate.countDocuments({
        $and: [
          combinedMatch,
          { status: 'Joined' }
        ]
      })
    ]);

    // Fetch recent candidates for this specific user
    const recentCandidates = await Candidate.find(combinedMatch)
      .sort({ scannedDate: -1, createdAt: -1 })
      .limit(20)
      .select('name email phone positionApplied status scannedByName sourcedBy scannedDate firstCallSubmitted candidateContacted createdAt')
      .lean();

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
