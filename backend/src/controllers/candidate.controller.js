const Candidate = require('../models/Candidate');
const Employee = require('../models/Employee');
const User = require('../models/User');
const { createLog } = require('../utils/auditLogger');
const { generateEmployeeId } = require('../utils/helpers');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const notificationService = require('../utils/notification.service');
const validator = require('validator');

// Statuses where the 30-Day Lock is removed and any recruiter can tag the candidate to their name
const UNLOCKED_REASSIGN_STATUSES = [
  'Not Eligible',
  'No Response',
  'Call Back',
  'Hold',
  'No Show',
  'VNA Reject',
  'Test Reject',
  'Candidate Drop Post L1 Select',
  'Candidate Drop Post L2 Select',
  'Candidate Drop During Final Stage',
  'L1 Reject',
  'L2 Reject',
  'Final Reject',
  'Offer Reject',
  'Rejected',
  'Rejected – Interview Round',
  'Rejected – Second Round',
  'Rejected – Communication',
  'Rejected – Experience Mismatch',
  'Rejected – Salary Mismatch',
  'Rejected – Location Constraint',
  'Rejected – Notice Period',
  'Duplicate-Client',
  'Client Duplicate'
];

function isRejectionStatus(status) {
  if (!status) return false;
  const clean = String(status).trim().toLowerCase();
  return clean === 'rejected' ||
         clean.includes('reject') ||
         clean.includes('not eligible') ||
         clean.includes('not interested') ||
         clean.includes('candidate drop');
}

function isStatusUnlockedForReassignment(status) {
  if (!status) return false;
  if (isRejectionStatus(status)) return true;
  const clean = String(status).trim().toLowerCase();
  return UNLOCKED_REASSIGN_STATUSES.some(s => s.toLowerCase() === clean);
}

function cleanRecruiterName(name) {
  if (!name || typeof name !== 'string') return name || '';
  return name
    .replace(/\s*\((recruiter|tl|admin|manager)\)\s*/gi, '')
    .replace(/\s*\[(recruiter|tl|admin|manager)\]\s*/gi, '')
    .trim();
}
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
    const { search, source, status, activeGroup, city, localArea, recruiter, page = 1, limit = 20, sort = '-createdAt', fromDate, toDate, division, statusIn, activeOnly, createdToday, company, clientName, tlId } = req.query;
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
        { jrNumber: { $regex: search, $options: 'i' } },
        { originalJrNumber: { $regex: search, $options: 'i' } },
        { originalJobTitle: { $regex: search, $options: 'i' } },
      ];
    }
    if (source) query.source = source;

    // Active / Inactive Group filter
    if (activeGroup === 'Active') {
      query.status = { $in: ACTIVE_STATUS_LIST };
    } else if (activeGroup === 'Inactive') {
      query.status = { $in: INACTIVE_STATUS_LIST };
    }

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

    // General Pool filter: Candidates available for re-assignment
    if (req.query.generalPool === 'true') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const poolCond = [
        { ownershipStatus: 'General Data' },
        { ownershipStatus: 'Unassigned' },
        { ownershipStatus: 'Expired' },
        { availableInGeneralPoolAfter: { $lte: new Date() } },
        { tlRejectedAt: { $lte: thirtyDaysAgo } }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: poolCond }];
        delete query.$or;
      } else {
        query.$or = poolCond;
      }
    }

    // Previously Screened filter: Candidates screened under a prior JR
    if (req.query.previouslyScreened === 'true') {
      const screenedCond = [
        { isPreviouslyScreened: true },
        { originalJrNumber: { $exists: true, $ne: '' } }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: screenedCond }];
        delete query.$or;
      } else {
        query.$or = screenedCond;
      }
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
        total: total,
        filteredTotal: total,
        totalCandidates: totalCandidatesCount || total,
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
    const isTlRejected30Days = candidate.tlRejectedAt && (Date.now() - new Date(candidate.tlRejectedAt).getTime() >= 30 * 24 * 60 * 60 * 1000);

    if ((daysSinceAssignment >= 30 || isTlRejected30Days) && candidate.ownershipStatus !== 'General Data') {
      candidate.ownershipStatus = 'General Data';
      candidate.assignedRecruiter = undefined;
      candidate.assignedRecruiterName = 'Unassigned';
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
    'Selected': 'Final Select',
    'Joined': 'Joined',
    'Rejected': 'Rejected',
    'Final Reject': 'Final Reject',
    'L1 Reject': 'L1 Reject',
    'L2 Reject': 'L2 Reject',
    'Not Eligible': 'Not Eligible',
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
    'On Hold': 'Hold',
    'Duplicate Profile': 'Duplicate-Client',
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
  
  if (Candidate.STATUSES && Candidate.STATUSES.includes(subStatus)) return subStatus;
  
  return subStatus;
};

// POST /api/candidates
exports.create = async (req, res, next) => {
  try {
    const data = { ...req.body };

    // Mandatory JR validation: candidates cannot be added without selecting a JR
    const isWalkIn = data.isWalkIn === true || data.isWalkIn === 'true' || data.source === 'Walk-In';
    if (!isWalkIn && (!data.jrNumber || !String(data.jrNumber).trim())) {
      return res.status(400).json({ message: 'Job Requirement (JR) is mandatory. Please select a JR before adding a candidate.' });
    }

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

    // Ensure candidate status preserves the exact status selected in the form
    const selectedStatus = data.status || data.firstCallStatus || data.recruiterStatus;
    if (selectedStatus) {
      data.status = mapSubStatusToGlobalStatus(selectedStatus);
    } else {
      data.status = 'Eligible';
    }

    const orClauses = [];
    if (data.phone) orClauses.push({ phone: data.phone });
    if (data.email && data.email.trim() !== '') orClauses.push({ email: data.email });

    let existing = null;
    if (orClauses.length > 0) {
      existing = await Candidate.findOne({ $or: orClauses });
    }

    if (existing) {
      const isExpiredOwnership = existing.ownershipStatus === 'Expired' || !existing.assignedAt || new Date(existing.assignedAt).getTime() === 0;
      const isUnlockedStatus = isStatusUnlockedForReassignment(existing.status) || isExpiredOwnership;
      const lastActivity = existing.assignedAt || existing.createdAt;
      const daysSinceAssignment = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
      const recruiterName = existing.assignedRecruiterName || 'another recruiter';

      // Strict 30-day duplicate rule for ALL USERS (including Admin & Recruiters)
      // If candidate is under active 30-day validity AND NOT in one of the unlocked waived statuses AND not expired:
      if (!isUnlockedStatus && !isExpiredOwnership && daysSinceAssignment < 30) {
        return res.status(409).json({
          message: `Candidate already exists in the system! This profile (${existing.name}, Phone: ${existing.phone}) is already assigned to ${recruiterName} under active 30-day validity (Status: "${existing.status}"). Duplicate candidates cannot be added.`,
          existingId: existing._id,
          assignedRecruiter: existing.assignedRecruiter,
          assignedRecruiterName: recruiterName,
          daysRemaining: 30 - daysSinceAssignment
        });
      }

      // Check if current user is ALREADY the owner of this candidate
      const candRecId = existing.assignedRecruiter ? String(existing.assignedRecruiter) : '';
      const reqUserId = req.user._id ? String(req.user._id) : (req.user.id ? String(req.user.id) : '');
      const candRecName = String(existing.assignedRecruiterName || '').trim().toLowerCase();
      const reqUserName = String(req.user.name || '').trim().toLowerCase();

      const isSameOwner = (candRecId && reqUserId && candRecId === reqUserId) ||
                          (candRecName && reqUserName && candRecName === reqUserName);

      if (isSameOwner && !isUnlockedStatus) {
        return res.status(409).json({
          message: `Candidate already exists in your list! You have already added ${existing.name} (Phone: ${existing.phone}, Status: "${existing.status}").`,
          existingId: existing._id
        });
      }

      // If unlocked status or expired (>= 30 days or rejected by TL), tag / re-assign the candidate to current recruiter
      const oldRecruiter = existing.assignedRecruiterName || 'Unknown';
      const oldStatus = existing.status || 'Unknown';
      const oldJob = existing.positionApplied || 'None';

      // Update fields if newly submitted in form
      if (data.name) existing.name = data.name;
      if (data.phone) existing.phone = data.phone;
      if (data.email) existing.email = data.email;
      if (data.positionApplied) existing.positionApplied = data.positionApplied;
      if (data.companyName || data.clientName) existing.companyName = data.companyName || data.clientName;
      if (data.clientName) existing.clientName = data.clientName;
      if (data.jrNumber) existing.jrNumber = data.jrNumber;
      if (data.skills) existing.skills = data.skills;
      if (data.experience) existing.experience = data.experience;
      if (data.totalExperience) existing.totalExperience = data.totalExperience;
      if (data.currentCtc) existing.currentCtc = data.currentCtc;
      if (data.expectedCtc) existing.expectedCtc = data.expectedCtc;
      if (data.noticePeriod) existing.noticePeriod = data.noticePeriod;
      if (data.location || data.currentLocation) existing.location = data.location || data.currentLocation;
      if (data.remarks) existing.remarks = data.remarks;
      if (data.resumePath) {
        existing.resumePath = data.resumePath;
        existing.resumeOriginalName = data.resumeOriginalName;
      }

      existing.assignedRecruiter = req.user._id;
      existing.assignedRecruiterName = cleanRecruiterName(req.user.name);
      existing.assignedAt = new Date();
      existing.ownershipStatus = 'Assigned';

      // Set candidate status to chosen status
      const chosenStatus = data.status || data.firstCallStatus || data.recruiterStatus;
      existing.status = chosenStatus ? mapSubStatusToGlobalStatus(chosenStatus) : 'Eligible';
      existing.firstCallStatus = data.firstCallStatus || chosenStatus || 'Eligible';
      existing.currentStage = 'Applied';

      if (!existing.stageHistory) existing.stageHistory = [];
      existing.stageHistory.push({
        stage: 'Re-assigned',
        subStatus: isUnlockedStatus
          ? `Tagged to ${req.user.name} (30-day lock waived for status: "${oldStatus}"). Prev Recruiter: ${oldRecruiter}, Prev Job: ${oldJob}`
          : `Picked up by ${req.user.name} after 30-day expiry. Prev Recruiter: ${oldRecruiter}, Status: ${oldStatus}, Job: ${oldJob}`,
        changedAt: new Date(),
        changedBy: req.user._id,
      });

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

      // Permanent Original JR Heritage Initialization
      data.originalJrNumber = data.jrNumber;
      data.originalJobTitle = data.positionApplied || (job ? job.jobTitle : '') || '';
      data.originalClientName = data.clientName || (job ? job.companyName : '') || '';
      data.originalScreenedAt = new Date();
      data.originalScreenerStatus = 'Eligible';
      data.isPreviouslyScreened = true;
      data.jrHistory = [{
        jrNumber: data.jrNumber,
        jobTitle: data.originalJobTitle,
        clientName: data.originalClientName,
        screenedAt: new Date(),
        screeningStatus: 'Eligible',
        assignedRecruiter: req.user._id,
        assignedRecruiterName: req.user.name,
        assignedAt: new Date(),
        notes: 'Initial JR assignment & screening',
      }];
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
      .select('name phone email status assignedRecruiterName assignedRecruiter currentStage createdAt assignedAt');

    if (!existing) {
      return res.json({ duplicate: false });
    }

    const isExpiredOwnership = existing.ownershipStatus === 'Expired' || !existing.assignedAt || new Date(existing.assignedAt).getTime() === 0;
    const isUnlockedStatus = isStatusUnlockedForReassignment(existing.status) || isExpiredOwnership;
    const lastActivity = existing.assignedAt || existing.createdAt;
    const daysSinceAssignment = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
    const is30DayLocked = !isUnlockedStatus && !isExpiredOwnership && daysSinceAssignment < 30;
    const daysRemaining = (isUnlockedStatus || isExpiredOwnership) ? 0 : Math.max(0, 30 - daysSinceAssignment);

    return res.json({
      duplicate: true,
      isUnlockedStatus,
      is30DayLocked,
      canReassign: !is30DayLocked || req.user?.role === 'admin',
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
        isUnlockedStatus,
        is30DayLocked,
        daysRemaining,
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

    // Auto-sync global status with latest sub-status updates only if status is not explicitly provided in payload
    if (!data.status) {
      let mappedStatus = null;
      if (data.candidateStatusPostOffer) mappedStatus = mapSubStatusToGlobalStatus(data.candidateStatusPostOffer);
      else if (data.finalInterviewStatus) mappedStatus = mapSubStatusToGlobalStatus(data.finalInterviewStatus);
      else if (data.interviewStatus) mappedStatus = mapSubStatusToGlobalStatus(data.interviewStatus);
      else if (data.firstCallStatus) mappedStatus = mapSubStatusToGlobalStatus(data.firstCallStatus);
      if (mappedStatus) data.status = mappedStatus;
    }

    // Immediate 30-day validity vanishing if candidate is rejected (by Team Leader, Admin, or status update)
    const isBeingRejected = (data.status && isRejectionStatus(data.status)) ||
                            (data.finalInterviewStatus && isRejectionStatus(data.finalInterviewStatus)) ||
                            (data.interviewStatus && isRejectionStatus(data.interviewStatus)) ||
                            (data.secondCallStatus && isRejectionStatus(data.secondCallStatus));

    if (isBeingRejected) {
      data.ownershipStatus = 'Expired';
      data.assignedAt = new Date(0); // 30-day validity timer vanishes immediately
      if (data.finalInterviewStatus === 'Rejected' && !data.status) {
        data.status = 'Rejected';
      }
    }

    // ── Submission lock enforcement ──────────────────────────
    const existing = await Candidate.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Candidate not found' });

    // Joined Status Lock: Once candidate has status 'Joined', it can only be updated to 'Joined and Abort', 'Exited', or 'Black List'
    const ALLOWED_AFTER_JOINED = ['Joined', 'Joined and Abort', 'Exited', 'Black List', 'Blacklist'];
    if (existing.status === 'Joined') {
      if (data.status && !ALLOWED_AFTER_JOINED.includes(data.status)) {
        return res.status(403).json({ message: 'Candidate status is "Joined" and can only be updated to "Joined and Abort", "Exited", or "Black List".' });
      }
      let newMapped = null;
      if (data.candidateStatusPostOffer) newMapped = mapSubStatusToGlobalStatus(data.candidateStatusPostOffer);
      else if (data.finalInterviewStatus) newMapped = mapSubStatusToGlobalStatus(data.finalInterviewStatus);
      else if (data.interviewStatus) newMapped = mapSubStatusToGlobalStatus(data.interviewStatus);
      else if (data.firstCallStatus) newMapped = mapSubStatusToGlobalStatus(data.firstCallStatus);
      if (newMapped && !ALLOWED_AFTER_JOINED.includes(newMapped)) {
        return res.status(403).json({ message: 'Candidate status is "Joined" and can only be updated to "Joined and Abort", "Exited", or "Black List".' });
      }
    }

    // Ownership check: recruiters can only edit their own candidates (or expired / unlocked candidates)
    const isExistingExpiredOwnership = existing.ownershipStatus === 'Expired' || !existing.assignedAt || new Date(existing.assignedAt).getTime() === 0;
    const lastActivity = existing.assignedAt || existing.createdAt;
    const daysSinceAssignment = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
    const isUnlockedStatus = isStatusUnlockedForReassignment(existing.status) || isExistingExpiredOwnership;

    if (req.user.role === 'recruiter') {
      const candRecId = existing.assignedRecruiter ? String(existing.assignedRecruiter) : '';
      const reqUserId = req.user._id ? String(req.user._id) : (req.user.id ? String(req.user.id) : '');
      const candRecName = String(existing.assignedRecruiterName || '').trim().toLowerCase();
      const reqUserName = String(req.user.name || '').trim().toLowerCase();

      const isOwner = (candRecId && reqUserId && candRecId === reqUserId) ||
                      (candRecName && reqUserName && candRecName === reqUserName);

      const isAssignedToOther = (Boolean(existing.assignedRecruiter) || Boolean(existing.assignedRecruiterName)) && !isOwner;
      if (isAssignedToOther && !isExistingExpiredOwnership && daysSinceAssignment < 30 && !isUnlockedStatus) {
        return res.status(403).json({
          message: `Candidate is assigned to ${existing.assignedRecruiterName || 'another recruiter'}. You cannot edit or change the status of this candidate.`
        });
      }
    }

    // Auto-assign to recruiter if candidate is unassigned, expired, unlocked status, or general data
    if (req.user.role === 'recruiter') {
      const isOwner = String(existing.assignedRecruiter || '') === String(req.user._id);
      const isExpired = !existing.assignedRecruiter || daysSinceAssignment >= 30 || isExistingExpiredOwnership;
      const isGeneral = existing.ownershipStatus === 'General Data';

      if (!isOwner && (isExpired || isGeneral || isUnlockedStatus)) {
        data.assignedRecruiter = req.user._id;
        data.assignedRecruiterName = cleanRecruiterName(req.user.name);
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

        // Archive prior JR to jrHistory and permanently preserve originalJrNumber
        if (!existing.originalJrNumber && existing.jrNumber) {
          existing.originalJrNumber = existing.jrNumber;
          existing.originalJobTitle = existing.positionApplied || '';
          existing.originalClientName = existing.clientName || '';
          existing.originalScreenedAt = existing.createdAt;
        }
        if (!data.jrHistory) data.jrHistory = existing.jrHistory || [];
        data.jrHistory.push({
          jrNumber: existing.jrNumber || existing.originalJrNumber || 'N/A',
          jobTitle: existing.positionApplied || existing.originalJobTitle || '',
          clientName: existing.clientName || existing.originalClientName || '',
          screenedAt: existing.originalScreenedAt || existing.createdAt,
          screeningStatus: existing.status || 'Eligible',
          tlDecision: existing.secondCallStatus || existing.finalInterviewStatus || (existing.tlRejectedAt ? 'Rejected' : 'Completed'),
          tlNotes: existing.secondCallNotes || existing.tlRejectionReason || '',
          tlDecidedAt: existing.tlRejectedAt,
          tlDecidedByName: existing.tlRejectedByName,
          assignedRecruiter: existing.assignedRecruiter,
          assignedRecruiterName: existing.assignedRecruiterName,
          assignedAt: existing.assignedAt,
          notes: `Re-assigned to new JR ${data.jrNumber}`
        });

        // Ensure original JR heritage is preserved forever
        data.originalJrNumber = existing.originalJrNumber || existing.jrNumber;
        data.originalJobTitle = existing.originalJobTitle || existing.positionApplied;
        data.originalClientName = existing.originalClientName || existing.clientName;
        data.originalScreenedAt = existing.originalScreenedAt || existing.createdAt;
        data.isPreviouslyScreened = true;
      }
    }

    // Capture TL Rejection timestamps if TL updates status/interview
    if (['tl', 'admin', 'manager'].includes(req.user.role)) {
      if (data.secondCallStatus && isRejectionStatus(data.secondCallStatus)) {
        data.tlRejectedAt = new Date();
        data.tlRejectedBy = req.user._id;
        data.tlRejectedByName = req.user.name;
        data.tlRejectionReason = data.secondCallNotes || data.secondCallStatus;
        data.availableInGeneralPoolAfter = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }
      if (data.finalInterviewStatus === 'Rejected' || (data.finalRoundStatus && isRejectionStatus(data.finalRoundStatus))) {
        data.tlRejectedAt = new Date();
        data.tlRejectedBy = req.user._id;
        data.tlRejectedByName = req.user.name;
        data.tlRejectionReason = data.finalRoundStatus || 'Final Round Rejected';
        data.availableInGeneralPoolAfter = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }
    }

    // Synchronize Joining & Offer Details with top-level fields
    if (data.offerDetails || data.joiningSalary || data.offeredCTC) {
      const salNum = data.joiningSalary ? parseInt(String(data.joiningSalary).replace(/\D/g, ''), 10) : (data.offerDetails?.joiningSalary ? parseInt(String(data.offerDetails.joiningSalary).replace(/\D/g, ''), 10) : null);
      const ctcNum = data.offeredCTC !== undefined ? (parseInt(String(data.offeredCTC).replace(/\D/g, ''), 10) || 0) : (data.offerDetails?.offeredCTC !== undefined ? (parseInt(String(data.offerDetails.offeredCTC).replace(/\D/g, ''), 10) || 0) : (salNum || 0));
      const pctNum = data.placementPercentage !== undefined ? parseFloat(data.placementPercentage) : (data.offerDetails?.placementPercentage !== undefined ? parseFloat(data.offerDetails.placementPercentage) : (existing.placementPercentage || 8.33));
      const effectiveCtc = (ctcNum && ctcNum >= 10000) ? ctcNum : (salNum && salNum >= 10000 ? salNum : 0);
      const revNum = effectiveCtc > 0 ? Math.round(effectiveCtc * (pctNum / 100)) : (data.revenueGenerated || data.offerDetails?.revenueGenerated || 0);

      if (effectiveCtc > 0) {
        data.offeredCTC = effectiveCtc;
        data.joiningSalary = String(effectiveCtc);
        data.placementPercentage = pctNum;
        data.revenueGenerated = revNum;

        data.offerDetails = {
          ...(existing.offerDetails || {}),
          ...(data.offerDetails || {}),
          offeredCTC: effectiveCtc,
          joiningSalary: String(effectiveCtc),
          placementPercentage: pctNum,
          revenueGenerated: revNum,
          dateOfJoining: data.offerDetails?.dateOfJoining || data.dateOfJoining || existing.offerDetails?.dateOfJoining || existing.dateOfJoining
        };
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

    // Joined Status Lock: Once candidate has status 'Joined', it can only be updated to 'Joined and Abort', 'Exited', or 'Black List'
    const ALLOWED_AFTER_JOINED = ['Joined', 'Joined and Abort', 'Exited', 'Black List', 'Blacklist'];
    if (candidate.status === 'Joined' && !ALLOWED_AFTER_JOINED.includes(status)) {
      return res.status(403).json({ message: 'Candidate status is "Joined" and can only be updated to "Joined and Abort", "Exited", or "Black List".' });
    }

    if (candidate.isDuplicate && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'This candidate is flagged as a duplicate. Contact Admin.' });
    }

    // Ownership check for recruiters
    if (req.user.role === 'recruiter') {
      const isExpiredOwnership = candidate.ownershipStatus === 'Expired' || !candidate.assignedAt || new Date(candidate.assignedAt).getTime() === 0;
      const lastActivity = candidate.assignedAt || candidate.createdAt;
      const daysSinceAssignment = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
      
      const candRecId = candidate.assignedRecruiter ? String(candidate.assignedRecruiter) : '';
      const reqUserId = req.user._id ? String(req.user._id) : (req.user.id ? String(req.user.id) : '');
      const candRecName = String(candidate.assignedRecruiterName || '').trim().toLowerCase();
      const reqUserName = String(req.user.name || '').trim().toLowerCase();

      const isOwner = (candRecId && reqUserId && candRecId === reqUserId) ||
                      (candRecName && reqUserName && candRecName === reqUserName);

      const isExpired = (!candidate.assignedRecruiter && !candidate.assignedRecruiterName) || daysSinceAssignment >= 30 || isExpiredOwnership;
      const isGeneral = candidate.ownershipStatus === 'General Data';
      const isUnlockedStatus = isStatusUnlockedForReassignment(candidate.status) || isExpiredOwnership;

      // If candidate is assigned to ANOTHER recruiter within 30 days and NOT in an unlocked status
      if (!isOwner && !isExpired && !isGeneral && !isUnlockedStatus) {
        return res.status(403).json({
          message: `Candidate is assigned to ${candidate.assignedRecruiterName || 'another recruiter'}. Only the assigned recruiter or Admin/TL can update status within 30 days.`
        });
      }

      if (!isOwner && (isExpired || isGeneral || isUnlockedStatus)) {
        candidate.assignedRecruiter = req.user._id;
        candidate.assignedRecruiterName = cleanRecruiterName(req.user.name);
        candidate.ownershipStatus = 'Assigned';
        candidate.assignedAt = new Date();
      }
    }

    const oldStatus = candidate.status;
    candidate.status = status;
    if (isRejectionStatus(status)) {
      candidate.ownershipStatus = 'Expired';
      candidate.assignedAt = new Date(0);

      // Track TL Rejection and 30-Day General Pool release
      if (['tl', 'admin', 'manager'].includes(req.user.role)) {
        candidate.tlRejectedAt = new Date();
        candidate.tlRejectedBy = req.user._id;
        candidate.tlRejectedByName = req.user.name;
        candidate.tlRejectionReason = req.body.rejectionReason || status;
        candidate.availableInGeneralPoolAfter = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        if (!candidate.jrHistory) candidate.jrHistory = [];
        const curJr = candidate.jrNumber || candidate.originalJrNumber || 'N/A';
        const existingJrEntry = candidate.jrHistory.find(h => h.jrNumber === curJr);
        if (existingJrEntry) {
          existingJrEntry.tlDecision = 'Rejected';
          existingJrEntry.tlNotes = req.body.rejectionReason || status;
          existingJrEntry.tlDecidedAt = new Date();
          existingJrEntry.tlDecidedByName = req.user.name;
        } else {
          candidate.jrHistory.push({
            jrNumber: curJr,
            jobTitle: candidate.positionApplied || candidate.originalJobTitle || '',
            clientName: candidate.clientName || candidate.originalClientName || '',
            screenedAt: candidate.originalScreenedAt || candidate.createdAt,
            screeningStatus: 'Eligible',
            tlDecision: 'Rejected',
            tlNotes: req.body.rejectionReason || status,
            tlDecidedAt: new Date(),
            tlDecidedByName: req.user.name,
            assignedRecruiter: candidate.assignedRecruiter,
            assignedRecruiterName: candidate.assignedRecruiterName,
            assignedAt: candidate.assignedAt,
            movedToGeneralPoolAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            notes: `Rejected with status "${status}". Becomes available in General Pool after 30 days.`
          });
        }
      }
    }
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

    if (secondCallStatus && isRejectionStatus(secondCallStatus)) {
      candidate.ownershipStatus = 'Expired';
      candidate.assignedAt = new Date(0);
      candidate.tlRejectedAt = new Date();
      candidate.tlRejectedBy = req.user._id;
      candidate.tlRejectedByName = req.user.name;
      candidate.tlRejectionReason = secondCallNotes || secondCallStatus;
      candidate.availableInGeneralPoolAfter = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      if (!candidate.jrHistory) candidate.jrHistory = [];
      const curJr = candidate.jrNumber || candidate.originalJrNumber || 'N/A';
      const existingJrEntry = candidate.jrHistory.find(h => h.jrNumber === curJr);
      if (existingJrEntry) {
        existingJrEntry.tlDecision = 'Rejected';
        existingJrEntry.tlNotes = secondCallNotes || secondCallStatus;
        existingJrEntry.tlDecidedAt = new Date();
        existingJrEntry.tlDecidedByName = req.user.name;
      } else {
        candidate.jrHistory.push({
          jrNumber: curJr,
          jobTitle: candidate.positionApplied || candidate.originalJobTitle || '',
          clientName: candidate.clientName || candidate.originalClientName || '',
          screenedAt: candidate.originalScreenedAt || candidate.createdAt,
          screeningStatus: 'Eligible',
          tlDecision: 'Rejected',
          tlNotes: secondCallNotes || secondCallStatus,
          tlDecidedAt: new Date(),
          tlDecidedByName: req.user.name,
          assignedRecruiter: candidate.assignedRecruiter,
          assignedRecruiterName: candidate.assignedRecruiterName,
          assignedAt: candidate.assignedAt,
          movedToGeneralPoolAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          notes: 'TL rejected candidate on second call. Eligible for General Pool in 30 days.'
        });
      }
    }

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

    // If candidate is Joined or keepStatus is passed, preserve status and stage
    if (candidate.status === 'Joined') {
      candidate.currentStage = 'Joining';
      candidate.status = 'Joined';
    } else if (req.body.keepStatus && candidate.status) {
      // keep current status and stage
    } else {
      // Reset workflow for fresh candidate reassignment
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
    }
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

const ACTIVE_STATUS_LIST = [
  'Call Back', 'Eligible', 'Eligible Candidates', 'Hold', 'On Hold', 'Hotlist', 'Hot List',
  'Offer Accept', 'Submitted to Client', 'Submitted To Client', 'Sublitted To Client', 'Walkin Company',
  'Walkin WHM', 'Test Select', 'Document Initialized', 'Documennt Initialted', 'Documentation Completed',
  'Joined', 'Waiting for Offer', 'Documentation Incomplete', 'Final Select',
  'L1 Select', 'L2 Select', 'VNA Select', 'New', 'Contacted', 'Interested', 'Selected for Call',
  'Screening', 'Interview Scheduled', 'Interview Completed', 'Interview Rescheduled',
  'HR Shortlist', 'Written Test', 'Operations Round', 'Document Pending', 'Documentation',
  'Yet To Join', 'Walk-in Submitted', 'SPOC Shortlisted', 'Offer Released', 'Offer Accepted',
  'Salary Negotiation in Progress', 'Documents Pending', 'Background Verification Initiated',
  'Background Verification Cleared', 'Joining Date Confirmed', 'Joining Postponed'
];

const INACTIVE_STATUS_LIST = [
  'Candidate Drop Post L2 Select', 'No Show', 'Test Reject', 'Not Eligible', 'Final Reject',
  'L1 Reject', 'L2 Reject', 'Offer Reject', 'Duplicate-Client', 'Duplicate Client',
  'Not Interested', 'No Response', 'No response', 'Not reachable', 'Candidate Drop Post L1 Select',
  'Candidate Drop During Final Stage', 'VNA Reject', 'Joined and Abort', 'Black List', 'Blacklist',
  'Exited', 'Rejected', 'Wrong Number', 'Unreachable', 'Did Not Pick', 'Unanswered Calls',
  'Offer Declined', 'Rejected – Communication', 'Rejected – Experience Mismatch',
  'Rejected – Salary Mismatch', 'Rejected – Location Constraint', 'Rejected – Notice Period',
  'Rejected – Second Round', 'Rejected – Interview Round', 'Background Verification Failed',
  'Duplicate Profile'
];

const getActiveInactiveGroup = (status) => {
  if (!status) return 'Active';
  const s = String(status).trim();
  const lower = s.toLowerCase();

  const inactiveExact = [
    'candidate drop post l2 select',
    'no show',
    'test reject',
    'not eligible',
    'final reject',
    'l1 reject',
    'l2 reject',
    'offer reject',
    'duplicate-client',
    'duplicate client',
    'not interested',
    'no response',
    'not reachable',
    'candidate drop post l1 select',
    'candidate drop during final stage',
    'vna reject',
    'joined and abort',
    'black list',
    'blacklist',
    'exited',
    'rejected',
    'wrong number',
    'unreachable',
    'did not pick',
    'unanswered calls',
    'offer declined',
    'rejected – communication',
    'rejected – experience mismatch',
    'rejected – salary mismatch',
    'rejected – location constraint',
    'rejected – notice period',
    'rejected – second round',
    'rejected – interview round',
    'background verification failed',
    'duplicate profile'
  ];

  if (inactiveExact.includes(lower)) {
    return 'Inactive';
  }

  if (
    lower.includes('reject') ||
    lower.includes('drop') ||
    lower.includes('no show') ||
    lower.includes('not eligible') ||
    lower.includes('duplicate') ||
    lower.includes('abort') ||
    lower.includes('black') ||
    lower.includes('no response') ||
    lower.includes('not interested') ||
    lower.includes('did not pick') ||
    lower.includes('unreachable') ||
    lower.includes('wrong number')
  ) {
    return 'Inactive';
  }

  return 'Active';
};

// GET /api/candidates/export?format=excel&search=&status=&source=&city=&activeGroup=
exports.exportCandidates = async (req, res, next) => {
  try {
    const { search, status, activeGroup, source, city, fromDate, toDate } = req.query;

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

    if (activeGroup === 'Active') {
      query.status = { $in: ACTIVE_STATUS_LIST };
    } else if (activeGroup === 'Inactive') {
      query.status = { $in: INACTIVE_STATUS_LIST };
    }

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

    if (req.user.role === 'recruiter') {
      query.assignedRecruiter = req.user._id;
    } else if (req.user.role === 'tl') {
      const TeamMember = require('../models/TeamMember');
      const members = await TeamMember.find({ teamLeaderId: req.user._id, removedAt: null }).select('memberId');
      const memberIds = members.map(m => m.memberId);
      memberIds.push(req.user._id);
      query.assignedRecruiter = { $in: memberIds };
    }

    // Fetch ALL candidates as requested
    const candidates = await Candidate.find(query).sort('-createdAt');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Candidates');

    const columns = [
      { header: 'Active Status', key: 'activeStatus', width: 25 },
      { header: 'Active/Inactive', key: 'activeInactive', width: 18 },
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

      const rawStatus = c.status || 'Eligible';
      worksheet.addRow({
        activeStatus: rawStatus,
        activeInactive: getActiveInactiveGroup(rawStatus),
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

    // Enable Excel native auto-filter dropdown on the top header row across all columns
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length }
    };

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
    const targetEmpId = employeeId || b.employeeId || req.user.employeeId;
    if (targetEmpId) {
      employee = await Employee.findOne({ employeeId: targetEmpId });
    }
    if (!employee && req.user._id) {
      employee = await Employee.findOne({ createdBy: req.user._id });
    }

    if (employee) {
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
    // Strip MongoDB internal fields to prevent duplicate key error on _id
    delete updateData._id;
    delete updateData.__v;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // Ensure approval workflow status is set to pending on submit/re-submit
    updateData.approvalStatus = 'pending';
    updateData.isApproved = false;
    updateData.submittedAt = new Date();
    updateData.rejectionRemarks = '';
    updateData.rejectedDocuments = [];

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

    // Handle File Uploads (Photo, Resume, KYC, Education Docs)
    if (req.files) {
      if (req.files.photo) updateData.photoPath = `/uploads/docs/${req.files.photo[0].filename}`;
      if (req.files.resume) updateData.resumePath = `/uploads/resumes/${req.files.resume[0].filename}`;
      if (req.files.panCard) updateData.panCardPath = `/uploads/docs/${req.files.panCard[0].filename}`;
      if (req.files.aadhaarCard) updateData.aadhaarCardPath = `/uploads/docs/${req.files.aadhaarCard[0].filename}`;
      if (req.files.highestDocument) updateData.highestDocumentPath = `/uploads/docs/${req.files.highestDocument[0].filename}`;
      if (req.files.marksheet) updateData.marksheetPath = `/uploads/docs/${req.files.marksheet[0].filename}`;
      if (req.files.degreeCertificate) updateData.degreeCertificatePath = `/uploads/docs/${req.files.degreeCertificate[0].filename}`;
      if (req.files.bankProof) updateData.bankProofPath = `/uploads/docs/${req.files.bankProof[0].filename}`;

    // Format Bank Details
    if (updateData.ifscCode) updateData.ifscCode = updateData.ifscCode.toUpperCase().trim();
    if (updateData.accountNumber) updateData.accountNumber = updateData.accountNumber.trim();
    if (updateData.bankName) updateData.bankName = updateData.bankName.trim();
    if (updateData.accountHolderName) updateData.accountHolderName = updateData.accountHolderName.trim();
    if (updateData.branchName) updateData.branchName = updateData.branchName.trim();

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
          if (employee.bankProofPath) {
            cand.documents = cand.documents || [];
            const hasBankDoc = cand.documents.some(d => d.type === 'Bank Details / Cancelled Cheque');
            if (!hasBankDoc) {
              cand.documents.push({
                type: 'Bank Details / Cancelled Cheque',
                fileName: 'Bank_Proof',
                filePath: employee.bankProofPath,
                uploadedAt: new Date(),
              });
            }
          }
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

// ─── ELIGIBLE TRACKER MODULE ─────────────────────────────────────

function formatTrackerDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function mapCandidateToEligibleRow(c, index = 0) {
  const parts = (c.name || '').trim().split(/\s+/);
  const firstName = c.firstName || parts[0] || '';
  const lastName = c.lastName || parts.slice(1).join(' ') || '';
  const skillsStr = Array.isArray(c.skills) ? c.skills.join(', ') : (c.skills || '');
  const skillNameVal = c.skillName || c.positionApplied || (Array.isArray(c.skills) && c.skills[0]) || '';

  return {
    _id: c._id ? c._id.toString() : '',
    slNo: index + 1,
    status: c.status || 'Eligible',
    recruiter: cleanRecruiterName(c.assignedRecruiterName || ''),
    skillName: skillNameVal,
    jobLevel: c.jobLevel || '',
    vendorSPOC: c.vendorSPOC || '',
    companySPOC: c.companySPOC || '',
    jobId: c.jrNumber || '',
    dob: formatTrackerDate(c.dateOfBirth),
    candidateId: c.candidateId || '',
    whiteHorseSource: c.whiteHorseSource || c.source || 'White Horse Manpower',
    date: formatTrackerDate(c.createdAt),
    candidateFirstName: firstName,
    candidateLastName: lastName,
    contact: c.phone || '',
    email: c.email || '',
    gender: c.gender || '',
    education: c.qualification || c.ugDegree || '',
    totalExperience: c.experience || '',
    relevantExperience: c.relevantExperience || '',
    company: c.clientName || c.company || c.currentCompany || '',
    skills: skillsStr,
    ctc: c.currentCTC || '',
    ectc: c.expectedCTC || '',
    noticePeriod: c.noticePeriod || '',
    currentLocation: c.currentLocation || c.city || c.location || '',
    preferredLocation: c.preferredLocation || '',
    cibilScore: c.cibilScore || '',
    panCardNumber: c.panCardNumber || '',
    assignedRecruiter: c.assignedRecruiter,
    assignedRecruiterName: c.assignedRecruiterName,
    rawCreatedAt: c.createdAt,
  };
}

// GET /api/candidates/eligible-tracker
exports.getEligibleTracker = async (req, res, next) => {
  try {
    const { search, status, recruiter, jrNumber, company, location, fromDate, toDate, page = 1, limit = 50 } = req.query;

    const query = {};

    // 1. Status Filter
    if (status && status !== 'all') {
      query.status = status;
    } else if (!status) {
      // Default: show Eligible and candidates in eligible tracking
      query.$or = [
        { status: { $in: ['Eligible', 'Eligible Candidates', 'SPOC Shortlisted'] } },
        { isEligibleTracker: true }
      ];
    }

    // 2. Search text filter
    if (search && search.trim()) {
      const s = search.trim();
      const searchRegex = { $regex: s, $options: 'i' };
      const searchClauses = [
        { name: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { candidateId: searchRegex },
        { panCardNumber: searchRegex },
        { jrNumber: searchRegex },
        { clientName: searchRegex },
        { currentCompany: searchRegex },
        { skillName: searchRegex },
        { skills: { $elemMatch: searchRegex } },
        { currentLocation: searchRegex },
        { city: searchRegex },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchClauses }];
        delete query.$or;
      } else {
        query.$or = searchClauses;
      }
    }

    // 3. Recruiter filter
    if (recruiter && recruiter !== 'all') {
      const recRegex = { assignedRecruiterName: { $regex: recruiter, $options: 'i' } };
      if (query.$and) {
        query.$and.push(recRegex);
      } else if (query.$or) {
        query.$and = [{ $or: query.$or }, recRegex];
        delete query.$or;
      } else {
        query.assignedRecruiterName = { $regex: recruiter, $options: 'i' };
      }
    }

    // 4. JR Number filter
    if (jrNumber) {
      query.jrNumber = { $regex: jrNumber, $options: 'i' };
    }

    // 5. Company / Client filter
    if (company) {
      query.clientName = { $regex: company, $options: 'i' };
    }

    // 6. Location filter
    if (location) {
      query.currentLocation = { $regex: location, $options: 'i' };
    }

    // 7. Date range filter
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        query.createdAt.$lte = to;
      }
    }

    // 8. Role-based scoping
    if (req.user.role === 'recruiter') {
      const recClause = [
        { assignedRecruiter: req.user._id },
        { assignedRecruiterName: { $regex: req.user.name, $options: 'i' } }
      ];
      if (query.$and) {
        query.$and.push({ $or: recClause });
      } else if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: recClause }];
        delete query.$or;
      } else {
        query.$or = recClause;
      }
    } else if (req.user.role === 'tl') {
      const TeamMember = require('../models/TeamMember');
      const members = await TeamMember.find({ teamLeaderId: req.user._id, removedAt: null }).select('memberId');
      const memberIds = members.map(m => m.memberId);
      memberIds.push(req.user._id);
      const tlClause = { assignedRecruiter: { $in: memberIds } };
      if (query.$and) {
        query.$and.push(tlClause);
      } else {
        query.$and = [tlClause];
      }
    }

    const totalCount = await Candidate.countDocuments(query);

    let candidatesQuery = Candidate.find(query).sort({ createdAt: -1 });
    if (limit !== 'all') {
      const p = Math.max(1, parseInt(page, 10) || 1);
      const l = Math.max(1, parseInt(limit, 10) || 50);
      candidatesQuery = candidatesQuery.skip((p - 1) * l).limit(l);
    }

    const candidates = await candidatesQuery;
    const rows = candidates.map((c, idx) => mapCandidateToEligibleRow(c, idx));

    // Stats breakdown
    const totalEligible = await Candidate.countDocuments({ status: { $in: ['Eligible', 'Eligible Candidates'] } });
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const addedToday = await Candidate.countDocuments({
      status: { $in: ['Eligible', 'Eligible Candidates'] },
      createdAt: { $gte: todayStart }
    });

    res.json({
      success: true,
      totalCount,
      page: parseInt(page, 10) || 1,
      limit: limit === 'all' ? totalCount : (parseInt(limit, 10) || 50),
      totalPages: limit === 'all' ? 1 : Math.ceil(totalCount / (parseInt(limit, 10) || 50)),
      stats: {
        totalEligible,
        addedToday,
        filteredCount: totalCount
      },
      candidates: rows
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/candidates/eligible-tracker/export
exports.exportEligibleTracker = async (req, res, next) => {
  try {
    const { search, status, recruiter, jrNumber, company, location, fromDate, toDate } = req.query;

    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    } else if (!status) {
      query.$or = [
        { status: { $in: ['Eligible', 'Eligible Candidates', 'SPOC Shortlisted'] } },
        { isEligibleTracker: true }
      ];
    }

    if (search && search.trim()) {
      const s = search.trim();
      const searchRegex = { $regex: s, $options: 'i' };
      const searchClauses = [
        { name: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { candidateId: searchRegex },
        { panCardNumber: searchRegex },
        { jrNumber: searchRegex },
        { clientName: searchRegex },
        { currentCompany: searchRegex },
        { skillName: searchRegex },
        { skills: { $elemMatch: searchRegex } },
        { currentLocation: searchRegex },
        { city: searchRegex },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchClauses }];
        delete query.$or;
      } else {
        query.$or = searchClauses;
      }
    }

    if (recruiter && recruiter !== 'all') {
      const recRegex = { assignedRecruiterName: { $regex: recruiter, $options: 'i' } };
      if (query.$and) {
        query.$and.push(recRegex);
      } else if (query.$or) {
        query.$and = [{ $or: query.$or }, recRegex];
        delete query.$or;
      } else {
        query.assignedRecruiterName = { $regex: recruiter, $options: 'i' };
      }
    }

    if (jrNumber) query.jrNumber = { $regex: jrNumber, $options: 'i' };
    if (company) query.clientName = { $regex: company, $options: 'i' };
    if (location) query.currentLocation = { $regex: location, $options: 'i' };

    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        query.createdAt.$lte = to;
      }
    }

    if (req.user.role === 'recruiter') {
      const recClause = [
        { assignedRecruiter: req.user._id },
        { assignedRecruiterName: { $regex: req.user.name, $options: 'i' } }
      ];
      if (query.$and) {
        query.$and.push({ $or: recClause });
      } else if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: recClause }];
        delete query.$or;
      } else {
        query.$or = recClause;
      }
    } else if (req.user.role === 'tl') {
      const TeamMember = require('../models/TeamMember');
      const members = await TeamMember.find({ teamLeaderId: req.user._id, removedAt: null }).select('memberId');
      const memberIds = members.map(m => m.memberId);
      memberIds.push(req.user._id);
      const tlClause = { assignedRecruiter: { $in: memberIds } };
      if (query.$and) {
        query.$and.push(tlClause);
      } else {
        query.$and = [tlClause];
      }
    }

    const candidates = await Candidate.find(query).sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Eligible Tracker');

    // Exact 29 Column Headers matching screenshot
    const columns = [
      { header: 'Sl No.', key: 'slNo', width: 8 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Recruiter', key: 'recruiter', width: 22 },
      { header: 'Skill name', key: 'skillName', width: 24 },
      { header: 'Job Level', key: 'jobLevel', width: 14 },
      { header: 'Vendor SPOC', key: 'vendorSPOC', width: 20 },
      { header: 'Company SPOC', key: 'companySPOC', width: 20 },
      { header: 'JOB ID', key: 'jobId', width: 16 },
      { header: 'DOB', key: 'dob', width: 14 },
      { header: 'Candidate ID', key: 'candidateId', width: 18 },
      { header: 'White Horse Manpower Source', key: 'whiteHorseSource', width: 28 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Candidate first Name', key: 'candidateFirstName', width: 22 },
      { header: 'Candidate last name', key: 'candidateLastName', width: 22 },
      { header: 'Contact', key: 'contact', width: 16 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Gender', key: 'gender', width: 12 },
      { header: 'Education', key: 'education', width: 24 },
      { header: 'Total Experience', key: 'totalExperience', width: 16 },
      { header: 'Relevant experience', key: 'relevantExperience', width: 18 },
      { header: 'Company', key: 'company', width: 24 },
      { header: 'Skills', key: 'skills', width: 28 },
      { header: 'CTC', key: 'ctc', width: 14 },
      { header: 'ECTC', key: 'ectc', width: 14 },
      { header: 'Notice Period', key: 'noticePeriod', width: 16 },
      { header: 'Current Location', key: 'currentLocation', width: 20 },
      { header: 'Preferred Location', key: 'preferredLocation', width: 20 },
      { header: 'CIBIL Score', key: 'cibilScore', width: 14 },
      { header: 'Pan Card Number', key: 'panCardNumber', width: 18 },
    ];

    worksheet.columns = columns;

    // Apply header style: #8eaadb blue fill, bold text, centered, thin black borders
    const headerRow = worksheet.getRow(1);
    headerRow.height = 32;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF8EAADB' } // Exact Blue from screenshot
      };
      cell.font = {
        name: 'Calibri',
        size: 11,
        bold: true,
        color: { argb: 'FF000000' }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });

    // Populate data rows
    candidates.forEach((c, index) => {
      const rowData = mapCandidateToEligibleRow(c, index);
      const newRow = worksheet.addRow({
        slNo: rowData.slNo,
        status: rowData.status,
        recruiter: rowData.recruiter,
        skillName: rowData.skillName,
        jobLevel: rowData.jobLevel,
        vendorSPOC: rowData.vendorSPOC,
        companySPOC: rowData.companySPOC,
        jobId: rowData.jobId,
        dob: rowData.dob,
        candidateId: rowData.candidateId,
        whiteHorseSource: rowData.whiteHorseSource,
        date: rowData.date,
        candidateFirstName: rowData.candidateFirstName,
        candidateLastName: rowData.candidateLastName,
        contact: rowData.contact,
        email: rowData.email,
        gender: rowData.gender,
        education: rowData.education,
        totalExperience: rowData.totalExperience,
        relevantExperience: rowData.relevantExperience,
        company: rowData.company,
        skills: rowData.skills,
        ctc: rowData.ctc,
        ectc: rowData.ectc,
        noticePeriod: rowData.noticePeriod,
        currentLocation: rowData.currentLocation,
        preferredLocation: rowData.preferredLocation,
        cibilScore: rowData.cibilScore,
        panCardNumber: rowData.panCardNumber,
      });

      newRow.height = 22;
      newRow.eachCell((cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 10 };
        cell.alignment = {
          vertical: 'middle',
          horizontal: [1, 2, 8, 9, 10, 12, 15, 17, 25, 28, 29].includes(colNumber) ? 'center' : 'left'
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
        };
      });
    });

    // Auto-filter on row 1
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length }
    };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Eligible_Tracker_${Date.now()}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();

    await createLog({
      type: 'export',
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: `Exported ${candidates.length} eligible tracker candidates to Excel`,
      ip: req.ip,
    }).catch(() => {});
  } catch (err) {
    next(err);
  }
};

// PUT /api/candidates/eligible-tracker/:id
exports.updateEligibleTracker = async (req, res, next) => {
  try {
    const candidateId = req.params.id;
    const body = req.body;
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    const fieldMap = {
      status: 'status',
      skillName: 'skillName',
      jobLevel: 'jobLevel',
      vendorSPOC: 'vendorSPOC',
      companySPOC: 'companySPOC',
      jobId: 'jrNumber',
      jrNumber: 'jrNumber',
      dob: 'dateOfBirth',
      dateOfBirth: 'dateOfBirth',
      candidateId: 'candidateId',
      whiteHorseSource: 'whiteHorseSource',
      firstName: 'firstName',
      candidateFirstName: 'firstName',
      lastName: 'lastName',
      candidateLastName: 'lastName',
      contact: 'phone',
      phone: 'phone',
      email: 'email',
      gender: 'gender',
      education: 'qualification',
      qualification: 'qualification',
      totalExperience: 'experience',
      experience: 'experience',
      relevantExperience: 'relevantExperience',
      company: 'clientName',
      clientName: 'clientName',
      skills: 'skills',
      ctc: 'currentCTC',
      currentCTC: 'currentCTC',
      ectc: 'expectedCTC',
      expectedCTC: 'expectedCTC',
      noticePeriod: 'noticePeriod',
      currentLocation: 'currentLocation',
      preferredLocation: 'preferredLocation',
      cibilScore: 'cibilScore',
      panCardNumber: 'panCardNumber',
      recruiter: 'assignedRecruiterName',
    };

    Object.keys(body).forEach(key => {
      const modelField = fieldMap[key];
      if (modelField) {
        if (modelField === 'skills') {
          candidate.skills = Array.isArray(body[key])
            ? body[key]
            : String(body[key]).split(',').map(s => s.trim()).filter(Boolean);
        } else if (modelField === 'dateOfBirth') {
          if (body[key]) candidate.dateOfBirth = new Date(body[key]);
        } else {
          candidate[modelField] = body[key];
        }
      }
    });

    if (body.firstName || body.candidateFirstName || body.lastName || body.candidateLastName) {
      const f = candidate.firstName || '';
      const l = candidate.lastName || '';
      candidate.name = [f, l].filter(Boolean).join(' ').trim();
    }

    candidate.isEligibleTracker = true;
    await candidate.save();

    await createLog({
      type: 'edit',
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: `Updated eligible tracker row for candidate: ${candidate.name}`,
      target: candidate._id.toString(),
      ip: req.ip,
    }).catch(() => {});

    const mapped = mapCandidateToEligibleRow(candidate, 0);
    res.json({ success: true, candidate: mapped });
  } catch (err) {
    next(err);
  }
};

// POST /api/candidates/eligible-tracker
exports.createEligibleCandidate = async (req, res, next) => {
  try {
    const body = req.body;
    const parts = (body.name || '').trim().split(/\s+/);
    const firstName = body.candidateFirstName || body.firstName || parts[0] || 'Candidate';
    const lastName = body.candidateLastName || body.lastName || parts.slice(1).join(' ') || '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

    const candidateData = {
      name: fullName,
      firstName,
      lastName,
      phone: body.contact || body.phone,
      email: body.email || '',
      status: body.status || 'Eligible',
      skillName: body.skillName || '',
      jobLevel: body.jobLevel || '',
      vendorSPOC: body.vendorSPOC || '',
      companySPOC: body.companySPOC || '',
      jrNumber: body.jobId || body.jrNumber || '',
      dateOfBirth: body.dob ? new Date(body.dob) : (body.dateOfBirth ? new Date(body.dateOfBirth) : undefined),
      whiteHorseSource: body.whiteHorseSource || body.source || 'White Horse Manpower',
      source: body.whiteHorseSource || body.source || 'White Horse Manpower',
      gender: body.gender || '',
      qualification: body.education || body.qualification || '',
      experience: body.totalExperience || body.experience || '',
      relevantExperience: body.relevantExperience || '',
      clientName: body.company || body.clientName || '',
      skills: Array.isArray(body.skills) ? body.skills : (body.skills ? String(body.skills).split(',').map(s => s.trim()).filter(Boolean) : []),
      currentCTC: body.ctc || body.currentCTC || '',
      expectedCTC: body.ectc || body.expectedCTC || '',
      noticePeriod: body.noticePeriod || '',
      currentLocation: body.currentLocation || '',
      preferredLocation: body.preferredLocation || '',
      cibilScore: body.cibilScore || '',
      panCardNumber: body.panCardNumber || '',
      assignedRecruiter: req.user._id,
      assignedRecruiterName: req.user.name,
      isEligibleTracker: true,
    };

    if (!candidateData.phone) {
      return res.status(400).json({ message: 'Contact / Phone number is required' });
    }

    if (!candidateData.jrNumber || !String(candidateData.jrNumber).trim()) {
      return res.status(400).json({ message: 'Job Requirement (JR) is mandatory. Please select or provide a JR.' });
    }

    const candidate = await Candidate.create(candidateData);

    await createLog({
      type: 'create',
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: `Added eligible candidate ${candidate.name} via Eligible Tracker`,
      target: candidate._id.toString(),
      ip: req.ip,
    }).catch(() => {});

    const mapped = mapCandidateToEligibleRow(candidate, 0);
    res.status(201).json({ success: true, candidate: mapped });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/candidates/:id/tag-new-jr ─────────────────────────
// Allows tagging a candidate from General Pool to a new JR without repeating full screening
exports.tagNewJr = async (req, res, next) => {
  try {
    const { newJrNumber, notes } = req.body;
    if (!newJrNumber || !String(newJrNumber).trim()) {
      return res.status(400).json({ message: 'newJrNumber is required' });
    }

    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const Job = require('../models/Job');
    const job = await Job.findOne({ jrNumber: newJrNumber.trim() });
    if (!job) {
      return res.status(404).json({ message: `Job Requisition "${newJrNumber}" not found` });
    }
    if (job.status === 'Closed') {
      return res.status(403).json({ message: `Job Requisition "${newJrNumber}" is already closed` });
    }

    // Check positions filled
    const joinedCount = await Candidate.countDocuments({ jrNumber: job.jrNumber, status: 'Joined' });
    if (joinedCount >= (job.positions || 1)) {
      return res.status(403).json({ message: `All positions for JR "${newJrNumber}" are already filled` });
    }

    // Verify availability: must be admin/tl/manager OR in General Data/Expired/>30 days
    const is30DaysElapsed = candidate.availableInGeneralPoolAfter && new Date() >= new Date(candidate.availableInGeneralPoolAfter);
    const isGeneralPool = candidate.ownershipStatus === 'General Data' || 
                          candidate.ownershipStatus === 'Unassigned' ||
                          candidate.ownershipStatus === 'Expired' ||
                          is30DaysElapsed;
    
    if (req.user.role === 'recruiter' && !isGeneralPool && candidate.assignedRecruiter && String(candidate.assignedRecruiter) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Candidate is currently locked to another recruiter and has not completed the 30-day release period.' });
    }

    // Archive current assignment into jrHistory before moving
    if (!candidate.jrHistory) candidate.jrHistory = [];
    const prevJr = candidate.jrNumber || candidate.originalJrNumber || 'N/A';
    
    candidate.jrHistory.push({
      jrNumber: prevJr,
      jobTitle: candidate.positionApplied || candidate.originalJobTitle || '',
      clientName: candidate.clientName || candidate.originalClientName || '',
      screenedAt: candidate.originalScreenedAt || candidate.createdAt,
      screeningStatus: candidate.status || 'Eligible',
      tlDecision: candidate.secondCallStatus || candidate.finalInterviewStatus || (candidate.tlRejectedAt ? 'Rejected' : 'Completed'),
      tlNotes: candidate.secondCallNotes || candidate.tlRejectionReason || '',
      tlDecidedAt: candidate.tlRejectedAt || undefined,
      tlDecidedByName: candidate.tlRejectedByName || '',
      assignedRecruiter: candidate.assignedRecruiter,
      assignedRecruiterName: candidate.assignedRecruiterName,
      assignedAt: candidate.assignedAt,
      movedToGeneralPoolAt: candidate.tlRejectedAt ? new Date(new Date(candidate.tlRejectedAt).getTime() + 30 * 24 * 60 * 60 * 1000) : new Date(),
      notes: `Archived prior to re-tagging to ${job.jrNumber}. ${notes || ''}`
    });

    // PERMANENT JR HERITAGE:
    // Ensure originalJrNumber is preserved and NEVER overwritten
    if (!candidate.originalJrNumber && candidate.jrNumber) {
      candidate.originalJrNumber = candidate.jrNumber;
      candidate.originalJobTitle = candidate.positionApplied || '';
      candidate.originalClientName = candidate.clientName || '';
      candidate.originalScreenedAt = candidate.originalScreenedAt || candidate.createdAt;
    }

    // Apply new JR
    candidate.jrNumber = job.jrNumber;
    candidate.clientName = job.companyName || candidate.clientName;
    candidate.company = job.companyName || candidate.company;
    candidate.positionApplied = job.jobTitle || candidate.positionApplied;
    candidate.division = job.division || candidate.division || 'BPO';

    // Assign to current user (recruiter)
    candidate.assignedRecruiter = req.user._id;
    candidate.assignedRecruiterName = cleanRecruiterName(req.user.name);
    candidate.assignedAt = new Date();
    candidate.ownershipStatus = 'Assigned';

    // Candidate was previously screened and marked Eligible:
    // Fast-track them: status is Eligible for the new JR without repeating complete initial screening!
    candidate.status = 'Eligible';
    candidate.currentStage = 'Screening';
    candidate.isPreviouslyScreened = true;
    
    // Reset round-specific sub-statuses for fresh evaluation under new JR
    candidate.tlCallSubmitted = false;
    candidate.secondCallStatus = undefined;
    candidate.secondCallNotes = undefined;
    candidate.secondCallDate = undefined;
    candidate.tlRejectedAt = undefined;
    candidate.availableInGeneralPoolAfter = undefined;
    candidate.interviewStatus = undefined;
    candidate.finalRoundStatus = undefined;
    candidate.finalInterviewStatus = undefined;
    candidate.finalInterviewLocked = false;

    // Push new assignment to jrHistory
    candidate.jrHistory.push({
      jrNumber: job.jrNumber,
      jobTitle: job.jobTitle,
      clientName: job.companyName,
      screenedAt: new Date(),
      screeningStatus: 'Eligible (Fast-Tracked from ' + (candidate.originalJrNumber || prevJr) + ')',
      assignedRecruiter: req.user._id,
      assignedRecruiterName: req.user.name,
      assignedAt: new Date(),
      notes: `Re-tagged to new JR ${job.jrNumber}. Preserved original screening from ${candidate.originalJrNumber || prevJr}. ${notes || ''}`
    });

    candidate.stageHistory.push({
      stage: 'Screening',
      subStatus: `Tagged to new JR ${job.jrNumber} (Previously screened under ${candidate.originalJrNumber || prevJr})`,
      changedAt: new Date(),
      changedBy: req.user._id,
      notes: notes || 'Assigned to new JR from General Pool',
    });

    await candidate.save();

    await createLog({
      type: 'edit', user: req.user._id, userName: req.user.name,
      role: req.user.role,
      action: `Tagged candidate ${candidate.name} to new JR ${job.jrNumber} (Original: ${candidate.originalJrNumber || prevJr})`,
      target: candidate._id.toString(), ip: req.ip,
    });

    res.json({
      success: true,
      message: `Candidate successfully tagged to new JR ${job.jrNumber} with original screening history preserved.`,
      candidate
    });
  } catch (err) {
    next(err);
  }
};

