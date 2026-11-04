const express = require('express');
const router = express.Router();
const { auth: authenticate, authorize } = require('../middleware/auth.middleware');

// Compute analytics on the fly from existing data
router.get('/kpis', authenticate, authorize('tl', 'manager', 'admin', 'spoc', 'view_only_admin'), async (req, res) => {
  try {
    const Candidate = require('../models/Candidate');
    const Job = require('../models/Job');

    const { period } = req.query; // e.g. "2026-03"
    let startDate, endDate;
    if (period) {
      const [year, month] = period.split('-').map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    const dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };

    // Total candidates in period
    const totalCandidates = await Candidate.countDocuments(dateFilter);
    const selectedCandidates = await Candidate.countDocuments({ ...dateFilter, status: 'Selected' });
    const joinedCandidates = await Candidate.countDocuments({ ...dateFilter, status: 'Joined' });

    // Offers
    const offersReleased = await Candidate.countDocuments({ ...dateFilter, postOfferStatus: { $regex: /offer released/i } });
    const offersAccepted = await Candidate.countDocuments({ ...dateFilter, postOfferStatus: { $regex: /offer accepted/i } });

    // Offer Acceptance Rate
    const offerAcceptanceRate = offersReleased > 0 ? ((offersAccepted / offersReleased) * 100).toFixed(1) : 0;

    // Join Ratio
    const joinRatio = offersAccepted > 0 ? ((joinedCandidates / offersAccepted) * 100).toFixed(1) : 0;

    // Source performance
    const sourceAgg = await Candidate.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$source', total: { $sum: 1 }, hired: { $sum: { $cond: [{ $eq: ['$status', 'Joined'] }, 1, 0] } } } },
      { $sort: { total: -1 } },
    ]);

    // Recruiter metrics
    const recruiterAgg = await Candidate.aggregate([
      { $match: { ...dateFilter, assignedRecruiter: { $exists: true } } },
      {
        $group: {
          _id: '$assignedRecruiter',
          recruiterName: { $first: '$assignedRecruiterName' },
          screened: { $sum: 1 },
          selected: { $sum: { $cond: [{ $in: ['$status', ['Selected', 'Joined']] }, 1, 0] } },
          joined: { $sum: { $cond: [{ $eq: ['$status', 'Joined'] }, 1, 0] } },
        },
      },
      { $sort: { screened: -1 } },
    ]);

    // Jobs metrics for time to fill
    const closedJobs = await Job.find({ ...dateFilter, status: 'Closed', closedDate: { $exists: true } }).select('closedDate createdAt');
    const avgTimeToFill = closedJobs.length > 0
      ? Math.round(closedJobs.reduce((acc, j) => acc + Math.ceil((j.closedDate - j.createdAt) / (1000 * 60 * 60 * 24)), 0) / closedJobs.length)
      : null;

    const now = new Date();
    res.json({
      period: period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      overview: {
        totalCandidates,
        selectedCandidates,
        joinedCandidates,
        offersReleased,
        offersAccepted,
        offerAcceptanceRate: parseFloat(offerAcceptanceRate),
        joinRatio: parseFloat(joinRatio),
        avgTimeToFill,
        conversionRate: totalCandidates > 0 ? parseFloat(((selectedCandidates / totalCandidates) * 100).toFixed(1)) : 0,
      },
      sourcePerformance: sourceAgg.map(s => ({
        source: s._id || 'Unknown',
        total: s.total,
        hired: s.hired,
        conversionRate: s.total > 0 ? parseFloat(((s.hired / s.total) * 100).toFixed(1)) : 0,
      })),
      recruiterMetrics: recruiterAgg.map(r => ({
        recruiterId: r._id,
        recruiterName: r.recruiterName || 'Unknown',
        screened: r.screened,
        selected: r.selected,
        joined: r.joined,
        conversionRate: r.screened > 0 ? parseFloat(((r.selected / r.screened) * 100).toFixed(1)) : 0,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
