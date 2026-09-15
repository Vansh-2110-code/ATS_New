const mongoose = require('mongoose');

const statutoryConfigSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, unique: true, index: true },
  epf: {
    employeeRate: { type: Number, default: 12 },
    employerRate: { type: Number, default: 12 },
    wageCeiling: { type: Number, default: 15000 },
    isCappedAtCeiling: { type: Boolean, default: true },
    adminChargesRate: { type: Number, default: 0.5 },
    edliRate: { type: Number, default: 0.5 }
  },
  esic: {
    employeeRate: { type: Number, default: 0.75 },
    employerRate: { type: Number, default: 3.25 },
    wageCeiling: { type: Number, default: 21000 }
  },
  ptSlabs: [{
    state: { type: String, required: true },
    minSalary: { type: Number, default: 0 },
    maxSalary: { type: Number, default: 999999999 },
    taxAmount: { type: Number, default: 200 },
    specialFebAmount: { type: Number, default: 300 }
  }],
  effectiveDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('StatutoryConfig', statutoryConfigSchema);
