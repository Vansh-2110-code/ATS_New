const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true, trim: true },
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, required: true, trim: true },
  role: { type: String, trim: true }, // Not required for initial form submission
  department: { type: String, trim: true },
  joiningDate: { type: Date, required: true },
  dateOfBirth: { type: Date },
  age: { type: Number },
  gender: { type: String, trim: true },
  positionApplied: { type: String, trim: true },
  sourceOfInterview: { type: String, trim: true },
  referralName: { type: String, trim: true },
  
  permanentAddress: { type: String, trim: true },
  localAddress: { type: String, trim: true },
  mothersPhone: { type: String, trim: true },
  fathersHusbandMobile: { type: String, trim: true },

  educationQualifications: { type: mongoose.Schema.Types.Mixed },
  additionalCourses: { type: Boolean, default: false },
  highestQualification: { type: mongoose.Schema.Types.Mixed },
  employmentHistory: { type: mongoose.Schema.Types.Mixed },
  
  guardianName: { type: String, trim: true },
  salaryOffered: { type: String, trim: true },
  targetAssignment: { type: String, trim: true },
  trainingDurationDays: { type: Number },
  undertakingAccepted: { type: Boolean, default: false },
  
  references: { type: mongoose.Schema.Types.Mixed },

  photoPath: { type: String },
  resumePath: { type: String },
  marksheetPath: { type: String },
  degreeCertificatePath: { type: String },
  highestDocumentPath: { type: String },
  panCardPath: { type: String },
  aadhaarCardPath: { type: String },

  expYears: { type: Number, default: 0 },
  expMonths: { type: Number, default: 0 },
  currentCTC: { type: String, trim: true },
  offeredCTC: { type: String, trim: true },
  reportingManager: { type: String, trim: true },
  address: { type: String, trim: true },
  emergencyContact: { type: String, trim: true },
  bloodGroup: { type: String, trim: true },
  panNumber: { type: String, trim: true },
  aadhaarNumber: { type: String, trim: true },
  candidateRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isApproved: { type: Boolean, default: false },
}, { timestamps: true });

employeeSchema.index({ fullName: 'text', email: 'text' });

// ─── Auto-calculate age from DOB ─────────────────────────────────
employeeSchema.pre('save', function(next) {
  if (this.dateOfBirth && !this.age) {
    const today = new Date();
    const dob = new Date(this.dateOfBirth);
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    // Adjust if birthday hasn't occurred this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    if (age >= 0) {
      this.age = age;
    }
  }
  next();
});

module.exports = mongoose.model('Employee', employeeSchema);
