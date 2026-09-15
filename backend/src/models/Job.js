const mongoose = require('mongoose');

const JOB_PRIORITIES = ['Urgent', 'High', 'Medium', 'Low', 'Hold', 'Closed'];

const jobSchema = new mongoose.Schema({
  companyName: { type: String, required: true, trim: true },
  jrNumber: { type: String, required: true, unique: true, trim: true },
  jobTitle: { type: String, required: true, trim: true },
  jobType: { type: String, trim: true },
  experience: { type: String, trim: true },
  location: { type: String, trim: true },
  positions: { type: Number, default: 1 },
  skills: [{ type: String, trim: true }],
  description: { type: String },
  requirements: { type: String },
  jdFilePath: { type: String },
  jdOriginalName: { type: String },
  suggestedKeywords: [{ type: String }],
  status: { type: String, enum: ['Open', 'Closed', 'On Hold'], default: 'Open' },
  priority: { type: String, enum: JOB_PRIORITIES, default: 'Medium' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  division: { type: String, enum: ['IT', 'BPO', 'Lateral'], default: 'BPO' },
  isDemoData: { type: Boolean, default: false },

  portfolioDepartment: { type: String, enum: ['BPO', 'ITES', 'IT', 'Non-IT', 'Healthcare', 'Sales', 'Finance'], default: 'BPO' },
  client: { type: String, trim: true },
  projectedRole: { type: String, trim: true },
  recruiterName: { type: String, trim: true },
  recruiterEmail: { type: String, trim: true },
  hrName: { type: String, trim: true },
  hrEmail: { type: String, trim: true },
  spocName: { type: String, trim: true },

  // Multi-recruiter assignment
  assignedRecruiters: [{
    recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recruiterName: { type: String },
    recruiterEmail: { type: String },
  }],

  screenedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  screenedByName: { type: String },
  screenerStatus: { type: String, default: 'New' },
  closedDate: { type: Date },
  reactivatedDate: { type: Date },
  totalResumes: { type: Number, default: 0 },
  shortlistedResumes: { type: Number, default: 0 },
  shortlistedCandidates: { type: Number, default: 0 },
}, { timestamps: true });

jobSchema.statics.PRIORITIES = JOB_PRIORITIES;

jobSchema.index({ companyName: 'text', jobTitle: 'text', jrNumber: 'text' });
jobSchema.index({ status: 1 });

module.exports = mongoose.model('Job', jobSchema);
