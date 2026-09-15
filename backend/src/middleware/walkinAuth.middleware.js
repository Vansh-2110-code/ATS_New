const jwt = require('jsonwebtoken');

// Middleware to verify walk-in JWT token
const walkinAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No authentication token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

    if (!decoded.isWalkIn && decoded.role !== 'walkin') {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.walkinId = decoded.walkinId || decoded.id;
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired. Please login again.' });
    }
    res.status(401).json({ message: 'Authentication failed' });
  }
};

// Optional walk-in auth - doesn't fail if no token provided
const optionalWalkInAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      if (decoded.isWalkIn || decoded.role === 'walkin') {
        req.walkinId = decoded.walkinId || decoded.id;
        req.user = decoded;
      }
    }
  } catch (error) {
    // Ignore errors for optional auth
  }

  next();
};

module.exports = {
  walkinAuth,
  optionalWalkInAuth,
};
