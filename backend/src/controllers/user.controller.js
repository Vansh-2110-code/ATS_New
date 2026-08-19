const User = require('../models/User');
const Employee = require('../models/Employee');
const { createLog } = require('../utils/auditLogger');
const { generateEmployeeId } = require('../utils/helpers');

const ROLE_ORDER = ['walkin', 'recruiter', 'spoc', 'tl', 'manager', 'admin'];
const getHighestRole = (roles) => {
  if (!roles || roles.length === 0) return 'recruiter';
  let highest = roles[0];
  roles.forEach(r => {
    if (ROLE_ORDER.indexOf(r) > ROLE_ORDER.indexOf(highest)) {
      highest = r;
    }
  });
  return highest;
};

// GET /api/users
exports.list = async (req, res, next) => {
  try {
    const { search, role, status, page = 1, limit = 50 } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }
    if (role) query.role = role;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(query).sort('-createdAt').skip(skip).limit(parseInt(limit)),
      User.countDocuments(query),
    ]);

    res.json({ users, total });
  } catch (err) {
    next(err);
  }
};

// POST /api/users
exports.create = async (req, res, next) => {
  try {
    const { name, email, role, roles, isWFH, password, noEmployeeId, loginStartTime, loginEndTime, allowHomeLogin } = req.body;
    if (!name || !email || !role || !password) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    let employeeId;
    if (noEmployeeId !== true) {
      employeeId = await generateEmployeeId(Employee, User);
    }
    const finalRoles = Array.isArray(roles) && roles.length > 0 ? roles : [role];
    const finalRole = getHighestRole(finalRoles);

    const user = await User.create({
      name,
      email,
      employeeId,
      role: finalRole,
      roles: finalRoles,
      isWFH: isWFH || false,
      password,
      loginStartTime,
      loginEndTime,
      allowHomeLogin
    });

    await createLog({
      type: 'create', user: req.user._id, userName: req.user.name,
      role: req.user.role, action: `Created user: ${name} (${employeeId})`,
      target: user._id.toString(), ip: req.ip,
    });

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
};

// PUT /api/users/:id
exports.update = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const updates = { ...req.body };
    delete updates.password;

    if (updates.roles) {
      updates.role = getHighestRole(updates.roles);
    }

    let user;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    }
    if (!user) {
      user = await User.findOneAndUpdate({ employeeId: req.params.id }, updates, { new: true, runValidators: true });
    }

    if (!user) return res.status(404).json({ message: 'User not found' });

    await createLog({
      type: 'edit', user: req.user._id, userName: req.user.name,
      role: req.user.role, action: `Updated user: ${user.name}`,
      target: user._id.toString(), ip: req.ip,
    });

    res.json(user);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/users/:id
exports.remove = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    let user;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      user = await User.findByIdAndDelete(req.params.id);
    }
    if (!user) {
      user = await User.findOneAndDelete({ employeeId: req.params.id });
    }

    if (!user) return res.status(404).json({ message: 'User not found' });

    await createLog({
      type: 'delete', user: req.user._id, userName: req.user.name,
      role: req.user.role, action: `Deleted user: ${user.name} (${user.employeeId})`,
      target: user._id.toString(), ip: req.ip,
    });

    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/users/:id/status
exports.toggleStatus = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    let user;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      user = await User.findById(req.params.id);
    }
    if (!user) {
      user = await User.findOne({ employeeId: req.params.id });
    }

    if (!user) return res.status(404).json({ message: 'User not found' });

    const isCurrentlyActive = user.status !== 'Suspended';
    user.status = isCurrentlyActive ? 'Suspended' : 'Active';
    await user.save();

    await createLog({
      type: 'edit', user: req.user._id, userName: req.user.name,
      role: req.user.role, action: `${user.status === 'Active' ? 'Activated' : 'Suspended'} user: ${user.name}`,
      target: user._id.toString(), ip: req.ip,
    });

    res.json(user);
  } catch (err) {
    next(err);
  }
};

// POST /api/users/:id/reset-password
exports.resetPassword = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Only administrators can reset user passwords.' });
    }

    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const mongoose = require('mongoose');
    let user = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      user = await User.findById(req.params.id);
    }
    if (!user) {
      user = await User.findOne({ employeeId: req.params.id });
    }

    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = password;
    await user.save();

    await createLog({
      type: 'edit', user: req.user._id, userName: req.user.name,
      role: req.user.role, action: `Reset password for user: ${user.name} (${user.employeeId || 'Email-only'})`,
      target: user._id.toString(), ip: req.ip,
    });

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/recruiters - List recruiters and team leads for job assignments and workflows
exports.getRecruiters = async (req, res, next) => {
  try {
    let query = { role: { $in: ['recruiter', 'tl'] }, status: 'Active' };

    // Role-based filtering: TLs see their team members plus themselves
    if (req.user && req.user.role === 'tl') {
      const TeamMember = require('../models/TeamMember');
      const teamMembers = await TeamMember.find({
        teamLeaderId: req.user._id,
        removedAt: null,
      }).select('memberId');
      const memberIds = teamMembers.map(t => t.memberId);
      query._id = { $in: [...memberIds, req.user._id] };
    }

    const recruiters = await User.find(query).select('name email employeeId role').sort({ role: 1, name: 1 });
    res.json(recruiters);
  } catch (err) {
    next(err);
  }
};

// POST /api/users/register-face
exports.registerFace = async (req, res, next) => {
  try {
    const { faceDescriptor } = req.body;
    if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
      return res.status(400).json({ message: 'faceDescriptor array is required' });
    }
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    user.faceDescriptor = faceDescriptor;
    await user.save();

    await createLog({
      type: 'edit', user: req.user._id, userName: req.user.name,
      role: req.user.role, action: `Registered face biometric data for user: ${user.name}`,
      target: user._id.toString(), ip: req.ip,
    });

    res.json({ message: 'Biometric face registration successful', faceDescriptor: user.faceDescriptor });
  } catch (err) {
    next(err);
  }
};

// POST /api/users/reset-all-faces (Demo Reset)
exports.resetAllFaces = async (req, res, next) => {
  try {
    const User = require('../models/User');
    const result = await User.updateMany({}, { $set: { faceDescriptor: [] } });
    await createLog({
      type: 'edit', user: null, userName: 'System/Demo Reset',
      role: 'admin', action: `Reset biometric face data for all users.`,
      target: 'all_users', ip: req.ip,
    });
    res.json({ message: `Biometric face data reset for all users successfully.` });
  } catch (err) {
    next(err);
  }
};
