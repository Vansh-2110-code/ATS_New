const Candidate = require('../models/Candidate');
const Employee = require('../models/Employee');
const User = require('../models/User');
const { createLog } = require('../utils/auditLogger');
const { generateEmployeeId } = require('../utils/helpers');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const notificationService = require('../utils/notification.service');
const validator = require('validator');

// GET /api/candidates/callbacks
exports.getCallbacks = async (req, res, next) => {
  try {
    const query = {
      $or: [
        { status: 'Call Back' },
        { callBackDate: { $ne: null } },
        { interviewCallBackDate: { $ne: null } }
      ]
    };

    if (req.user && req.user.role === 'recruiter') {
      query.assignedRecruiter = req.user._id;
    }

    const candidates = await Candidate.find(query).sort({ updatedAt: -1 }).limit(100);
    res.json({ success: true, count: candidates.length, candidates });
  } catch (err) {
    next(err);
  }
};

// GET /api/candidates/clients — created company names for filter dropdowns
exports.listClientNames = async (req, res, next) => {
  try {
    const Company = require('../models/Company');
    const companies = await Company.find().select('companyName').collation({ locale: 'en', strength: 2 }).sort({ companyName: 1 });
    const names = companies.map(c => c.companyName).filter(Boolean);
    const uniqueSorted = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    res.json(uniqueSorted);
  } catch (err) {
    next(err);
  }
};

// GET /api/candidates
exports.list = async (req, res, next) => {
  try {
    const { search, source, status, city, localArea, recruiter, page = 1, limit = 20, sort = '-createdAt', fromDate, toDate, division, statusIn, activeOnly, createdToday, company, clientName, tlId } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { skills: { $elemMatch: { $regex: search, $options: 'i' } } },
        { resumeOriginalName: { $regex: search, $options: 'i' } },
        { positionApplied: { $regex: search, $options: 'i' } },
        { assignedRecruiterName: { $regex: search, $options: 'i' } },
      ];
    }
    if (source) query.source = source;

    // Company / Client filtering
    const companyParam = company || clientName;
    if (companyParam && companyParam !== 'All Companies') {
      const companyRegex = new RegExp(`^${companyParam.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i');
      query.$or = [
        { clientName: companyRegex },
        { company: companyRegex },
        { client: companyRegex },
      ];
    }

    // statusIn: comma-separated list of statuses e.g. "Eligible,Eligible Candidates"
    if (statusIn) {
      const statuses = statusIn.split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length > 0) query.status = { $in: statuses };
    } else if (status) {
      const reverseMap = {
        'Eligible': ['Eligible', 'Eligible Candidates'],
        'No Response': ['No Response', 'No response', 'Did Not Pick', 'Not reachable'],
        'Not Eligible': ['Not Eligible', 'Rejected', 'Rejected – Communication', 'Rejected – Experience Mismatch', 'Rejected – Salary Mismatch', 'Rejected – Location Constraint', 'Rejected – Notice Period'],
        'Final Select': ['Final Select', 'Selected', 'Final Round Scheduled'],
        'Offer Accept': ['Offer Accept', 'Yet To Join', 'Offer Released', 'Offer Accepted', 'Salary Negotiation in Progress'],
        'Document Initialized': ['Document Initialized', 'Documentation', 'Documents Pending', 'Document Pending', 'Documennt Initialted'],
        'Test Select': ['Test Select', 'Written Test'],
        'L1 Select': ['L1 Select', 'HR Shortlist', 'HR Round Scheduled'],
        'Interview Scheduled': ['Interview Scheduled', 'Interview Completed', 'Interview Rescheduled'],
        'Hold': ['Hold', 'On Hold', 'Interview Feedback Pending'],
        'Submitted to Client': ['Submitted to Client', 'Shortlisted'],
        'Waiting for Offer': ['Waiting for Offer', 'Offer in Progress', 'Offer Approval Pending'],
        'Offer Reject': ['Offer Reject', 'Offer Declined'],
        'Duplicate-Client': ['Duplicate-Client', 'Duplicate Profile'],
      };
      if (reverseMap[status]) {
        query.status = { $in: reverseMap[status] };
      } else {
        query.status = status;
      }
    }

    // activeOnly: show candidates not in terminal/rejected statuses
    if (activeOnly === 'true') {
      const terminalStatuses = [
        'Not Eligible', 'Not Interested', 'Duplicate-Client', 'Black List',
        'VNA Reject', 'Test Reject', 'L1 Reject', 'L2 Reject', 'Final Reject',
        'Offer Reject', 'Joined and Abort', 'No Show',
        'Candidate Drop Post L1 Select', 'Candidate Drop Post L2 Select',
        'Candidate Drop During Final Stage',
      ];
      query.status = { $nin: terminalStatuses };
    }

    // createdToday: only candidates created today
    if (createdToday === 'true') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      query.createdAt = { $gte: today, $lt: tomorrow };
    }

    if (division && division !== 'All') query.division = division;
    if (city) query.city = { $regex: city, $options: 'i' };
    if (localArea) query.localArea = { $regex: localArea, $options: 'i' };
    if (req.query.reassignRequested === 'true') query.reassignRequested = true;
    if (req.query.inactive === 'true') query.candidateActiveStatus = 'Inactive';
    if (req.query.tlFollowUpRequired === 'true') {
      query.firstCallStatus = 'Eligible';
      query.tlCallSubmitted = false;
    }

    if (fromDate || toDate || req.query.range || req.query.dateRange) {
      const selectedRange = (req.query.range || req.query.dateRange || '').toLowerCase();
      if (selectedRange && selectedRange !== 'all') {
        const { getDateRange } = require('../utils/helpers');
        const { start, end } = getDateRange(selectedRange, fromDate, toDate);
        query.createdAt = { $gte: start, $lt: end };
      } else {
        if (!query.createdAt) query.createdAt = {};
        if (fromDate) {
          query.createdAt.$gte = new Date(fromDate);
        }
        if (toDate) {
          const endOfDay = new Date(toDate);
          endOfDay.setHours(23, 59, 59, 999);
          query.createdAt.$lte = endOfDay;
        }
      }
    }

    // Team Leader / Recruiter Filter
    let effectiveTlId = tlId;
    if (!effectiveTlId && req.user.role === 'tl') {
      effectiveTlId = req.user._id;
    }
    const isAllRecruiters = !recruiter || recruiter === 'All Recruiters' || recruiter === 'All';
    const isAllTls = !effectiveTlId || effectiveTlId === 'All Team Leaders' || effectiveTlId === 'All';

    if (!isAllTls && isAllRecruiters) {
      const TeamMember = require('../models/TeamMember');
      const User = require('../models/User');
      const mongoose = require('mongoose');

      let targetTlId = null;
      let targetTlName = null;

      if (mongoose.Types.ObjectId.isValid(effectiveTlId)) {
        targetTlId = effectiveTlId;
        const u = await User.findById(effectiveTlId).select('name');
        if (u) targetTlName = u.name;
      } else {
        const u = await User.findOne({ name: effectiveTlId }).select('_id name');
        if (u) {
          targetTlId = u._id;
          targetTlName = u.name;
        } else {
          targetTlName = effectiveTlId;
        }
      }

      let userIds = [];
      let userNames = [];

      if (targetTlId) {
        userIds.push(targetTlId);
        const teamAssigned = await TeamMember.find({ teamLeaderId: targetTlId, removedAt: null }).lean();
        const memberIds = teamAssigned.map(m => m.memberId).filter(Boolean);
        userIds.push(...memberIds);

        const memberUsers = await User.find({ _id: { $in: userIds } }).select('_id name');
        userNames = memberUsers.map(u => u.name).filter(Boolean);
      }
      if (targetTlName && !userNames.includes(targetTlName)) userNames.push(targetTlName);

      const tlUserCond = [];
      if (userIds.length > 0) tlUserCond.push({ assignedRecruiter: { $in: userIds } });
      if (userNames.length > 0) {
        tlUserCond.push({ assignedRecruiterName: { $in: userNames } });
        tlUserCond.push({ sourcedBy: { $in: userNames } });
        tlUserCond.push({ recruiterName: { $in: userNames } });
      }

      if (tlUserCond.length > 0) {
        if (query.$or) {
          query.$and = [{ $or: query.$or }, { $or: tlUserCond }];
          delete query.$or;
        } else {
          query.$or = tlUserCond;
        }
      }
    } else if (!isAllRecruiters && (req.user.role === 'tl' || req.user.role === 'admin' || req.user.role === 'manager')) {
      const mongoose = require('mongoose');
      const User = require('../models/User');
      let cond = [];
      if (mongoose.Types.ObjectId.isValid(recruiter)) {
        cond.push({ assignedRecruiter: recruiter });
        const recUser = await User.findById(recruiter).select('_id name');
        if (recUser) {
          cond.push({ assignedRecruiterName: recUser.name });
          cond.push({ sourcedBy: recUser.name });
          cond.push({ recruiterName: recUser.name });
        }
      } else {
        cond.push({ assignedRecruiterName: recruiter });
        cond.push({ sourcedBy: recruiter });
        cond.push({ recruiterName: recruiter });
        const recUser = await User.findOne({ name: recruiter }).select('_id name');
        if (recUser) cond.push({ assignedRecruiter: recUser._id });
      }
      if (cond.length > 0) {
        if (query.$or) {
          query.$and = [{ $or: query.$or }, { $or: cond }];
          delete query.$or;
        } else {
          query.$or = cond;
        }
      }
    } else if (req.user.role === 'recruiter') {
      const recCond = [
        { assignedRecruiter: req.user._id },
        { assignedRecruiterName: req.user.name },
        { sourcedBy: req.user.name },
        { recruiterName: req.user.name }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: recCond }];
        delete query.$or;
      } else {
        query.$or = recCond;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Compute status counts across the entire dataset matching non-status query filters
    const countQuery = { ...query };
    delete countQuery.status;

    const [candidates, total, statusAgg] = await Promise.all([
      Candidate.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-notes'),
      Candidate.countDocuments(query),
      Candidate.aggregate([
        { $match: countQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const CANONICAL_STATUS_MAP = {
      'Eligible Candidates': 'Eligible',
      'New': 'Eligible',
      'Screening': 'Eligible',
      'Contacted': 'Eligible',
      'Interested': 'Eligible',
      'Selected for Call': 'Eligible',
      'SPOC Shortlisted': 'Eligible',
      'Screening in Progress': 'Eligible',
      'Other': 'Eligible',
      'Did Not Pick': 'No Response',
      'No response': 'No Response',
      'Not reachable': 'No Response',
      'Rejected': 'Not Eligible',
      'Rejected – Communication': 'Not Eligible',
      'Rejected – Experience Mismatch': 'Not Eligible',
      'Rejected – Salary Mismatch': 'Not Eligible',
      'Rejected – Location Constraint': 'Not Eligible',
      'Rejected – Notice Period': 'Not Eligible',
      'Rejected – Second Round': 'L2 Reject',
      'Rejected – Interview Round': 'L1 Reject',
      'Selected': 'Final Select',
      'Final Round Scheduled': 'Final Select',
      'Yet To Join': 'Offer Accept',
      'Offer Released': 'Offer Accept',
      'Offer Accepted': 'Offer Accept',
      'Salary Negotiation in Progress': 'Offer Accept',
      'Offer Declined': 'Offer Reject',
      'Documentation': 'Document Initialized',
      'Documents Pending': 'Document Initialized',
      'Document Pending': 'Document Initialized',
      'Documennt Initialted': 'Document Initialized',
      'Written Test': 'Test Select',
      'HR Shortlist': 'L1 Select',
      'HR Round Scheduled': 'L1 Select',
      'Interview Completed': 'Interview Scheduled',
      'Interview Rescheduled': 'Interview Scheduled',
      'On Hold': 'Hold',
      'Interview Feedback Pending': 'Hold',
      'Shortlisted': 'Submitted to Client',
      'Offer in Progress': 'Waiting for Offer',
      'Offer Approval Pending': 'Waiting for Offer',
      'Duplicate Profile': 'Duplicate-Client',
      'Call back scheduled': 'Call Back',
    };

    const statusCounts = {};
    let totalCandidatesCount = 0;
    statusAgg.forEach(s => {
      if (s._id) {
        const canonical = CANONICAL_STATUS_MAP[s._id] || s._id;
        statusCounts[canonical] = (statusCounts[canonical] || 0) + s.count;
        totalCandidatesCount += s.count;
      }
    });

    res.json({
      candidates,
      statusCounts,
      totalCount: totalCandidatesCount || total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCandidatesCount || total,
        filteredTotal: total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/candidates/:id
exports.getById = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id)
      .populate('assignedRecruiter', 'name email');
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // Auto-update ownership status based on 30-day validity
    const lastActivity = candidate.assignedAt || candidate.createdAt;
    const daysSinceAssignment = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
    const isExpired = daysSinceAssignment >= 30 || candidate.ownershipStatus === 'Expired';

    if (daysSinceAssignment >= 30 && candidate.ownershipStatus !== 'General Data') {
      candidate.ownershipStatus = 'General Data';
      candidate.assignedRecruiter = undefined;
      candidate.assignedRecruiterName = 'General Pool';
      await candidate.save();
    }

    // Everyone (Recruiter, Team Lead, Manager, Admin) can view candidate details
    res.json(candidate);
  } catch (err) {
    next(err);
  }
};

const mapSubStatusToGlobalStatus = (subStatus) => {
  if (!subStatus) return null;
  const statusMap = {
    'Eligible': 'Eligible',
    'Eligible Candidates': 'Eligible',
    'New': 'Eligible',
    'Screening': 'Eligible',
    'Contacted': 'Eligible',
    'Interested': 'Eligible',
    'Selected for Call': 'Eligible',
    'SPOC Shortlisted': 'Eligible',
    'Interview Scheduled': 'Interview Scheduled',
    'Interview Completed': 'Interview Scheduled',
    'Selected': 'Final Select',
    'Joined': 'Joined',
    'Rejected – Communication': 'Not Eligible',
    'Rejected – Experience Mismatch': 'Not Eligible',
    'Rejected – Salary Mismatch': 'Not Eligible',
    'Rejected – Location Constraint': 'Not Eligible',
    'Rejected – Notice Period': 'Not Eligible',
    'Rejected – Second Round': 'L2 Reject',
    'Rejected – Interview Round': 'L1 Reject',
    'Offer Released': 'Offer Accept',
    'Offer Accepted': 'Offer Accept',
    'Offer Declined': 'Offer Reject',
    'No response': 'No Response',
    'Not reachable': 'No Response',
    'Call back scheduled': 'Call Back',
    'Screening in Progress': 'Eligible',
    'On Hold': 'Hold',
    'Duplicate Profile': 'Duplicate-Client',
    'Not Interested': 'Not Interested',
    'Other': 'Eligible',
    'Interview Rescheduled': 'Interview Scheduled',
    'Interview Feedback Pending': 'Hold',
    'Shortlisted': 'Submitted to Client',
    'HR Round Scheduled': 'L1 Select',
    'Final Round Scheduled': 'Final Select',
    'Offer in Progress': 'Waiting for Offer',
    'Offer Approval Pending': 'Waiting for Offer',
    'Salary Negotiation in Progress': 'Offer Accept',
    'Documents Pending': 'Document Initialized',
    'Background Verification Initiated': 'Documentation Completed',
    'Background Verification Cleared': 'Documentation Completed',
    'Background Verification Failed': 'Final Reject',
    'Joining Date Confirmed': 'Offer Accept',
    'Joining Postponed': 'Offer Accept'
  };
  if (statusMap[subStatus]) return statusMap[subStatus];
  
  const CANDIDATE_STATUSES = [
    'New', 'Contacted', 'Interested', 'Selected for Call',
    'Interview Scheduled', 'Selected', 'Rejected',
    'Eligible Candidates', 'Wrong Number', 'Unreachable',
    'Did Not Pick', 'Unanswered Calls', 'Call Back',
    'HR Shortlist', 'Written Test', 'Operations Round',
    'Document Pending', 'Documentation', 'Yet To Join', 'Joined',
    'Walk-in Submitted', 'Exited'
  ];
  if (CANDIDATE_STATUSES.includes(subStatus)) return subStatus;
  
  return null;
};

// POST /api/candidates
exports.create = async (req, res, next) => {
  try {
    const data = { ...req.body };

    // Parse skills if sent as string
    if (typeof data.skills === 'string') {
      data.skills = data.skills.split(',').map(s => s.trim()).filter(Boolean);
    }

    // Handle file upload

    if (req.file) {
      data.resumePath = `/uploads/resumes/${req.file.filename}`;
      data.resumeOriginalName = req.file.originalname;
    }

    data.assignedRecruiter = req.user._id;
    data.assignedRecruiterName = req.user.name;

    // Recruiter cannot set final round/interview status on create
    if (req.user.role === 'recruiter') {
      delete data.finalRoundStatus;
      delete data.finalInterviewStatus;
    }
    // Auto-lock if finalInterviewStatus provided on creation
    if (data.finalInterviewStatus) {
      data.finalInterviewLocked = true;
    }

    // Auto-sync global status with latest sub-status updates
    let mappedStatus = null;
    if (data.candidateStatusPostOffer) mappedStatus = mapSubStatusToGlobalStatus(data.candidateStatusPostOffer);
    else if (data.finalInterviewStatus) mappedStatus = mapSubStatusToGlobalStatus(data.finalInterviewStatus);
    else if (data.interviewStatus) mappedStatus = mapSubStatusToGlobalStatus(data.interviewStatus);
    else if (data.firstCallStatus) mappedStatus = mapSubStatusToGlobalStatus(data.firstCallStatus);
    if (mappedStatus) data.status = mappedStatus;

    const orClauses = [];
    if (data.phone) orClauses.push({ phone: data.phone });
    if (data.email && data.email.trim() !== '') orClauses.push({ email: data.email });

    let existing = null;
    if (orClauses.length > 0) {
      existing = await Candidate.findOne({ $or: orClauses });
    }

    if (existing) {
      const lastActivity = existing.assignedAt || existing.createdAt;
      const daysSinceAssignment = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));

      // Strict 30-day rule for non-admins
      if (daysSinceAssignment < 30 && req.user.role !== 'admin') {
        const recruiterName = existing.assignedRecruiterName || 'another recruiter';
        return res.status(409).json({
          message: `Candidate is already assigned to ${recruiterName} and is under 30-day validity. Please contact Admin for reassignment.`,
          existingId: existing._id,
          assignedRecruiter: existing.assignedRecruiter,
          assignedRecruiterName: recruiterName,
          daysRemaining: 30 - daysSinceAssignment
        });
      }

      // If expired or admin override, we "re-pick" the candidate
      const oldRecruiter = existing.assignedRecruiterName || 'Unknown';
      const oldStatus = existing.status || 'Unknown';
      const oldJob = existing.positionApplied || 'None';

      existing.assignedRecruiter = req.user._id;
      existing.assignedRecruiterName = req.user.name;
      existing.assignedAt = new Date();
      existing.ownershipStatus = 'Assigned';

      // Clear previous workflow if re-picked after expiry
      if (daysSinceAssignment >= 30) {
        existing.status = 'New';
        existing.currentStage = 'Applied';
        // Preserve history
        existing.stageHistory.push({
          stage: 'Re-assigned',
          subStatus: `Picked up by ${req.user.name}. Prev Recruiter: ${oldRecruiter}, Status: ${oldStatus}, Job: ${oldJob}`,
          changedAt: new Date(),
          changedBy: req.user._id,
        });
      }

      const updated = await existing.save();

      const { shareCandidateWithAhmedSir } = require('../utils/emailService');
      shareCandidateWithAhmedSir(updated, 're-assigned').catch(err => {
        console.error('Failed to automatically share candidate re-assignment with Ahmed Sir:', err);
      });

      return res.status(200).json(updated);
    }

    // Joining-Based Lock: Check if any candidate for this JR has already Joined
    if (data.jrNumber) {
      const Job = require('../models/Job');
      const job = await Job.findOne({ jrNumber: data.jrNumber });
      if (job) {
        data.division = job.division || 'BPO';
        if (job.companyName && (!data.clientName || data.clientName === '')) {
          data.clientName = job.companyName;
        }
        if (job.companyName && (!data.company || data.company === '')) {
          data.company = job.companyName;
        }
        if (job.jobTitle && (!data.positionApplied || data.positionApplied === '')) {
          data.positionApplied = job.jobTitle;
        }
        if (job.status === 'Closed') {
          return res.status(403).json({ message: 'Position already filled / JR is closed' });
        }
        const joinedCount = await Candidate.countDocuments({
          jrNumber: data.jrNumber,
          status: 'Joined'
        });
        if (joinedCount >= (job.positions || 1)) {
          return res.status(403).json({ message: 'All positions for this JR are already filled' });
        }
      }
    }

    const candidate = await Candidate.create(data);

    const { shareCandidateWithAhmedSir } = require('../utils/emailService');
    shareCandidateWithAhmedSir(candidate, 'created').catch(err => {
      console.error('Failed to automatically share new candidate with Ahmed Sir:', err);
    });

    await createLog({
      type: 'create', user: req.user._id, userName: req.user.name,
      role: req.user.role, action: `Added candidate: ${candidate.name}`,
      target: candidate._id.toString(), ip: req.ip,
    });

    // --- Notification Logic ---
    try {
      const TeamMember = require('../models/TeamMember');
      const recipients = new Set();

      // 1. Recruiter who added candidate
      recipients.add(req.user._id.toString());

      // 2. Team Leader of that recruiter
      const teamAssignment = await TeamMember.findOne({ memberId: req.user._id, removedAt: null }).select('teamLeaderId');
      if (teamAssignment) recipients.add(teamAssignment.teamLeaderId.toString());

      // 3. All Admins
      const admins = await User.find({ role: 'admin', status: 'Active' }).select('_id');
      admins.forEach(a => recipients.add(a._id.toString()));

      // 4. (No exclusion needed here usually, but if adding for consistency: recipients.delete(req.user._id.toString()) if we don't want the recruiter to notify themselves)
      // Actually, line 214 previously notified the recruiter.

      if (recipients.size > 0) {
        await notificationService.createBulkNotifications({
          recipientIds: Array.from(recipients),
          type: 'resume',
          title: 'New Candidate Added',
          message: `${candidate.name} has been added by ${req.user.name}`,
          entityId: candidate._id,
          entityType: 'Candidate',
          navigateTo: `/recruiter/candidate/${candidate._id}`
        });
      }
    } catch (notifyErr) {
      console.error('Candidate notification failed:', notifyErr);
    }

    res.status(201).json(candidate);
  } catch (err) {
    next(err);
  }
};

// GET /api/candidates/check-duplicate?phone=xxx&email=yyy
exports.checkDuplicate = async (req, res, next) => {
  try {
    const { phone, email } = req.query;
    if (!phone && !email) {
      return res.json({ duplicate: false });
    }

    const orClauses = [];
    if (phone) orClauses.push({ phone: phone.trim() });
    if (email) orClauses.push({ email: email.trim().toLowerCase() });

    const existing = await Candidate.findOne({ $or: orClauses })
      .populate('assignedRecruiter', 'name email')
      .select('name phone email status assignedRecruiterName assignedRecruiter currentStage createdAt');

    if (!existing) {
      return res.json({ duplicate: false });
    }

    return res.json({
      duplicate: true,
      candidate: {
        id: existing._id,
        name: existing.name,
        phone: existing.phone,
        email: existing.email,
        status: existing.status,
        recruiterName: existing.assignedRecruiterName || existing.assignedRecruiter?.name || 'Unassigned',
        stage: existing.currentStage,
        createdAt: existing.createdAt,
        ownershipStatus: existing.ownershipStatus,
        daysRemaining: Math.max(0, 30 - Math.floor((Date.now() - new Date(existing.assignedAt || existing.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
      },
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/candidates/:id
exports.update = async (req, res, next) => {
  try {
    const data = { ...req.body };

    

if (typeof data.skills === 'string') {
      data.skills = data.skills.split(',').map(s => s.trim()).filter(Boolean);
    }

    if (req.file) {
      data.resumePath = `/uploads/resumes/${req.file.filename}`;
      data.resumeOriginalName = req.file.originalname;
    }

    // Auto-sync global status with latest sub-status updates
    let mappedStatus = null;
    if (data.candidateStatusPostOffer) mappedStatus = mapSubStatusToGlobalStatus(data.candidateStatusPostOffer);
    else if (data.finalInterviewStatus) mappedStatus = mapSubStatusToGlobalStatus(data.finalInterviewStatus);
    else if (data.interviewStatus) mappedStatus = mapSubStatusToGlobalStatus(data.interviewStatus);
    else if (data.firstCallStatus) mappedStatus = mapSubStatusToGlobalStatus(data.firstCallStatus);
    if (mappedStatus) data.status = mappedStatus;

    // ── Submission lock enforcement ──────────────────────────
    const existing = await Candidate.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Candidate not found' });

    // Joined Status Lock: Once candidate has status 'Joined', it cannot be changed back to any other status
    if (existing.status === 'Joined') {
      if (data.status && data.status !== 'Joined') {
        return res.status(403).json({ message: 'Candidate status is "Joined" and cannot be changed back to any other status.' });
      }
      let newMapped = null;
      if (data.candidateStatusPostOffer) newMapped = mapSubStatusToGlobalStatus(data.candidateStatusPostOffer);
      else if (data.finalInterviewStatus) newMapped = mapSubStatusToGlobalStatus(data.finalInterviewStatus);
      else if (data.interviewStatus) newMapped = mapSubStatusToGlobalStatus(data.interviewStatus);
      else if (data.firstCallStatus) newMapped = mapSubStatusToGlobalStatus(data.firstCallStatus);
      if (newMapped && newMapped !== 'Joined') {
        return res.status(403).json({ message: 'Candidate status is "Joined" and cannot be changed back to any other status.' });
      }
    }

    // Ownership check
    const lastActivity = existing.assignedAt || existing.createdAt;
    const daysSinceAssignment = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));

    const isAssignedToOther = existing.assignedRecruiter && String(existing.assignedRecruiter) !== String(req.user._id);
    const isLocked = isAssignedToOther && existing.ownershipStatus === 'Assigned' && daysSinceAssignment < 30;

    if (isLocked && req.user.role !== 'admin' && req.user.role !== 'tl' && req.user.role !== 'manager') {
      return res.status(403).json({
        message: `Candidate is locked by ${existing.assignedRecruiterName || 'another recruiter'}. Only Admin, Manager, Team Leader or the assigned recruiter can edit within 30 days.`
      });
    }

    // Auto-assign to recruiter if candidate is unassigned, expired, or general data
    if (req.user.role === 'recruiter') {
      const isOwner = String(existing.assignedRecruiter || '') === String(req.user._id);
      const isExpired = !existing.assignedRecruiter || daysSinceAssignment >= 30;
      const isGeneral = existing.ownershipStatus === 'General Data';

      if (!isOwner && (isExpired || isGeneral)) {
        data.assignedRecruiter = req.user._id;
        data.assignedRecruiterName = req.user.name;
        data.ownershipStatus = 'Assigned';
        data.assignedAt = new Date();
      }
    }

    if (existing.tlCallSubmitted && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Profile is locked after TL submission. Only Admin can edit.' });
    }
    if (existing.isDuplicate && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'This candidate is flagged as a duplicate. Contact Admin.' });
    }
    // ── Interview Status role enforcement ────────────────────────
    // Recruiter cannot set Final Round Status or Final Interview Status
    if (req.user.role === 'recruiter') {
      delete data.finalRoundStatus;
      delete data.finalInterviewStatus;
      delete data.finalInterviewLocked;
    }
    // Once finalInterviewLocked, only admin can change finalInterviewStatus
    if (existing.finalInterviewLocked && req.user.role !== 'admin') {
      delete data.finalInterviewStatus;
    }
    // Auto-lock when finalInterviewStatus is being set for the first time
    if (data.finalInterviewStatus && !existing.finalInterviewLocked) {
      data.finalInterviewLocked = true;
    }

    data.lastContactDate = new Date();

    // Joining-Based Lock: Check if changing to a JR that is already filled
    if (data.jrNumber) {
      const Job = require('../models/Job');
      const job = await Job.findOne({ jrNumber: data.jrNumber });
      if (job) {
        data.division = job.division || 'BPO';
        if (job.companyName && (!data.clientName || data.clientName === '')) {
          data.clientName = job.companyName;
        }
        if (job.companyName && (!data.company || data.company === '')) {
          data.company = job.companyName;
        }
        if (job.jobTitle && (!data.positionApplied || data.positionApplied === '')) {
          data.positionApplied = job.jobTitle;
        }
      }
      if (data.jrNumber !== existing.jrNumber) {
        if (job) {
          if (job.status === 'Closed') {
            return res.status(403).json({ message: 'Position already filled / JR is closed' });
          }
          const joinedCount = await Candidate.countDocuments({
            jrNumber: data.jrNumber,
            status: 'Joined'
          });
          if (joinedCount >= (job.positions || 1)) {
            return res.status(403).json({ message: 'All positions for this JR are already filled' });
          }
        }
      }
    }

    // Field-level diff for audit trail
    const TRACKED_FIELDS = [
      'status', 'firstCallStatus', 'secondCallStatus', 'interviewStatus',
      'finalInterviewStatus', 'candidateActiveStatus', 'assignedRecruiterName',
      'name', 'phone', 'email',
    ];
    const changes = {};
    TRACKED_FIELDS.forEach(field => {
      if (data[field] !== undefined && String(data[field] ?? '') !== String(existing[field] ?? '')) {
        changes[field] = { from: existing[field], to: data[field] };
      }
    });

    const candidate = await Candidate.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // If status changed to Joined, check if we need to close the JR
    if (data.status === 'Joined' && existing.status !== 'Joined' && candidate.jrNumber) {
      const Job = require('../models/Job');
      const job = await Job.findOne({ jrNumber: candidate.jrNumber });
      if (job) {
        const joinedCount = await Candidate.countDocuments({
          jrNumber: candidate.jrNumber,
          status: 'Joined'
        });
        if (joinedCount >= (job.positions || 1)) {
          await Job.findOneAndUpdate({ jrNumber: candidate.jrNumber }, { status: 'Closed', priority: 'Closed' });
        }
      }
    }

    const changeCount = Object.keys(changes).length;
    await createLog({
      type: 'edit', user: req.user._id, userName: req.user.name,
      role: req.user.role,
      action: changeCount > 0
        ? `Updated candidate: ${candidate.name} (changed: ${Object.keys(changes).join(', ')})`
        : `Updated candidate: ${candidate.name}`,
      target: candidate._id.toString(),
      details: changeCount > 0 ? changes : undefined,
      ip: req.ip,
    });

    if (changeCount > 0) {
      const { shareCandidateWithAhmedSir } = require('../utils/emailService');
      shareCandidateWithAhmedSir(candidate, 'updated').catch(err => {
        console.error('Failed to automatically share candidate update with Ahmed Sir:', err);
      });
    }

    res.json(candidate);
  } catch (err) {
    next(err);
  }
};

// POST /api/candidates/:id/record-exit
exports.recordExit = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can record candidate exit.' });
    }

    const { exitDate, joiningDate } = req.body;
    if (!exitDate) {
      return res.status(400).json({ message: 'Exit date is required' });
    }

    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // If joiningDate is provided and not already set (or being corrected)
    if (joiningDate) {
      if (!candidate.offerDetails) candidate.offerDetails = {};
      candidate.offerDetails.dateOfJoining = new Date(joiningDate);
      candidate.markModified('offerDetails');
    }

    const oldStatus = candidate.status;
    candidate.status = 'Exited';
    candidate.exitDate = new Date(exitDate);

    // Preserve stage history
    candidate.stageHistory.push({
      stage: candidate.currentStage || 'Joining',
      subStatus: 'Candidate Exited',
      changedAt: new Date(),
      changedBy: req.user._id,
      notes: `Recorded exit on ${new Date(exitDate).toLocaleDateString()}`,
    });

    await candidate.save();

    await createLog({
      type: 'status', user: req.user._id, userName: req.user.name,
      role: req.user.role,
      action: `Candidate exited: ${candidate.name}. Exit Date: ${new Date(exitDate).toLocaleDateString()}`,
      target: candidate._id.toString(), ip: req.ip,
    });

    res.json(candidate);
  } catch (err) {
    next(err);
  }
};

// PUT /api/candidates/:id/status
exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!Candidate.STATUSES.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Allowed: ${Candidate.STATUSES.join(', ')}` });
    }

    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // Joined Status Lock: Once candidate has status 'Joined', it cannot be changed back to any other status
    if (candidate.status === 'Joined' && status !== 'Joined') {
      return res.status(403).json({ message: 'Candidate status is "Joined" and cannot be changed back to any other status.' });
    }

    if (candidate.isDuplicate && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'This candidate is flagged as a duplicate. Contact Admin.' });
    }

    // Auto-assign to recruiter if candidate is unassigned, expired, or general data
    if (req.user.role === 'recruiter') {
      const lastActivity = candidate.assignedAt || candidate.createdAt;
      const daysSinceAssignment = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
      const isOwner = String(candidate.assignedRecruiter || '') === String(req.user._id);
      const isExpired = !candidate.assignedRecruiter || daysSinceAssignment >= 30;
      const isGeneral = candidate.ownershipStatus === 'General Data';

      if (!isOwner && (isExpired || isGeneral)) {
        candidate.assignedRecruiter = req.user._id;
        candidate.assignedRecruiterName = req.user.name;
        candidate.ownershipStatus = 'Assigned';
        candidate.assignedAt = new Date();
      }
    }

    const oldStatus = candidate.status;
    candidate.status = status;
    if (req.body.expectedDateOfJoining) {
      candidate.expectedDateOfJoining = new Date(req.body.expectedDateOfJoining);
    }
    if (req.body.dateOfJoining) {
      candidate.dateOfJoining = new Date(req.body.dateOfJoining);
    }
    if (req.body.offeredCTC !== undefined && req.body.offeredCTC !== null) {
      const numCtc = parseInt(String(req.body.offeredCTC).replace(/\D/g, ''), 10) || 0;
      candidate.offeredCTC = numCtc;
      candidate.joiningSalary = String(numCtc);
    }
    if (req.body.joiningSalary !== undefined && req.body.joiningSalary !== null) {
      const numSal = parseInt(String(req.body.joiningSalary).replace(/\D/g, ''), 10) || 0;
      candidate.joiningSalary = String(numSal);
      if (!candidate.offeredCTC) candidate.offeredCTC = numSal;
    }
    await candidate.save();

    await createLog({
      type: 'status', user: req.user._id, userName: req.user.name,
      role: req.user.role,
      action: `Status changed: ${oldStatus} → ${status} for ${candidate.name}`,
      target: candidate._id.toString(), ip: req.ip,
    });

    // Generate notification
    if (String(candidate.assignedRecruiter) !== String(req.user._id)) {
      await notificationService.createNotification({
        recipientId: candidate.assignedRecruiter,
        type: 'candidate',
        title: 'Candidate Status Updated',
        message: `${candidate.name}'s status was changed to ${status} by ${req.user.name}`,
        entityId: candidate._id,
        entityType: 'Candidate',
        navigateTo: `/recruiter/candidates/${candidate._id}`
      });
    }

    res.json(candidate);
  } catch (err) {
    next(err);
  }
};

// POST /api/candidates/:id/notes
exports.addNote = async (req, res, next) => {
  try {
    if (req.user.role === 'tl') {
      return res.status(403).json({ message: 'Team Leaders cannot add notes. Use the Second Call section for observations.' });
    }

    const { text, followUpDate } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Note text is required' });
    }

    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    if (candidate.isDuplicate && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'This candidate is flagged as a duplicate. Contact Admin.' });
    }

    // Auto-assign to recruiter if candidate is unassigned, expired, or general data
    if (req.user.role === 'recruiter') {
      const lastActivity = candidate.assignedAt || candidate.createdAt;
      const daysSinceAssignment = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
      const isOwner = String(candidate.assignedRecruiter || '') === String(req.user._id);
      const isExpired = !candidate.assignedRecruiter || daysSinceAssignment >= 30;
      const isGeneral = candidate.ownershipStatus === 'General Data';

      if (!isOwner && (isExpired || isGeneral)) {
        candidate.assignedRecruiter = req.user._id;
        candidate.assignedRecruiterName = req.user.name;
        candidate.ownershipStatus = 'Assigned';
        candidate.assignedAt = new Date();
      }
    }

    candidate.notes.push({
      text,
      addedBy: req.user._id,
      addedByName: req.user.name,
      followUpDate: followUpDate ? new Date(followUpDate) : undefined,
    });
    candidate.lastContactDate = new Date();
    // Reactivate if was inactive
    if (candidate.candidateActiveStatus === 'Inactive') {
      candidate.candidateActiveStatus = 'Active';
      candidate.inactiveSince = undefined;
    }
    await candidate.save();

    await createLog({
      type: 'call', user: req.user._id, userName: req.user.name,
      role: req.user.role,
      action: `Note added for ${candidate.name}: "${text.substring(0, 80)}${text.length > 80 ? '…' : ''}"`,
      target: candidate._id.toString(), ip: req.ip,
    });

    res.json(candidate);
  } catch (err) {
    next(err);
  }
};

// GET /api/candidates/flagged
exports.getFlagged = async (req, res, next) => {
  try {
    const query = { flagged: true };

    // Role-based filtering
    if (req.user.role === 'recruiter') {
      query.assignedRecruiter = req.user._id;
    } else if (req.user.role === 'tl') {
      const TeamMember = require('../models/TeamMember');
      const teamMembers = await TeamMember.find({
        teamLeaderId: req.user._id,
        removedAt: null,
      }).select('memberId');
      const memberIds = teamMembers.map(t => t.memberId);
      memberIds.push(req.user._id);
      query.assignedRecruiter = { $in: memberIds };
    } else if (req.user.role === 'manager') {
      const User = require('../models/User');
      const TeamMember = require('../models/TeamMember');
      const tlUsers = await User.find({ role: 'tl' }).select('_id');
      const tlIds = tlUsers.map(t => t._id);
      const allTeamMembers = await TeamMember.find({
        teamLeaderId: { $in: tlIds },
        removedAt: null,
      }).select('memberId');
      const recruiterIds = allTeamMembers.map(t => t.memberId);
      recruiterIds.push(...tlIds);
      recruiterIds.push(req.user._id);
      query.assignedRecruiter = { $in: recruiterIds };
    }

    const candidates = await Candidate.find(query)
      .sort('-updatedAt')
      .populate('assignedRecruiter', 'name');
    res.json(candidates);
  } catch (err) {
    next(err);
  }
};

// PUT /api/candidates/:id/correction
exports.correction = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (typeof data.skills === 'string') {
      data.skills = data.skills.split(',').map(s => s.trim()).filter(Boolean);
    }

    // Handle recruiter reassignment
    if (data.assignedRecruiterName) {
      // Keep the name; TL reassignment
    }

    data.flagged = false;
    data.flagReason = '';

    const candidate = await Candidate.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    await createLog({
      type: 'edit', user: req.user._id, userName: req.user.name,
      role: req.user.role, action: `TL corrected candidate: ${candidate.name}`,
      target: candidate._id.toString(), ip: req.ip,
    });

    res.json(candidate);
  } catch (err) {
    next(err);
  }
};

// PUT /api/candidates/:id/flag
exports.flag = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const candidate = await Candidate.findByIdAndUpdate(
      req.params.id,
      { flagged: true, flagReason: reason || 'Flagged for review' },
      { new: true }
    );
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    await createLog({
      type: 'edit', user: req.user._id, userName: req.user.name,
      role: req.user.role,
      action: `Flagged candidate: ${candidate.name}. Reason: ${reason || 'Flagged for review'}`,
      target: candidate._id.toString(), ip: req.ip,
    });

    res.json(candidate);
  } catch (err) {
    next(err);
  }
};

// PUT /api/candidates/:id/second-call  (TL only)
exports.secondCallSubmit = async (req, res, next) => {
  try {
    const { secondCallStatus, secondCallNotes, secondCallDate, secondCallTime, secondCallEmail } = req.body;

    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    if (candidate.tlCallSubmitted && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Second call already submitted and locked.' });
    }

    if (secondCallStatus) candidate.secondCallStatus = secondCallStatus;
    if (secondCallNotes) candidate.secondCallNotes = secondCallNotes;
    if (secondCallDate) candidate.secondCallDate = new Date(secondCallDate);
    if (secondCallTime) candidate.secondCallTime = secondCallTime;
    if (secondCallEmail) candidate.secondCallEmail = secondCallEmail;
    candidate.tlCallSubmitted = true;
    candidate.lastContactDate = new Date();

    // Preserve stage history
    candidate.stageHistory.push({
      stage: candidate.currentStage || 'Screening',
      subStatus: `TL second call submitted: ${secondCallStatus || ''}`,
      changedAt: new Date(),
      changedBy: req.user._id,
    });

    await candidate.save();

    await createLog({
      type: 'edit', user: req.user._id, userName: req.user.name,
      role: req.user.role, action: `TL submitted second call for: ${candidate.name}`,
      target: candidate._id.toString(), ip: req.ip,
    });

    res.json(candidate);
  } catch (err) {
    next(err);
  }
};

// POST /api/candidates/:id/reassign  (admin only)
exports.reassign = async (req, res, next) => {
  try {
    const { newRecruiterId, newRecruiterName, reason } = req.body;
    if (!newRecruiterId) return res.status(400).json({ message: 'newRecruiterId is required' });

    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    // Item 3: If TL, can reassign candidates with status "Not Eligible", "Client Duplicate", "No Response", "Hold"
    if (req.user.role === 'tl') {
      const allowedStatuses = ['Not Eligible', 'Client Duplicate', 'Duplicate-Client', 'No Response', 'Hold'];
      if (!allowedStatuses.includes(candidate.status)) {
        return res.status(403).json({
          message: `Team Leads can only reassign candidates with status "Not Eligible", "Client Duplicate", "No Response", or "Hold". Current candidate status is "${candidate.status}".`
        });
      }
    }

    // Preserve history before reset
    candidate.stageHistory.push({
      stage: candidate.currentStage || 'Applied',
      subStatus: `Reassigned from ${candidate.assignedRecruiterName || 'previous recruiter'} to ${newRecruiterName}. Reason: ${reason || 'N/A'}`,
      changedAt: new Date(),
      changedBy: req.user._id,
      notes: `First call: ${candidate.firstCallStatus || 'N/A'} | Second call: ${candidate.secondCallStatus || 'N/A'} | Interview: ${candidate.interviewStatus || 'N/A'}`,
    });

    // Reset workflow
    candidate.firstCallStatus = undefined;
    candidate.firstCallOtherReason = undefined;
    candidate.firstCallDate = undefined;
    candidate.firstCallTime = undefined;
    candidate.firstCallEmail = undefined;
    candidate.firstCallSubmitted = false;
    candidate.secondCallStatus = undefined;
    candidate.secondCallNotes = undefined;
    candidate.secondCallDate = undefined;
    candidate.secondCallTime = undefined;
    candidate.secondCallEmail = undefined;
    candidate.tlCallSubmitted = false;
    candidate.interviewStatus = undefined;
    candidate.finalRoundStatus = undefined;
    candidate.finalInterviewStatus = undefined;
    candidate.finalInterviewLocked = false;
    candidate.currentStage = 'Applied';
    candidate.status = 'New';
    candidate.candidateActiveStatus = 'Active';
    candidate.inactiveSince = undefined;
    candidate.isDuplicate = false;
    candidate.flagged = false;
    candidate.reassignRequested = false;
    candidate.reassignRequestedAt = undefined;
    candidate.reassignRequestedBy = undefined;
    candidate.reassignRequestedByName = undefined;
    candidate.reassignRequestNote = undefined;

    // Reassign
    candidate.assignedRecruiter = newRecruiterId;
    candidate.assignedRecruiterName = newRecruiterName || '';
    candidate.recruiterChangedBy = req.user._id;
    candidate.recruiterChangedAt = new Date();
    candidate.recruiterChangedByName = req.user.name;
    candidate.lastContactDate = new Date();

    await candidate.save();

    await createLog({
      type: 'reassign', user: req.user._id, userName: req.user.name,
      role: req.user.role,
      action: `Reassigned ${candidate.name} to ${newRecruiterName}. Reason: ${reason || 'N/A'}`,
      target: candidate._id.toString(), ip: req.ip,
    });

    // Notify new recruiter
    await notificationService.createNotification({
      recipientId: newRecruiterId,
      type: 'candidate',
      title: 'Candidate Assigned',
      message: `${candidate.name} has been assigned to you.`,
      entityId: candidate._id,
      entityType: 'Candidate',
      navigateTo: `/recruiter/candidates/${candidate._id}`
    });

    res.json(candidate);
  } catch (err) {
    next(err);
  }
};

// POST /api/candidates/:id/mark-duplicate  (admin only)
exports.markDuplicate = async (req, res, next) => {
  try {
    const { duplicateOfId } = req.body;

    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    // Preserve history entry
    candidate.stageHistory.push({
      stage: candidate.currentStage || 'Applied',
      subStatus: `Flagged as duplicate by Admin (${req.user.name})`,
      changedAt: new Date(),
      changedBy: req.user._id,
      notes: duplicateOfId ? `Duplicate of candidate ID: ${duplicateOfId}` : 'Duplicate flagged manually',
    });

    candidate.isDuplicate = true;
    if (duplicateOfId) candidate.duplicateOf = duplicateOfId;

    await candidate.save();

    await createLog({
      type: 'edit', user: req.user._id, userName: req.user.name,
      role: req.user.role,
      action: `Marked candidate as duplicate: ${candidate.name}`,
      target: candidate._id.toString(), ip: req.ip,
    });

    res.json(candidate);
  } catch (err) {
    next(err);
  }
};

// POST /api/candidates/:id/request-reassign  (recruiter / tl)
exports.requestReassign = async (req, res, next) => {
  try {
    const { note } = req.body;

    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    if (candidate.candidateActiveStatus !== 'Inactive') {
      return res.status(400).json({ message: 'Reassignment can only be requested for inactive candidates.' });
    }

    if (candidate.reassignRequested) {
      return res.status(409).json({ message: 'Reassignment already requested for this candidate.' });
    }

    candidate.stageHistory.push({
      stage: candidate.currentStage || 'Applied',
      subStatus: `Reassignment requested by ${req.user.name} due to inactivity`,
      changedAt: new Date(),
      changedBy: req.user._id,
      notes: note || 'No note provided',
    });

    candidate.reassignRequested = true;
    candidate.reassignRequestedAt = new Date();
    candidate.reassignRequestedBy = req.user._id;
    candidate.reassignRequestedByName = req.user.name;
    candidate.reassignRequestNote = note || '';

    await candidate.save();

    await createLog({
      type: 'edit', user: req.user._id, userName: req.user.name,
      role: req.user.role,
      action: `Reassignment requested for ${candidate.name} (inactive 30+ days)`,
      target: candidate._id.toString(), ip: req.ip,
    });

    res.json(candidate);
  } catch (err) {
    next(err);
  }
};

// POST /api/candidates/:id/documents  (admin only)
exports.uploadDocument = async (req, res, next) => {
  try {
    const { docType, status } = req.body;
    if (!req.file) return res.status(400).json({ message: 'File is required' });
    if (!docType) return res.status(400).json({ message: 'docType is required' });

    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    candidate.documents.push({
      docType,
      filePath: `/uploads/docs/${req.file.filename}`,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      status: status || 'Submitted',
      uploadedBy: req.user._id,
      uploadedByName: req.user.name,
      uploadedAt: new Date(),
    });

    await candidate.save();

    await createLog({
      type: 'document', user: req.user._id, userName: req.user.name,
      role: req.user.role, action: `Uploaded document "${docType}" for ${candidate.name}`,
      target: candidate._id.toString(), ip: req.ip,
    });

    res.json(candidate.documents);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/candidates/:id/documents/:docId/status  (admin only)
exports.updateDocumentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const doc = candidate.documents.id(req.params.docId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const oldStatus = doc.status;
    doc.status = status;
    await candidate.save();

    await createLog({
      type: 'document', user: req.user._id, userName: req.user.name,
      role: req.user.role,
      action: `Document status changed: "${doc.docType}" for ${candidate.name} — ${oldStatus} → ${status}`,
      target: candidate._id.toString(), ip: req.ip,
    });

    res.json(candidate.documents);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/candidates/:id/documents/:docId  (admin only)
// Soft-delete: marks as deleted, never physically removes (audit trail)
exports.deleteDocument = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const doc = candidate.documents.id(req.params.docId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.deletedBy = req.user._id;
    doc.deletedByName = req.user.name;
    await candidate.save();

    await createLog({
      type: 'document', user: req.user._id, userName: req.user.name,
      role: req.user.role,
      action: `Deleted document "${doc.docType}" for ${candidate.name}`,
      target: candidate._id.toString(), ip: req.ip,
    });

    res.json(candidate.documents);
  } catch (err) {
    next(err);
  }
};

// GET /api/candidates/export?format=excel&search=&status=&source=&city=
exports.exportCandidates = async (req, res, next) => {
  try {
    // Strict Admin check as per requirements
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only Admin can access the export feature.' });
    }

    const { search, status, source, city, fromDate, toDate } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { skills: { $elemMatch: { $regex: search, $options: 'i' } } },
        { positionApplied: { $regex: search, $options: 'i' } },
      ];
    }
    if (source) query.source = source;
    if (status) query.status = status;
    if (city) query.city = { $regex: city, $options: 'i' };

    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) {
        query.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endOfDay;
      }
    }

    // Fetch ALL candidates as requested
    const candidates = await Candidate.find(query).sort('-createdAt');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Candidates');

    const columns = [
      { header: 'Job Title', key: 'jobTitle', width: 25 },
      { header: 'Date of application', key: 'dateOfApplication', width: 20 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Email ID', key: 'email', width: 30 },
      { header: 'Phone Number', key: 'phone', width: 15 },
      { header: 'Current Location', key: 'currentLocation', width: 20 },
      { header: 'Preferred Locations', key: 'preferredLocation', width: 20 },
      { header: 'Total Experience', key: 'totalExperience', width: 15 },
      { header: 'Curr. Company name', key: 'currCompany', width: 25 },
      { header: 'Curr. Company Designation', key: 'currDesignation', width: 25 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Role', key: 'role', width: 20 },
      { header: 'Industry', key: 'industry', width: 20 },
      { header: 'Key Skills', key: 'keySkills', width: 40 },
      { header: 'Annual Salary', key: 'annualSalary', width: 15 },
      { header: 'Notice period/ Availability to join', key: 'noticePeriod', width: 25 },
      { header: 'Resume Headline', key: 'resumeHeadline', width: 30 },
      { header: 'Summary', key: 'summary', width: 40 },
      { header: 'Under Graduation degree', key: 'ugDegree', width: 25 },
      { header: 'UG Specialization', key: 'ugSpecialization', width: 25 },
      { header: 'UG University/institute Name', key: 'ugUniversity', width: 30 },
      { header: 'UG Graduation year', key: 'ugYear', width: 15 },
      { header: 'Post graduation degree', key: 'pgDegree', width: 25 },
      { header: 'PG specialization', key: 'pgSpecialization', width: 25 },
      { header: 'PG university/institute name', key: 'pgUniversity', width: 30 },
      { header: 'PG graduation year', key: 'pgYear', width: 15 },
      { header: 'Doctorate degree', key: 'doctorateDegree', width: 25 },
      { header: 'Doctorate specialization', key: 'doctorateSpecialization', width: 25 },
      { header: 'Doctorate university/institute name', key: 'doctorateUniversity', width: 30 },
      { header: 'Doctorate graduation year', key: 'doctorateYear', width: 15 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Marital Status', key: 'maritalStatus', width: 15 },
      { header: 'Home Town/City', key: 'homeTown', width: 20 },
      { header: 'Pin Code', key: 'pinCode', width: 10 },
      { header: 'Work permit for USA', key: 'usaWorkPermit', width: 15 },
      { header: 'Date of Birth', key: 'dob', width: 15 },
      { header: 'Permanent Address', key: 'address', width: 40 },
    ];

    worksheet.columns = columns;

    // Bold Headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    const formatDate = (date) => {
      if (!date) return 'N/A';
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'N/A';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };

    candidates.forEach((c) => {
      // Data Validation
      let emailVal = c.email || 'N/A';
      if (emailVal !== 'N/A' && !validator.isEmail(emailVal)) {
        emailVal = `Invalid Email Format: ${emailVal}`;
      }

      let phoneVal = c.phone || 'N/A';
      const cleanPhone = String(phoneVal).replace(/[\s\-\(\)]/g, '');
      if (phoneVal !== 'N/A' && cleanPhone.length !== 10) {
        phoneVal = `Invalid Phone Format: ${phoneVal}`;
      }

      worksheet.addRow({
        jobTitle: c.positionApplied || 'N/A',
        dateOfApplication: formatDate(c.createdAt),
        name: c.name || 'N/A',
        email: emailVal,
        phone: phoneVal,
        currentLocation: c.currentLocation || 'N/A',
        preferredLocation: c.preferredLocation || 'N/A',
        totalExperience: c.experience || 'N/A',
        currCompany: c.currentCompany || 'N/A',
        currDesignation: 'N/A', // Not explicitly in schema, mapping to N/A
        department: c.department || 'N/A',
        role: c.eligibleRole || 'N/A',
        industry: c.industry || 'N/A',
        keySkills: Array.isArray(c.skills) ? c.skills.join(', ') : (c.skills || 'N/A'),
        annualSalary: c.currentCTC || 'N/A',
        noticePeriod: c.noticePeriod || c.joiningAvailability || 'N/A',
        resumeHeadline: c.resumeHeadline || 'N/A',
        summary: c.comments || 'N/A',
        ugDegree: c.qualification || 'N/A',
        ugSpecialization: 'N/A', // Not explicitly in schema
        ugUniversity: c.university || 'N/A',
        ugYear: c.yearOfGraduation || 'N/A',
        pgDegree: c.pgDegree || 'N/A',
        pgSpecialization: c.pgSpecialization || 'N/A',
        pgUniversity: c.pgUniversity || 'N/A',
        pgYear: c.pgGraduationYear || 'N/A',
        doctorateDegree: c.doctorateDegree || 'N/A',
        doctorateSpecialization: c.doctorateSpecialization || 'N/A',
        doctorateUniversity: c.doctorateUniversity || 'N/A',
        doctorateYear: c.doctorateGraduationYear || 'N/A',
        gender: c.gender || 'N/A',
        maritalStatus: c.maritalStatus || 'N/A',
        homeTown: c.homeTownCity || 'N/A',
        pinCode: c.pinCode || 'N/A',
        usaWorkPermit: c.usaWorkPermit === true ? 'Yes' : (c.usaWorkPermit === false ? 'No' : 'N/A'),
        dob: formatDate(c.dateOfBirth),
        address: c.permanentAddress || 'N/A',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Candidate_Database_Export_${Date.now()}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();

    await createLog({
      type: 'export',
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: `Exported ${candidates.length} candidates to Excel (Admin Only)`,
      details: { count: candidates.length },
      ip: req.ip,
    }).catch(() => { });

  } catch (err) {
    next(err);
  }
};

// ─── Column Mapping Configuration ──────────────────────────────
const EXCEL_COLUMN_MAPPING = {
  // Personal Details
  'Job Title': 'positionApplied',
  'Date of application': 'dateOfApplication',
  'Name': 'name',
  'Email ID': 'email',
  'Phone Number': 'phone',
  'Current Location': 'currentLocation',
  'Preferred Locations': 'preferredLocation',

  // Professional
  'Total Experience': 'experience',
  'Curr. Company name': 'currentCompany',
  'Curr. Company Designation': 'currentRole',
  'Department': 'department',
  'Role': 'eligibleRole',
  'Industry': 'industry',
  'Key Skills': 'skills',
  'Annual Salary': 'currentCTC',
  'Notice period/ Availability to join': 'noticePeriod',
  'Resume Headline': 'resumeHeadline',
  'Summary': 'comments',

  // Education - UG
  'Under Graduation degree': 'qualification',
  'UG Specialization': 'ugSpecialization',
  'UG University/institute Name': 'university',
  'UG Graduation year': 'yearOfGraduation',

  // Education - PG
  'Post graduation degree': 'pgDegree',
  'PG specialization': 'pgSpecialization',
  'PG university/institute name': 'pgUniversity',
  'PG graduation year': 'pgGraduationYear',

  // Education - Doctorate
  'Doctorate degree': 'doctorateDegree',
  'Doctorate specialization': 'doctorateSpecialization',
  'Doctorate university/institute name': 'doctorateUniversity',
  'Doctorate graduation year': 'doctorateGraduationYear',

  // Personal Info
  'Gender': 'gender',
  'Marital Status': 'maritalStatus',
  'Home Town/City': 'homeTownCity',
  'Pin Code': 'pinCode',
  'Work permit for USA': 'usaWorkPermit',
  'Date of Birth': 'dateOfBirth',
  'Permanent Address': 'permanentAddress',
};

// Flexible column name matching (handles Excel header variations)
const flexibleColumnMatch = (excelColumns, headerVariations) => {
  for (const variation of headerVariations) {
    const found = excelColumns.find(col =>
      col.toLowerCase().trim() === variation.toLowerCase().trim() ||
      col.toLowerCase().replace(/[\s_-]/g, '') === variation.toLowerCase().replace(/[\s_-]/g, '')
    );
    if (found) return found;
  }
  return null;
};

// Validation functions
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
const isValidPhone = (phone) => /^[0-9]{10}$/.test(String(phone).replace(/[\s\-\(\)]/g, ''));
const isValidMaritalStatus = (status) => ['Single', 'Married', 'Divorced', 'Widowed', 'Prefer not to say'].includes(status);

// POST /api/candidates/import — bulk import from Excel/CSV file (ENHANCED NON-BLOCKING)
exports.importCandidates = async (req, res, next) => {
  try {
    const { finalData, duplicateHandling = 'skip', preview = 'false' } = req.body || {};

    // ─── FINAL IMPORT PHASE (Receives corrected data from frontend) ───
    if (finalData && preview !== 'true') {
      const recordsToImport = JSON.parse(finalData);
      let created = 0, updated = 0, skipped = 0;
      const importBatchId = `batch_${Date.now()}_${req.user._id}`;
      const errors = [];

      // Fields allowed to be saved from frontend payload (whitelist for safety)
      const ALLOWED_FIELDS = [
        'name', 'email', 'phone', 'altPhone', 'skills', 'experience', 'currentCTC',
        'expectedCTC', 'noticePeriod', 'location', 'currentLocation', 'city', 'localArea',
        'positionApplied', 'positionTitle', 'currentCompany', 'currentRole', 'department',
        'eligibleRole', 'industry', 'resumeHeadline', 'comments', 'gender', 'dateOfBirth',
        'maritalStatus', 'homeTownCity', 'pinCode', 'usaWorkPermit', 'permanentAddress',
        'qualification', 'ugSpecialization', 'university', 'yearOfGraduation',
        'pgDegree', 'pgSpecialization', 'pgUniversity', 'pgGraduationYear',
        'doctorateDegree', 'doctorateSpecialization', 'doctorateUniversity', 'doctorateGraduationYear',
        'preferredLocation', 'dateOfApplication', 'source',
      ];

      for (const item of recordsToImport) {
        const rawData = item.data;
        if (!rawData || !rawData.name || !rawData.phone) { skipped++; continue; }

        // Build a clean, whitelisted payload
        const parsedData = {};
        for (const field of ALLOWED_FIELDS) {
          if (rawData[field] !== undefined && rawData[field] !== null && rawData[field] !== '') {
            parsedData[field] = rawData[field];
          }
        }

        // Always re-apply server-controlled fields (never trust client for these)
        parsedData.source = rawData.source || 'Excel Import';
        parsedData.status = 'New';
        parsedData.importedFrom = 'Excel';
        parsedData.importedAt = new Date();
        parsedData.importedByName = req.user.name;
        parsedData.assignedRecruiter = req.user._id;
        parsedData.assignedRecruiterName = req.user.name;
        parsedData.importBatchId = importBatchId;
        parsedData.ownershipStatus = 'Assigned';
        parsedData.assignedAt = new Date();

        // Sanitize phone: strip to first 10 digits if multi-value
        if (parsedData.phone) {
          const cleanPhone = String(parsedData.phone).replace(/[^\d]/g, '').substring(0, 10);
          if (cleanPhone.length >= 7) parsedData.phone = cleanPhone;
        }

        // Sanitize email: take first valid email if multi-value
        if (parsedData.email) {
          const emailStr = String(parsedData.email);
          if (emailStr.includes(',')) {
            const parts = emailStr.split(',').map(e => e.trim());
            const valid = parts.find(e => isValidEmail(e));
            parsedData.email = valid || parts[0].trim();
          }
          // lowercase
          parsedData.email = parsedData.email.toLowerCase();
        }

        // Duplicate Detection
        let existing = null;
        try {
          if (parsedData.email && isValidEmail(parsedData.email)) {
            existing = await Candidate.findOne({ email: parsedData.email }).lean();
          }
          if (!existing && parsedData.phone) {
            existing = await Candidate.findOne({ phone: parsedData.phone }).lean();
          }
        } catch (e) { /* ignore lookup errors */ }

        if (existing) {
          if (duplicateHandling === 'update') {
            try {
              await Candidate.findByIdAndUpdate(existing._id, { $set: parsedData }, { runValidators: false });
              updated++;
            } catch (e) { errors.push(String(e.message)); skipped++; }
          } else if (duplicateHandling === 'allow') {
            try {
              const doc = new Candidate(parsedData);
              await doc.save({ validateBeforeSave: false });
              created++;
            } catch (e) { errors.push(String(e.message)); skipped++; }
          } else {
            skipped++;
          }
          continue;
        }

        // Create new
        try {
          const doc = new Candidate(parsedData);
          await doc.save({ validateBeforeSave: false });
          created++;
        } catch (e) {
          errors.push(String(e.message));
          skipped++;
        }
      }

      await createLog({
        type: 'import',
        user: req.user._id,
        userName: req.user.name,
        role: req.user.role,
        action: `Intelligent Excel import: ${created} created, ${updated} updated, ${skipped} skipped`,
        details: { created, updated, skipped, importBatchId, duplicateHandling, firstErrors: errors.slice(0, 5) },
        ip: req.ip,
      }).catch(() => { });

      return res.json({ created, updated, skipped, total: recordsToImport.length, importBatchId, errors: errors.slice(0, 10) });
    }

    // ─── PREVIEW / ANALYSIS PHASE ───
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (rows.length === 0) return res.status(400).json({ message: 'File is empty' });

    const previewData = [];
    const duplicateMatches = [];

    // Helper to detect multi-value
    const hasMultiple = (str) => /[,;/]|\s{2,}/.test(String(str).trim());
    const splitMulti = (str) => String(str).split(/[,;/]|\s{2,}/).map(s => s.trim()).filter(Boolean);

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const rowNum = idx + 1;
      let parsedData = {};
      const fieldsNeedingCorrection = [];

      try {
        // Name
        const name = String(row['Name'] || row['name'] || row['CANDIDATE NAME'] || '').trim();
        if (!name) fieldsNeedingCorrection.push({ field: 'name', type: 'missing', suggestion: 'Unknown Candidate' });
        parsedData.name = name || 'Unknown Candidate';

        // Email
        const emailRaw = String(row['Email ID'] || row['email'] || row['Email'] || '').trim();
        if (emailRaw) {
          if (hasMultiple(emailRaw)) {
            const parts = splitMulti(emailRaw);
            const validParts = parts.filter(isValidEmail);
            fieldsNeedingCorrection.push({
              field: 'email', type: 'multi_value', raw: emailRaw,
              suggestions: { autoFix: validParts[0] || parts[0], keepBoth: emailRaw }
            });
            parsedData.email = emailRaw;
          } else if (!isValidEmail(emailRaw)) {
            fieldsNeedingCorrection.push({
              field: 'email', type: 'invalid_format', raw: emailRaw,
              suggestions: { autoFix: emailRaw.replace(/[^\w@.-]/g, '') }
            });
            parsedData.email = emailRaw;
          } else {
            parsedData.email = emailRaw;
          }
        }

        // Phone
        const phoneRaw = String(row['Phone Number'] || row['phone'] || row['Phone'] || '').trim();
        if (!phoneRaw) {
          fieldsNeedingCorrection.push({ field: 'phone', type: 'missing', suggestion: '0000000000' });
          parsedData.phone = '0000000000';
        } else if (hasMultiple(phoneRaw)) {
          const parts = splitMulti(phoneRaw).map(p => p.replace(/[\s\-\(\)]/g, ''));
          fieldsNeedingCorrection.push({
            field: 'phone', type: 'multi_value', raw: phoneRaw,
            suggestions: { autoFix: parts[0], keepBoth: phoneRaw, altPhone: parts[1] || '' }
          });
          parsedData.phone = phoneRaw;
        } else {
          const cleanPhone = phoneRaw.replace(/[\s\-\(\)]/g, '');
          if (!isValidPhone(cleanPhone)) {
            fieldsNeedingCorrection.push({
              field: 'phone', type: 'invalid_format', raw: phoneRaw,
              suggestions: { autoFix: cleanPhone.replace(/\D/g, '').substring(0, 10) }
            });
            parsedData.phone = cleanPhone;
          } else {
            parsedData.phone = cleanPhone;
          }
        }

        // Skills (split by comma is normal)
        const skillsRaw = String(row['Key Skills'] || row['skills'] || row['Skills'] || '').trim();
        parsedData.skills = skillsRaw ? skillsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

        // Standard mapping (keep exact raw strings for now to preserve user intent)
        const fieldMap = {
          'Job Title': 'positionApplied',
          'Date of application': 'dateOfApplication',
          'Current Location': 'currentLocation',
          'Preferred Locations': 'preferredLocation',
          'Total Experience': 'experience',
          'Curr. Company name': 'currentCompany',
          'Curr. Company Designation': 'currentRole',
          'Department': 'department',
          'Role': 'eligibleRole',
          'Industry': 'industry',
          'Annual Salary': 'currentCTC',
          'Notice period/ Availability to join': 'noticePeriod',
          'Resume Headline': 'resumeHeadline',
          'Summary': 'comments',
          'Under Graduation degree': 'qualification',
          'UG Specialization': 'ugSpecialization',
          'UG University/institute Name': 'university',
          'UG Graduation year': 'yearOfGraduation',
          'Post graduation degree': 'pgDegree',
          'PG specialization': 'pgSpecialization',
          'PG university/institute name': 'pgUniversity',
          'PG graduation year': 'pgGraduationYear',
          'Doctorate degree': 'doctorateDegree',
          'Doctorate specialization': 'doctorateSpecialization',
          'Doctorate university/institute name': 'doctorateUniversity',
          'Doctorate graduation year': 'doctorateGraduationYear',
          'Gender': 'gender',
          'Marital Status': 'maritalStatus',
          'Home Town/City': 'homeTownCity',
          'Pin Code': 'pinCode',
          'Work permit for USA': 'usaWorkPermit',
          'Permanent Address': 'permanentAddress',
        };

        for (const [excelCol, systemField] of Object.entries(fieldMap)) {
          const value = String(row[excelCol] || '').trim();
          if (value) {
            parsedData[systemField] = value;
          }
        }

        const dobValue = String(row['Date of Birth'] || '').trim();
        if (dobValue) {
          const date = new Date(dobValue);
          if (!isNaN(date.getTime())) parsedData.dateOfBirth = date;
        }

        // Source mapping rules
        const rawSource = String(row['Source'] || row['source'] || '').trim();
        const naValues = ['na', 'n/a', ''];
        if (naValues.includes(rawSource.toLowerCase())) {
          parsedData.source = 'Excel Import';
        } else {
          parsedData.source = rawSource;
        }

        // System defaults
        parsedData.status = 'New';
        parsedData.importedFrom = 'Excel';
        parsedData.importedAt = new Date();
        parsedData.importedByName = req.user.name;
        parsedData.assignedRecruiter = req.user._id;
        parsedData.assignedRecruiterName = req.user.name;

        // Duplicate Check
        const checkEmail = fieldsNeedingCorrection.find(f => f.field === 'email')
          ? fieldsNeedingCorrection.find(f => f.field === 'email').suggestions?.autoFix
          : parsedData.email;

        const checkPhone = fieldsNeedingCorrection.find(f => f.field === 'phone')
          ? fieldsNeedingCorrection.find(f => f.field === 'phone').suggestions?.autoFix
          : parsedData.phone;

        let existing = null;
        if (checkEmail && isValidEmail(checkEmail)) {
          existing = await Candidate.findOne({ email: checkEmail }).lean();
        }
        if (!existing && checkPhone && String(checkPhone).length >= 10) {
          existing = await Candidate.findOne({ phone: checkPhone }).lean();
        }

        let rowStatus = 'valid';
        if (existing) {
          rowStatus = 'duplicate';
          duplicateMatches.push({
            row: rowNum,
            excelData: parsedData,
            existingCandidate: { _id: existing._id, name: existing.name, email: existing.email, phone: existing.phone }
          });
        } else if (fieldsNeedingCorrection.length > 0) {
          rowStatus = 'needs_correction';
        }

        previewData.push({
          row: rowNum,
          data: parsedData,
          status: rowStatus,
          corrections: fieldsNeedingCorrection.length > 0 ? fieldsNeedingCorrection : undefined
        });

      } catch (e) {
        previewData.push({
          row: rowNum,
          data: parsedData,
          status: 'needs_correction',
          corrections: [{ field: 'general', type: 'error', suggestion: String(e.message) }]
        });
      }
    }

    if (req.body.direct === 'true') {
      let created = 0, skipped = 0;
      const errors = [];
      const importBatchId = `batch_direct_${Date.now()}_${req.user._id}`;

      for (const p of previewData) {
        if (p.status === 'duplicate') {
          errors.push(`Row ${p.row}: Duplicate candidate (${p.data.phone || p.data.email})`);
          skipped++;
          continue;
        }

        // Apply auto-fixes if needed, unless user wants to keep raw
        if (p.corrections && req.body.multiValueAction !== 'keep') {
          p.corrections.forEach(c => {
            if (c.suggestions && c.suggestions.autoFix) {
              p.data[c.field] = c.suggestions.autoFix;
            }
          });
        }

        try {
          p.data.importBatchId = importBatchId;
          p.data.assignedAt = new Date();
          p.data.ownershipStatus = 'Assigned';

          // Final safety sanitization, unless user wants to keep raw
          if (req.body.multiValueAction !== 'keep') {
            if (p.data.phone) p.data.phone = String(p.data.phone).replace(/[^\d]/g, '').substring(0, 10);
            if (p.data.email && String(p.data.email).includes(',')) {
              p.data.email = String(p.data.email).split(',')[0].trim().toLowerCase();
            }
          } else {
            // If keeping raw, just make sure email is lowercased for consistency if it's a valid string
            if (p.data.email) p.data.email = String(p.data.email).toLowerCase();
          }

          const doc = new Candidate(p.data);
          await doc.save({ validateBeforeSave: false });
          created++;
        } catch (e) {
          errors.push(`Row ${p.row}: ${e.message}`);
          skipped++;
        }
      }

      return res.json({ created, skipped, total: rows.length, errors: errors.slice(0, 20) });
    }

    return res.json({
      preview: previewData,
      totalRows: rows.length,
      validRows: previewData.filter(p => p.status === 'valid').length,
      correctionRows: previewData.filter(p => p.status === 'needs_correction').length,
      duplicateRows: previewData.filter(p => p.status === 'duplicate').length,
      duplicates: duplicateMatches.slice(0, 50)
    });

  } catch (err) {
    next(err);
  }
};

// ─── Comprehensive Joining Form ───

// POST /api/candidates/joining-form
// POST /api/candidates/:employeeId/joining-form
exports.createOrUpdateJoiningForm = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const b = req.body;

    let employee;
    if (employeeId) {
      employee = await Employee.findOne({ employeeId });
      if (!employee) return res.status(404).json({ message: 'Employee record not found' });
      
      // If approved, only admin can edit!
      if (employee.isApproved && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'This joining record has already been approved and locked. Only administrators can make edits.' });
      }
      
      // If not approved, the creator/employee can edit, but other non-admins cannot
      const isOwner = String(employee.createdBy || '') === String(req.user._id) || employee.employeeId === req.user.employeeId;
      if (!isOwner && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only administrators are allowed to edit other employees\' records.' });
      }
    }

    const updateData = { ...b };

    // Clean empty string values for dates and numbers to prevent Mongoose CastErrors
    if (!updateData.joiningDate || updateData.joiningDate === '') {
      updateData.joiningDate = new Date();
    }
    if (updateData.dateOfBirth === '') {
      delete updateData.dateOfBirth;
    }
    ['trainingDurationDays', 'expYears', 'expMonths', 'age'].forEach(f => {
      if (updateData[f] === '' || updateData[f] === 'undefined' || updateData[f] === 'null' || updateData[f] === 'NaN') {
        delete updateData[f];
      }
    });

    // Parse JSON fields (Frontend sends them as strings in FormData)
    if (b.educationQualifications) try { updateData.educationQualifications = JSON.parse(b.educationQualifications); } catch (e) { }
    if (b.highestQualification) try { updateData.highestQualification = JSON.parse(b.highestQualification); } catch (e) { }
    if (b.employmentHistory) try { updateData.employmentHistory = JSON.parse(b.employmentHistory); } catch (e) { }
    if (b.references) try { updateData.references = JSON.parse(b.references); } catch (e) { }

    // Handle File Uploads (Photo, Resume, Education Docs)
    if (req.files) {
      if (req.files.photo) updateData.photoPath = `/uploads/docs/${req.files.photo[0].filename}`;
      if (req.files.resume) updateData.resumePath = `/uploads/resumes/${req.files.resume[0].filename}`;
      if (req.files.marksheet) updateData.marksheetPath = `/uploads/docs/${req.files.marksheet[0].filename}`;
      if (req.files.degreeCertificate) updateData.degreeCertificatePath = `/uploads/docs/${req.files.degreeCertificate[0].filename}`;

      // Handle relieving letters in employment history
      if (updateData.employmentHistory && Array.isArray(updateData.employmentHistory)) {
        updateData.employmentHistory.forEach((emp, idx) => {
          const key = `relievingLetter${idx}`;
          if (req.files[key]) {
            emp.relievingLetterPath = `/uploads/docs/${req.files[key][0].filename}`;
          }
        });
      }
    }

    if (!employee) {
      // Create new record
      updateData.employeeId = await generateEmployeeId(Employee, User);
      updateData.createdBy = req.user._id;
      employee = await Employee.create(updateData);

      await createLog({
        type: 'create', user: req.user._id, userName: req.user.name,
        role: req.user.role, action: `Created comprehensive joining form for ${employee.fullName}`,
        target: employee._id.toString(), ip: req.ip,
      });
    } else {
      // Update existing record
      Object.assign(employee, updateData);
      await employee.save();

      await createLog({
        type: 'edit', user: req.user._id, userName: req.user.name,
        role: req.user.role, action: `Updated joining form for ${employee.fullName} (${employee.employeeId})`,
        target: employee._id.toString(), ip: req.ip,
      });
    }

    // Auto-update linked Candidate status to 'Joined'
    if (employee.phone || employee.email) {
      const candFilter = [];
      if (employee.phone) candFilter.push({ phone: employee.phone });
      if (employee.email) candFilter.push({ email: employee.email });

      if (candFilter.length > 0) {
        const cand = await Candidate.findOne({ $or: candFilter });
        if (cand) {
          cand.status = 'Joined';
          cand.candidateActiveStatus = 'Active';
          await cand.save();
        }
      }
    }

    res.json(employee);
  } catch (err) {
    next(err);
  }
};

// GET /api/candidates/:employeeId/joining-form
exports.getJoiningForm = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ employeeId: req.params.employeeId });
    if (!employee) return res.status(404).json({ message: 'Record not found' });
    res.json(employee);
  } catch (err) {
    next(err);
  }
};

// GET /api/candidates/joining-form/autofill
exports.getJoiningFormAutoFillData = async (req, res, next) => {
  try {
    const { employeeId } = req.query;

    // 1. Find by employeeId if provided
    if (employeeId) {
      const emp = await Employee.findOne({ employeeId });
      if (emp) return res.json(emp);
    }

    // 2. Find by createdBy (the logged-in recruiter's User ID)
    const emp = await Employee.findOne({ createdBy: req.user._id });
    if (emp) return res.json(emp);

    // 3. Fallback: populate from current user's profile details
    return res.json({
      fullName: req.user.name,
      email: req.user.email,
      phone: '',
      address: '',
      positionApplied: req.user.role ? (req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1)) : '',
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/candidates/bulk-email
exports.bulkEmail = async (req, res, next) => {
  try {
    const { candidateIds, subject, body } = req.body;
    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({ message: 'candidateIds array is required' });
    }
    if (!subject || !body) {
      return res.status(400).json({ message: 'subject and body are required' });
    }

    const { sendEmail } = require('../utils/emailService');
    const candidates = await Candidate.find({ _id: { $in: candidateIds } });

    let sentCount = 0;
    let failedCount = 0;

    for (const cand of candidates) {
      if (cand.email) {
        try {
          await sendEmail({
            to: cand.email,
            toName: cand.name,
            subject: subject,
            body: body
          });
          sentCount++;
        } catch (err) {
          console.error(`Failed to send bulk email to ${cand.email}:`, err);
          failedCount++;
        }
      } else {
        failedCount++;
      }
    }

    await createLog({
      type: 'system',
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: `Bulk sent emails to ${sentCount} candidate(s) (${failedCount} failed/skipped)`,
      target: 'bulk',
      ip: req.ip,
    });

    res.json({ message: 'Bulk emails processed', sentCount, failedCount });
  } catch (err) {
    next(err);
  }
};
