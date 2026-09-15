const mongoose = require('mongoose');

const employeePayrollProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  salaryStructure: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryStructure' },
  grossSalary: { type: Number, default: 0 },
  annualCTC: { type: Number, default: 0 },
  statutory: {
    panNumber: { type: String, uppercase: true, trim: true },
    uanNumber: { type: String, trim: true },
    pfNumber: { type: String, trim: true },
    esicNumber: { type: String, trim: true },
    isPFExempt: { type: Boolean, default: false },
    isESIExempt: { type: Boolean, default: false },
    isPTExempt: { type: Boolean, default: false },
    taxRegime: { type: String, enum: ['new', 'old'], default: 'new' }
  },
  bank: {
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, uppercase: true, trim: true },
    accountHolderName: { type: String, trim: true },
    paymentMode: { type: String, enum: ['bank_transfer', 'cheque', 'cash'], default: 'bank_transfer' }
  },
  status: {
    type: String,
    enum: ['active', 'on_hold', 'inactive'],
    default: 'active'
  },
  revisions: [{
    effectiveDate: { type: Date, default: Date.now },
    grossSalary: { type: Number, required: true },
    annualCTC: { type: Number, required: true },
    reason: { type: String, trim: true },
    revisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

employeePayrollProfileSchema.index({ company: 1, status: 1 });

module.exports = mongoose.model('EmployeePayrollProfile', employeePayrollProfileSchema);
