const Candidate = require('../models/Candidate');
const Job = require('../models/Job');
const User = require('../models/User');

module.exports = async function demoProtection(req, res, next) {
  // Only apply restrictions if authenticated user is the demo account
  if (!req.user || !req.user.isDemoAccount) {
    return next();
  }

  const method = req.method.toUpperCase();

  // Read-only operations (GET, HEAD, OPTIONS) are completely safe
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }

  const url = req.originalUrl || req.url || '';

  // Allow resetting demo data itself
  if (url.includes('reset-demo-data')) {
    return next();
  }

  // Allow logout, search, and internal chat
  if (url.includes('/auth/logout') || url.includes('/internal-chat') || url.includes('/search')) {
    return next();
  }

  // ── 1. Candidate Protection ──
  if (url.includes('/api/candidates')) {
    // When creating a candidate in demo mode, auto-tag as demo
    if (method === 'POST') {
      req.body = req.body || {};
      req.body.isDemoData = true;
      return next();
    }

    // When modifying or deleting an existing candidate
    const idMatch = url.match(/\/candidates\/([a-f0-9]{24})/i);
    if (idMatch && ['PUT', 'PATCH', 'DELETE'].includes(method)) {
      const candidateId = idMatch[1];
      try {
        const candidate = await Candidate.findById(candidateId).select('isDemoData name');
        if (candidate && !candidate.isDemoData) {
          return res.status(403).json({
            message: `[Demo Sandbox Protection] Cannot alter or delete real candidate "${candidate.name}". Live production candidate records are protected in demo mode.`
          });
        }
      } catch (e) {
        // proceed if lookup fails
      }
    }
    return next();
  }

  // ── 2. Job Requisition Protection (Live 106 JRs) ──
  if (url.includes('/api/jobs')) {
    // When creating a job in demo mode, auto-tag as demo
    if (method === 'POST') {
      req.body = req.body || {};
      req.body.isDemoData = true;
      if (req.body.jrNumber && !String(req.body.jrNumber).startsWith('DEMO-')) {
        req.body.jrNumber = `DEMO-${req.body.jrNumber}`;
      }
      return next();
    }

    // When modifying or deleting an existing job
    const idMatch = url.match(/\/jobs\/([a-f0-9]{24})/i);
    if (idMatch && ['PUT', 'PATCH', 'DELETE'].includes(method)) {
      const jobId = idMatch[1];
      try {
        const job = await Job.findById(jobId).select('isDemoData jobTitle jrNumber');
        if (job && !job.isDemoData) {
          return res.status(403).json({
            message: `[Demo Sandbox Protection] Cannot alter or delete live job requisition "${job.jobTitle}" (${job.jrNumber}). Live ATS client requisitions are protected in demo mode.`
          });
        }
      } catch (e) {
        // proceed
      }
    }
    return next();
  }

  // ── 3. User Management Protection ──
  if (url.includes('/api/users')) {
    if (url.includes('reset-all-faces')) {
      return res.status(403).json({
        message: '[Demo Sandbox Protection] Biometric face reset is disabled in demo mode.'
      });
    }

    if (method === 'POST') {
      req.body = req.body || {};
      req.body.isDemoData = true;
      return next();
    }

    const idMatch = url.match(/\/users\/([a-f0-9]{24})/i);
    if (idMatch && ['PUT', 'PATCH', 'DELETE'].includes(method)) {
      const targetUserId = idMatch[1];
      try {
        const targetUser = await User.findById(targetUserId).select('isDemoData isDemoAccount name');
        if (targetUser && !targetUser.isDemoData && !targetUser.isDemoAccount) {
          return res.status(403).json({
            message: `[Demo Sandbox Protection] Cannot modify or delete real employee user "${targetUser.name}". Real employee profiles are protected in demo mode.`
          });
        }
      } catch (e) {
        // proceed
      }
    }
    return next();
  }

  // ── 4. Finance, Leave & Attendance Protection ──
  if (url.includes('/api/finance') || url.includes('/api/leaves') || url.includes('/api/attendance')) {
    if (['PUT', 'PATCH', 'DELETE'].includes(method)) {
      return res.status(403).json({
        message: '[Demo Sandbox Protection] Production payroll, leave records, and attendance cannot be altered in demo mode.'
      });
    }
  }

  next();
};
