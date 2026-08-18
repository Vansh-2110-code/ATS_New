const Attendance = require('../models/Attendance');
const Holiday = require('../models/Holiday');
const User = require('../models/User');
const { createLog } = require('../utils/auditLogger');
const { getKolkataDate } = require('../utils/helpers');

// GET /api/attendance/today — check if current user has marked attendance today
exports.todayStatus = async (req, res, next) => {
  try {
    const localNow = getKolkataDate();
    const today = new Date(Date.UTC(localNow.getFullYear(), localNow.getMonth(), localNow.getDate(), 0, 0, 0, 0));

    const record = await Attendance.findOne({ user: req.user._id, date: today });

    if (record) {
      return res.json({
        marked: true,
        markedAt: record.markedAt || record.loginTime,
        loginTime: record.loginTime,
        status: record.status,
        isWFH: record.isWFH,
      });
    }
    res.json({ marked: false });
  } catch (err) {
    next(err);
  }
};

// POST /api/attendance/mark — user explicitly marks their own attendance
exports.mark = async (req, res, next) => {
  try {
    const { isWFH = false } = req.body;
    const now = new Date();
    const localNow = getKolkataDate(now);
    const today = new Date(Date.UTC(localNow.getFullYear(), localNow.getMonth(), localNow.getDate(), 0, 0, 0, 0));

    const localMarkNow = getKolkataDate(now);
    const markHour = localMarkNow.getHours();
    const markMin = localMarkNow.getMinutes();
    const isLate = (markHour > 9) || (markHour === 9 && markMin > 15);
    const lateMinutes = isLate ? ((markHour - 9) * 60 + markMin) : 0;

    let record = await Attendance.findOne({ user: req.user._id, date: today });

    if (record) {
      // Already exists — update markedAt to confirm, but don't overwrite loginTime
      record.markedAt = record.markedAt || now;
      record.isWFH = isWFH;
      record.status = isWFH ? 'WFH' : (record.status && record.status !== 'Absent' ? record.status : 'Present');
      record.isLate = record.isLate || isLate;
      record.lateMinutes = record.lateMinutes || lateMinutes;
      await record.save();
    } else {
      record = await Attendance.create({
        user: req.user._id,
        name: req.user.name,
        role: req.user.role,
        date: today,
        loginTime: now,
        markedAt: now,
        status: isWFH ? 'WFH' : 'Present',
        isWFH,
        isLate,
        lateMinutes,
      });
    }

    const hhmm = `${String(localMarkNow.getHours()).padStart(2,'0')}:${String(localMarkNow.getMinutes()).padStart(2,'0')}`;
    await createLog({
      type: 'attendance',
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: `Attendance marked (${hhmm})${isWFH ? ' — WFH' : ''}${isLate ? ` [Late: +${lateMinutes}m]` : ''}`,
      details: { markedAt: hhmm, isWFH, isLate, lateMinutes },
    });

    res.json({
      marked: true,
      markedAt: record.markedAt,
      loginTime: record.loginTime,
      status: record.status,
      isWFH: record.isWFH,
      isLate: record.isLate,
      lateMinutes: record.lateMinutes,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/attendance
exports.list = async (req, res, next) => {
  try {
    const { date, status, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setDate(end.getDate() + 1);
      query.date = { $gte: d, $lt: end };
    }
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Role-based filtering
    if (req.user.role === 'recruiter') {
      query.user = req.user._id;
    } else if (req.user.role === 'tl') {
      const TeamMember = require('../models/TeamMember');
      const teamMembers = await TeamMember.find({
        teamLeaderId: req.user._id,
        removedAt: null,
      }).select('memberId');
      const memberIds = teamMembers.map(t => t.memberId);
      memberIds.push(req.user._id);
      query.user = { $in: memberIds };
    }

    const [records, total] = await Promise.all([
      Attendance.find(query).sort('-date').skip(skip).limit(parseInt(limit)),
      Attendance.countDocuments(query),
    ]);

    res.json({ records, total });
  } catch (err) {
    next(err);
  }
};

// GET /api/attendance/holidays
exports.getHolidays = async (req, res, next) => {
  try {
    const { year } = req.query;
    const query = {};
    if (year) query.year = parseInt(year);
    const holidays = await Holiday.find(query).sort('date');
    res.json(holidays);
  } catch (err) {
    next(err);
  }
};

// POST /api/attendance/holidays
exports.addHoliday = async (req, res, next) => {
  try {
    const { date, name, type } = req.body;
    if (!date || !name) {
      return res.status(400).json({ message: 'date and name are required' });
    }
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    const holiday = await Holiday.create({
      date: d,
      name,
      type: type || 'National',
      year: d.getFullYear(),
    });
    res.status(201).json(holiday);
  } catch (err) {
    next(err);
  }
};

// GET /api/attendance/leave-balance
exports.getLeaveBalance = async (req, res, next) => {
  try {
    const { userId } = req.query;
    const targetUserId = userId || req.user._id;
    const LeaveBalance = require('../models/LeaveBalance');
    const { getKolkataDate } = require('../utils/helpers');
    
    const localNow = getKolkataDate();
    const year = localNow.getFullYear();
    const currentMonthIdx = localNow.getMonth(); // 0-indexed

    let balance = await LeaveBalance.findOne({ user: targetUserId, year });
    const targetAccrued = (currentMonthIdx + 1) * 1.5;

    if (!balance) {
      balance = await LeaveBalance.create({
        user: targetUserId,
        year,
        accruedLeaves: targetAccrued,
        usedLeaves: 0,
        pendingLeaves: 0,
        currentBalance: targetAccrued,
        lastAccruedMonth: `${year}-${String(currentMonthIdx + 1).padStart(2, '0')}`,
        history: [{
          month: `${year}-${String(currentMonthIdx + 1).padStart(2, '0')}`,
          credited: targetAccrued,
          used: 0,
          description: 'Monthly leave accrual (+1.5 days/month)',
          date: new Date(),
        }],
      });
    } else if (balance.accruedLeaves < targetAccrued) {
      const diff = targetAccrued - balance.accruedLeaves;
      balance.accruedLeaves = targetAccrued;
      balance.currentBalance = Math.max(0, balance.accruedLeaves - balance.usedLeaves);
      balance.lastAccruedMonth = `${year}-${String(currentMonthIdx + 1).padStart(2, '0')}`;
      balance.history.push({
        month: `${year}-${String(currentMonthIdx + 1).padStart(2, '0')}`,
        credited: diff,
        used: 0,
        description: 'Monthly leave accrual (+1.5 days/month)',
        date: new Date(),
      });
      await balance.save();
    }

    res.json({
      totalLeave: balance.accruedLeaves,
      earnedLeave: balance.accruedLeaves,
      usedLeave: balance.usedLeaves,
      pendingLeave: balance.pendingLeaves,
      remainingLeave: balance.currentBalance,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/attendance/employee/:userId - Detailed employee attendance summary
exports.employeeDetail = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { year } = req.query;

    const currentYear = parseInt(year) || new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear + 1, 0, 1);

    // Resolve user by employeeId or _id
    const mongoose = require('mongoose');
    let employee = null;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      employee = await User.findById(userId).lean();
    }
    if (!employee) {
      employee = await User.findOne({ employeeId: userId }).lean();
    }
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const mongoId = employee._id;

    // Fetch all attendance records for the year
    const attendanceRecords = await Attendance.find({
      user: mongoId,
      date: { $gte: yearStart, $lt: yearEnd },
    }).sort('date');

    // Fetch holidays for the year
    const Holiday = require('../models/Holiday');
    const holidays = await Holiday.find({ year: currentYear }).sort('date');

    // Yearly summary
    const yearlySummary = {
      workingDays: attendanceRecords.filter(r => r.status !== 'Holiday' && r.status !== 'Weekend').length,
      presentDays: attendanceRecords.filter(r => r.status === 'Present').length,
      absentDays: attendanceRecords.filter(r => r.status === 'Absent').length,
      wfhDays: attendanceRecords.filter(r => r.status === 'WFH').length,
      halfDays: attendanceRecords.filter(r => r.status === 'Half Day').length,
      leaveDays: attendanceRecords.filter(r => r.status === 'Leave').length,
      totalHolidays: holidays.length,
      earnedLeaves: Math.floor(attendanceRecords.filter(r => ['Present', 'WFH'].includes(r.status)).length / 20),
    };

    // Monthly breakdown
    const monthlyData = [];
    for (let m = 0; m < 12; m++) {
      const mStart = new Date(currentYear, m, 1);
      const mEnd = new Date(currentYear, m + 1, 1);
      const mRecords = attendanceRecords.filter(r => {
        const d = new Date(r.date);
        return d >= mStart && d < mEnd;
      });
      const mHolidays = holidays.filter(h => {
        const d = new Date(h.date);
        return d >= mStart && d < mEnd;
      });
      monthlyData.push({
        month: m + 1,
        monthName: new Date(currentYear, m).toLocaleString('en-US', { month: 'short' }),
        present: mRecords.filter(r => r.status === 'Present').length,
        absent: mRecords.filter(r => r.status === 'Absent').length,
        wfh: mRecords.filter(r => r.status === 'WFH').length,
        leave: mRecords.filter(r => r.status === 'Leave').length,
        holidays: mHolidays.length,
        earnedLeave: 1, // 1 earned leave per month
      });
    }

    // Activity — format times as HH:MM AM/PM in IST and compute flags
    const toHHMM = (dt) => {
      if (!dt) return '—';
      const d = getKolkataDate(new Date(dt));
      const hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 || 12;
      return `${String(h12).padStart(2, '0')}:${minutes} ${ampm}`;
    };
    const toMins = (dt) => {
      if (!dt) return null;
      const d = getKolkataDate(new Date(dt));
      return d.getHours() * 60 + d.getMinutes();
    };
    const WORK_START_MINS = 9 * 60 + 30;  // 09:30
    const WORK_END_MINS   = 18 * 60;      // 18:00

    const recentRecords = attendanceRecords.slice(-30).reverse().map(r => {
      const day         = new Date(r.date).getDay();
      const isWorkDay   = day !== 0 && day !== 6;
      const loginMins   = r.loginTime  ? toMins(r.loginTime)  : null;
      const logoutMins  = r.logoutTime ? toMins(r.logoutTime) : null;
      const lateLogin   = isWorkDay && loginMins  !== null && loginMins  > WORK_START_MINS;
      const earlyLogout = isWorkDay && logoutMins !== null && logoutMins < WORK_END_MINS;
      return {
        _date:       new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        login:       toHHMM(r.loginTime),
        logout:      toHHMM(r.logoutTime),
        totalHours:  r.totalHours || 0,
        status:      r.status,
        wfh:         r.isWFH,
        lateLogin,
        earlyLogout,
      };
    });

    res.json({
      employee: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        employeeId: employee.employeeId,
        role: employee.role,
        isWFH: employee.isWFH,
        isActive: employee.isActive,
        joinedDate: employee.createdAt,
        lastLogin: employee.lastLogin,
      },
      yearlySummary,
      monthlyData,
      recentRecords,
      holidays: holidays.map(h => ({ date: h.date, name: h.name, type: h.type })),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/attendance/tl-activity - TL login activity for Admin/Manager
exports.tlActivity = async (req, res, next) => {
  try {
    const { from, to, userId } = req.query;

    const query = { role: 'tl' };

    if (from || to) {
      query.date = {};
      if (from) {
        const f = new Date(from); f.setHours(0, 0, 0, 0);
        query.date.$gte = f;
      }
      if (to) {
        const t = new Date(to); t.setHours(23, 59, 59, 999);
        query.date.$lte = t;
      }
    }
    if (userId) query.user = userId;

    const records = await Attendance.find(query)
      .sort('-date')
      .populate('user', 'name email role')
      .limit(500);

    // Also pull lastLogin from User model for each TL
    const tls = await User.find({ role: 'tl', status: 'Active' })
      .select('name email lastLogin')
      .lean();

    const toHHMM = (d) => {
      if (!d) return null;
      const dt = new Date(d);
      return `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
    };

    const formatted = records.map(r => ({
      _id: r._id,
      userId: r.user?._id || r.user,
      name: r.user?.name || r.name,
      email: r.user?.email || '',
      date: r.date,
      loginTime: r.loginTime,
      logoutTime: r.logoutTime,
      loginHHMM: toHHMM(r.loginTime),
      logoutHHMM: toHHMM(r.logoutTime),
      totalHours: r.totalHours || 0,
      status: r.status,
      isWFH: r.isWFH,
    }));

    res.json({ records: formatted, tls });
  } catch (err) {
    next(err);
  }
};

// GET /api/attendance/summary - Today's summary
exports.summary = async (req, res, next) => {
  try {
    const localNow = getKolkataDate();
    const today = new Date(Date.UTC(localNow.getFullYear(), localNow.getMonth(), localNow.getDate(), 0, 0, 0, 0));
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let totalUsersQuery = { status: 'Active' };
    let attendanceQuery = { date: { $gte: today, $lt: tomorrow } };

    // Role-based filtering
    if (req.user.role === 'tl') {
      const TeamMember = require('../models/TeamMember');
      const teamMembers = await TeamMember.find({
        teamLeaderId: req.user._id,
        removedAt: null,
      }).select('memberId');
      const memberIds = teamMembers.map(t => t.memberId);
      memberIds.push(req.user._id);
      
      totalUsersQuery._id = { $in: memberIds };
      attendanceQuery.user = { $in: memberIds };
    }

    const totalUsers = await User.countDocuments(totalUsersQuery);
    const present = await Attendance.countDocuments({ ...attendanceQuery, status: 'Present' });
    const wfh = await Attendance.countDocuments({ ...attendanceQuery, status: 'WFH' });
    const absent = totalUsers - present - wfh;

    res.json({
      total: totalUsers,
      present,
      wfh,
      absent: Math.max(0, absent),
      attendanceRate: totalUsers > 0 ? Math.round(((present + wfh) / totalUsers) * 100) : 0,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/attendance/export/excel - Export all attendance records as Excel
exports.exportExcel = async (req, res, next) => {
  try {
    const XLSX = require('xlsx');

    // Optional filters from query
    const { date, from, to, status } = req.query;
    const query = {};

    // Support both single date and date range
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      query.date = { $gte: d, $lt: nextDay };
    } else if (from || to) {
      query.date = {};
      if (from) {
        const f = new Date(from);
        f.setHours(0, 0, 0, 0);
        query.date.$gte = f;
      }
      if (to) {
        const t = new Date(to);
        t.setHours(23, 59, 59, 999);
        query.date.$lte = t;
      }
    }
    if (status) query.status = status;

    // Fetch all attendance records
    const records = await Attendance.find(query)
      .sort('-date')
      .lean()
      .exec();

    // Format data for Excel
    const excelData = records.map(r => {
      const d = new Date(r.date);
      const dateStr = d.toLocaleDateString('en-IN');

      const toHHMM = (dt) => {
        if (!dt) return '—';
        const time = getKolkataDate(new Date(dt));
        const hours = time.getHours();
        const minutes = String(time.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const h12 = hours % 12 || 12;
        return `${String(h12).padStart(2, '0')}:${minutes} ${ampm}`;
      };

      return {
        'Employee ID': r.employeeId || r.userId || 'N/A',
        'Name': r.name || 'N/A',
        'Role': r.role || 'N/A',
        'Date': dateStr || 'N/A',
        'Login Time': toHHMM(r.loginTime),
        'Logout Time': toHHMM(r.logoutTime),
        'Total Hours': r.totalHours ? r.totalHours.toFixed(2) : 'N/A',
        'Status': r.status || 'N/A',
        'WFH': r.isWFH ? 'Yes' : 'No',
      };
    });

    // Create workbook and add sheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

    // Set column widths
    const colWidths = [
      { wch: 15 }, // Employee ID
      { wch: 20 }, // Name
      { wch: 12 }, // Role
      { wch: 12 }, // Date
      { wch: 12 }, // Login Time
      { wch: 12 }, // Logout Time
      { wch: 12 }, // Total Hours
      { wch: 15 }, // Status
      { wch: 8 },  // WFH
    ];
    ws['!cols'] = colWidths;

    // Generate filename with date
    const now = new Date();
    const dateStamp = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `Attendance_${dateStamp}.xlsx`;

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write file to response
    const buffer = XLSX.write(wb, { type: 'buffer' });
    res.send(buffer);

    // Audit log
    await createLog({
      type: 'export',
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: `Exported ${records.length} attendance record(s) to Excel`,
      details: { recordCount: records.length, filters: { from, to, status }, filename },
      ip: req.ip,
    });
  } catch (err) {
    next(err);
  }
};
