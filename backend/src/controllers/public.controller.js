const Candidate = require('../models/Candidate');
const Employee = require('../models/Employee');
const User = require('../models/User');
const { generateEmployeeId } = require('../utils/helpers');

const Job = require('../models/Job');

// GET /api/public/jobs
exports.getJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find({ status: 'Open' })
      .select('companyName jrNumber jobTitle department jobType experience location positions priority hrName hrEmail skills description')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ jobs });
  } catch (err) {
    next(err);
  }
};

async function getNextRoundRobinRecruiter() {
  try {
    // 1. Get all active recruiters
    const recruiters = await User.find({ role: 'recruiter', status: 'Active' });
    if (recruiters.length === 0) return null;

    // 2. For each recruiter, find their most recent candidate assignment
    const recruitersWithLastAssignment = await Promise.all(recruiters.map(async (r) => {
      const lastCandidate = await Candidate.findOne({ assignedRecruiter: r._id })
        .sort({ assignedAt: -1 })
        .select('assignedAt');
      return {
        recruiter: r,
        lastAssignedAt: lastCandidate && lastCandidate.assignedAt ? lastCandidate.assignedAt.getTime() : 0
      };
    }));

    // 3. Sort recruiters by lastAssignedAt ascending (oldest first)
    recruitersWithLastAssignment.sort((a, b) => a.lastAssignedAt - b.lastAssignedAt);

    // 4. Return the recruiter who got assigned least recently
    return recruitersWithLastAssignment[0].recruiter;
  } catch (err) {
    console.error('Error in getNextRoundRobinRecruiter:', err);
    return null;
  }
}

// POST /api/public/apply
exports.apply = async (req, res, next) => {
  try {
    const applicantName = (req.body.fullName || req.body.name || req.body.candidateName || '').trim();
    const applicantEmail = (req.body.email || '').trim().toLowerCase();
    const applicantPhone = (req.body.phone || req.body.mobile || req.body.phoneNumber || '').trim();
    const experience = req.body.experience || '';
    const skills = req.body.skills;
    const jrNumber = req.body.jrNumber;
    const positionApplied = req.body.positionApplied || req.body.jobTitle || 'Website Application';

    if (!applicantName || !applicantPhone) {
      return res.status(400).json({ message: 'Name and phone number are required' });
    }

    // Check duplicate
    let existing = null;
    if (applicantEmail || applicantPhone) {
      const orConds = [];
      if (applicantPhone) orConds.push({ phone: applicantPhone });
      if (applicantEmail) orConds.push({ email: applicantEmail });
      existing = await Candidate.findOne({ $or: orConds });
    }

    if (existing) {
      // Re-application: gracefully update resume and record re-application note rather than rejecting
      if (req.file) {
        existing.resumePath = `/uploads/resumes/${req.file.filename}`;
        existing.resumeOriginalName = req.file.originalname;
      }
      if (!existing.notes) existing.notes = [];
      existing.notes.unshift({
        text: `Re-applied via White Horse Website for "${positionApplied}"${jrNumber ? ' (' + jrNumber + ')' : ''}`,
        addedByName: 'Website Portal',
        createdAt: new Date()
      });
      if (existing.ownershipStatus === 'Expired' || !existing.assignedRecruiter) {
        existing.ownershipStatus = 'General Data';
        existing.status = 'New';
      }
      existing.appliedViaPublic = true;
      if (!existing.source || existing.source === 'Other') {
        existing.source = 'Company Website';
      }
      await existing.save();

      return res.status(200).json({
        success: true,
        message: 'Your application has been received and your profile updated in White Horse Manpower ATS.',
        id: existing._id,
        reapplication: true
      });
    }

    const candidateData = {
      name: applicantName,
      email: applicantEmail,
      phone: applicantPhone,
      experience: experience || '',
      skills: typeof skills === 'string' ? skills.split(',').map(s => s.trim()).filter(Boolean) : (skills || []),
      source: req.body.source || 'Company Website',
      appliedViaPublic: true,
      status: 'New',
      ownershipStatus: 'General Data',
      positionApplied: positionApplied,
      clientName: 'White Horse Website'
    };

    // Round robin assignment to active recruiter
    const nextRecruiter = await getNextRoundRobinRecruiter();
    if (nextRecruiter) {
      candidateData.assignedRecruiter = nextRecruiter._id;
      candidateData.assignedRecruiterName = nextRecruiter.name;
      candidateData.ownershipStatus = 'Assigned';
      candidateData.assignedAt = new Date();
    } else {
      candidateData.assignedRecruiterName = 'Unassigned';
    }

    if (jrNumber) {
      const linkedJob = await Job.findOne({ jrNumber });
      if (linkedJob) {
        candidateData.jrNumber = jrNumber;
        candidateData.positionApplied = linkedJob.jobTitle;
        if (linkedJob.companyName) candidateData.clientName = linkedJob.companyName;
      }
    }

    if (req.body.location) {
      candidateData.location = req.body.location;
      candidateData.currentLocation = req.body.location;
    }

    if (req.file) {
      candidateData.resumePath = `/uploads/resumes/${req.file.filename}`;
      candidateData.resumeOriginalName = req.file.originalname;
    }

    const candidate = await Candidate.create(candidateData);
    res.status(201).json({
      success: true,
      message: 'Application submitted successfully to White Horse Manpower ATS',
      id: candidate._id
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/public/joining
exports.joining = async (req, res, next) => {
  try {
    const { fullName, phone, joiningDate } = req.body;
    if (!fullName || !phone || !joiningDate) {
      return res.status(400).json({ message: 'fullName, phone, and joiningDate are required' });
    }
    const data = { ...req.body };
    data.employeeId = await generateEmployeeId(Employee, User);
    data.createdBy = req.user._id;

    const employee = await Employee.create(data);
    res.status(201).json(employee);
  } catch (err) {
    next(err);
  }
};

// GET /api/public/joining/:id - Single record detail (filtered by role)
exports.getJoiningDetail = async (req, res, next) => {
  try {
    const emp = await Employee.findById(req.params.id)
      .populate('createdBy', 'name employeeId')
      .populate('candidateRef', 'name status source');
    if (!emp) return res.status(404).json({ message: 'Record not found' });

    // Role-based visibility check
    if (req.user.role === 'recruiter') {
      if (String(emp.createdBy?._id || emp.createdBy) !== String(req.user._id)) {
        return res.status(403).json({ message: 'Access denied: You did not submit this record.' });
      }
    } else if (req.user.role === 'tl') {
      const TeamMember = require('../models/TeamMember');
      const teamMember = await TeamMember.findOne({
        teamLeaderId: req.user._id,
        memberId: emp.createdBy?._id || emp.createdBy,
        removedAt: null,
      });
      const isSelf = String(emp.createdBy?._id || emp.createdBy) === String(req.user._id);
      if (!isSelf && !teamMember) {
        return res.status(403).json({ message: 'Access denied: Creator is not on your team.' });
      }
    }

    res.json(emp);
  } catch (err) {
    next(err);
  }
};

// PUT /api/public/joining/:id - Admin or TL: update a joining record
exports.updateJoining = async (req, res, next) => {
  try {
    const emp = await Employee.findById(req.params.id);
    if (!emp) return res.status(404).json({ message: 'Record not found' });

    if (req.user.role === 'tl') {
      const TeamMember = require('../models/TeamMember');
      const teamMember = await TeamMember.findOne({
        teamLeaderId: req.user._id,
        memberId: emp.createdBy?._id || emp.createdBy,
        removedAt: null,
      });
      const isSelf = String(emp.createdBy?._id || emp.createdBy) === String(req.user._id);
      if (!isSelf && !teamMember) {
        return res.status(403).json({ message: 'Access denied: Creator is not on your team.' });
      }
    }

    const payload = { ...req.body };
    if (payload.isApproved === true || payload.approvalStatus === 'approved') {
      payload.isApproved = true;
      payload.approvalStatus = 'approved';
      payload.approvedBy = req.user._id;
      payload.approvedByName = req.user.name;
      payload.approvedAt = new Date();
      payload.rejectionRemarks = '';
    } else if (payload.approvalStatus === 'rejected') {
      payload.isApproved = false;
      payload.approvalStatus = 'rejected';
      payload.approvedBy = req.user._id;
      payload.approvedByName = req.user.name;
      payload.approvedAt = new Date();
    }

    const updated = await Employee.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name employeeId').populate('approvedBy', 'name employeeId');

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// POST /api/public/joining/:id/approve - TL or Admin approves recruiter joining form
exports.approveJoining = async (req, res, next) => {
  try {
    const emp = await Employee.findById(req.params.id).populate('createdBy', 'name employeeId');
    if (!emp) return res.status(404).json({ message: 'Record not found' });

    if (req.user.role === 'tl') {
      const TeamMember = require('../models/TeamMember');
      const teamMember = await TeamMember.findOne({
        teamLeaderId: req.user._id,
        memberId: emp.createdBy?._id || emp.createdBy,
        removedAt: null,
      });
      const isSelf = String(emp.createdBy?._id || emp.createdBy) === String(req.user._id);
      if (!isSelf && !teamMember) {
        return res.status(403).json({ message: 'Access denied: Creator is not on your team.' });
      }
    }

    emp.isApproved = true;
    emp.approvalStatus = 'approved';
    emp.approvedBy = req.user._id;
    emp.approvedByName = req.user.name;
    emp.approvedAt = new Date();
    emp.rejectionRemarks = '';
    emp.rejectedDocuments = [];
    await emp.save();

    try {
      const { createLog } = require('../utils/auditLogger');
      await createLog({
        type: 'edit',
        user: req.user._id,
        userName: req.user.name,
        role: req.user.role,
        action: `Approved and verified joining form for ${emp.fullName} (${emp.employeeId})`,
        target: emp._id.toString(),
        ip: req.ip,
      });
    } catch (logErr) {
      console.error('Audit log error on approveJoining:', logErr);
    }

    res.json({ success: true, message: 'Joining form approved and locked', employee: emp });
  } catch (err) {
    next(err);
  }
};

// POST /api/public/joining/:id/reject - TL or Admin requests changes / rejects joining form
exports.rejectJoining = async (req, res, next) => {
  try {
    const { remarks, rejectedDocuments } = req.body;
    if (!remarks || !remarks.trim()) {
      return res.status(400).json({ message: 'Rejection remarks are required explaining what needs correction.' });
    }

    const emp = await Employee.findById(req.params.id).populate('createdBy', 'name employeeId');
    if (!emp) return res.status(404).json({ message: 'Record not found' });

    if (req.user.role === 'tl') {
      const TeamMember = require('../models/TeamMember');
      const teamMember = await TeamMember.findOne({
        teamLeaderId: req.user._id,
        memberId: emp.createdBy?._id || emp.createdBy,
        removedAt: null,
      });
      const isSelf = String(emp.createdBy?._id || emp.createdBy) === String(req.user._id);
      if (!isSelf && !teamMember) {
        return res.status(403).json({ message: 'Access denied: Creator is not on your team.' });
      }
    }

    emp.isApproved = false;
    emp.approvalStatus = 'rejected';
    emp.approvedBy = req.user._id;
    emp.approvedByName = req.user.name;
    emp.approvedAt = new Date();
    emp.rejectionRemarks = remarks.trim();
    emp.rejectedDocuments = Array.isArray(rejectedDocuments) ? rejectedDocuments : [];
    await emp.save();

    try {
      const { createLog } = require('../utils/auditLogger');
      await createLog({
        type: 'edit',
        user: req.user._id,
        userName: req.user.name,
        role: req.user.role,
        action: `Requested changes on joining form for ${emp.fullName} (${emp.employeeId}): ${remarks.trim()}`,
        target: emp._id.toString(),
        ip: req.ip,
      });
    } catch (logErr) {
      console.error('Audit log error on rejectJoining:', logErr);
    }

    res.json({ success: true, message: 'Joining form rejected with remarks for revision', employee: emp });
  } catch (err) {
    next(err);
  }
};

// GET /api/public/joining - List all joining records (filtered by role and status)
exports.listJoining = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    // Role-based records visibility
    if (req.user.role === 'recruiter') {
      query.createdBy = req.user._id;
    } else if (req.user.role === 'tl') {
      const TeamMember = require('../models/TeamMember');
      const teamMembers = await TeamMember.find({
        teamLeaderId: req.user._id,
        removedAt: null,
      }).select('memberId');
      const memberIds = teamMembers.map(t => t.memberId);
      memberIds.push(req.user._id);
      query.createdBy = { $in: memberIds };
    }

    // Status filter
    if (status && status !== 'all') {
      if (status === 'approved') {
        query.$or = [
          { approvalStatus: 'approved' },
          { isApproved: true }
        ];
      } else if (status === 'pending') {
        query.$and = [
          { isApproved: { $ne: true } },
          { $or: [{ approvalStatus: 'pending' }, { approvalStatus: { $exists: false } }, { approvalStatus: 'draft' }] }
        ];
      } else if (status === 'rejected') {
        query.approvalStatus = 'rejected';
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [employees, total, pendingCount] = await Promise.all([
      Employee.find(query).sort('-createdAt').skip(skip).limit(parseInt(limit))
        .populate('createdBy', 'name employeeId')
        .populate('approvedBy', 'name employeeId')
        .populate('candidateRef', 'name status source'),
      Employee.countDocuments(query),
      Employee.countDocuments({
        ...query,
        isApproved: { $ne: true },
        approvalStatus: { $ne: 'rejected' }
      }),
    ]);
    res.json({ employees, total, pendingCount });
  } catch (err) {
    next(err);
  }
};
