const AtsRecord = require('../models/AtsRecord');
const Candidate = require('../models/Candidate');
const WalkIn = require('../models/WalkIn');
const Job = require('../models/Job');
const Company = require('../models/Company');
const User = require('../models/User');
const TeamMember = require('../models/TeamMember');
const Task = require('../models/Task');
const Invoice = require('../models/Invoice');
const CreditNote = require('../models/CreditNote');

const SEARCH_PATH_CACHE = new Map();

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getSearchablePaths = (model) => {
  if (SEARCH_PATH_CACHE.has(model.modelName)) {
    return SEARCH_PATH_CACHE.get(model.modelName);
  }

  const blockedParts = ['password', 'otp', 'token', '__v'];
  const paths = Object.entries(model.schema.paths)
    .filter(([name, schemaPath]) => {
      const lowered = name.toLowerCase();
      if (blockedParts.some(part => lowered.includes(part))) return false;
      if (name === '_id' || name === 'createdAt' || name === 'updatedAt') return false;
      if (name.startsWith('__')) return false;

      const isString = schemaPath.instance === 'String';
      const isStringArray = schemaPath.instance === 'Array' && schemaPath.caster?.instance === 'String';
      return isString || isStringArray;
    })
    .map(([name]) => name)
    .slice(0, 28);

  SEARCH_PATH_CACHE.set(model.modelName, paths);
  return paths;
};

const buildDynamicQuery = (model, q) => {
  const paths = getSearchablePaths(model);
  if (!paths.length) return null;
  const regex = { $regex: escapeRegex(q), $options: 'i' };
  return { $or: paths.map(path => ({ [path]: regex })) };
};

const buildCandidateVisibilityQuery = async (user) => {
  // Everyone (Recruiter, Team Lead, Manager, Admin) can search all candidates
  return {};
};

const buildWalkInVisibilityQuery = async (user) => {
  if (user.role === 'recruiter' || user.role === 'spoc') {
    return { $or: [{ assignedTo: user._id }, { registeredByUser: user._id }] };
  }

  if (user.role === 'tl') {
    const teamMembers = await TeamMember.find({
      teamLeaderId: user._id,
      removedAt: null,
    }).select('memberId');
    const memberIds = teamMembers.map(m => m.memberId);
    memberIds.push(user._id);
    return { $or: [{ assignedTo: { $in: memberIds } }, { registeredByUser: { $in: memberIds } }] };
  }

  return {};
};

const buildTaskVisibilityQuery = async (user) => {
  if (['admin', 'manager'].includes(user.role)) return {};

  if (user.role === 'tl') {
    const teamMembers = await TeamMember.find({
      teamLeaderId: user._id,
      removedAt: null,
    }).select('memberId');
    const memberIds = teamMembers.map(m => m.memberId);
    memberIds.push(user._id);
    return { $or: [{ assignedTo: { $in: memberIds } }, { assignedBy: { $in: memberIds } }] };
  }

  return { $or: [{ assignedTo: user._id }, { assignedBy: user._id }] };
};

const formatCandidateResult = (candidate) => {
  const hasResume = Boolean(candidate.resumePath);
  let resumeUrl = null;
  if (candidate.resumePath) {
    resumeUrl = candidate.resumePath.startsWith('http')
      ? candidate.resumePath
      : `${candidate.resumePath.startsWith('/') ? '' : '/'}${candidate.resumePath}`;
  }

  const subtitleParts = [
    candidate.phone,
    candidate.email,
    candidate.positionApplied,
    candidate.clientName || candidate.companyName,
    candidate.status,
    candidate.assignedRecruiterName ? `Recruiter: ${candidate.assignedRecruiterName}` : '',
    hasResume ? '📄 Resume Available' : 'No Resume'
  ].filter(Boolean);

  return {
    id: candidate._id,
    type: 'candidate',
    module: 'Candidates',
    title: candidate.name || 'Unnamed Candidate',
    subtitle: subtitleParts.join(' • '),
    path: `/recruiter/candidate/${candidate._id}`,
    hasResume,
    resumeUrl,
    resumeOriginalName: candidate.resumeOriginalName || (hasResume ? 'Candidate_Resume.pdf' : null),
  };
};

const formatAtsRecordResult = (rec) => ({
  id: rec._id,
  type: 'atsRecord',
  module: 'ATS Resumes',
  title: rec.name || 'Scanned Resume',
  subtitle: [`Score: ${rec.atsScore || 0}%`, rec.jobTitle, rec.phone, rec.email, rec.atsStatus].filter(Boolean).join(' • '),
  path: '/admin/ats-records',
  hasResume: false,
});

const formatWalkInResult = (walkIn) => ({
  id: walkIn._id,
  type: 'walkin',
  module: 'Walk-In',
  title: walkIn.name || walkIn.referenceId || 'Walk-In Candidate',
  subtitle: [walkIn.referenceId, walkIn.phone, walkIn.status].filter(Boolean).join(' • '),
  path: '/recruiter/walkin-queue',
});

const formatJobResult = (job, role) => ({
  id: job._id,
  type: 'job',
  module: 'Jobs',
  title: job.jobTitle || job.jrNumber || 'Job',
  subtitle: [job.jrNumber, job.companyName, job.status].filter(Boolean).join(' • '),
  path: ['admin', 'manager'].includes(role) ? '/admin/jobs' : `/recruiter/jobs/${job._id}/summary`,
});

const formatCompanyResult = (company) => ({
  id: company._id,
  type: 'company',
  module: 'Companies',
  title: company.companyName || 'Company',
  subtitle: [company.city, company.spoc, company.phone].filter(Boolean).join(' • '),
  path: '/admin/companies',
});

const formatUserResult = (user) => ({
  id: user._id,
  type: 'user',
  module: 'Users',
  title: user.name || user.employeeId || 'User',
  subtitle: [user.employeeId, user.role, user.email].filter(Boolean).join(' • '),
  path: '/admin/users',
});

const formatTaskResult = (task) => ({
  id: task._id,
  type: 'task',
  module: 'Tasks',
  title: task.title || 'Task',
  subtitle: [task.status, task.priority, task.taskCategory].filter(Boolean).join(' • '),
  path: '/admin/tasks',
});

const formatInvoiceResult = (invoice) => ({
  id: invoice._id,
  type: 'invoice',
  module: 'Invoices',
  title: invoice.client || 'Invoice',
  subtitle: [invoice.status, `Amount: ${invoice.amount}`].filter(Boolean).join(' • '),
  path: '/invoices/create',
});

const formatCreditNoteResult = (cn) => ({
  id: cn._id,
  type: 'creditNote',
  module: 'Credit Notes',
  title: cn.client || 'Credit Note',
  subtitle: [cn.status, `Amount: ${cn.amount}`].filter(Boolean).join(' • '),
  path: `/credit-notes/view/${cn._id}`,
});

// GET /api/search/global?q=...
exports.globalSearch = async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit || '30', 10), 1), 100);
    if (q.length < 2) {
      return res.json({ query: q, total: 0, suggestions: [], results: [] });
    }

    const candidateVisibility = await buildCandidateVisibilityQuery(req.user);
    const walkInVisibility = await buildWalkInVisibilityQuery(req.user);
    const taskVisibility = await buildTaskVisibilityQuery(req.user);
    const candidateLimit = Math.max(20, Math.ceil(limit * 0.6));
    const perBucket = Math.max(4, Math.ceil(limit / 8));

    const qRegex = { $regex: escapeRegex(q), $options: 'i' };
    const isResumeSearch = ['resume', 'resumes', 'cv', 'cvs'].includes(q.toLowerCase());
    const candidateOrList = [
      { name: qRegex },
      { phone: qRegex },
      { email: qRegex },
      { skills: qRegex },
      { candidateId: qRegex },
      { clientName: qRegex },
      { companyName: qRegex },
      { positionApplied: qRegex },
      { jrNumber: qRegex },
      { status: qRegex },
      { currentStage: qRegex },
      { assignedRecruiterName: qRegex },
      { location: qRegex },
      { resumeOriginalName: qRegex },
      { resumePath: qRegex }
    ];
    if (isResumeSearch) {
      candidateOrList.push({ resumePath: { $exists: true, $ne: null, $ne: '' } });
    }
    const candidateQuery = { $or: candidateOrList };
    const walkInQuery = buildDynamicQuery(WalkIn, q);
    const jobQuery = buildDynamicQuery(Job, q);
    const companyQuery = buildDynamicQuery(Company, q);
    const userQuery = buildDynamicQuery(User, q);
    const taskQuery = buildDynamicQuery(Task, q);
    const invoiceQuery = buildDynamicQuery(Invoice, q);
    const cnQuery = buildDynamicQuery(CreditNote, q);

    const tasks = [];

    if (candidateQuery) {
      tasks.push(
        Candidate.find({ ...candidateVisibility, ...candidateQuery })
          .sort('-updatedAt')
          .limit(candidateLimit)
          .select('name email phone status positionApplied clientName companyName assignedRecruiterName resumePath resumeOriginalName source updatedAt')
          .lean()
          .then(items => items.map(formatCandidateResult))
      );
    }

    if (walkInQuery) {
      tasks.push(
        WalkIn.find({ ...walkInVisibility, ...walkInQuery })
          .sort('-updatedAt')
          .limit(perBucket)
          .select('name phone referenceId status updatedAt')
          .lean()
          .then(items => items.map(formatWalkInResult))
      );
    }

    if (['recruiter', 'spoc', 'tl', 'manager', 'admin'].includes(req.user.role) && jobQuery) {
      const jobFilter = req.user.role === 'admin' ? {} : { priority: { $ne: 'Closed' } };
      tasks.push(
        Job.find({ ...jobFilter, ...jobQuery })
          .sort('-updatedAt')
          .limit(perBucket)
          .select('jobTitle jrNumber companyName status updatedAt')
          .lean()
          .then(items => items.map(item => formatJobResult(item, req.user.role)))
      );
    }

    if (['recruiter', 'spoc', 'tl', 'manager', 'admin'].includes(req.user.role) && companyQuery) {
      tasks.push(
        Company.find(companyQuery)
          .sort('-updatedAt')
          .limit(perBucket)
          .select('companyName city spoc phone updatedAt')
          .lean()
          .then(items => items.map(formatCompanyResult))
      );
    }

    if (['manager', 'admin'].includes(req.user.role) && userQuery) {
      const userFilter = req.user.role === 'admin'
        ? {}
        : { role: { $in: ['recruiter', 'tl', 'manager'] }, status: 'Active' };
      tasks.push(
        User.find({ ...userFilter, ...userQuery })
          .sort('-updatedAt')
          .limit(perBucket)
          .select('name employeeId role email status updatedAt')
          .lean()
          .then(items => items.map(formatUserResult))
      );
    }

    if (taskQuery) {
      tasks.push(
        Task.find({ ...taskVisibility, ...taskQuery })
          .sort('-updatedAt')
          .limit(perBucket)
          .select('title status priority taskCategory updatedAt')
          .lean()
          .then(items => items.map(formatTaskResult))
      );
    }

    if (['manager', 'admin'].includes(req.user.role) && invoiceQuery) {
      tasks.push(
        Invoice.find(invoiceQuery)
          .sort('-updatedAt')
          .limit(perBucket)
          .select('client status amount updatedAt')
          .lean()
          .then(items => items.map(formatInvoiceResult))
      );
    }

    if (['manager', 'admin'].includes(req.user.role) && cnQuery) {
      tasks.push(
        CreditNote.find(cnQuery)
          .sort('-updatedAt')
          .limit(perBucket)
          .select('client status amount updatedAt')
          .lean()
          .then(items => items.map(formatCreditNoteResult))
      );
    }

    const groupedResults = await Promise.all(tasks);
    const results = groupedResults
      .flat()
      .slice(0, limit);

    const suggestions = [...new Set(results.map(r => r.title))].slice(0, 8);

    res.json({
      query: q,
      total: results.length,
      suggestions,
      results,
    });
  } catch (err) {
    next(err);
  }
};
