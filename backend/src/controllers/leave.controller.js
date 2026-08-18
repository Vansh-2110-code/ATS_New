const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { createLog } = require('../utils/auditLogger');
const { getKolkataDate } = require('../utils/helpers');

// Helper: Ensure user has an initialized LeaveBalance for the current year
// and auto-accrue 1.5 days per elapsed month of the year
async function getOrInitLeaveBalance(userId, targetYear) {
  const localNow = getKolkataDate();
  const year = targetYear || localNow.getFullYear();
  const currentMonthIdx = localNow.getMonth(); // 0-indexed (0 = Jan, 7 = Aug)

  let balance = await LeaveBalance.findOne({ user: userId, year });
  if (!balance) {
    balance = new LeaveBalance({
      user: userId,
      year,
      accruedLeaves: 0,
      usedLeaves: 0,
      pendingLeaves: 0,
      currentBalance: 0,
      history: [],
    });
  }

  // Calculate elapsed months up to current month (e.g. for Aug, elapsed = 8 months -> 8 * 1.5 = 12 days)
  const elapsedMonths = currentMonthIdx + 1;
  const targetAccrued = elapsedMonths * 1.5;

  if (balance.accruedLeaves < targetAccrued) {
    const diff = targetAccrued - balance.accruedLeaves;
    balance.accruedLeaves = targetAccrued;
    balance.currentBalance = Math.max(0, balance.accruedLeaves - balance.usedLeaves);
    balance.lastAccruedMonth = `${year}-${String(elapsedMonths).padStart(2, '0')}`;
    balance.history.push({
      month: `${year}-${String(elapsedMonths).padStart(2, '0')}`,
      credited: diff,
      used: 0,
      description: `Monthly leave auto-credit (+1.5 days/month)`,
      date: new Date(),
    });
    await balance.save();
  }

  return balance;
}

// GET /api/leaves/balance — get balance for logged in user (or specified user if admin)
exports.getBalance = async (req, res, next) => {
  try {
    const targetUserId = req.query.userId && ['admin', 'manager', 'tl'].includes(req.user.role)
      ? req.query.userId
      : req.user._id;

    const balance = await getOrInitLeaveBalance(targetUserId);

    // Calculate late logins in current calendar month for the user
    const localNow = getKolkataDate();
    const monthStart = new Date(Date.UTC(localNow.getFullYear(), localNow.getMonth(), 1, 0, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(localNow.getFullYear(), localNow.getMonth() + 1, 0, 23, 59, 59, 999));

    const lateRecords = await Attendance.find({
      user: targetUserId,
      date: { $gte: monthStart, $lte: monthEnd },
      isLate: true,
    });

    const lateCount = lateRecords.length;
    const lateDeductions = Math.floor(lateCount / 5) * 0.5;

    res.json({
      balance: balance.currentBalance,
      accruedLeaves: balance.accruedLeaves,
      usedLeaves: balance.usedLeaves,
      pendingLeaves: balance.pendingLeaves,
      lateLoginsThisMonth: lateCount,
      lateDeductionsThisMonth: lateDeductions,
      history: balance.history || [],
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/leaves/apply — apply for leave
exports.apply = async (req, res, next) => {
  try {
    const { leaveType = 'Paid Leave', fromDate, toDate, daysCount, reason } = req.body;

    if (!fromDate || !toDate || !reason) {
      return res.status(400).json({ message: 'From date, to date, and reason are required' });
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);
    const days = daysCount ? parseFloat(daysCount) : Math.max(0.5, Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1);

    const balance = await getOrInitLeaveBalance(req.user._id);

    // If paid leave, check if sufficient balance
    if (leaveType === 'Paid Leave' && balance.currentBalance < days) {
      return res.status(400).json({
        message: `Insufficient leave balance. You have ${balance.currentBalance} day(s) available, but requested ${days} day(s).`
      });
    }

    const leaveReq = await LeaveRequest.create({
      user: req.user._id,
      name: req.user.name,
      role: req.user.role,
      leaveType,
      fromDate: from,
      toDate: to,
      daysCount: days,
      reason,
      status: 'Pending',
    });

    // Update pending balance
    balance.pendingLeaves = (balance.pendingLeaves || 0) + days;
    await balance.save();

    await createLog({
      type: 'leave',
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: `Applied for ${days} day(s) ${leaveType}`,
      details: { fromDate, toDate, leaveType, daysCount: days, reason },
    });

    res.status(201).json({ message: 'Leave application submitted successfully', leaveRequest: leaveReq });
  } catch (err) {
    next(err);
  }
};

// GET /api/leaves/my — current user's leave requests
exports.getMyRequests = async (req, res, next) => {
  try {
    const requests = await LeaveRequest.find({ user: req.user._id })
      .sort('-createdAt')
      .lean();
    res.json(requests);
  } catch (err) {
    next(err);
  }
};

// GET /api/leaves/pending — pending requests for TL / Manager / Admin
exports.getPendingRequests = async (req, res, next) => {
  try {
    const query = { status: 'Pending' };

    // If TL, filter for team members if applicable
    if (req.user.role === 'tl') {
      const TeamMember = require('../models/TeamMember');
      const team = await TeamMember.find({ teamLeader: req.user._id }).select('user');
      const memberIds = team.map(t => t.user);
      query.$or = [{ user: { $in: memberIds } }, { user: req.user._id }];
    }

    const requests = await LeaveRequest.find(query)
      .populate('user', 'name email role employeeId')
      .sort('-createdAt')
      .lean();

    res.json(requests);
  } catch (err) {
    next(err);
  }
};

// POST /api/leaves/:id/review — Approve or Reject leave
exports.reviewRequest = async (req, res, next) => {
  try {
    const { action, reviewRemarks } = req.body; // action: 'Approve' | 'Reject'
    if (!['Approve', 'Reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be Approve or Reject' });
    }

    const leaveReq = await LeaveRequest.findById(req.params.id);
    if (!leaveReq) {
      return res.status(404).json({ message: 'Leave request not found' });
    }
    if (leaveReq.status !== 'Pending') {
      return res.status(400).json({ message: `Leave request is already ${leaveReq.status}` });
    }

    const balance = await getOrInitLeaveBalance(leaveReq.user);

    if (action === 'Approve') {
      leaveReq.status = 'Approved';
      leaveReq.reviewedBy = req.user._id;
      leaveReq.reviewedByName = req.user.name;
      leaveReq.reviewRemarks = reviewRemarks || '';
      leaveReq.reviewedAt = new Date();
      await leaveReq.save();

      // Deduct balance and adjust pending
      balance.pendingLeaves = Math.max(0, (balance.pendingLeaves || 0) - leaveReq.daysCount);
      if (leaveReq.leaveType !== 'Unpaid Leave') {
        balance.usedLeaves = (balance.usedLeaves || 0) + leaveReq.daysCount;
        balance.currentBalance = Math.max(0, balance.accruedLeaves - balance.usedLeaves);
        balance.history.push({
          month: `${getKolkataDate().getFullYear()}-${String(getKolkataDate().getMonth() + 1).padStart(2, '0')}`,
          credited: 0,
          used: leaveReq.daysCount,
          description: `Approved ${leaveReq.leaveType} (${leaveReq.daysCount} days)`,
          date: new Date(),
        });
      }
      await balance.save();

      // Mark Attendance records for each day of leave
      const cur = new Date(leaveReq.fromDate);
      const end = new Date(leaveReq.toDate);
      while (cur <= end) {
        // Skip Sundays (0)
        if (cur.getDay() !== 0) {
          const dUtc = new Date(Date.UTC(cur.getFullYear(), cur.getMonth(), cur.getDate(), 0, 0, 0, 0));
          await Attendance.findOneAndUpdate(
            { user: leaveReq.user, date: dUtc },
            {
              $set: {
                name: leaveReq.name,
                role: leaveReq.role,
                status: leaveReq.daysCount === 0.5 ? 'Half Day' : 'Leave',
                leaveRequestId: leaveReq._id,
              }
            },
            { upsert: true, new: true }
          );
        }
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      leaveReq.status = 'Rejected';
      leaveReq.reviewedBy = req.user._id;
      leaveReq.reviewedByName = req.user.name;
      leaveReq.reviewRemarks = reviewRemarks || '';
      leaveReq.reviewedAt = new Date();
      await leaveReq.save();

      // Remove from pending
      balance.pendingLeaves = Math.max(0, (balance.pendingLeaves || 0) - leaveReq.daysCount);
      await balance.save();
    }

    await createLog({
      type: 'leave',
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: `${action}d leave request for ${leaveReq.name}`,
      details: { requestId: leaveReq._id, action, remarks: reviewRemarks },
    });

    res.json({ message: `Leave request ${action.toLowerCase()}d successfully`, leaveRequest: leaveReq });
  } catch (err) {
    next(err);
  }
};

// GET /api/leaves/all — list all leave requests (Admin/Manager view)
exports.getAllRequests = async (req, res, next) => {
  try {
    const { status, search, year } = req.query;
    const query = {};
    if (status && status !== 'All') query.status = status;
    if (search) query.name = { $regex: search, $options: 'i' };

    const requests = await LeaveRequest.find(query)
      .populate('user', 'name email role employeeId')
      .sort('-createdAt')
      .lean();

    res.json(requests);
  } catch (err) {
    next(err);
  }
};
