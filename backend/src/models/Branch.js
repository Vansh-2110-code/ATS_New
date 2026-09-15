const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true },
  state: { type: String, trim: true, default: 'Karnataka' },
  city: { type: String, trim: true, default: 'Bangalore' },
  address: { type: String, trim: true },
  ptStateRule: { type: String, trim: true, default: 'Karnataka' },
  bankDetails: {
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifsc: { type: String, trim: true },
    branchName: { type: String, trim: true }
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

branchSchema.index({ company: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Branch', branchSchema);
