const mongoose = require('mongoose');
const Candidate = require('../models/Candidate');
const CallLog = require('../models/CallLog');
const Interview = require('../models/Interview');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const AuditLog = require('../models/AuditLog');
const WalkIn = require('../models/WalkIn');
const TeamMember = require('../models/TeamMember');
const Job = require('../models/Job');
const { getDateRange } = require('../utils/helpers');

// GET /api/dashboard/recruiter
exports.recruiterDashboard = async (req, res, next) => {
  try {
    const { dateRange = 'month', range, startDate, endDate, from, to, division, company, customer, recruiter, tlId } = req.query;
    const customStart = startDate || from || null;
    const customEnd = endDate || to || null;
    const selectedRange = (customStart || customEnd) ? 'custom' : (range || dateRange || 'month').toLowerCase();
    const { start, end } = getDateRange(selectedRange, customStart, customEnd);
    const userId = req.user._id;
    const isAdmin = ['admin', 'manager', 'tl'].includes(req.user.role);

    const dateFilter = { $gte: start, $lt: end };
    
    let filterRecruiter = userId;
    let filterRecruiterName = null;
    let teamScopeFilter = null;

    if (isAdmin) {
      if (recruiter && recruiter !== 'All Recruiters' && recruiter !== 'All') {
        if (mongoose.Types.ObjectId.isValid(recruiter)) {
          filterRecruiter = new mongoose.Types.ObjectId(recruiter);
          const u = await User.findById(recruiter).select('name').lean();
          if (u) filterRecruiterName = u.name;
        } else {
          filterRecruiterName = recruiter;
          const u = await User.findOne({ name: recruiter }).select('_id').lean();
          if (u) filterRecruiter = u._id;
          else filterRecruiter = null;
        }
      } else {
        filterRecruiter = null; // Admin viewing all
      }

      if (!filterRecruiter && (tlId || req.user.role === 'tl')) {
        const targetTlId = tlId && mongoose.Types.ObjectId.isValid(tlId) ? tlId : req.user._id;
        const teamAssignments = await TeamMember.find({ teamLeaderId: targetTlId, removedAt: null }).lean();
        const targetTlUser = await User.findById(targetTlId).select('name').lean();
        const memberIds = teamAssignments.map(ta => ta.memberId).filter(Boolean);
        const userIds = [targetTlId, ...memberIds].map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id);
        
        const memberUsers = await User.find({ _id: { $in: userIds } }).select('_id name').lean();
        const userNames = memberUsers.map(u => u.name).filter(Boolean);
        if (targetTlUser && !userNames.includes(targetTlUser.name)) userNames.push(targetTlUser.name);

        teamScopeFilter = {
          $or: [
            { assignedRecruiter: { $in: userIds } },
            { assignedRecruiterName: { $in: userNames } },
            { sourcedBy: { $in: userNames } },
            { recruiterName: { $in: userNames } }
          ]
        };
      }
    }

    const andConditions = [];
    if (selectedRange !== 'all') {
      andConditions.push({ createdAt: dateFilter });
    }
    if (division && division !== 'All') {
      andConditions.push({ division });
    }

    if (filterRecruiter || filterRecruiterName) {
      const recOr = [];
      if (filterRecruiter) recOr.push({ assignedRecruiter: filterRecruiter });
      if (filterRecruiterName) {
        recOr.push({ assignedRecruiterName: filterRecruiterName });
        recOr.push({ sourcedBy: filterRecruiterName });
        recOr.push({ recruiterName: filterRecruiterName });
      }
      andConditions.push({ $or: recOr });
    } else if (teamScopeFilter) {
      andConditions.push(teamScopeFilter);
    }

    const clientFilter = customer || company;
    if (clientFilter && clientFilter !== 'All Companies') {
      const companyRegex = new RegExp(`^${clientFilter.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i');
      andConditions.push({
        $or: [
          { clientName: companyRegex },
          { company: companyRegex },
          { client: companyRegex },
        ]
      });
    }

    const baseMatch = andConditions.length > 0 ? { $and: andConditions } : {};

    // Pipeline counts
    const statusCounts = await Candidate.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const pipeline = {};
    Candidate.STATUSES.forEach(s => { pipeline[s] = 0; });
    statusCounts.forEach(s => { if (s._id) pipeline[s._id] = s.count; });
    pipeline['Eligible'] = (pipeline['Eligible'] || 0) + (pipeline['Eligible Candidates'] || 0);

    // Candidate & Job metrics
    const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
    const endOfToday = new Date(new Date().setHours(23, 59, 59, 999));

    const profilesUploadedTodayMatch = {
      ...baseMatch,
      createdAt: { $gte: startOfToday, $lt: endOfToday }
    };

    const profilesUploadedToday = await Candidate.countDocuments(profilesUploadedTodayMatch);
    const openRequirements = await Job.countDocuments({ status: { $regex: /^open$/i } });

    const eligibleCount = await Candidate.countDocuments({
      ...baseMatch,
      status: { $in: ['Eligible', 'Eligible Candidates'] }
    });

    const finalSelectCount = await Candidate.countDocuments({
      ...baseMatch,
      status: { $in: ['L1 Select', 'Client Select', 'Final Select', 'Selected'] }
    });

    const waitingForOfferCount = await Candidate.countDocuments({
      ...baseMatch,
      status: { $in: ['Offer Released', 'Yet To Join', 'Documentation in Progress', 'Documentation'] }
    });

    const joinedCount = await Candidate.countDocuments({
      ...baseMatch,
      status: 'Joined'
    });

    // Call stats
    const callMatch = { ...baseMatch };
    const totalCalls = await Candidate.countDocuments({
      ...baseMatch,
      $or: [
        { firstCallDate: { $ne: null, $ne: '' } },
        { firstCallStatus: { $ne: null, $ne: '' } },
        { 'notes.0': { $exists: true } }
      ]
    });

    const todayCalls = await Candidate.countDocuments({
      ...baseMatch,
      createdAt: { $gte: startOfToday, $lt: endOfToday },
      $or: [
        { firstCallDate: { $ne: null, $ne: '' } },
        { firstCallStatus: { $ne: null, $ne: '' } },
        { 'notes.0': { $exists: true } }
      ]
    });

    // Candidates
    const totalCandidates = await Candidate.countDocuments(baseMatch);
    const joined = joinedCount;

    // Follow-ups (candidates with follow-up notes)
    const followUpMatch = {
      ...baseMatch,
      'notes.followUpDate': { $gte: startOfToday, $lt: endOfToday }
    };
    
    const followUps = await Candidate.find(followUpMatch).select('name phone status notes').limit(10);

    // Recent activity
    const activityMatch = {};
    if (filterRecruiter) activityMatch.user = filterRecruiter;

    const recentActivity = await AuditLog.find(activityMatch)
      .sort('-timestamp').limit(10)
      .select('action timestamp type');

    // Call target (daily = 50)
    const callTarget = { target: 50, completed: todayCalls };

    res.json({
      metrics: {
        totalCandidates,
        totalCalls,
        todayCalls,
        totalInterviews: finalSelectCount,
        scheduledInterviews: finalSelectCount,
        joined,
        conversionRate: totalCandidates > 0 ? Math.round((joined / totalCandidates) * 100) : 0,
      },
      pipeline,
      followUps,
      recentActivity,
      callTarget,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/tl
exports.tlDashboard = async (req, res, next) => {
  try {
    const { range = 'month', startDate, endDate, from, to, tlId, division, company, customer, recruiter } = req.query;
    const currentUser = req.user;
    const { getDateRange } = require('../utils/helpers');
    const customStart = startDate || from || null;
    const customEnd = endDate || to || null;
    const selectedRange = (customStart || customEnd) ? 'custom' : (range || 'month').toLowerCase();
    const { start, end } = getDateRange(selectedRange, customStart, customEnd);
    const dateFilter = selectedRange === 'all' ? {} : { $gte: start, $lt: end };

    // Determine target TL ID: Admins can specify, TLs get their own
    const targetTlId = (currentUser.role === 'admin' || currentUser.role === 'manager') && tlId ? tlId : currentUser._id;

    // Get assigned team members (recruiters)
    const teamAssignments = await TeamMember.find({ teamLeaderId: targetTlId, removedAt: null })
      .populate('memberId', 'name email employeeId status')
      .lean();
    
    let recruiters = teamAssignments
      .map(ta => ta.memberId)
      .filter(u => u && u.status === 'Active');

    if (recruiters.length === 0 && (currentUser.role === 'admin' || currentUser.role === 'manager') && !tlId) {
      recruiters = await User.find({ role: { $in: ['recruiter', 'tl'] }, status: { $ne: 'Suspended' } }).select('name email employeeId status').lean();
    } else {
      const targetTlUser = await User.findById(targetTlId).select('name email employeeId status').lean();
      if (targetTlUser && !recruiters.some(r => String(r._id) === String(targetTlId))) {
        recruiters.unshift(targetTlUser);
      }
    }

    if (recruiter && recruiter !== 'All Recruiters' && recruiter !== 'All') {
      recruiters = recruiters.filter(r => String(r._id) === String(recruiter) || r.name === recruiter);
    }

    const recruiterIds = recruiters.map(r => r._id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const clientFilter = customer || company;
    const extraFilter = {};
    if (division && division !== 'All') extraFilter.division = division;
    if (clientFilter && clientFilter !== 'All Companies') {
      const companyRegex = new RegExp(`^${clientFilter.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i');
      extraFilter.$or = [
        { clientName: companyRegex },
        { company: companyRegex },
        { client: companyRegex },
      ];
    }

    const teamStats = await Promise.all(recruiters.map(async (r) => {
      const rId = r._id;
      const rName = r.name;
      
      const andConditions = [
        {
          $or: [
            { assignedRecruiter: rId },
            { assignedRecruiterName: rName },
            { sourcedBy: rName },
            { recruiterName: rName }
          ]
        }
      ];

      if (division && division !== 'All') {
        andConditions.push({ division });
      }
      if (clientFilter && clientFilter !== 'All Companies') {
        const companyRegex = new RegExp(`^${clientFilter.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i');
        andConditions.push({
          $or: [
            { clientName: companyRegex },
            { company: companyRegex },
            { client: companyRegex },
          ]
        });
      }

      const recruiterBaseNoDate = { $and: andConditions };

      const recruiterBaseMatch = selectedRange === 'all'
        ? recruiterBaseNoDate
        : { $and: [...andConditions, { createdAt: dateFilter }] };

      const stageMatch = (statuses) => {
        if (selectedRange === 'all') {
          return { ...recruiterBaseNoDate, status: { $in: statuses } };
        }
        return {
          ...recruiterBaseNoDate,
          status: { $in: statuses },
          createdAt: dateFilter
        };
      };

      const eligible = await Candidate.countDocuments(stageMatch(['Eligible', 'Eligible Candidates', 'Call Back']));
      const finalSelect = await Candidate.countDocuments(stageMatch(['Final Select', 'Final Round Scheduled', 'Final Round Completed', 'L1 Select', 'L2 Select', 'Client Select', 'Selected']));
      const docCompleted = await Candidate.countDocuments(stageMatch(['Documentation Completed', 'Documentation Incomplete', 'Document Initialized', 'Documennt Initialted', 'Documentation', 'Document Pending', 'Documents Pending']));
      const offerAccept = await Candidate.countDocuments(stageMatch(['Offer Accept', 'Offer Accepted', 'Offered', 'Offer Released', 'Yet To Join', 'Waiting for Offer']));
      
      const joinedMatch = selectedRange === 'all'
        ? { ...recruiterBaseNoDate, status: 'Joined' }
        : {
            ...recruiterBaseNoDate,
            status: 'Joined',
            $or: [
              { dateOfJoining: dateFilter },
              { 'offerDetails.dateOfJoining': dateFilter },
              { 'offerDetails.expectedDateOfJoining': dateFilter },
              { expectedDateOfJoining: dateFilter },
              { createdAt: dateFilter }
            ]
          };
      const joined = await Candidate.countDocuments(joinedMatch);

      const totalCalls = await Candidate.countDocuments({
        ...recruiterBaseMatch,
        $or: [
          { firstCallDate: { $ne: null, $ne: '' } },
          { firstCallStatus: { $ne: null, $ne: '' } },
          { 'notes.0': { $exists: true } }
        ]
      });

      const todayCalls = await Candidate.countDocuments({
        ...recruiterBaseMatch,
        createdAt: { $gte: today, $lt: tomorrow },
        $or: [
          { firstCallDate: { $ne: null, $ne: '' } },
          { firstCallStatus: { $ne: null, $ne: '' } },
          { 'notes.0': { $exists: true } }
        ]
      });

      // Count candidates with interview scheduled today
      const todayInterviews = await Candidate.countDocuments({
        ...recruiterBaseMatch,
        $or: [
          { interviewScheduled: { $gte: today, $lt: tomorrow } },
          { interviewDate: { $gte: today, $lt: tomorrow } },
        ],
      });

      // Count candidates needing TL follow-up (Eligible, but no TL call submitted)
      const followUps = await Candidate.countDocuments({
        ...recruiterBaseMatch,
        firstCallStatus: 'Eligible',
        tlCallSubmitted: false,
      });

      const totalCandidates = await Candidate.countDocuments(recruiterBaseMatch);
      const activeCandidates = await Candidate.countDocuments({
        ...recruiterBaseMatch,
        status: { $nin: ['Rejected', 'Joined'] },
      });

      const totalInterviewsScheduled = await Candidate.countDocuments({
        ...recruiterBaseMatch,
        status: { $in: ['Interview Scheduled', 'Interview Rescheduled', 'Interview Completed', 'Shortlisted', 'HR Round Scheduled', 'Final Round Scheduled', 'Selected', 'Rejected'] }
      });

      return {
        id: r._id,
        name: r.name,
        email: r.email,
        employeeId: r.employeeId,
        todayCalls,
        totalCalls,
        eligible,
        finalSelect,
        docCompleted,
        offerAccept,
        joined,
        callTarget: 50,
        todayInterviews,
        totalInterviewsScheduled,
        followUps,
        totalCandidates,
        activeCandidates,
        onTarget: todayCalls >= 50,
      };
    }));

    // Team Summary Totals
    const summary = {
      totalCalls: teamStats.reduce((s, r) => s + (r.totalCalls || 0), 0),
      eligible: teamStats.reduce((s, r) => s + (r.eligible || 0), 0),
      finalSelect: teamStats.reduce((s, r) => s + (r.finalSelect || 0), 0),
      docCompleted: teamStats.reduce((s, r) => s + (r.docCompleted || 0), 0),
      offerAccept: teamStats.reduce((s, r) => s + (r.offerAccept || 0), 0),
      joined: teamStats.reduce((s, r) => s + (r.joined || 0), 0),
    };

    if ((currentUser.role === 'admin' || currentUser.role === 'manager') && !tlId && (!recruiter || recruiter === 'All Recruiters' || recruiter === 'All')) {
      const summaryNoDate = [];
      if (division && division !== 'All') summaryNoDate.push({ division });
      if (clientFilter && clientFilter !== 'All Companies') {
        const companyRegex = new RegExp(`^${clientFilter.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i');
        summaryNoDate.push({
          $or: [
            { clientName: companyRegex },
            { company: companyRegex },
            { client: companyRegex },
          ]
        });
      }
      const baseSummaryMatch = summaryNoDate.length > 0 ? { $and: summaryNoDate } : {};

      const summaryStageMatch = (statuses) => {
        if (selectedRange === 'all') {
          return { ...baseSummaryMatch, status: { $in: statuses } };
        }
        return {
          ...baseSummaryMatch,
          status: { $in: statuses },
          createdAt: dateFilter
        };
      };

      summary.eligible = await Candidate.countDocuments(summaryStageMatch(['Eligible', 'Eligible Candidates', 'Call Back']));
      summary.finalSelect = await Candidate.countDocuments(summaryStageMatch(['Final Select', 'Final Round Scheduled', 'Final Round Completed', 'L1 Select', 'L2 Select', 'Client Select', 'Selected']));
      summary.docCompleted = await Candidate.countDocuments(summaryStageMatch(['Documentation Completed', 'Documentation Incomplete', 'Document Initialized', 'Documennt Initialted', 'Documentation', 'Document Pending', 'Documents Pending']));
      summary.offerAccept = await Candidate.countDocuments(summaryStageMatch(['Offer Accept', 'Offer Accepted', 'Offered', 'Offer Released', 'Yet To Join', 'Waiting for Offer']));
      summary.joined = await Candidate.countDocuments(
        selectedRange === 'all'
          ? { ...baseSummaryMatch, status: 'Joined' }
          : {
              ...baseSummaryMatch,
              status: 'Joined',
              $or: [
                { dateOfJoining: dateFilter },
                { 'offerDetails.dateOfJoining': dateFilter },
                { 'offerDetails.expectedDateOfJoining': dateFilter },
                { expectedDateOfJoining: dateFilter },
                { createdAt: dateFilter }
              ]
            }
      );
      summary.totalCalls = await Candidate.countDocuments(
        selectedRange === 'all'
          ? {
              ...baseSummaryMatch,
              $or: [
                { firstCallDate: { $ne: null, $ne: '' } },
                { firstCallStatus: { $ne: null, $ne: '' } },
                { 'notes.0': { $exists: true } }
              ]
            }
          : {
              ...baseSummaryMatch,
              $or: [
                { firstCallDate: dateFilter },
                { 'notes.date': dateFilter },
                { createdAt: dateFilter },
                { updatedAt: dateFilter }
              ]
            }
      );
    }

    // Pending corrections (filtered by team members)
    const corrections = await Candidate.find({ 
      flagged: true,
      assignedRecruiter: { $in: recruiterIds }
    })
      .select('name phone email skills experience source status assignedRecruiterName flagReason')
      .limit(20);

    // Team health
    const avgCalls = teamStats.length > 0 ? Math.round(teamStats.reduce((s, t) => s + t.todayCalls, 0) / teamStats.length) : 0;
    const onTarget = teamStats.filter(t => t.onTarget).length;

    res.json({
      summary,
      teamMembers: teamStats,
      corrections,
      teamHealth: {
        avgCalls,
        onTargetCount: onTarget,
        totalMembers: teamStats.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/manager
exports.managerDashboard = async (req, res, next) => {
  try {
    const { range = 'month', startDate, endDate } = req.query;
    const { getDateRange } = require('../utils/helpers');
    const { start, end } = getDateRange(range, startDate, endDate);
    const dateFilter = { $gte: start, $lt: end };

    // Previous period for trend calculation
    const duration = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - duration);
    const prevDateFilter = { $gte: prevStart, $lt: start };

    // KPIs
    const totalPlacements = await Candidate.countDocuments({ status: 'Joined', updatedAt: dateFilter });
    const totalInterviews = await Interview.countDocuments({ createdAt: dateFilter });
    const completedInterviews = await Interview.countDocuments({ status: 'Completed', updatedAt: dateFilter });
    const interviewToHire = totalInterviews > 0 ? Math.round((totalPlacements / totalInterviews) * 100) : 0;

    // Revenue Calculation
    const joinedCurrent = await Candidate.countDocuments({ status: 'Joined', updatedAt: dateFilter });
    const currentRevenue = joinedCurrent * 25000;
    const joinedPrev = await Candidate.countDocuments({ status: 'Joined', updatedAt: prevDateFilter });
    const prevRevenue = joinedPrev * 25000;
    
    let revenueTrend = '+0%';
    if (prevRevenue > 0) {
      const pct = Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100);
      revenueTrend = `${pct >= 0 ? '+' : ''}${pct}%`;
    } else if (currentRevenue > 0) {
      revenueTrend = '+100%';
    }

    // Funnel data & Revenue Data (last 6 months)
    const funnelData = [];
    const revenueData = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const mFilter = { $gte: mStart, $lt: mEnd };
      
      const applied = await Candidate.countDocuments({ createdAt: mFilter });
      const interviewed = await Interview.countDocuments({ createdAt: mFilter });
      const selected = await Candidate.countDocuments({ status: 'Selected', updatedAt: mFilter });
      const joinedCount = await Candidate.countDocuments({ status: 'Joined', updatedAt: mFilter });
      
      const monthLabel = mStart.toLocaleString('default', { month: 'short' });
      
      funnelData.push({
        month: monthLabel,
        applied, interviewed, selected, joined: joinedCount,
      });
      
      revenueData.push({
        month: monthLabel,
        revenue: joinedCount * 25000
      });
    }

    // Recruiter productivity
    const recruiters = await User.find({ role: 'recruiter', status: 'Active' }).select('name');
    const recruiterProductivity = await Promise.all(recruiters.map(async (r) => {
      const calls = await CallLog.countDocuments({ recruiter: r._id, createdAt: dateFilter });
      const interviews = await Interview.countDocuments({ recruiter: r._id, createdAt: dateFilter });
      const placements = await Candidate.countDocuments({ assignedRecruiter: r._id, status: 'Joined', updatedAt: dateFilter });
      return { name: r.name, calls, interviews, placements };
    }));

    // Source distribution
    const sourceDistribution = await Candidate.aggregate([
      { $match: { createdAt: dateFilter } },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Department distribution
    const departmentDistribution = await Candidate.aggregate([
      { $match: { createdAt: dateFilter, department: { $ne: null } } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      kpis: {
        totalPlacements,
        totalInterviews,
        completedInterviews,
        interviewToHireRate: interviewToHire,
        avgTimeToHire: 14,
        revenue: currentRevenue,
        revenueTrend
      },
      funnelData,
      revenueData,
      recruiterProductivity,
      sourceDistribution: sourceDistribution.map(s => ({ source: s._id || 'Unknown', count: s.count })),
      departmentDistribution: departmentDistribution.map(d => ({ department: d._id, count: d.count })),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/admin
exports.adminDashboard = async (req, res, next) => {
  try {
    const { range, dateRange, startDate, endDate, from, to } = req.query;
    const selectedRange = (range || dateRange || 'all').toLowerCase();
    const customStart = (startDate && String(startDate).trim()) || (from && String(from).trim()) || null;
    const customEnd = (endDate && String(endDate).trim()) || (to && String(to).trim()) || null;

    const { getDateRange } = require('../utils/helpers');
    const { start, end } = getDateRange(selectedRange, customStart, customEnd);
    const dateMatch = selectedRange === 'all' ? {} : { createdAt: { $gte: start, $lt: end } };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Active users today
    const activeLogins = await Attendance.countDocuments({ date: { $gte: today, $lt: tomorrow } });
    const totalUsers = await User.countDocuments({ status: 'Active' });
    const totalResumes = await Candidate.countDocuments(dateMatch);

    // Attendance rate
    const attendanceRate = totalUsers > 0 ? Math.round((activeLogins / totalUsers) * 100) : 0;

    // ── NEW DASHBOARD CARD COUNTS ────────────────────────────────────
    const Job = require('../models/Job');

    // Pending Follow-ups: candidates with follow-up note in selected range (or due today/earlier if all)
    const followUpFilter = selectedRange === 'all'
      ? { 'notes.followUpDate': { $exists: true, $lte: tomorrow } }
      : { ...dateMatch, 'notes.followUpDate': { $exists: true } };

    const pendingFollowUps = await Candidate.countDocuments({
      status: { $nin: ['Rejected', 'Joined', 'Exited'] },
      ...followUpFilter,
    });

    // HR Round: candidates in HR Shortlist status
    const hrRoundCount = await Candidate.countDocuments({ ...dateMatch, status: 'HR Shortlist' });

    // Selected / Offered: candidates with status in final selection, offer or documentation
    const selectedCount = await Candidate.countDocuments({
      ...dateMatch,
      status: {
        $in: [
          'Selected', 'Final Select', 'Client Select', 'Test Select', 'Selected for Call', 'Waiting for Offer', 'Offered', 'Offer Released',
          'Offer Accept', 'Offer Accepted', 'Document Initialized', 'Documennt Initialted',
          'Documentation Completed', 'Documentation Incomplete', 'Document Pending', 'Documentation'
        ]
      }
    });

    // Follow to Join: candidates with status 'Yet To Join'
    const followToJoinCount = await Candidate.countDocuments({ ...dateMatch, status: 'Yet To Join' });

    // Joined count
    const joinedCount = await Candidate.countDocuments({ ...dateMatch, status: 'Joined' });

    // Rejected count
    const rejectedCount = await Candidate.countDocuments({ ...dateMatch, status: 'Rejected' });

    // Open Jobs count and Total Open Positions
    const jobMatch = selectedRange === 'all' ? { status: { $regex: /^open$/i } } : { status: { $regex: /^open$/i }, createdAt: { $gte: start, $lt: end } };
    const openJobs = await Job.find(jobMatch).select('positions openPositions noOfPositions');
    const openJobsCount = openJobs.length;
    const openPositionsCount = openJobs.reduce((sum, j) => sum + (parseInt(j.positions || j.openPositions || j.noOfPositions) || 1), 0);

    // Revenue this month (from Revenue model if it exists)
    let currentMonthRevenue = 0;
    try {
      const Revenue = require('../models/Revenue');
      const now = new Date();
      const revenueDoc = await Revenue.findOne({ month: now.getMonth() + 1, year: now.getFullYear() });
      currentMonthRevenue = revenueDoc?.actual || 0;
    } catch (e) {
      currentMonthRevenue = 0;
    }
    // ── END NEW COUNTS ───────────────────────────────────────────────

    // Source chart
    const sourcePipeline = [
      ...(selectedRange !== 'all' ? [{ $match: { createdAt: { $gte: start, $lt: end } } }] : []),
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ];
    const sourceChart = await Candidate.aggregate(sourcePipeline);

    // Recent alerts (from logs)
    const alerts = await AuditLog.find({ type: { $in: ['delete', 'system'] } })
      .sort('-timestamp').limit(5)
      .select('action userName type timestamp');

    // System metrics
    const todayLogs = await AuditLog.countDocuments({ timestamp: { $gte: today, $lt: tomorrow } });

    // Calculate total revenue and get candidate revenue details
    const revPipeline = [
      { $match: { revenueGenerated: { $gt: 0 }, ...(selectedRange !== 'all' ? { createdAt: { $gte: start, $lt: end } } : {}) } },
      { $project: { _id: 1, name: 1, revenueGenerated: 1, joiningSalary: 1, placementPercentage: 1, dateOfJoining: 1, status: 1 } },
      { $sort: { revenueGenerated: -1 } }
    ];
    const revenueData = await Candidate.aggregate(revPipeline);
    const totalRevenue = revenueData.reduce((sum, c) => sum + (c.revenueGenerated || 0), 0);

    res.json({
      totalRevenue,
      revenueCandidates: revenueData,
      metrics: {
        activeLogins,
        totalUsers,
        totalResumes,
        attendanceRate,
        todayLogs,
        totalCandidates: totalResumes,
        pendingFollowUps,
        hrRoundCount,
        selectedCount,
        selected: selectedCount,
        followToJoinCount,
        yetToJoinCount: followToJoinCount,
        joinedCount,
        joined: joinedCount,
        rejectedCount,
        openJobsCount,
        openPositionsCount,
        currentMonthRevenue,
      },
      sourceChart: sourceChart.map(s => ({ source: s._id || 'Unknown', count: s.count })),
      alerts: alerts.map(a => ({
        id: a._id,
        message: a.action,
        user: a.userName,
        type: a.type,
        severity: a.type === 'delete' ? 'high' : 'medium',
        time: a.timestamp,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/manager/reports
exports.managerReports = async (req, res, next) => {
  try {
    const { dateRange, range, startDate, endDate, from, to, sort = 'placements' } = req.query;
    const customStart = (startDate && String(startDate).trim()) || (from && String(from).trim()) || null;
    const customEnd = (endDate && String(endDate).trim()) || (to && String(to).trim()) || null;
    const selectedRange = (customStart || customEnd) ? 'custom' : (dateRange || range || 'all');
    const { start, end } = getDateRange(selectedRange, customStart, customEnd);
    const dateFilter = { $gte: start, $lt: end };

    const recruiters = await User.find({ role: 'recruiter', status: 'Active' }).select('name employeeId');

    const reports = await Promise.all(recruiters.map(async (r) => {
      const totalCalls = await CallLog.countDocuments({ recruiter: r._id, createdAt: dateFilter });
      const interviews = await Interview.countDocuments({ recruiter: r._id, createdAt: dateFilter });
      const placements = await Candidate.countDocuments({ assignedRecruiter: r._id, status: 'Joined', updatedAt: dateFilter });
      const candidates = await Candidate.countDocuments({ assignedRecruiter: r._id, createdAt: dateFilter });

      return {
        id: r._id,
        name: r.name,
        employeeId: r.employeeId,
        totalCalls,
        interviews,
        placements,
        candidates,
        conversionRate: candidates > 0 ? Math.round((placements / candidates) * 100) : 0,
      };
    }));

    // Sort
    reports.sort((a, b) => b[sort] - a[sort] || 0);

    res.json({ reports, dateRange });
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/admin/all-teams
exports.allTeamsDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Get all active Team Leaders
    const teamLeaders = await User.find({ role: 'tl', status: 'Active' }).select('name email employeeId status').lean();

    const teams = await Promise.all(teamLeaders.map(async (tl) => {
      // 2. Get recruiters for this TL
      const teamAssignments = await TeamMember.find({ teamLeaderId: tl._id, removedAt: null })
        .populate('memberId', 'name email employeeId status')
        .lean();
      
      const recruiters = teamAssignments
        .map(ta => ta.memberId)
        .filter(u => u && u.status === 'Active');

      // 3. Calculate performance for each recruiter
      const recruiterStats = await Promise.all(recruiters.map(async (r) => {
        // Calls today
        const callsAgg = await Candidate.aggregate([
          { $match: { assignedRecruiter: r._id } },
          { $unwind: '$notes' },
          { $match: { 'notes.createdAt': { $gte: today, $lt: tomorrow } } },
          { $count: 'count' },
        ]);
        const calls = callsAgg[0]?.count || 0;

        // Interviews today
        const interviews = await Candidate.countDocuments({
          assignedRecruiter: r._id,
          $or: [
            { interviewScheduled: { $gte: today, $lt: tomorrow } },
            { interviewDate: { $gte: today, $lt: tomorrow } },
          ],
        });

        // Follow-ups (Eligible candidates waiting for TL)
        const followUps = await Candidate.countDocuments({
          assignedRecruiter: r._id,
          firstCallStatus: 'Eligible',
          tlCallSubmitted: false,
        });

        // Joined count (all time)
        const joinedCount = await Candidate.countDocuments({
          assignedRecruiter: r._id,
          status: 'Joined'
        });

        return {
          id: r._id,
          name: r.name,
          employeeId: r.employeeId,
          status: r.status,
          calls,
          target: 50,
          interviews,
          followUps,
          joinedCount,
          onTarget: calls >= 50
        };
      }));

      // 4. Aggregate TL performance
      const tlStats = {
        totalCalls: recruiterStats.reduce((s, r) => s + r.calls, 0),
        totalInterviews: recruiterStats.reduce((s, r) => s + r.interviews, 0),
        totalFollowUps: recruiterStats.reduce((s, r) => s + r.followUps, 0),
        totalJoined: recruiterStats.reduce((s, r) => s + r.joinedCount, 0),
        onTargetCount: recruiterStats.filter(r => r.onTarget).length,
        totalMembers: recruiterStats.length
      };

      return {
        tlId: tl._id,
        tlName: tl.name,
        tlEmployeeId: tl.employeeId,
        recruiters: recruiterStats,
        stats: tlStats
      };
    }));

    // 5. Overall summary
    const summary = {
      totalCalls: teams.reduce((s, t) => s + t.stats.totalCalls, 0),
      totalInterviews: teams.reduce((s, t) => s + t.stats.totalInterviews, 0),
      totalFollowUps: teams.reduce((s, t) => s + t.stats.totalFollowUps, 0),
      activeRecruiters: teams.reduce((s, t) => s + t.stats.totalMembers, 0)
    };

    res.json({
      teams,
      summary
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/division
exports.divisionDashboard = async (req, res, next) => {
  try {
    const { division = 'BPO', company, tlId, recruiterId, range, dateRange, startDate, endDate, from, to } = req.query;
    const selectedRange = (range || dateRange || 'all').toLowerCase();
    const customStart = (startDate && String(startDate).trim()) || (from && String(from).trim()) || null;
    const customEnd = (endDate && String(endDate).trim()) || (to && String(to).trim()) || null;

    const { getDateRange } = require('../utils/helpers');
    const { start, end } = getDateRange(selectedRange, customStart, customEnd);

    const Job = require('../models/Job');
    const Candidate = require('../models/Candidate');
    const TeamMember = require('../models/TeamMember');
    const User = require('../models/User');

    let userIds = [];
    let userNames = [];

    if (recruiterId && recruiterId !== 'All Recruiters') {
      const recUser = await User.findOne({
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(recruiterId) ? recruiterId : null },
          { name: recruiterId }
        ]
      }).select('_id name');
      if (recUser) {
        userIds = [recUser._id];
        userNames = [recUser.name];
      } else {
        userIds = [recruiterId];
        userNames = [recruiterId];
      }
    } else if (tlId && tlId !== 'All Team Leaders') {
      const tlUser = await User.findOne({
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(tlId) ? tlId : null },
          { name: tlId }
        ]
      }).select('_id name');
      const targetTlId = tlUser ? tlUser._id : tlId;
      const targetTlName = tlUser ? tlUser.name : tlId;

      const teamAssigned = await TeamMember.find({ teamLeaderId: targetTlId, removedAt: null }).lean();
      const memberIds = teamAssigned.map(m => m.memberId).filter(Boolean);

      userIds = [targetTlId, ...memberIds];

      const memberUsers = await User.find({ _id: { $in: userIds } }).select('_id name');
      userNames = memberUsers.map(u => u.name).filter(Boolean);
      if (targetTlName && !userNames.includes(targetTlName)) userNames.push(targetTlName);
    }

    const jobQuery = { division };
    const candQuery = { division };
    if (selectedRange !== 'all') {
      jobQuery.createdAt = { $gte: start, $lt: end };
      candQuery.createdAt = { $gte: start, $lt: end };
    }

    // Apply User / TL filter
    if (userIds.length > 0) {
      const candUserCond = [
        { assignedRecruiter: { $in: userIds } },
        { assignedRecruiterName: { $in: userNames } }
      ];

      const candidateJobs = await Candidate.distinct('positionApplied', { assignedRecruiter: { $in: userIds } });
      const candidateJrs = await Candidate.distinct('jrNumber', { assignedRecruiter: { $in: userIds } });

      const jobUserCond = [
        { createdBy: { $in: userIds } },
        { 'assignedRecruiters.recruiterId': { $in: userIds } },
        { recruiterName: { $in: userNames } }
      ];
      if (candidateJobs.length > 0) jobUserCond.push({ jobTitle: { $in: candidateJobs } });
      if (candidateJrs.length > 0) jobUserCond.push({ jrNumber: { $in: candidateJrs } });

      if (company && company !== 'All Companies') {
        const companyRegex = new RegExp(`^${company.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i');
        candQuery.$and = [
          { $or: [{ clientName: companyRegex }, { company: companyRegex }, { client: companyRegex }] },
          { $or: candUserCond }
        ];
        jobQuery.$and = [
          { $or: [{ companyName: companyRegex }, { client: companyRegex }] },
          { $or: jobUserCond }
        ];
      } else {
        candQuery.$or = candUserCond;
        jobQuery.$or = jobUserCond;
      }
    } else if (company && company !== 'All Companies') {
      const companyRegex = new RegExp(`^${company.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i');
      candQuery.$or = [
        { clientName: companyRegex },
        { company: companyRegex },
        { client: companyRegex },
      ];
      jobQuery.$or = [
        { companyName: companyRegex },
        { client: companyRegex },
      ];
    }

    // 1. Open Positions & total JRs
    const openJobs = await Job.find({ ...jobQuery, status: 'Open' });
    const openPositions = openJobs.reduce((sum, j) => sum + (j.positions || 0), 0);
    const totalJRs = openJobs.length;

    // 2. Comprehensive Candidate Stage Matching
    const screeningStatuses = [
      'Eligible', 'Eligible Candidates', 'Screening', 'Shortlisted', 'Submitted to Client', 'Submitted To Client',
      'Sublitted To Client', 'Walkin Company', 'Walkin WHM', 'Call Back', 'Hold', 'No Response',
      'Duplicate-Client', 'Walk-in Submitted', 'Contacted', 'Interested', 'Selected for Call', 'New', 'HR Shortlist',
      'Did Not Pick', 'Switched Off', 'Busy', 'Not Reachable', 'Wrong Number', 'Ringing', 'No Pick'
    ];

    const interviewStatuses = [
      'Interview Scheduled', 'Interview Rescheduled', 'Interview Completed', 'Interview',
      'Selected for Interview', 'Written Test', 'Operations Round', 'Interview Feedback Pending',
      'Test Select', 'Test Reject', 'L1 Select', 'L1 Reject', 'L2 Select', 'L2 Reject', 'VNA Select', 'VNA Reject',
      'Candidate Drop Post L1 Select', 'Candidate Drop Post L2 Select', 'Candidate Drop During Final Stage',
      'Final Reject', 'No Show'
    ];

    const offerStatuses = [
      'Selected', 'Final Select', 'Client Select', 'Waiting for Offer', 'Offered',
      'Offer Released', 'Offer Accept', 'Offer Accepted', 'Document Initialized',
      'Documennt Initialted', 'Documentation Completed', 'Documentation Incomplete',
      'Document Pending', 'Documentation'
    ];

    const baseYetToJoinOr = [
      { status: { $in: ['Yet To Join', 'Joining Date Confirmed', 'Joining Postponed'] } },
      { candidateStatusPostOffer: 'Yet To Join' },
      { currentStage: 'Joining', status: { $ne: 'Joined' } }
    ];

    function buildQueryWithOr(baseQuery, extraOrArray) {
      if (baseQuery.$and) {
        return {
          ...baseQuery,
          $and: [...baseQuery.$and, { $or: extraOrArray }]
        };
      }
      if (baseQuery.$or) {
        const { $or: existingOr, ...rest } = baseQuery;
        return {
          ...rest,
          $and: [
            { $or: existingOr },
            { $or: extraOrArray }
          ]
        };
      }
      return {
        ...baseQuery,
        $or: extraOrArray
      };
    }

    const screeningMatch = buildQueryWithOr(candQuery, [
      { status: { $in: screeningStatuses } }
    ]);

    const interviewMatch = buildQueryWithOr(candQuery, [
      { status: { $in: interviewStatuses } }
    ]);

    const offerMatch = buildQueryWithOr(candQuery, [
      { status: { $in: offerStatuses } }
    ]);

    const yetToJoinMatch = buildQueryWithOr(candQuery, [
      { status: { $in: ['Yet To Join', 'Joining Date Confirmed', 'Joining Postponed'] } }
    ]);

    const [
      screeningCount,
      interviewCount,
      offerCount,
      yetToJoinCount,
      joinedCount,
      joinedCandidates,
      yetToJoinCandidates,
      offeredCandidates
    ] = await Promise.all([
      Candidate.countDocuments(screeningMatch),
      Candidate.countDocuments(interviewMatch),
      Candidate.countDocuments(offerMatch),
      Candidate.countDocuments(yetToJoinMatch),
      Candidate.countDocuments({ ...candQuery, status: 'Joined' }),
      Candidate.find({ ...candQuery, status: 'Joined' })
        .select('name positionApplied clientName dateOfJoining assignedRecruiterName status')
        .sort('-dateOfJoining'),
      Candidate.find(yetToJoinMatch)
        .select('name positionApplied clientName dateOfJoining expectedDateOfJoining assignedRecruiterName status candidateStatusPostOffer')
        .sort('-createdAt'),
      Candidate.find(offerMatch)
        .select('name positionApplied clientName dateOfJoining expectedDateOfJoining assignedRecruiterName status candidateStatusPostOffer')
        .sort('-createdAt')
    ]);

    res.json({
      division,
      company: company || 'All Companies',
      tlId: tlId || 'All Team Leaders',
      recruiterId: recruiterId || 'All Recruiters',
      openPositions,
      totalJRs,
      pipeline: {
        screening: screeningCount,
        interview: interviewCount,
        offer: offerCount,
        yetToJoin: yetToJoinCount,
        joined: joinedCount,
      },
      joinedCandidates,
      yetToJoinCandidates,
      offeredCandidates
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/reports/advanced
exports.advancedReports = async (req, res, next) => {
  try {
    const { dateRange, range, startDate, endDate, from, to, division, tlId } = req.query;
    const customStart = (startDate && String(startDate).trim()) || (from && String(from).trim()) || null;
    const customEnd = (endDate && String(endDate).trim()) || (to && String(to).trim()) || null;
    const selectedRange = (customStart || customEnd) ? 'custom' : (dateRange || range || 'all');
    const { start, end } = getDateRange(selectedRange, customStart, customEnd);
    
    const Job = require('../models/Job');
    const Candidate = require('../models/Candidate');
    const User = require('../models/User');
    const TeamMember = require('../models/TeamMember');

    // Build comprehensive Recruiter -> TL lookup maps (by both ObjectId and Name)
    const allAssignments = await TeamMember.find({ removedAt: null }).populate('teamLeaderId', 'name _id').populate('memberId', 'name _id').lean();
    const recruiterToTlMap = {};
    const recruiterNameToTlMap = {};
    const tlUsers = await User.find({ role: 'tl' }).select('_id name').lean();
    tlUsers.forEach(t => {
      recruiterToTlMap[t._id.toString()] = t.name;
      recruiterNameToTlMap[t.name] = t.name;
    });
    allAssignments.forEach(ta => {
      if (ta.memberId && ta.teamLeaderId) {
        const memId = ta.memberId._id ? ta.memberId._id.toString() : ta.memberId.toString();
        recruiterToTlMap[memId] = ta.teamLeaderId.name;
        if (ta.memberId.name) {
          recruiterNameToTlMap[ta.memberId.name] = ta.teamLeaderId.name;
        }
      }
    });

    const cleanRecName = (name) => {
      if (!name) return 'Unassigned';
      const trimmed = name
        .replace(/\s*\((recruiter|tl|admin|manager)\)\s*/gi, '')
        .replace(/\s*\[(recruiter|tl|admin|manager)\]\s*/gi, '')
        .trim();
      if (['general pool', 'corporate demo admin', 'system administrator', 'demo admin', 'unassigned'].includes(trimmed.toLowerCase())) {
        return 'Unassigned';
      }
      return trimmed || 'Unassigned';
    };

    const divisionMatch = (division && division !== 'All' && division !== 'All Divisions') ? { division } : {};

    // 1. Recruiter performance
    const recruiterReport = await Candidate.aggregate([
      { 
        $match: { 
          createdAt: { $gte: start, $lt: end }, 
          ...divisionMatch,
          assignedRecruiterName: { $nin: [null, '', 'General Pool', 'Unassigned'] }
        } 
      },
      {
        $group: {
          _id: '$assignedRecruiterName',
          shared: { $sum: 1 },
          interviews: {
            $sum: {
              $cond: [{ $in: ['$status', ['Interview Scheduled', 'Interview Completed', 'Shortlisted', 'HR Round Scheduled']] }, 1, 0]
            }
          },
          selected: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Selected'] }, 1, 0]
            }
          },
          joined: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Joined'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { joined: -1 } }
    ]);

    // 2. Customer performance
    const customerReport = await Candidate.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end }, clientName: { $ne: null, $ne: '' }, ...divisionMatch } },
      {
        $group: {
          _id: '$clientName',
          shared: { $sum: 1 },
          interviews: {
            $sum: {
              $cond: [{ $in: ['$status', ['Interview Scheduled', 'Interview Completed', 'Shortlisted', 'HR Round Scheduled']] }, 1, 0]
            }
          },
          selected: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Selected'] }, 1, 0]
            }
          },
          joined: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Joined'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { joined: -1 } }
    ]);

    // 3. Division performance
    const divisionReport = await Candidate.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: '$division',
          shared: { $sum: 1 },
          interviews: {
            $sum: {
              $cond: [{ $in: ['$status', ['Interview Scheduled', 'Interview Completed', 'Shortlisted', 'HR Round Scheduled']] }, 1, 0]
            }
          },
          selected: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Selected'] }, 1, 0]
            }
          },
          joined: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Joined'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { joined: -1 } }
    ]);

    // 4. Aging Report
    const activePipelineCandidates = await Candidate.find({
      status: { $nin: ['Joined', 'Rejected', 'Exited'] },
      ...divisionMatch,
    }).select('name currentStage status updatedAt createdAt assignedRecruiterName assignedRecruiter division')
      .populate('assignedRecruiter', 'name');

    const agingCandidates = activePipelineCandidates.map(cand => {
      const lastChangeDate = cand.updatedAt || cand.createdAt;
      const daysPending = Math.ceil((new Date() - new Date(lastChangeDate)) / (1000 * 60 * 60 * 24));
      
      let tlName = 'Unassigned';
      if (cand.assignedRecruiter && cand.assignedRecruiter._id) {
        tlName = recruiterToTlMap[cand.assignedRecruiter._id.toString()] || 'Unassigned';
      }
      if (tlName === 'Unassigned' && cand.assignedRecruiterName) {
        tlName = recruiterNameToTlMap[cand.assignedRecruiterName] || 'Unassigned';
      }

      return {
        _id: cand._id,
        name: cand.name,
        stage: cand.currentStage,
        status: cand.status,
        division: cand.division || 'BPO',
        daysPending,
        pendingSince: cand.createdAt,
        recruiter: cand.assignedRecruiterName || 'Unassigned',
        teamLead: tlName,
        manager: 'Admin'
      };
    }).sort((a, b) => b.daysPending - a.daysPending);

    const avgStageAging = {};
    ['Applied', 'Screening', 'Interview', 'Offer', 'Joining'].forEach(stg => {
      const stgCands = agingCandidates.filter(c => c.stage === stg);
      const avg = stgCands.length > 0
        ? Math.round(stgCands.reduce((s, c) => s + c.daysPending, 0) / stgCands.length)
        : 0;
      avgStageAging[stg] = avg;
    });

    // 5. Conversion Ratio Report
    const conversionReport = recruiterReport.map(r => {
      const sharedPerSelect = r.selected > 0 ? (r.shared / r.selected).toFixed(1) : '—';
      const sharedPerJoin = r.joined > 0 ? (r.shared / r.joined).toFixed(1) : '—';
      return {
        recruiter: r._id || 'Unknown',
        shared: r.shared,
        interviews: r.interviews,
        selected: r.selected,
        joined: r.joined,
        sharedPerSelect,
        sharedPerJoin
      };
    });

    // 6. Active JR Report (JR Nos, Customer Name, Skills, Active profiles in Pipeline, Division & TL Mappings)
    const openJobQuery = { status: { $ne: 'Closed' } };
    if (division && division !== 'All' && division !== 'All Divisions') {
      openJobQuery.division = division;
    }
    const openJobs = await Job.find(openJobQuery)
      .populate('createdBy', 'name email employeeId role')
      .lean();

    let activeJRsReport = await Promise.all(openJobs.map(async (j) => {
      const escapedTitle = (j.jobTitle || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const activeCandidates = await Candidate.find({
        $or: [
          { jrNumber: j.jrNumber },
          { positionApplied: { $regex: `^${escapedTitle}$`, $options: 'i' } }
        ],
        status: { $nin: ['Rejected', 'Exited'] }
      }).select('name phone email status currentStage assignedRecruiterName createdAt updatedAt division').lean();

      const isInterview = (s) => ['Interview Scheduled', 'Interview Completed', 'Shortlisted', 'HR Round Scheduled', 'Written Test', 'Test Select', 'Test Reject', 'Operations Round', 'HR Shortlist', 'L1/Final', 'Submitted to Client', 'Selected', 'Final Select', 'No Show', 'Final Round Scheduled', 'Final Round Completed'].includes(s);
      const isOffered = (s) => ['Offered', 'Offer Released', 'Offer Accept', 'Offer Accepted', 'Documentation', 'Documentation Completed', 'Candidate Drop Post L2 Select'].includes(s);
      const isYetToJoin = (s) => ['Yet To Join', 'Joining Date Confirmed', 'Joining Postponed'].includes(s);
      const isJoined = (s) => s === 'Joined';

      let screeningCount = 0;
      let interviewCount = 0;
      let offeredCount = 0;
      let yetToJoinCount = 0;
      let joinedCount = 0;

      activeCandidates.forEach(c => {
        const s = c.status;
        if (isJoined(s)) joinedCount++;
        else if (isYetToJoin(s)) yetToJoinCount++;
        else if (isOffered(s)) offeredCount++;
        else if (isInterview(s)) interviewCount++;
        else screeningCount++;
      });

      let tlName = 'Unassigned';
      if (j.createdBy?._id && recruiterToTlMap[j.createdBy._id.toString()]) {
        tlName = recruiterToTlMap[j.createdBy._id.toString()];
      } else if (j.createdBy?.name && recruiterNameToTlMap[j.createdBy.name]) {
        tlName = recruiterNameToTlMap[j.createdBy.name];
      } else if (j.recruiterName && recruiterNameToTlMap[j.recruiterName]) {
        tlName = recruiterNameToTlMap[j.recruiterName];
      }

      return {
        _id: j._id,
        jrNumber: j.jrNumber || '—',
        customerName: j.companyName || j.client || '—',
        jobTitle: j.jobTitle || '—',
        division: j.division || 'BPO',
        teamLeader: tlName,
        skills: Array.isArray(j.skills) ? j.skills.join(', ') : (j.skills || '—'),
        location: j.location || '—',
        positions: j.positions || 1,
        status: j.status || 'Open',
        createdBy: j.createdBy?.name || j.recruiterName || 'Admin',
        activeProfilesCount: activeCandidates.length,
        screeningCount,
        interviewCount,
        offeredCount,
        yetToJoinCount,
        joinedCount,
        activeCandidates: activeCandidates.map(c => ({
          _id: c._id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          status: c.status,
          stage: c.currentStage,
          division: c.division || j.division || 'BPO',
          recruiter: c.assignedRecruiterName || 'Unassigned',
          updatedAt: c.updatedAt || c.createdAt
        }))
      };
    }));

    if (tlId && tlId !== 'All' && tlId !== 'All Team Leaders') {
      activeJRsReport = activeJRsReport.filter(j => j.teamLeader === tlId);
    }

    // 7. Active Status Profiles (Documentation process, Pending with Customer, Joined, etc.)
    const activeProfilesQuery = {
      status: { $nin: ['Rejected', 'Exited'] },
      ...divisionMatch,
    };

    const activeProfilesCandidates = await Candidate.find(activeProfilesQuery)
      .select('name phone email positionApplied clientName status jrNumber assignedRecruiter assignedRecruiterName sourcedBy updatedAt createdAt division')
      .lean();

    const masterStatusesSet = new Set([
      'Eligible', 'Not Eligible', 'Not Interested', 'No Response', 'Duplicate-Client', 'Call Back',
      'Hold', 'Submitted to Client', 'Walkin Company', 'Walkin WHM', 'No Show', 'VNA Select', 'VNA Reject',
      'Test Select', 'Test Reject', 'Candidate Drop Post L1 Select', 'Candidate Drop Post L2 Select',
      'Candidate Drop During Final Stage', 'L1 Select', 'L1 Reject', 'L2 Select', 'L2 Reject',
      'Final Select', 'Final Reject', 'Document Initialized', 'Documentation Completed',
      'Documentation Incomplete', 'Waiting for Offer', 'Offer Accept', 'Offer Reject', 'Joined',
      'Joined and Abort'
    ]);

    let activeProfilesReport = activeProfilesCandidates.map(c => {
      const daysPending = Math.ceil((new Date() - new Date(c.updatedAt || c.createdAt)) / (1000 * 60 * 60 * 24));
      let rawStatus = c.status || 'Eligible';
      let displayStatus = masterStatusesSet.has(rawStatus) ? rawStatus : 'Eligible';
      if (rawStatus === 'Screening' || rawStatus === 'New' || rawStatus === 'Contacted' || rawStatus === 'Interested' || rawStatus === 'Selected for Call' || rawStatus === 'Eligible Candidates') displayStatus = 'Eligible';
      else if (rawStatus === 'Document Pending' || rawStatus === 'Documentation' || rawStatus === 'Documennt Initialted') displayStatus = 'Document Initialized';
      else if (rawStatus === 'Yet To Join' || rawStatus === 'Joining Date Confirmed' || rawStatus === 'Joining Postponed') displayStatus = 'Offer Accept';
      else if (rawStatus === 'Submitted To Client' || rawStatus === 'Sublitted To Client' || rawStatus === 'Walk-in Submitted') displayStatus = 'Submitted to Client';
      else if (rawStatus === 'HR Shortlist' || rawStatus === 'SPOC Shortlisted' || rawStatus === 'HR Round Scheduled') displayStatus = 'Eligible';
      else if (rawStatus === 'Selected' || rawStatus === 'L1/Final') displayStatus = 'Final Select';

      const resolvedRecruiter = (c.assignedRecruiterName && !['general pool', 'unassigned', 'corporate demo admin', 'system administrator'].includes(c.assignedRecruiterName.trim().toLowerCase()))
        ? c.assignedRecruiterName
        : (c.sourcedBy || 'Unassigned');

      const tlName = (c.assignedRecruiter && recruiterToTlMap[c.assignedRecruiter.toString()]) || 
                     (c.assignedRecruiterName && recruiterNameToTlMap[c.assignedRecruiterName]) || 
                     (resolvedRecruiter && recruiterNameToTlMap[resolvedRecruiter]) ||
                     'Unassigned';

      return {
        _id: c._id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        positionApplied: c.positionApplied || '—',
        clientName: c.clientName || '—',
        status: displayStatus,
        jrNumber: c.jrNumber || '—',
        recruiter: cleanRecName(resolvedRecruiter),
        teamLeader: cleanRecName(tlName),
        division: c.division || 'BPO',
        daysPending,
        updatedAt: c.updatedAt || c.createdAt
      };
    }).sort((a, b) => b.daysPending - a.daysPending);

    if (tlId && tlId !== 'All' && tlId !== 'All Team Leaders') {
      activeProfilesReport = activeProfilesReport.filter(p => p.teamLeader === tlId);
    }

    // 8. Revenue Report (Joined Candidates with CTC, Date of Joining & Customer/Division Breakdown)
    const joinedCandidatesDateFilter = (selectedRange !== 'all') ? {
      $or: [
        { dateOfJoining: { $gte: start, $lt: end } },
        { 'offerDetails.dateOfJoining': { $gte: start, $lt: end } },
        { expectedDateOfJoining: { $gte: start, $lt: end } },
        { 'offerDetails.expectedDateOfJoining': { $gte: start, $lt: end } },
        { updatedAt: { $gte: start, $lt: end } },
        { createdAt: { $gte: start, $lt: end } }
      ]
    } : {};

    const joinedCandidatesRaw = await Candidate.find({
      status: 'Joined',
      isDemoData: { $ne: true },
      ...divisionMatch,
      ...joinedCandidatesDateFilter
    }).select('name phone email positionApplied clientName companyName division joiningSalary placementPercentage revenueGenerated offerDetails dateOfJoining expectedDateOfJoining assignedRecruiter assignedRecruiterName sourcedBy isDemoData updatedAt createdAt').lean();

    const joinedCandidatesList = joinedCandidatesRaw
      .filter(c => !c.isDemoData && !c.email?.includes('demo@') && c.assignedRecruiterName !== 'Corporate Demo Admin')
      .map(c => {
        let ctc = parseFloat(c.joiningSalary) || parseFloat(c.offerDetails?.joiningSalary) || parseFloat(c.offerDetails?.offeredCTC) || 0;
        let rev = parseFloat(c.revenueGenerated) || 0;
        if (!rev && ctc) {
          const pct = parseFloat(c.placementPercentage) || parseFloat(c.offerDetails?.placementPercentage) || 8.33;
          rev = (ctc * pct) / 100;
        }
        if (!rev) rev = 25000;

        const doj = c.offerDetails?.dateOfJoining || c.dateOfJoining || c.expectedDateOfJoining || c.updatedAt || c.createdAt;
        const dojStr = doj ? new Date(doj).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
        const monthStr = doj ? new Date(doj).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—';

        const rawRecruiter = (c.assignedRecruiterName && !['general pool', 'unassigned', 'corporate demo admin', 'system administrator'].includes(c.assignedRecruiterName.trim().toLowerCase()))
          ? c.assignedRecruiterName
          : (c.sourcedBy || 'Unassigned');
        const sanitizedRecruiter = cleanRecName(rawRecruiter);

        const rawTl = (c.assignedRecruiter && recruiterToTlMap[c.assignedRecruiter.toString()]) || 
                     (c.assignedRecruiterName && recruiterNameToTlMap[c.assignedRecruiterName]) || 
                     (rawRecruiter && recruiterNameToTlMap[rawRecruiter]) ||
                     'Unassigned';
        const sanitizedTl = cleanRecName(rawTl);

        return {
          _id: c._id,
          name: c.name,
          phone: c.phone || '—',
          email: c.email || '—',
          positionApplied: c.positionApplied || '—',
          customerName: c.clientName || c.companyName || 'General / Unspecified',
          division: c.division || 'BPO',
          ctc,
          doj: dojStr,
          month: monthStr,
          rawDoj: doj,
          revenue: rev,
          recruiter: sanitizedRecruiter,
          teamLeader: sanitizedTl,
          joinedDate: dojStr,
          status: c.status || 'Joined'
        };
      });

    const totalJoinedRevenue = joinedCandidatesList.reduce((sum, c) => sum + c.revenue, 0);

    // Yet To Join candidates for projected revenue
    const yetToJoinDateFilter = (selectedRange !== 'all') ? {
      $or: [
        { expectedDateOfJoining: { $gte: start, $lt: end } },
        { 'offerDetails.expectedDateOfJoining': { $gte: start, $lt: end } },
        { dateOfJoining: { $gte: start, $lt: end } },
        { 'offerDetails.dateOfJoining': { $gte: start, $lt: end } },
        { updatedAt: { $gte: start, $lt: end } },
        { createdAt: { $gte: start, $lt: end } }
      ]
    } : {};

    const yetToJoinRaw = await Candidate.find({
      status: { $in: ['Yet To Join', 'Offer Accept', 'Offer Accepted', 'Waiting for Offer', 'Joining Date Confirmed', 'Joining Postponed'] },
      ...divisionMatch,
      ...yetToJoinDateFilter
    }).select('clientName companyName division joiningSalary placementPercentage revenueGenerated offerDetails dateOfJoining expectedDateOfJoining createdAt').lean();

    const customerRevMap = {};
    const divisionRevMap = {};
    const monthlyRevMap = {};

    // Process joined candidates into maps
    joinedCandidatesList.forEach(c => {
      const cust = c.customerName;
      const div = c.division;
      const mStr = c.month && c.month !== '—' ? c.month : (c.rawDoj ? new Date(c.rawDoj).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Unknown');

      if (!customerRevMap[cust]) {
        customerRevMap[cust] = { customerName: cust, yetToJoinCount: 0, joinedCount: 0, expectedRevenue: 0, actualJoinedRevenue: 0 };
      }
      customerRevMap[cust].joinedCount += 1;
      customerRevMap[cust].actualJoinedRevenue += c.revenue;

      if (!divisionRevMap[div]) {
        divisionRevMap[div] = { division: div, yetToJoinCount: 0, joinedCount: 0, expectedRevenue: 0, actualJoinedRevenue: 0 };
      }
      divisionRevMap[div].joinedCount += 1;
      divisionRevMap[div].actualJoinedRevenue += c.revenue;

      if (!monthlyRevMap[mStr]) {
        monthlyRevMap[mStr] = { month: mStr, yetToJoinCount: 0, joinedCount: 0, expectedRevenue: 0, actualJoinedRevenue: 0, rawDate: c.rawDoj ? new Date(c.rawDoj) : new Date(0) };
      }
      monthlyRevMap[mStr].joinedCount += 1;
      monthlyRevMap[mStr].actualJoinedRevenue += c.revenue;
    });

    // Process Yet To Join candidates for projected revenue
    let totalExpectedFromYTJ = 0;
    yetToJoinRaw.forEach(c => {
      const cust = c.clientName || c.companyName || 'General / Unspecified';
      const div = c.division || 'BPO';
      const doj = c.offerDetails?.dateOfJoining || c.dateOfJoining || c.expectedDateOfJoining || c.offerDetails?.expectedDateOfJoining || c.createdAt;
      const mStr = doj ? new Date(doj).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Unknown';

      let ctc = parseFloat(c.joiningSalary) || parseFloat(c.offerDetails?.joiningSalary) || parseFloat(c.offerDetails?.offeredCTC) || 0;
      let projRev = parseFloat(c.revenueGenerated) || 0;
      if (!projRev && ctc) {
        const pct = parseFloat(c.placementPercentage) || parseFloat(c.offerDetails?.placementPercentage) || 8.33;
        projRev = (ctc * pct) / 100;
      }
      if (!projRev) projRev = 25000;
      totalExpectedFromYTJ += projRev;

      if (!customerRevMap[cust]) {
        customerRevMap[cust] = { customerName: cust, yetToJoinCount: 0, joinedCount: 0, expectedRevenue: 0, actualJoinedRevenue: 0 };
      }
      customerRevMap[cust].yetToJoinCount += 1;
      customerRevMap[cust].expectedRevenue += projRev;

      if (!divisionRevMap[div]) {
        divisionRevMap[div] = { division: div, yetToJoinCount: 0, joinedCount: 0, expectedRevenue: 0, actualJoinedRevenue: 0 };
      }
      divisionRevMap[div].yetToJoinCount += 1;
      divisionRevMap[div].expectedRevenue += projRev;

      if (!monthlyRevMap[mStr]) {
        monthlyRevMap[mStr] = { month: mStr, yetToJoinCount: 0, joinedCount: 0, expectedRevenue: 0, actualJoinedRevenue: 0, rawDate: doj ? new Date(doj) : new Date(0) };
      }
      monthlyRevMap[mStr].yetToJoinCount += 1;
      monthlyRevMap[mStr].expectedRevenue += projRev;
    });

    const customerJoinedRevenue = Object.values(customerRevMap).sort((a, b) => (b.actualJoinedRevenue + b.expectedRevenue) - (a.actualJoinedRevenue + a.expectedRevenue));
    const divisionJoinedRevenue = Object.values(divisionRevMap).sort((a, b) => (b.actualJoinedRevenue + b.expectedRevenue) - (a.actualJoinedRevenue + a.expectedRevenue));
    const monthlyJoinedRevenue = Object.values(monthlyRevMap).sort((a, b) => b.rawDate - a.rawDate);

    const expectedRevenueReport = {
      joinedCandidates: joinedCandidatesList,
      customerRevenue: customerJoinedRevenue,
      divisionRevenue: divisionJoinedRevenue,
      monthlyRevenue: monthlyJoinedRevenue,
      totalJoinedRevenue,
      totalJoinedCount: joinedCandidatesList.length,
      totalExpectedRevenue: totalJoinedRevenue + totalExpectedFromYTJ,
    };

    // 9. Lead and Recruiter Performance Report (Flat List & Team-Wise Hierarchy)
    const usersList = await User.find({ 
      role: { $in: ['recruiter', 'tl', 'manager', 'admin'] },
      status: { $ne: 'Suspended' },
      name: { $nin: ['Corporate Demo Admin', 'General Pool', 'System Administrator'] }
    }).select('name role employeeId').lean();

    const getMetricsForUser = async (u) => {
      const candidateMatch = selectedRange === 'all'
        ? { $or: [{ assignedRecruiter: u._id }, { assignedRecruiterName: u.name }] }
        : { $or: [{ assignedRecruiter: u._id }, { assignedRecruiterName: u.name }], createdAt: { $gte: start, $lt: end } };

      const submitted = await Candidate.countDocuments(candidateMatch);
      const selects = await Candidate.countDocuments({
        ...candidateMatch,
        status: { $in: ['Selected', 'Offer Released', 'Offer Accepted', 'Yet To Join', 'Joined'] }
      });
      const joinees = await Candidate.countDocuments({
        ...candidateMatch,
        status: 'Joined'
      });

      return {
        userId: u._id,
        name: u.name,
        employeeId: u.employeeId || '—',
        role: u.role === 'tl' ? 'Team Lead' : (u.role === 'recruiter' ? 'Recruiter' : u.role.toUpperCase()),
        submitted,
        selects,
        joinees,
        joineesVsSubmittedRatio: submitted > 0 ? `${((joinees / submitted) * 100).toFixed(1)}%` : '0.0%',
        joineesVsSelectsRatio: selects > 0 ? `${((joinees / selects) * 100).toFixed(1)}%` : '0.0%',
      };
    };

    const leadRecruiterPerformanceReport = await Promise.all(usersList.map(u => getMetricsForUser(u)));

    const activeLeadRecruiterPerformance = leadRecruiterPerformanceReport
      .filter(r => r.name && !['Corporate Demo Admin', 'General Pool', 'System Administrator'].includes(r.name))
      .sort((a, b) => b.joinees - a.joinees || b.selects - a.selects || b.submitted - a.submitted || a.name.localeCompare(b.name));

    // Build Team-Wise hierarchy (Team Lead -> Members)
    const allTls = await User.find({ role: 'tl' }).select('name role employeeId').lean();
    const teamAssignments = await TeamMember.find({ removedAt: null }).populate('memberId', 'name role employeeId').lean();

    const tlMembersMap = {};
    const assignedMemberSet = new Set();

    teamAssignments.forEach(ta => {
      if (ta.teamLeaderId && ta.memberId) {
        const tlIdStr = ta.teamLeaderId.toString();
        if (!tlMembersMap[tlIdStr]) tlMembersMap[tlIdStr] = [];
        tlMembersMap[tlIdStr].push(ta.memberId);
        assignedMemberSet.add(ta.memberId._id.toString());
      }
    });

    const teamWiseReport = await Promise.all(allTls.map(async (tl) => {
      const tlMetrics = await getMetricsForUser(tl);
      const members = tlMembersMap[tl._id.toString()] || [];
      const memberMetrics = await Promise.all(members.map(m => getMetricsForUser(m)));

      const totalSubmitted = tlMetrics.submitted + memberMetrics.reduce((s, m) => s + m.submitted, 0);
      const totalSelects = tlMetrics.selects + memberMetrics.reduce((s, m) => s + m.selects, 0);
      const totalJoinees = tlMetrics.joinees + memberMetrics.reduce((s, m) => s + m.joinees, 0);

      return {
        teamLeader: {
          ...tlMetrics,
          totalSubmitted,
          totalSelects,
          totalJoinees,
          totalJoineesVsSubmittedRatio: totalSubmitted > 0 ? `${((totalJoinees / totalSubmitted) * 100).toFixed(1)}%` : '0.0%',
          totalJoineesVsSelectsRatio: totalSelects > 0 ? `${((totalJoinees / totalSelects) * 100).toFixed(1)}%` : '0.0%',
        },
        members: memberMetrics.sort((a, b) => b.joinees - a.joinees || b.selects - a.selects || b.submitted - a.submitted)
      };
    }));

    // Find direct / unassigned recruiters
    const unassignedRecruiters = await User.find({
      role: 'recruiter',
      _id: { $nin: Array.from(assignedMemberSet) }
    }).select('name role employeeId').lean();

    const unassignedMetrics = (await Promise.all(unassignedRecruiters.map(m => getMetricsForUser(m))))
      .sort((a, b) => b.joinees - a.joinees || b.selects - a.selects || b.submitted - a.submitted);

    res.json({
      recruiterReport,
      customerReport,
      divisionReport,
      aging: {
        avgStageAging,
        candidates: agingCandidates.slice(0, 100) // limit to top 100 for performance
      },
      conversionReport,
      activeJRsReport,
      activeProfilesReport,
      expectedRevenueReport,
      leadRecruiterPerformanceReport: activeLeadRecruiterPerformance,
      teamWisePerformanceReport: {
        teams: teamWiseReport,
        unassignedMembers: unassignedMetrics
      }
    });
  } catch (err) {
    next(err);
  }
};
