const mongoose = require('mongoose');

const offerLetterSchema = new mongoose.Schema({
  offerNumber: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
  },
  templateKey: {
    type: String,
    enum: ['master', 'sr_recruiter', 'team_leader', 'branch_manager', 'business_developer'],
    required: true,
    default: 'master',
  },
  templateName: {
    type: String,
    required: true,
    default: 'Master Offer & Appointment Letter',
  },
  recipientType: {
    type: String,
    enum: ['candidate', 'employee', 'custom'],
    default: 'candidate',
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  recipient: {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    designation: { type: String, required: true, trim: true },
    dateOfJoining: { type: Date },
    dateOfJoiningStr: { type: String },
    reportingTo: { type: String, trim: true },
    placeOfPosting: { type: String, trim: true, default: 'Bangalore' },
  },
  terms: {
    probationMonths: { type: Number, default: 3 },
    probationNoticeDays: { type: Number, default: 30 },
    confirmedNoticeDays: { type: Number, default: 90 },
    workLocation: { type: String, trim: true, default: 'Bangalore' },
  },
  salary: {
    grossMonthly: { type: Number, default: 30000 },
    grossAnnual: { type: Number, default: 360000 },
    basicMonthly: { type: Number, default: 15000 },
    basicAnnual: { type: Number, default: 180000 },
    hraMonthly: { type: Number, default: 7500 },
    hraAnnual: { type: Number, default: 90000 },
    specialAllowanceMonthly: { type: Number, default: 7500 },
    specialAllowanceAnnual: { type: Number, default: 90000 },
    pfMonthly: { type: String, default: 'Not Applicable' },
    pfAnnual: { type: String, default: 'Not Applicable' },
    esiMonthly: { type: String, default: 'As applicable' },
    esiAnnual: { type: String, default: 'As applicable' },
    ptMonthly: { type: String, default: 'As applicable' },
    ptAnnual: { type: String, default: 'As applicable' },
    tdsMonthly: { type: String, default: 'As applicable' },
    tdsAnnual: { type: String, default: 'As applicable' },
    netSalaryEstimated: { type: String, default: 'Subject to statutory deductions' },
  },
  kpiDetails: [{
    area: { type: String, trim: true },
    measurement: { type: String, trim: true },
  }],
  customClauses: { type: String, trim: true },
  status: {
    type: String,
    enum: ['Draft', 'Issued', 'Sent', 'Accepted', 'Declined'],
    default: 'Draft',
  },
  issuedDate: { type: Date, default: Date.now },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  issuedByName: { type: String },
  generatedDocxPath: { type: String },
  notes: { type: String },
}, {
  timestamps: true,
});

// Auto-generate offerNumber if not set
offerLetterSchema.pre('save', async function (next) {
  if (!this.offerNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('OfferLetter').countDocuments();
    const seq = String(count + 1).padStart(4, '0');
    this.offerNumber = `WH/OL/${year}/${seq}`;
  }
  next();
});

module.exports = mongoose.model('OfferLetter', offerLetterSchema);
