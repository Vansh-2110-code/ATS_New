const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Support token via query param for file downloads (GET requests only)
    const queryToken = req.method === 'GET' ? req.query.token : null;
    const header = req.headers.authorization;
    if (!header && !queryToken) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = queryToken || (header && header.startsWith('Bearer ') ? header.split(' ')[1] : null);
    if (!token) return res.status(401).json({ message: 'Authentication required' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Virtual user support for demo flow
    if (decoded.id === 'demo_walkin_user' || decoded._id === 'demo_walkin_user' || decoded.id === '000000000000000000000000' || decoded._id === '000000000000000000000000') {
      req.user = {
        _id: '000000000000000000000000',
        id: '000000000000000000000000',
        name: 'Demo Walk-In User',
        role: 'demo_walkin',
        email: 'demo@walkin.com',
      };
      req.userId = '000000000000000000000000';
      return next();
    }

    const user = await User.findById(decoded.id).select('-password -otp -otpExpiry');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    if (user.status === 'Suspended') {
      return res.status(403).json({ message: 'Account suspended' });
    }

    req.user = user;
    req.userId = user._id;

    // Run demo sandbox protection if demo account is active
    if (user.isDemoAccount) {
      const demoProtection = require('./demoProtection.middleware');
      return demoProtection(req, res, next);
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const ROLE_INHERITANCE = {
  admin: ['admin', 'manager', 'tl', 'recruiter', 'spoc'],
  manager: ['manager', 'tl', 'recruiter', 'spoc'],
  tl: ['tl', 'recruiter', 'spoc'],
  recruiter: ['recruiter'],
  spoc: ['spoc'],
  walkin: ['walkin']
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    const userRole = req.user.role;
    const effectiveRoles = ROLE_INHERITANCE[userRole] || [userRole];
    const hasAccess = roles.some(role => effectiveRoles.includes(role));
    if (!hasAccess) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

// Optional auth — attaches req.user if valid token present, continues either way
const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return next();
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password -otp -otpExpiry');
    if (user && user.status !== 'Suspended') req.user = user;
  } catch { /* ignore — proceed unauthenticated */ }
  next();
};

module.exports = { auth, authorize, optionalAuth };
