const mongoose = require('mongoose');

const CANDIDATE_STATUSES = [
  // Official Statuses
  'Eligible', 'Not Eligible', 'Not Interested', 'No Response', 'Duplicate-Client', 'Call Back',
  'Hold', 'Hotlist', 'Hot List', 'Submitted To Client', 'Submitted to Client', 'Sublitted To Client', 'Walkin Company', 'Walkin WHM',
  'No Show', 'VNA Select', 'VNA Reject', 'Test Select', 'Test Reject',
  'Candidate Drop Post L1 Select', 'Candidate Drop Post L2 Select',
  'Candidate Drop During Final Stage', 'L1 Select', 'L1 Reject', 'L2 Select',
  'L2 Reject', 'Final Select', 'Final Reject', 'Document Initialized',
  'Documennt Initialted', 'Documentation Completed', 'Documentation Incomplete',
  'Waiting for Offer', 'Offer Accept', 'Offer Reject', 'Joined',
  'Joined and Abort', 'Black List',

  // Legacy Statuses (for backward compatibility)
  'Contacted', 'Interested', 'Selected for Call', 'Screening',
  'Interview Scheduled', 'Selected', 'Rejected', 'Eligible Candidates',
  'Wrong Number', 'Unreachable', 'Did Not Pick', 'Unanswered Calls',
  'HR Shortlist', 'Written Test', 'Operations Round', 'Document Pending',
  'Documentation', 'Yet To Join', 'Walk-in Submitted', 'Exited', 'New'
];


const SOURCES = [
  'Naukri', 'LinkedIn', 'Indeed', 'Walk-In', 'Referral',
  'Monster', 'Company Website', 'Social Media', 'Shine', 'Job Fair', 'Other'
];

const FIRST_CALL_STATUSES = [
  'No response', 'Not reachable', 'Call back scheduled', 'Screening in Progress',
  'Eligible', 'SPOC Shortlisted',
  'Rejected – Communication', 'Rejected – Experience Mismatch',
  'Rejected – Salary Mismatch', 'Rejected – Location Constraint',
  'Rejected – Notice Period',
  'On Hold', 'Duplicate Profile', 'Not Interested',
  'Interview Scheduled', 'Interview Completed',
  'Selected', 'Offer Released', 'Offer Accepted', 'Offer Declined', 'Joined', 'Other'
];

const INTERVIEW_STATUSES = [
  'Interview Scheduled', 'Interview Rescheduled', 'Interview Completed',
  'Interview Feedback Pending', 'Shortlisted', 'Rejected – Interview Round',
  'On Hold', 'HR Round Scheduled'
];

const FINAL_ROUND_STATUSES = ['Final Round Scheduled'];

const FINAL_INTERVIEW_STATUSES = ['Selected', 'Rejected', 'On Hold'];

const POST_OFFER_STATUSES = [
  'Offer in Progress', 'Offer Approval Pending', 'Offer Released',
  'Offer Accepted', 'Offer Declined', 'Salary Negotiation in Progress',
  'Documents Pending', 'Background Verification Initiated',
  'Background Verification Cleared', 'Background Verification Failed',
  'Joining Date Confirmed', 'Joining Postponed'
];

const INTERVIEW_TYPES_ENUM = [
  'Virtual', 'Walk-in Company', 'Walk-in WHM', 'Video Call', 'Phone Call', 'Face2Face'
];

const SECOND_CALL_STATUSES = [
  'Not Reachable', 'Call Back Scheduled', 'Screening in Progress',
  'Eligible – Second Round', 'SPOC Follow-up', 'Not Interested',
  'Rejected – Second Round', 'On Hold', 'Interview Confirmed',
  'Offer Discussion', 'Other'
];

const DOCUMENT_TYPES = [
  'Resume', 'Aadhar Card', 'PAN Card', 'Passport',
  'Educational Certificate', 'Experience Letter',
  'Salary Slip', 'Offer Letter', 'Bank Details / Cancelled Cheque', 'Photograph', 'Other'
];

const noteSchema = new mongoose.Schema({
  text: { type: String, required: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  addedByName: { type: String },
  followUpDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

const candidateSchema = new mongoose.Schema({
  candidateId: { type: String, unique: true, sparse: true, trim: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, required: true, trim: true },
  altPhone: { type: String, trim: true },
  skills: [{ type: String, trim: true }],
  experience: { type: String, trim: true },
  currentCTC: { type: String, trim: true },
  expectedCTC: { type: String, trim: true },
  noticePeriod: { type: String, trim: true },
  location: { type: String, trim: true },
  currentLocation: { type: String, trim: true },
  city: { type: String, trim: true },
  localArea: { type: String, trim: true },
  source: { type: String, default: 'Other' },
  linkedin: { type: String, trim: true },
  portfolio: { type: String, trim: true },
  status: { type: String, enum: CANDIDATE_STATUSES, default: 'Eligible' },
  exitDate: { type: Date },
  resumePath: { type: String },
  resumeOriginalName: { type: String },
  notes: [noteSchema],
  flagged: { type: Boolean, default: false },
  flagReason: { type: String },
  assignedRecruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedRecruiterName: { type: String },
  isWalkIn: { type: Boolean, default: false },
  walkinId: { type: mongoose.Schema.Types.ObjectId, ref: 'WalkIn' }, // Link to WalkIn auth record
  walkInToken: { type: String },
  walkinReferenceId: { type: String }, // Reference ID for walk-in candidate tracking
  positionApplied: { type: String, trim: true },
  interviewScheduled: { type: Date },
  appliedViaPublic: { type: Boolean, default: false },

  // Candidate Flags
  isBlacklisted: { type: Boolean, default: false },
  rehireEligible: { type: Boolean, default: true },
  candidateActiveStatus: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  isPriority: { type: Boolean, default: false },
  isDuplicate: { type: Boolean, default: false },
  duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' },

  // Ownership & 30-Day Validity
  ownershipStatus: { 
    type: String, 
    enum: ['Assigned', 'Expired', 'Unassigned', 'General Data'], 
    default: 'Assigned' 
  },
  assignedAt: { type: Date, default: Date.now },

  // Pipeline Stage
  currentStage: { type: String, enum: ['Applied', 'Screening', 'Interview', 'Offer', 'Joining'], default: 'Applied' },
  stageHistory: [{
    stage: String,
    subStatus: String,
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String,
  }],

  // Detailed Status Fields
  screenerStatus: { type: String },
  firstCallStatus: { type: String },
  firstCallOtherReason: { type: String },   // Used when firstCallStatus === 'Other'
  firstCallDate: { type: Date },
  firstCallTime: { type: String },
  firstCallEmail: { type: String, trim: true },
  firstCallSubmitted: { type: Boolean, default: false },  // Locks form after first call
  candidateContacted: { type: Boolean, default: false },  // Have you spoken to the candidate?
  finalDetailsSubmitted: { type: Boolean, default: false }, // Locks Candidate Final Details
  
  // Missing fields for First Call & Final Details
  firstCallInterviewType: { type: String },
  callBack: { type: String }, // Stored as string for simplicity or Date
  candidateAge: { type: String },
  recruiterStatus: { type: String },

  interviewStatus: { type: String },
  finalRoundStatus: { type: String },       // Team Leader only
  finalInterviewStatus: { type: String, enum: FINAL_INTERVIEW_STATUSES },
  finalInterviewLocked: { type: Boolean, default: false }, // Locked after TL submits

  postOfferStatus: { type: String },
  candidateStatusPostOffer: { type: String }, // Used by AddCandidatePage
  scheduledDate: { type: Date },            // Used by AddCandidatePage
  finalSelectDate: { type: Date },          // Used by AddCandidatePage
  finalInterviewSlotStatus: { type: String }, // Used by AddCandidatePage
  offeredDate: { type: Date },              // Used by AddCandidatePage
  designationOffered: { type: String },     // Used by AddCandidatePage
  joiningSalary: { type: String },          // Used by AddCandidatePage
  placementPercentage: { type: Number },
  revenueGenerated: { type: Number },
  dateOfJoining: { type: Date },           // Used by AddCandidatePage

  // Rejection Reason
  rejectionReason: { type: String },

  // JR auto-fill fields
  jrNumber: { type: String },
  clientName: { type: String },
  division: { type: String, enum: ['IT', 'BPO', 'Lateral'], default: 'BPO' },
  sourcedBy: { type: String },
  sourceStatus: { type: String, enum: ['Active', 'Non-Active'], default: 'Active' },

  // Recruiter assignment change tracking
  recruiterChangedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recruiterChangedAt: { type: Date },
  recruiterChangedByName: { type: String },

  // Assessment tests (up to 6)
  assessmentTests: [{
    testName: { type: String },
    questionsFile: { type: String },
    answersFile: { type: String },
    candidateResponseFile: { type: String },
    score: { type: Number },
    result: { type: String, enum: ['Selected', 'Rejected', 'Pending'], default: 'Pending' },
    evaluatedAt: { type: Date },
  }],

  // Offer Details
  offerDetails: {
    offeredDate: Date,
    designationOffered: String,
    joiningSalary: String,
    dateOfJoining: Date,
    offerStatus: String,
    offeredCTC: { type: Number, default: 0 },
    placementPercentage: { type: Number, default: 8.33 },
    revenueGenerated: { type: Number, default: 0 },
  },

  // Recruiter Status Section
  walkInSchedule: { type: Date },
  tentativeDOJ: { type: Date },
  clientCandidateId: { type: String },
  candidateEmployeeId: { type: String },

  // Interview Details
  interviewDate: { type: Date },
  interviewTime: { type: String },
  interviewCallBackDate: { type: Date },
  communicationRating: { type: String },
  eligibleRole: { type: String },

  // Scoring
  communicationScore: { type: Number, default: 0 },
  experienceScore: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 },

  // Ownership
  assignedSPOC: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedInterviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Additional Fields
  gender: { type: String },
  dateOfBirth: { type: Date },
  university: { type: String },
  yearOfGraduation: { type: String },
  qualification: { type: String },
  currentCompany: { type: String },
  interviewType: { type: String },
  jobOpeningSource: { type: String },
  currentSubLocation: { type: String },
  preferredLocation: { type: String },
  joiningAvailability: { type: String },
  comments: { type: String },
  finalSelectedDate: { type: Date },

  // Second Call (Team Leader stage)
  secondCallStatus: { type: String },
  secondCallNotes: { type: String },
  secondCallDate: { type: Date },
  secondCallTime: { type: String },
  secondCallEmail: { type: String, trim: true },
  tlCallSubmitted: { type: Boolean, default: false },

  // Inactivity tracking
  lastContactDate: { type: Date },
  inactiveSince: { type: Date },
  inactiveReason: { type: String },

  // Reassignment request (recruiter → admin)
  reassignRequested: { type: Boolean, default: false },
  reassignRequestedAt: { type: Date },
  reassignRequestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reassignRequestedByName: { type: String },
  reassignRequestNote: { type: String },

  // ─── Education: Post Graduation ─────────────────────────────────
  pgDegree: { type: String, trim: true },
  pgSpecialization: { type: String, trim: true },
  pgUniversity: { type: String, trim: true },
  pgGraduationYear: { type: String, trim: true },

  // ─── Education: Doctorate ────────────────────────────────────────
  doctorateDegree: { type: String, trim: true },
  doctorateSpecialization: { type: String, trim: true },
  doctorateUniversity: { type: String, trim: true },
  doctorateGraduationYear: { type: String, trim: true },

  // ─── Additional Personal Details ─────────────────────────────────
  maritalStatus: { type: String, trim: true },
  homeTownCity: { type: String, trim: true },
  pinCode: { type: String, trim: true },
  usaWorkPermit: { type: String, trim: true }, // Changed to string to handle 'Need H1 Visa', 'Yes', 'No', etc.
  permanentAddress: { type: String, trim: true },
  resumeHeadline: { type: String, trim: true },
  dateOfApplication: { type: String, trim: true },
  currentRole: { type: String, trim: true },
  ugSpecialization: { type: String, trim: true },

  // ─── Company & Department Info ──────────────────────────────────
  department: { type: String, trim: true },
  industry: { type: String, trim: true },
  companySize: { type: String, trim: true },

  // ─── Import Tracking ────────────────────────────────────────────
  importedFrom: {
    type: String,
    enum: ['Excel', 'Resume', 'Manual', 'Walk-In'],
    default: 'Manual'
  },
  importedAt: { type: Date },
  importedByName: { type: String },
  importBatchId: { type: String }, // Group records from same bulk import
  externalId: { type: String }, // Original ID from external system

  // ─── Field Control Metadata (for admin panel) ───────────────────
  fieldVisibility: {
    hidden: [String],     // Hidden fields
    readonly: [String],   // Read-only fields
    mandatory: [String]   // Mandatory fields
  },

  // Documents (Admin only)
  documents: [{
    docType: {
      type: String,
      enum: DOCUMENT_TYPES,
      required: true,
    },
    filePath: { type: String, required: true },
    fileName: { type: String },
    fileSize: { type: Number },
    status: { type: String, enum: ['Pending', 'Submitted', 'Verified'], default: 'Submitted' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedByName: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedByName: { type: String },
  }],
}, { timestamps: true });

candidateSchema.index({ name: 'text', email: 'text', phone: 'text', skills: 'text' });
candidateSchema.index({ status: 1 });
candidateSchema.index({ source: 1 });
candidateSchema.index({ city: 1 });
candidateSchema.index({ localArea: 1 });
candidateSchema.index({ assignedRecruiter: 1 });
candidateSchema.index({ flagged: 1 });
candidateSchema.index({ createdAt: -1 });
candidateSchema.index({ isDuplicate: 1 });
candidateSchema.index({ currentStage: 1 });
candidateSchema.index({ candidateActiveStatus: 1 });
candidateSchema.index({ importBatchId: 1 });
candidateSchema.index({ importedFrom: 1 });
candidateSchema.index({ importedAt: -1 });

// ─── Auto-calculate age and assign Candidate ID ───────────────────
candidateSchema.pre('save', async function(next) {
  if (this.isNew && !this.candidateId) {
    try {
      const { generateCandidateId } = require('../utils/helpers');
      this.candidateId = await generateCandidateId(this.constructor);
    } catch (err) {
      console.error('Failed to generate candidate ID:', err);
    }
  }

  if (this.dateOfBirth && !this.candidateAge) {
    const today = new Date();
    const dob = new Date(this.dateOfBirth);
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    // Adjust if birthday hasn't occurred this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    if (age >= 0) {
      this.candidateAge = age;
    }
  }

  // Automatic workflow movement
  if (this.isModified('status')) {
    const s = this.status;
    if (['Shortlisted', 'Screening'].includes(s)) this.currentStage = 'Screening';
    else if (['Interview', 'Selected'].includes(s)) this.currentStage = 'Interview';
    else if (['Offered'].includes(s)) this.currentStage = 'Offer';
    else if (['Joined', 'Joining', 'Yet To Join', 'Joining Date Confirmed', 'Joining Postponed'].includes(s)) this.currentStage = 'Joining';
  }

  next();
});

// ─── Post-save: Auto-sync Candidate details to AtsRecord collection ───

// Auto-calculate revenueGenerated on save
candidateSchema.pre('save', function(next) {
  if (this.joiningSalary && this.placementPercentage) {
    this.revenueGenerated = (parseFloat(this.joiningSalary) || 0) * (parseFloat(this.placementPercentage) || 0) / 100;
  }
  next();
});

// Auto-calculate revenueGenerated on update (handles both $set and plain object updates)
candidateSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  // Mongoose wraps plain objects in $set by default
  const setObj = (update && update.$set) ? update.$set : update;
  if (setObj && setObj.joiningSalary && setObj.placementPercentage) {
    const salary = parseFloat(setObj.joiningSalary) || 0;
    const pct = parseFloat(setObj.placementPercentage) || 0;
    const revenue = salary * pct / 100;
    if (update.$set) {
      update.$set.revenueGenerated = revenue;
    } else {
      update.revenueGenerated = revenue;
    }
  }
  next();
});

candidateSchema.post('save', async function(doc) {
  try {
    const AtsRecord = require('./AtsRecord');

    // Sync only if candidate has an email or phone to prevent empty profiles
    const criteria = [];
    if (doc.email) criteria.push({ email: doc.email });
    if (doc.phone) criteria.push({ phone: doc.phone });

    if (criteria.length === 0) return;

    // Check if an AtsRecord already exists
    const existing = await AtsRecord.findOne({ $or: criteria });

    const recordData = {
      name: doc.name,
      email: doc.email || '',
      phone: doc.phone || '',
      currentLocation: doc.currentLocation || doc.city || '',
      totalExperience: doc.experience || '',
      currentCompanyName: doc.currentCompany || '',
      currentCompanyDesignation: doc.positionApplied || '',
      keySkills: Array.isArray(doc.skills) ? doc.skills.join(', ') : (doc.skills || ''),
      atsScore: doc.totalScore || 0,
      scannedBy: doc.assignedRecruiter || undefined,
      scannedByName: doc.assignedRecruiterName || '',
      source: doc.source || 'Manual',
      remarks: doc.comments || '',
      candidateRef: doc._id,
    };

    // Classify status mapping
    if (doc.status === 'Selected') {
      recordData.atsStatus = 'Selected';
    } else if (doc.status === 'Rejected') {
      recordData.atsStatus = 'Rejected (ATS Low Score)';
    } else if (existing && existing.atsStatus) {
      recordData.atsStatus = existing.atsStatus;
    } else {
      recordData.atsStatus = 'Not Processed';
    }

    // Classify education mapping
    if (doc.qualification) {
      recordData.ugDegree = doc.qualification;
    }
    if (doc.pgDegree) {
      recordData.pgDegree = doc.pgDegree;
      recordData.pgSpecialization = doc.pgSpecialization || '';
      recordData.pgInstitute = doc.pgUniversity || '';
      recordData.pgGraduationYear = doc.pgGraduationYear || '';
    }
    if (doc.doctorateDegree) {
      recordData.doctorateDegree = doc.doctorateDegree;
      recordData.doctorateSpecialization = doc.doctorateSpecialization || '';
      recordData.doctorateInstitute = doc.doctorateUniversity || '';
      recordData.doctorateGraduationYear = doc.doctorateGraduationYear || '';
    }

    if (existing) {
      await AtsRecord.findByIdAndUpdate(existing._id, { $set: recordData });
    } else {
      await AtsRecord.create(recordData);
    }
  } catch (err) {
    console.error('Failed to auto-sync candidate to ATS database:', err.message);
  }
});

candidateSchema.statics.STATUSES = CANDIDATE_STATUSES;
candidateSchema.statics.SOURCES = SOURCES;
candidateSchema.statics.FIRST_CALL_STATUSES = FIRST_CALL_STATUSES;
candidateSchema.statics.INTERVIEW_STATUSES = INTERVIEW_STATUSES;
candidateSchema.statics.FINAL_ROUND_STATUSES = FINAL_ROUND_STATUSES;
candidateSchema.statics.FINAL_INTERVIEW_STATUSES = FINAL_INTERVIEW_STATUSES;
candidateSchema.statics.POST_OFFER_STATUSES = POST_OFFER_STATUSES;
candidateSchema.statics.INTERVIEW_TYPES = INTERVIEW_TYPES_ENUM;
candidateSchema.statics.SECOND_CALL_STATUSES = SECOND_CALL_STATUSES;
candidateSchema.statics.DOCUMENT_TYPES = DOCUMENT_TYPES;

module.exports = mongoose.model('Candidate', candidateSchema);
