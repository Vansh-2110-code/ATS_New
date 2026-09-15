const mongoose = require('mongoose');

const payrollEmployeeRecordSchema = new mongoose.Schema({
  payrollRun: { type: mongoose.Schema.Types.ObjectId, ref: 'PayrollRun', required: true, index: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  employeeId: { type: String, trim: true },
  name: { type: String, required: true },
  designation: { type: String },
  department: { type: String },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  calculationBaseDays: { type: Number, default: 30 },
  presentDays: { type: Number, default: 0 },
  paidLeaveDays: { type: Number, default: 0 },
  lopDays: { type: Number, default: 0 },
  payableDays: { type: Number, default: 30 },
  earnings: [{
    code: { type: String, required: true },
    name: { type: String, required: true },
    standardAmount: { type: Number, default: 0 },
    earnedAmount: { type: Number, default: 0 }
  }],
  deductions: [{
    code: { type: String, required: true },
    name: { type: String, required: true },
    amount: { type: Number, default: 0 }
  }],
  employerContributions: [{
    code: { type: String, required: true },
    name: { type: String, required: true },
    amount: { type: Number, default: 0 }
  }],
  grossStandard: { type: Number, default: 0 },
  grossEarned: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  netSalary: { type: Number, default: 0 },
  netSalaryInWords: { type: String },
  totalEmployerCost: { type: Number, default: 0 },
  ctc: { type: Number, default: 0 },
  incentiveAmount: { type: Number, default: 0 },
  lopDeduction: { type: Number, default: 0 },
  bankDetails: {
    bankName: { type: String },
    accountNumber: { type: String },
    ifscCode: { type: String },
    paymentMode: { type: String, default: 'bank_transfer' }
  },
  statutoryDetails: {
    pan: { type: String },
    uan: { type: String },
    pfNumber: { type: String },
    esicNumber: { type: String },
    taxRegime: { type: String, default: 'new' },
    isPFExempt: { type: Boolean, default: false }
  },
  isFrozen: { type: Boolean, default: false },
  downloadCount: { type: Number, default: 0 },
  firstDownloadedAt: { type: Date }
}, { timestamps: true });

payrollEmployeeRecordSchema.index({ payrollRun: 1, user: 1 }, { unique: true });
payrollEmployeeRecordSchema.index({ user: 1, month: 1, year: 1 });

module.exports = mongoose.model('PayrollEmployeeRecord', payrollEmployeeRecordSchema);
