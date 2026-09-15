const mongoose = require('mongoose');

const salaryComponentSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, uppercase: true, trim: true },
  type: {
    type: String,
    enum: ['earning', 'deduction', 'employer_contribution'],
    required: true
  },
  calcType: {
    type: String,
    enum: ['fixed', 'percentage', 'formula', 'manual', 'system_generated'],
    default: 'fixed'
  },
  percentageOf: { type: String, uppercase: true, trim: true, default: 'BASIC' }, // 'GROSS', 'BASIC', 'CTC'
  percentageValue: { type: Number, default: 0 },
  formula: { type: String, trim: true }, // e.g., 'GROSS - BASIC - HRA'
  isTaxable: { type: Boolean, default: true },
  isPFApplicable: { type: Boolean, default: true },
  isESIApplicable: { type: Boolean, default: true },
  isPTApplicable: { type: Boolean, default: true },
  isProratedOnLOP: { type: Boolean, default: true },
  includeInCTC: { type: Boolean, default: true },
  showOnPayslip: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

salaryComponentSchema.index({ company: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('SalaryComponent', salaryComponentSchema);
