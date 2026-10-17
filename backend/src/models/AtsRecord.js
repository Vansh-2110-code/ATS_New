const mongoose = require('mongoose');

/**
 * AtsRecord — persists every resume scan result.
 * Append-only. Never overwritten. Rejected candidates included.
 */
const atsRecordSchema = new mongoose.Schema({

  /* ── Standard Candidate Fields ────────────────────────────── */
  jobTitle:               { type: String, default: '' },

  name:                   { type: String, required: true, trim: true },
  email:                  { type: String, trim: true, lowercase: true, default: '' },
  phone:                  { type: String, trim: true, default: '' },
  currentLocation:        { type: String, default: '' },
  preferredLocations:     { type: String, default: '' },

  totalExperience:        { type: String, default: '' },
  currentCompanyName:     { type: String, default: '' },
  currentCompanyDesignation: { type: String, default: '' },
  department:             { type: String, default: '' },
  role:                   { type: String, default: '' },
  industry:               { type: String, default: '' },
  keySkills:              { type: String, default: '' },   // comma-separated
  annualSalary:           { type: String, default: '' },
  noticePeriod:           { type: String, default: '' },

  resumeHeadline:         { type: String, default: '' },
  summary:                { type: String, default: '' },

  // Education — UG
  ugDegree:               { type: String, default: '' },
  ugSpecialization:       { type: String, default: '' },
  ugInstitute:            { type: String, default: '' },
  ugGraduationYear:       { type: String, default: '' },

  // Education — PG
  pgDegree:               { type: String, default: '' },
  pgSpecialization:       { type: String, default: '' },
  pgInstitute:            { type: String, default: '' },
  pgGraduationYear:       { type: String, default: '' },

  // Education — Doctorate
  doctorateDegree:        { type: String, default: '' },
  doctorateSpecialization:{ type: String, default: '' },
  doctorateInstitute:     { type: String, default: '' },
  doctorateGraduationYear:{ type: String, default: '' },

  gender:                 { type: String, default: '' },
  maritalStatus:          { type: String, default: '' },
  homeTownCity:           { type: String, default: '' },
  pinCode:                { type: String, default: '' },
  workPermitUSA:          { type: String, default: '' },
  dateOfBirth:            { type: String, default: '' },
  permanentAddress:       { type: String, default: '' },

  /* ── ATS-Specific Fields ─────────────────────────────────── */
  atsScore:               { type: Number, default: 0 },
  atsStatus: {
    type: String,
    enum: ['Selected', 'Shortlisted', 'Rejected (ATS Low Score)', 'Not Processed'],
    default: 'Not Processed',
  },
  matchedSkills:          { type: String, default: '' },   // comma-separated
  missingSkills:          { type: String, default: '' },   // comma-separated
  keywordMatchPct:        { type: Number, default: 0 },
  experienceMatchScore:   { type: Number, default: 0 },
  educationMatchScore:    { type: Number, default: 0 },
  resumeQualityScore:     { type: Number, default: 0 },

  scanDate:               { type: Date,   default: Date.now },
  scannedBy:              { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  scannedByName:          { type: String, default: '' },
  scannedByRole:          { type: String, default: '' },    // recruiter/tl/manager/admin
  source:                 { type: String, default: 'Upload' }, // Upload / Walk-in / Bulk Import
  remarks:                { type: String, default: '' },

  /* ── Reusability Flag ─────────────────────────────────────── */
  reusable:               { type: Boolean, default: true },

  /* ── Link to Candidate record (if later added) ───────────── */
  candidateRef:           { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', default: null },
  resumePath:             { type: String, default: '' },
  resumeOriginalName:     { type: String, default: '' },

}, { timestamps: true });

// Indexes for fast filtering
atsRecordSchema.index({ atsScore: 1 });
atsRecordSchema.index({ atsStatus: 1 });
atsRecordSchema.index({ scanDate: -1 });
atsRecordSchema.index({ email: 1 });
atsRecordSchema.index({ scannedByRole: 1 });

module.exports = mongoose.model('AtsRecord', atsRecordSchema);
