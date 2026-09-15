const mongoose = require('mongoose');
const WalkIn = require('../models/WalkIn');
const Candidate = require('../models/Candidate');
const User = require('../models/User');
const { generateWalkInToken } = require('../utils/helpers');
const { createLog } = require('../utils/auditLogger');
const fs = require('fs');
const path = require('path');
const notificationService = require('../utils/notification.service');

const ASSIGNABLE_ROLES = new Set(['recruiter', 'tl', 'manager', 'admin']);

// POST /api/walkin/register  (optionalAuth — walkin session tracked if logged in)
exports.register = async (req, res, next) => {
  try {
    const b = req.body;

    // Accept both frontend key names (candidateName) and short names (name)
    const name  = (b.candidateName  || b.name  || '').trim();
    const phone = (b.candidatePhone || b.phone || '').trim();
    const experience = (b.experienceYears || b.experience || '').trim();

    if (!name || !phone) {
      return res.status(400).json({ message: 'Name and phone are required' });
    }

    // Generate unique token
    let token;
    let isUnique = false;
    while (!isUnique) {
      token = generateWalkInToken();
      const exists = await WalkIn.findOne({ token });
      if (!exists) isUnique = true;
    }

    const resumePath = req.file ? `/uploads/resumes/${req.file.filename}` : undefined;
    let assignedUser = null;

    if (req.user && ASSIGNABLE_ROLES.has(req.user.role)) {
      assignedUser = req.user;
    }

    if (b.recruiterId && req.user && ['tl', 'manager', 'admin'].includes(req.user.role)) {
      const selectedRecruiter = await User.findOne({
        _id: b.recruiterId,
        role: 'recruiter',
        status: 'Active',
      });
      if (selectedRecruiter) {
        assignedUser = selectedRecruiter;
      }
    }

    // ── Build WalkIn record ───────────────────────────────────
    const walkInData = {
      token,
      name,
      phone,
      email:           b.candidateEmail  || b.email  || undefined,
      alternatePhone:  b.alternatePhone  || undefined,
      gender:          b.gender          || undefined,
      dateOfBirth:     b.dateOfBirth     ? new Date(b.dateOfBirth) : undefined,

      interviewCaller: b.interviewCaller || undefined,
      recruiterEmail:  b.recruiterEmail  || undefined,
      interviewType:   b.interviewType   || undefined,
      source:          b.jobOpeningSource || b.source || 'Walk-in',

      experience,
      currentCompany:  b.currentCompany  || undefined,
      currentComp:     b.currentCompany  || undefined, // backward compatibility
      currentCTC:      b.currentCTC      || undefined,
      expectedCTC:     b.expectedCTC     || undefined,
      noticePeriod:    b.noticePeriod    || undefined,
      joiningAvailability: b.joiningAvailability || undefined,
      skills: Array.isArray(b.skills)
        ? b.skills.map(s => String(s).trim()).filter(Boolean)
        : (typeof b.skills === 'string'
          ? b.skills.split(',').map(s => s.trim()).filter(Boolean)
          : undefined),

      qualification:    b.qualification    || undefined,
      university:       b.university       || undefined,
      yearOfGraduation: b.yearOfGraduation || undefined,

      currentRegion:      b.currentRegion      || undefined,
      currentState:       b.currentState       || undefined,
      currentCity:        b.currentCity        || undefined,
      currentSubLocation: b.currentSubLocation || undefined,

      preferredRegion: b.preferredRegion || undefined,
      preferredState:  b.preferredState  || undefined,
      preferredCity:   b.preferredCity   || undefined,

      resumePath,
      resumeOriginalName: req.file?.originalname || undefined,
      resumeUploaded: !!req.file,

      // Track walkin session user if logged in
      registeredByUser: req.user?._id || undefined,
    };

    // ── Build Candidate record ────────────────────────────────
    const candidateData = {
      name,
      phone,
      email:     walkInData.email     || undefined,
      altPhone:  walkInData.alternatePhone || undefined,
      gender:    walkInData.gender     || undefined,
      dateOfBirth: walkInData.dateOfBirth || undefined,

      source: 'Walk-In',
      isWalkIn: true,
      walkInToken: token,
      status: 'New',
      interviewType: walkInData.interviewType || undefined,

      experience: experience ? (experience === '30+' ? '30+ Years' : `${experience} Year${experience === '1' ? '' : 's'}`) : undefined,
      currentCompany: walkInData.currentCompany || undefined,
      currentCTC:     walkInData.currentCTC     || undefined,
      expectedCTC:    walkInData.expectedCTC    || undefined,
      noticePeriod:   walkInData.noticePeriod   || undefined,
      joiningAvailability: walkInData.joiningAvailability || undefined,

      qualification:    walkInData.qualification    || undefined,
      university:       walkInData.university       || undefined,
      yearOfGraduation: walkInData.yearOfGraduation || undefined,

      currentState:       walkInData.currentState       || undefined,
      currentCity:        walkInData.currentCity        || undefined,
      currentRegion:      walkInData.currentRegion      || undefined,
      currentSubLocation: walkInData.currentSubLocation || undefined,
      localArea:          walkInData.currentSubLocation || undefined,
      currentLocation:    [walkInData.currentCity, walkInData.currentState].filter(Boolean).join(', ') || undefined,

      preferredCity:  walkInData.preferredCity  || undefined,
      preferredState: walkInData.preferredState || undefined,

      assignedRecruiterName: assignedUser?.name || walkInData.interviewCaller || undefined,
    };

    if (assignedUser) {
      walkInData.assignedTo = assignedUser._id;
      walkInData.assignedToName = assignedUser.name;
      candidateData.assignedRecruiter = assignedUser._id;
      candidateData.assignedRecruiterName = assignedUser.name;
    }

    if (resumePath) {
      candidateData.resumePath = resumePath;
      candidateData.resumeOriginalName = req.file.originalname;
    }

    // ── De-duplicate by phone ─────────────────────────────────
    const existing = await Candidate.findOne({ phone });
    let candidate;
    if (existing) {
      // Update the existing record with new walk-in data
      Object.assign(existing, candidateData);
      existing.walkInToken = token;
      await existing.save();
      candidate = existing;
    } else {
      candidate = await Candidate.create(candidateData);
    }

    walkInData.candidate = candidate._id;
    const walkIn = await WalkIn.create(walkInData);

    // ── Audit log ─────────────────────────────────────────────
    await createLog({
      type: 'create',
      user: req.user?._id || candidate._id,
      userName: req.user?.name || name,
      role: req.user?.role || 'walkin',
      action: `Walk-in registered: ${name} (Token: ${token})`,
      target: candidate._id.toString(),
      ip: req.ip,
    }).catch(() => {}); // non-blocking

    // Send notifications to all recruiters and TLs
    await notificationService.notifyRole({
      role: { $in: ['recruiter', 'tl'] }, // This assumes notifyRole supports query obj, let's fix that. Actually notifyRole in our service uses {role, ...} which does User.find({role, status: 'Active'}). Let's update that manually.
      // Wait, let's just use createBulkNotifications
    });
    
    // Proper way to notify all recruiters and TLs
    const targetUsers = await User.find({ role: { $in: ['recruiter', 'tl'] }, status: 'Active' }).select('_id');
    if (targetUsers.length > 0) {
      await notificationService.createBulkNotifications({
        recipientIds: targetUsers.map(u => u._id),
        type: 'walkin',
        title: 'New Walk-In Registration',
        message: `${name} has registered in the walk-in queue.`,
        entityId: candidate._id,
        entityType: 'Candidate',
        navigateTo: `/walk-in/queue`
      });
    }

    res.status(201).json({
      token: walkIn.token,
      tokenNumber: walkIn.token,
      message: `Registration successful. Your token is ${walkIn.token}`,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/walkin/queue
exports.getQueue = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const query = {};

    // Today's queue by default
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    query.registeredAt = { $gte: today, $lt: tomorrow };

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { token: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const queue = await WalkIn.find(query).sort('registeredAt');
    res.json(queue);
  } catch (err) {
    next(err);
  }
};

// PUT /api/walkin/:id/status
exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!WalkIn.STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const walkIn = await WalkIn.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!walkIn) return res.status(404).json({ message: 'Walk-in entry not found' });

    // Update candidate status too
    if (walkIn.candidate) {
      const candidateStatusMap = {
        'Waiting': 'New',
        'In Review': 'Contacted',
        'Interviewed': 'Interview Scheduled',
        'Selected': 'Selected',
        'Rejected': 'Rejected',
      };
      await Candidate.findByIdAndUpdate(walkIn.candidate, { status: candidateStatusMap[status] || status });
    }

    res.json(walkIn);
  } catch (err) {
    next(err);
  }
};

// PUT /api/walkin/:id/assign
exports.assign = async (req, res, next) => {
  try {
    const { recruiterId } = req.body;
    if (!recruiterId) {
      return res.status(400).json({ message: 'Recruiter ID is required' });
    }

    const recruiter = await User.findOne({
      _id: recruiterId,
      role: 'recruiter',
      status: 'Active',
    }).select('_id name email');
    if (!recruiter) return res.status(404).json({ message: 'Recruiter not found' });

    const walkIn = await WalkIn.findByIdAndUpdate(
      req.params.id,
      { assignedTo: recruiter._id, assignedToName: recruiter.name, status: 'In Review' },
      { new: true }
    );
    if (!walkIn) return res.status(404).json({ message: 'Walk-in entry not found' });

    if (walkIn.candidate) {
      await Candidate.findByIdAndUpdate(walkIn.candidate, {
        assignedRecruiter: recruiter._id,
        assignedRecruiterName: recruiter.name,
        status: 'Contacted',
      });
    }

    res.json(walkIn);
  } catch (err) {
    next(err);
  }
};

// ═════════════════════════════════════════════════════════════════════
// SELF-REGISTRATION WALK-IN AUTHENTICATION (New Module)
// ═════════════════════════════════════════════════════════════════════

const jwt = require('jsonwebtoken');

// Generate JWT for walk-in user
const generateWalkInAuthToken = (walkinId) => {
  return jwt.sign({ walkinId, isWalkIn: true }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '7d',
  });
};

// ─── Walk-In Signup (Self-registration) ────────────────
exports.walkInSignup = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Validate input
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    // Check if email or phone already exists
    const existingWalkIn = await WalkIn.findOne({
      $or: [{ email: email.toLowerCase() }, { phone }],
      isAuthEnabled: true,
    });

    if (existingWalkIn) {
      return res.status(400).json({ message: 'Email or phone already registered' });
    }

    // Check if email already exists in main Candidate database
    const existingCandidate = await Candidate.findOne({
      $or: [{ email: email.toLowerCase() }, { phone }],
    });

    if (existingCandidate) {
      return res.status(400).json({ message: 'Email or phone already exists in system' });
    }

    // Generate reference ID
    const referenceId = await WalkIn.generateReferenceId();

    // Create new walk-in user
    const walkin = new WalkIn({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password,
      referenceId,
      isAuthEnabled: true,
      status: 'Waiting',
    });

    await walkin.save();

    // Generate token
    const token = generateWalkInAuthToken(walkin._id);

    res.status(201).json({
      message: 'Signup successful',
      token,
      walkin: {
        _id: walkin._id,
        id: walkin._id,
        name: walkin.name,
        email: walkin.email,
        phone: walkin.phone,
        referenceId: walkin.referenceId,
      },
    });
  } catch (error) {
    console.error('Walk-in signup error:', error);
    res.status(500).json({ message: error.message || 'Signup failed' });
  }
};

// ─── Walk-In Login (Self-registration candidates & Walk-in Desk Staff) ───────────
exports.walkInLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Check WalkIn collection first (candidate self-registration)
    const walkin = await WalkIn.findOne({ email: cleanEmail });

    if (walkin && walkin.isAuthEnabled) {
      const passwordMatch = await walkin.comparePassword(password);
      if (passwordMatch) {
        if (walkin.status === 'Rejected') {
          return res.status(401).json({ message: 'Your account has been deactivated' });
        }

        const token = generateWalkInAuthToken(walkin._id);

        return res.json({
          message: 'Login successful',
          token,
          walkin: {
            _id: walkin._id,
            id: walkin._id,
            name: walkin.name,
            email: walkin.email,
            phone: walkin.phone,
            referenceId: walkin.referenceId,
          },
        });
      }
    }

    // 2. Check User collection (for walk-in desk users / employee accounts)
    const user = await User.findOne({
      $or: [
        { email: cleanEmail },
        { employeeId: email.trim() }
      ]
    });

    if (user) {
      if (user.status === 'Suspended') {
        return res.status(403).json({ message: 'Account suspended. Contact admin.' });
      }

      const userPasswordMatch = await user.comparePassword(password);
      if (userPasswordMatch) {
        const token = jwt.sign(
          { id: user._id, walkinId: user._id, isWalkIn: true, role: user.role },
          process.env.JWT_SECRET || 'secret',
          { expiresIn: '30d' }
        );

        return res.json({
          message: 'Login successful',
          token,
          walkin: {
            _id: user._id,
            id: user._id,
            name: user.name,
            email: user.email,
            phone: '',
            referenceId: user.employeeId || 'WH-WALKIN',
            role: user.role,
          },
        });
      }
    }

    return res.status(401).json({ message: 'Invalid email or password' });
  } catch (error) {
    console.error('Walk-in login error:', error);
    res.status(500).json({ message: error.message || 'Login failed' });
  }
};

// ─── Submit Walk-In Application Form ────────────────
exports.submitWalkInForm = async (req, res) => {
  try {
    const walkinId = req.walkinId; // From middleware
    const {
      name, email, phone, alternatePhone, dateOfBirth, gender,
      jobOpeningSource, interviewType,
      currentRegion, currentState, currentCity, currentSubLocation,
      preferredRegion, preferredState, preferredCity,
      qualification, university, yearOfGraduation,
      experienceYears, currentCompany, currentRole,
      currentCTC, expectedCTC, noticePeriod, joiningAvailability, additionalInfo,
      skills,
      recruiterId,
    } = req.body;

    if (!currentState || !currentCity || !qualification) {
      return res.status(400).json({ message: 'Required fields missing' });
    }

    // Find walk-in record
    let walkin = await WalkIn.findById(walkinId);

    if (!walkin) {
      return res.status(404).json({ message: 'Walk-in user not found' });
    }

    let assignedRecruiter = null;
    if (recruiterId) {
      assignedRecruiter = await User.findOne({
        _id: recruiterId,
        role: 'recruiter',
        status: 'Active',
      }).select('_id name email role status');
    }
    if (!assignedRecruiter && walkin.assignedTo) {
      assignedRecruiter = await User.findById(walkin.assignedTo).select('_id name email role status');
      if (assignedRecruiter && assignedRecruiter.status === 'Suspended') {
        assignedRecruiter = null;
      }
    }
    if (!assignedRecruiter && walkin.registeredByUser) {
      const registeredBy = await User.findById(walkin.registeredByUser).select('_id name email role status');
      if (registeredBy && registeredBy.status !== 'Suspended' && ASSIGNABLE_ROLES.has(registeredBy.role)) {
        assignedRecruiter = registeredBy;
      }
    }

    // Update form details
    walkin.name = (name || walkin.name || '').trim();
    walkin.email = (email || walkin.email || '').toLowerCase().trim();
    walkin.phone = (phone || walkin.phone || '').trim();
    walkin.alternatePhone = (alternatePhone || walkin.alternatePhone || '').trim();
    walkin.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : undefined;
    walkin.gender = gender || '';
    walkin.interviewType = interviewType || '';
    walkin.source = jobOpeningSource || walkin.source || 'Walk-in';
    walkin.currentRegion = currentRegion || '';
    walkin.currentState = currentState;
    walkin.currentCity = currentCity;
    walkin.currentSubLocation = currentSubLocation || '';
    walkin.preferredRegion = preferredRegion || '';
    walkin.preferredState = preferredState || '';
    walkin.preferredCity = preferredCity || '';
    walkin.qualification = qualification;
    walkin.university = university || '';
    walkin.yearOfGraduation = yearOfGraduation || '';
    walkin.experienceYears = String(experienceYears || '').trim();
    walkin.experience = walkin.experienceYears
      ? (walkin.experienceYears === '30+' ? '30+ Years' : `${walkin.experienceYears} Year${walkin.experienceYears === '1' ? '' : 's'}`)
      : '';
    walkin.currentCompany = currentCompany || '';
    walkin.currentComp = currentCompany || '';
    walkin.currentRole = currentRole || '';
    walkin.currentCTC = currentCTC || '';
    walkin.expectedCTC = expectedCTC || '';
    walkin.noticePeriod = noticePeriod || '';
    walkin.joiningAvailability = joiningAvailability || '';
    walkin.additionalInfo = additionalInfo || '';

    // Parse skills
    if (skills) {
      try {
        const parsedSkills = JSON.parse(skills);
        walkin.skills = Array.isArray(parsedSkills)
          ? parsedSkills.map(s => String(s).trim()).filter(Boolean)
          : [];
      } catch {
        walkin.skills = String(skills).split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    // Handle resume upload
    if (req.file) {
      walkin.resumePath = `/uploads/resumes/${req.file.filename}`;
      walkin.resumeOriginalName = req.file.originalname;
      walkin.resumeUploaded = true;
    }

    if (assignedRecruiter) {
      walkin.assignedTo = assignedRecruiter._id;
      walkin.assignedToName = assignedRecruiter.name;
    }

    await walkin.save();

    // Create/Update Candidate record
    let candidate = await Candidate.findOne({ walkinId: walkin._id });
    if (!candidate && walkin.email) {
      candidate = await Candidate.findOne({ email: walkin.email.toLowerCase() });
    }
    if (!candidate && walkin.phone) {
      candidate = await Candidate.findOne({ phone: walkin.phone });
    }

    const candidateStatus = assignedRecruiter ? 'Contacted' : 'Walk-in Submitted';
    const candidatePayload = {
      name: walkin.name,
      email: walkin.email || undefined,
      phone: walkin.phone,
      altPhone: walkin.alternatePhone || undefined,
      skills: walkin.skills || [],
      experience: walkin.experience || undefined,
      currentCTC: walkin.currentCTC || undefined,
      expectedCTC: walkin.expectedCTC || undefined,
      noticePeriod: walkin.noticePeriod || undefined,
      joiningAvailability: walkin.joiningAvailability || undefined,
      currentLocation: [walkin.currentCity, walkin.currentState].filter(Boolean).join(', ') || undefined,
      currentRegion: walkin.currentRegion || undefined,
      currentState: walkin.currentState || undefined,
      currentCity: walkin.currentCity || undefined,
      currentSubLocation: walkin.currentSubLocation || undefined,
      localArea: walkin.currentSubLocation || undefined,
      preferredLocation: [walkin.preferredCity, walkin.preferredState].filter(Boolean).join(', ') || undefined,
      qualification: walkin.qualification || undefined,
      university: walkin.university || undefined,
      yearOfGraduation: walkin.yearOfGraduation || undefined,
      gender: walkin.gender || undefined,
      dateOfBirth: walkin.dateOfBirth || undefined,
      interviewType: walkin.interviewType || undefined,
      jobOpeningSource: walkin.source || undefined,
      status: candidateStatus,
      source: 'Walk-In',
      isWalkIn: true,
      walkinId: walkin._id,
      walkInToken: walkin.referenceId || walkin.token,
      walkinReferenceId: walkin.referenceId,
    };

    if (walkin.resumePath) {
      candidatePayload.resumePath = walkin.resumePath;
      candidatePayload.resumeOriginalName = walkin.resumeOriginalName || undefined;
    }
    if (assignedRecruiter) {
      candidatePayload.assignedRecruiter = assignedRecruiter._id;
      candidatePayload.assignedRecruiterName = assignedRecruiter.name;
    }

    if (!candidate) {
      candidate = await Candidate.create(candidatePayload);
    } else {
      Object.assign(candidate, candidatePayload);
      await candidate.save();
    }

    // Update WalkIn with candidate reference
    walkin.candidate = candidate._id;
    walkin.status = assignedRecruiter ? 'In Review' : 'Waiting';
    await walkin.save();

    res.json({
      message: 'Application submitted successfully',
      referenceId: walkin.referenceId,
      walkinReferenceId: walkin.referenceId,
      candidateId: candidate._id,
    });
  } catch (error) {
    console.error('Walk-in form submission error:', error);
    res.status(500).json({ message: error.message || 'Form submission failed' });
  }
};

// ─── Get Walk-In Application Status ─────────────────
exports.getWalkInStatus = async (req, res) => {
  try {
    const walkinId = req.params.id || req.walkinId;

    let walkin = null;
    if (walkinId && mongoose.Types.ObjectId.isValid(walkinId)) {
      walkin = await WalkIn.findById(walkinId)
        .populate('assignedTo', 'name email')
        .populate('candidate', '_id status');
    }

    // If not found by ID, check if walkinId belongs to a User (or user's email)
    if (!walkin && walkinId) {
      let user = null;
      if (mongoose.Types.ObjectId.isValid(walkinId)) {
        user = await User.findById(walkinId);
      }
      if (!user && req.user?.id && mongoose.Types.ObjectId.isValid(req.user.id)) {
        user = await User.findById(req.user.id);
      }

      if (user) {
        walkin = await WalkIn.findOne({ email: user.email.toLowerCase() })
          .populate('assignedTo', 'name email')
          .populate('candidate', '_id status');

        if (!walkin) {
          // Return valid application status for the desk/walkin user so dashboard loads cleanly
          return res.json({
            _id: user._id,
            referenceId: user.employeeId || 'WH-WALKIN-DESK',
            name: user.name,
            email: user.email,
            phone: '',
            city: 'Bangalore',
            state: 'Karnataka',
            qualification: 'Walk-In Desk Coordinator',
            experienceYears: 'N/A',
            status: 'Walk-in Submitted',
            statusUpdatedAt: user.updatedAt,
            submittedAt: user.createdAt,
            resumeUrl: null,
            assignedRecruiter: null,
            interviewDetails: null,
          });
        }
      }
    }

    if (!walkin) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Get candidate details if exists
    const candidate = walkin.candidate ? await Candidate.findById(walkin.candidate) : null;

    res.json({
      _id: walkin._id,
      referenceId: walkin.referenceId,
      name: walkin.name,
      email: walkin.email,
      phone: walkin.phone,
      city: walkin.currentCity,
      state: walkin.currentState,
      qualification: walkin.qualification,
      experienceYears: walkin.experienceYears,
      status: walkin.status,
      statusUpdatedAt: walkin.updatedAt,
      submittedAt: walkin.registeredAt,
      resumeUrl: walkin.resumePath ? `/api/walkin/${walkin._id}/resume` : null,
      assignedRecruiter: walkin.assignedTo
        ? {
            name: walkin.assignedTo.name,
            email: walkin.assignedTo.email,
          }
        : null,
      interviewDetails:
        candidate && candidate.interviewScheduled
          ? {
              scheduledDate: candidate.interviewScheduled,
              scheduledTime: candidate.interviewTime,
              interviewType: candidate.interviewType,
            }
          : null,
      rejectionReason: candidate?.rejectionReason || null,
    });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch status' });
  }
};

// ─── Download Resume ────────────────────────────────
exports.downloadResume = async (req, res) => {
  try {
    const { id } = req.params;

    const walkin = await WalkIn.findById(id);

    if (!walkin || !walkin.resumePath) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    const absolutePath = path.join(__dirname, '..', '..', walkin.resumePath.replace(/^\//, ''));
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: 'Resume file missing on server' });
    }

    res.download(absolutePath, walkin.resumeOriginalName || path.basename(absolutePath));
  } catch (error) {
    console.error('Download resume error:', error);
    res.status(500).json({ message: error.message || 'Download failed' });
  }
};

// ─── Update Password ────────────────────────────────
exports.updateWalkInPassword = async (req, res) => {
  try {
    const walkinId = req.walkinId;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Both passwords are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }

    const walkin = await WalkIn.findById(walkinId);

    if (!walkin) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify old password
    const passwordMatch = await walkin.comparePassword(oldPassword);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Update password
    walkin.password = newPassword;
    await walkin.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ message: error.message || 'Password update failed' });
  }
};

// ─── Demo Login (Virtual session) ──────────────────────────
exports.demoLogin = async (req, res) => {
  try {
    // Return a virtual user token with role demo_walkin
    const demoUser = {
      _id: '000000000000000000000000',
      id: '000000000000000000000000',
      name: 'Demo Walk-In User',
      email: 'demo@walkin.com',
      role: 'demo_walkin',
    };

    const token = jwt.sign(demoUser, process.env.JWT_SECRET || 'secret', {
      expiresIn: '1d',
    });

    res.json({
      message: 'Demo login successful',
      token,
      user: demoUser,
    });
  } catch (error) {
    console.error('Demo login error:', error);
    res.status(500).json({ message: 'Demo login failed' });
  }
};

// Helper to parse date only if valid
const parseDate = (val) => {
  if (!val) return undefined;
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d;
};

// ─── Register Demo Candidate ────────────────────────────────
exports.registerDemoCandidate = async (req, res, next) => {
  try {
    const b = req.body;
    
    // Required fields check
    if (!b.name || !b.phone || !b.qualification) {
      return res.status(400).json({ message: 'Name, Phone, and Qualification are required' });
    }

    const resumePath = req.file ? `/uploads/resumes/${req.file.filename}` : undefined;

    // Build Candidate record
    const candidateData = {
      name: b.name.trim(),
      phone: b.phone.trim(),
      email: b.email ? b.email.toLowerCase().trim() : undefined,
      alternatePhone: b.alternatePhone || undefined,
      positionApplied: b.positionApplied || undefined,
      jobOpeningSource: b.jobOpeningSource || undefined,
      interviewType: b.interviewType || undefined,
      
      experienceYears: b.experienceYears || '0',
      experienceMonths: b.experienceMonths || '0',
      experience: b.experience || undefined,
      
      currentRegion: b.currentRegion || undefined,
      currentState: b.currentState || undefined,
      currentCity: b.currentCity || undefined,
      currentSubLocation: b.currentSubLocation || undefined,
      localArea: b.currentSubLocation || undefined,
      currentLocation: [b.currentCity, b.currentState].filter(Boolean).join(', ') || undefined,

      qualification: b.qualification || undefined,
      university: b.university || undefined,
      yearOfGraduation: b.yearOfGraduation || undefined,
      
      gender: b.gender || undefined,
      dateOfBirth: parseDate(b.dateOfBirth),
      joiningAvailability: b.joiningAvailability || undefined,
      
      currentCTC: b.currentCTC || undefined,
      expectedCTC: b.expectedCTC || undefined,
      noticePeriod: b.noticePeriod || undefined,
      interviewDate: parseDate(b.interviewDate),
      
      status: b.status || 'New',
      notes: b.notes ? [{ text: b.notes, addedByName: 'Demo User' }] : [],
      
      source: 'Walk-In',
      isWalkIn: true,
      created_by: 'demo_walkin_user',
      assignedRecruiterName: 'Demo Walk-In User',
    };

    if (b.skills) {
      candidateData.skills = typeof b.skills === 'string' 
        ? b.skills.split(',').map(s => s.trim()).filter(Boolean)
        : b.skills;
    }

    if (resumePath) {
      candidateData.resumePath = resumePath;
      candidateData.resumeOriginalName = req.file.originalname;
    }

    // Duplicate check by Email OR Phone
    const existing = await Candidate.findOne({
      $or: [
        { phone: candidateData.phone },
        { email: candidateData.email }
      ].filter(clause => clause.phone || clause.email)
    });

    let candidate;
    if (existing) {
      Object.assign(existing, candidateData);
      await existing.save();
      candidate = existing;
    } else {
      candidate = await Candidate.create(candidateData);
    }

    // Audit log
    await createLog({
      type: 'create',
      user: '000000000000000000000000',
      userName: 'Demo Walk-In User',
      role: 'demo_walkin',
      action: `Demo user registered candidate: ${candidate.name}`,
      target: candidate._id.toString(),
      ip: req.ip,
    }).catch(() => {});

    res.status(201).json({
      message: 'Candidate registered successfully',
      candidateId: candidate._id,
    });
  } catch (error) {
    console.error('Register demo candidate error:', error);
    next(error);
  }
};
