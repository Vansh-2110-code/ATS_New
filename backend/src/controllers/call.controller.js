const CallLog = require('../models/CallLog');
const Candidate = require('../models/Candidate');
const { createLog } = require('../utils/auditLogger');
const notificationService = require('../utils/notification.service');

// POST /api/calls/initiate
exports.initiate = async (req, res, next) => {
  try {
    const { candidateId } = req.body;
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    const call = await CallLog.create({
      candidate: candidate._id,
      candidateName: candidate.name,
      candidatePhone: candidate.phone,
      recruiter: req.user._id,
      recruiterName: req.user.name,
      startTime: new Date(),
    });

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

    // Update candidate status if "New"
    if (candidate.status === 'New') {
      candidate.status = 'Contacted';
    }
    await candidate.save();

    await createLog({
      type: 'call', user: req.user._id, userName: req.user.name,
      role: req.user.role, action: `Initiated call to ${candidate.name} (${candidate.phone})`,
      target: candidate._id.toString(), ip: req.ip,
    });

    res.status(201).json(call);
  } catch (err) {
    next(err);
  }
};

// PUT /api/calls/:id/end
exports.endCall = async (req, res, next) => {
  try {
    const { duration } = req.body;
    const call = await CallLog.findById(req.params.id);
    if (!call) return res.status(404).json({ message: 'Call not found' });

    call.endTime = new Date();
    call.duration = duration || Math.round((call.endTime - call.startTime) / 1000);
    await call.save();

    res.json(call);
  } catch (err) {
    next(err);
  }
};

// POST /api/calls/:id/log
exports.logOutcome = async (req, res, next) => {
  try {
    const { outcome, notes } = req.body;
    if (!outcome) return res.status(400).json({ message: 'Outcome is required' });

    const call = await CallLog.findById(req.params.id);
    if (!call) return res.status(404).json({ message: 'Call not found' });

    call.outcome = outcome;
    call.notes = notes || '';
    call.completed = true;
    if (!call.endTime) {
      call.endTime = new Date();
      call.duration = Math.round((call.endTime - call.startTime) / 1000);
    }
    await call.save();

    // Update candidate status based on outcome
    const candidate = await Candidate.findById(call.candidate);
    if (candidate) {
      // Add the call log as a candidate note so it displays in their history and registers on the dashboards
      const callNoteText = `[Call Outcome: ${outcome}]${notes ? ` - ${notes}` : ''}`;
      candidate.notes.push({
        text: callNoteText,
        addedBy: req.user._id,
        addedByName: req.user.name,
        createdAt: new Date(),
      });

      const statusMap = {
        'Interested': 'Interested',
        'Not Interested': 'Rejected',
        'Call Back': 'Call Back',
        'No Answer': 'Did Not Pick',
        'Busy': 'Call Back',
        'Wrong Number': 'Wrong Number',
      };
      if (statusMap[outcome]) {
        candidate.status = statusMap[outcome];
      }
      await candidate.save();
    }

    await createLog({
      type: 'call', user: req.user._id, userName: req.user.name,
      role: req.user.role, action: `Call outcome: ${outcome} for ${call.candidateName}`,
      target: call.candidate.toString(), ip: req.ip,
    });

    // Generate missed call notification if outcome is No Answer or Busy
    if (outcome === 'No Answer' || outcome === 'Busy') {
      await notificationService.createNotification({
        recipientId: call.recruiter,
        type: 'call',
        title: 'Missed Call Logged',
        message: `${call.candidateName} (${outcome}). Follow up later.`,
        entityId: candidate ? candidate._id : null,
        entityType: 'Candidate',
        navigateTo: candidate ? `/recruiter/candidates/${candidate._id}` : `/recruiter/dashboard`
      });
    }

    res.json(call);
  } catch (err) {
    next(err);
  }
};

// GET /api/calls/candidate/:candidateId
exports.getCandidateCalls = async (req, res, next) => {
  try {
    const calls = await CallLog.find({ candidate: req.params.candidateId })
      .sort('-createdAt')
      .limit(50);
    res.json(calls);
  } catch (err) {
    next(err);
  }
};

// GET /api/calls/my - Get recruiter's calls / candidate touches for a given date
exports.getMyCalls = async (req, res, next) => {
  try {
    const { date, recruiterId } = req.query;
    const User = require('../models/User');

    let targetUserId = req.user._id;
    let targetUserName = req.user.name;

    if (recruiterId && ['admin', 'manager', 'tl'].includes(req.user.role)) {
      const u = await User.findById(recruiterId).select('name');
      if (u) {
        targetUserId = u._id;
        targetUserName = u.name;
      }
    }

    const targetDate = date ? new Date(date) : new Date();
    const startOfToday = new Date(targetDate);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(targetDate);
    endOfToday.setHours(23, 59, 59, 999);

    // 1. Get CallLogs if any
    const callLogs = await CallLog.find({
      recruiter: targetUserId,
      createdAt: { $gte: startOfToday, $lt: endOfToday }
    }).populate('candidate').lean();

    // 2. Get Candidate entries touched on that date
    const candFilter = {
      $and: [
        {
          $or: [
            { assignedRecruiter: targetUserId },
            { assignedRecruiterName: targetUserName },
            { sourcedBy: targetUserName },
            { recruiterName: targetUserName }
          ]
        },
        {
          $or: [
            { createdAt: { $gte: startOfToday, $lt: endOfToday } },
            { firstCallDate: { $gte: startOfToday, $lt: endOfToday } },
            { updatedAt: { $gte: startOfToday, $lt: endOfToday } },
            { 'notes.createdAt': { $gte: startOfToday, $lt: endOfToday } }
          ]
        }
      ]
    };

    const candidates = await Candidate.find(candFilter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    // 3. Merge & Deduplicate
    const candidateMap = new Map();

    // Add CallLogs first if any
    for (const cl of callLogs) {
      const cId = cl.candidate?._id ? cl.candidate._id.toString() : (cl.candidate ? cl.candidate.toString() : String(cl._id));
      candidateMap.set(cId, {
        _id: cl._id,
        candidate: cId,
        candidateName: cl.candidate?.name || cl.candidateName || 'Candidate',
        candidatePhone: cl.candidate?.phone || cl.candidatePhone || '',
        candidateEmail: cl.candidate?.email || '',
        startTime: cl.startTime || cl.createdAt,
        duration: cl.duration || 0,
        outcome: cl.outcome || cl.candidate?.status || 'Completed',
        recruiterName: cl.recruiterName || targetUserName,
        completed: cl.completed ?? true,
        clientName: cl.candidate?.clientName || cl.candidate?.company || '',
        status: cl.candidate?.status || cl.outcome
      });
    }

    // Add candidates touched today
    for (const c of candidates) {
      const cId = c._id.toString();
      if (!candidateMap.has(cId)) {
        candidateMap.set(cId, {
          _id: c._id,
          candidate: cId,
          candidateName: c.name,
          candidatePhone: c.phone,
          candidateEmail: c.email,
          startTime: c.updatedAt || c.createdAt || c.firstCallDate,
          duration: 0,
          outcome: c.firstCallStatus || c.status || 'Updated',
          recruiterName: c.assignedRecruiterName || targetUserName,
          completed: true,
          clientName: c.clientName || c.company || '',
          status: c.status
        });
      }
    }

    const result = Array.from(candidateMap.values()).sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    res.json(result);
  } catch (err) {
    next(err);
  }
};
