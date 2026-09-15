const mongoose = require('mongoose');

const payrollRunSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
  month: { type: Number, required: true }, // 1-12
  year: { type: Number, required: true },
  payGroup: { type: String, default: 'All' },
  status: {
    type: String,
    enum: ['DRAFT', 'CALCULATED', 'UNDER_REVIEW', 'APPROVED', 'LOCKED', 'PAYMENT_INITIATED', 'PAID'],
    default: 'DRAFT',
    index: true
  },
  totalActiveEmployees: { type: Number, default: 0 },
  totalProcessed: { type: Number, default: 0 },
  totalGross: { type: Number, default: 0 },
  totalIncentives: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  totalNetPayable: { type: Number, default: 0 },
  totalEmployerContribution: { type: Number, default: 0 },
  totalPayrollCost: { type: Number, default: 0 },
  approvalHierarchy: [{
    role: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String },
    action: { type: String, enum: ['SUBMITTED', 'REVIEWED', 'APPROVED', 'REJECTED'] },
    comment: { type: String },
    actionAt: { type: Date, default: Date.now }
  }],
  lockedAt: { type: Date },
  lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  paidAt: { type: Date },
  runBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

payrollRunSchema.index({ company: 1, month: 1, year: 1, branch: 1 }, { unique: true });

module.exports = mongoose.model('PayrollRun', payrollRunSchema);
