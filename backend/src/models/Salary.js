const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  role: { type: String, required: true },
  month: { type: Number, required: true }, // 1-12
  year: { type: Number, required: true },
  baseSalary: { type: Number, required: true },
  wfhAllowance: { type: Number, default: 0 },
  presentDays: { type: Number, default: 0 },
  workingDays: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
  netSalary: { type: Number, default: 0 },

  // Incentives array
  incentives: [{
    id: { type: String, default: () => new mongoose.Types.ObjectId() },
    name: String,           // e.g., "Performance Bonus", "Project Completion"
    amount: Number,
    description: String,
    category: { type: String, enum: ['Bonus', 'Allowance', 'Incentive'], default: 'Incentive' },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now },
  }],

  // Download tracking (Single download restriction)
  downloadCount: { type: Number, default: 0 },
  firstDownloadedAt: Date,
  downloadLocked: { type: Boolean, default: false },

  // Attendance breakdown
  lateLoginsCount: { type: Number, default: 0 },
  lateDeductionsDays: { type: Number, default: 0 },
  leavesApprovedDays: { type: Number, default: 0 },
  unpaidLeavesDays: { type: Number, default: 0 },

  // Override fields
  isOverridden: { type: Boolean, default: false },
  overriddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  overrideReason: String,
  adminNotes: String,
  overriddenAt: Date,

}, { timestamps: true });

salarySchema.index({ user: 1, month: 1, year: 1 }, { unique: true });
salarySchema.index({ month: 1, year: 1 });

module.exports = mongoose.model('Salary', salarySchema);
