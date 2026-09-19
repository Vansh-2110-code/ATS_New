const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const { createLog } = require('../utils/auditLogger');
const { generateOTP, sendOTP, getKolkataDate, isTimeInWindow } = require('../utils/helpers');

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { employeeId, password, isWFH: loginIsWFH } = req.body;
    if (!employeeId || !password) {
      return res.status(400).json({ message: 'Employee ID and password are required' });
    }

    const identifier = employeeId.trim();
    const user = await User.findOne({
      $or: [
        { employeeId: identifier },
        { email: identifier.toLowerCase() }
      ]
    });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (user.status === 'Suspended') {
      return res.status(403).json({ message: 'Account suspended. Contact admin.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Access Control: Cutoff login hours and WFH allowances (except Admin role)
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      const localNow = getKolkataDate();
      const currentHour = localNow.getHours();
      const currentMin = localNow.getMinutes();
      const currentHHMM = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;

      const startTime = user.loginStartTime || '09:00';
      const endTime = user.role === 'recruiter' ? (user.loginEndTime || '19:00') : (user.loginEndTime || '19:00');

      if (!isTimeInWindow(currentHHMM, startTime, endTime)) {
        const errorMsg = user.role === 'recruiter'
          ? `Access denied: Recruiters cannot log in to ATS post 7:00 PM IST. Allowed login window is ${startTime} to ${endTime} IST. Current local time is ${currentHHMM} IST.`
          : `Access denied: Your allowed login window is between ${startTime} and ${endTime} IST. Current local time is ${currentHHMM} IST.`;
        return res.status(403).json({ message: errorMsg });
      }

      if (loginIsWFH && (user.isWFH === false || user.allowHomeLogin === false)) {
        return res.status(403).json({
          message: 'Access denied: Working from Home (WFH) login is not allowed for your account.'
        });
      }
    }

    const loginTime = new Date();
    user.lastLogin = loginTime;
    await user.save();

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        isWalkIn: user.role === 'walkin' || user.role === 'demo_walkin',
        walkinId: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      }
    );

    // Detect late login (after 09:30 on a working day)
    const localLoginTime = getKolkataDate(loginTime);
    const loginHour = localLoginTime.getHours();
    const loginMin  = localLoginTime.getMinutes();
    const loginDay  = localLoginTime.getDay();
    const isWorkingDay = loginDay !== 0 && loginDay !== 6;
    const isLateLogin  = isWorkingDay && (loginHour > 9 || (loginHour === 9 && loginMin > 30));
    const loginHHMM    = `${String(loginHour).padStart(2,'0')}:${String(loginMin).padStart(2,'0')}`;

    await createLog({
      type: 'login', user: user._id, userName: user.name,
      role: user.role,
      action: isLateLogin ? `User logged in (Late — ${loginHHMM})` : `User logged in (${loginHHMM})`,
      target: user.employeeId,
      details: { loginTime: loginHHMM, lateLogin: isLateLogin, isWFH: loginIsWFH || false },
      ip: req.ip || req.headers['x-forwarded-for'],
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        roles: user.roles && user.roles.length > 0 ? user.roles : [user.role],
        isWFH: loginIsWFH || user.isWFH || false,
        avatar: user.avatar,
        faceDescriptor: user.faceDescriptor,
        disableBiometric: user.disableBiometric || false,
        employeeId: user.employeeId,
        isSuperAdmin: Boolean(user.isSuperAdmin || user.employeeId === 'WH000001' || user.email === 'admin@whitehorsemanpower.in'),
        isDemoAccount: user.isDemoAccount || false,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
exports.logout = async (req, res, next) => {
  try {
    // Update attendance logout time
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const attendance = await Attendance.findOne({ user: req.user._id, date: today });
    let totalHours = 0;
    const logoutTime = new Date();
    if (attendance && !attendance.logoutTime) {
      attendance.logoutTime = logoutTime;
      const diff = logoutTime - attendance.loginTime;
      attendance.totalHours = Math.round((diff / 3600000) * 100) / 100;
      totalHours = attendance.totalHours;
      await attendance.save();
    }

    // Detect early logout (before 18:00 on a working day)
    const localLogoutTime = getKolkataDate(logoutTime);
    const logoutHour = localLogoutTime.getHours();
    const logoutMin  = localLogoutTime.getMinutes();
    const logoutDay  = localLogoutTime.getDay();
    const isLogoutWorkingDay = logoutDay !== 0 && logoutDay !== 6;
    const isEarlyLogout      = isLogoutWorkingDay && logoutHour < 18;
    const logoutHHMM         = `${String(logoutHour).padStart(2,'0')}:${String(logoutMin).padStart(2,'0')}`;

    await createLog({
      type: 'logout', user: req.user._id, userName: req.user.name,
      role: req.user.role,
      action: isEarlyLogout ? `User logged out (Early — ${logoutHHMM})` : `User logged out (${logoutHHMM})`,
      target: req.user.employeeId,
      details: { logoutTime: logoutHHMM, earlyLogout: isEarlyLogout, totalHours },
      ip: req.ip,
    });

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/send-otp
exports.sendOTP = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otpCode = generateOTP();
    user.otp = otpCode;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    await user.save();

    await sendOTP(user, otpCode);

    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/verify-otp
exports.verifyOTP = async (req, res, next) => {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp) {
      return res.status(400).json({ message: 'User ID and OTP are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.otp || user.otp !== otp || !user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // OTP verified, clear it
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    });

    await createLog({
      type: 'login',
      user: user._id,
      userName: user.name,
      role: user.role,
      action: 'User verified WFH OTP successfully',
      target: user.employeeId,
      details: { isWFH: true },
      ip: req.ip || req.headers['x-forwarded-for'],
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        roles: user.roles && user.roles.length > 0 ? user.roles : [user.role],
        isWFH: user.isWFH || false,
        avatar: user.avatar,
        faceDescriptor: user.faceDescriptor,
        disableBiometric: user.disableBiometric || false,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
exports.me = async (req, res, next) => {
  try {
    const user = req.user;
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        roles: user.roles && user.roles.length > 0 ? user.roles : [user.role],
        isWFH: user.isWFH || false,
        avatar: user.avatar,
        faceDescriptor: user.faceDescriptor,
        disableBiometric: user.disableBiometric || false,
        employeeId: user.employeeId,
        isDemoAccount: user.isDemoAccount || false,
      }
    });
  } catch (err) {
    next(err);
  }
};
