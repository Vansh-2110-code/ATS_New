const mongoose = require('mongoose');

const salaryStructureSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, uppercase: true, trim: true },
  description: { type: String, trim: true },
  components: [{
    component: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryComponent' },
    code: { type: String, required: true, uppercase: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['earning', 'deduction', 'employer_contribution'], required: true },
    calcType: { type: String, enum: ['fixed', 'percentage', 'formula', 'manual', 'system_generated'], default: 'fixed' },
    percentageOf: { type: String, default: 'BASIC' },
    percentageValue: { type: Number, default: 0 },
    formula: { type: String },
    fixedAmount: { type: Number, default: 0 },
    order: { type: Number, default: 0 }
  }],
  isDefault: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

salaryStructureSchema.index({ company: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('SalaryStructure', salaryStructureSchema);
