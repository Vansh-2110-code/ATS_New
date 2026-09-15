const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  companyName: { type: String, required: true, trim: true },
  address: { type: String, trim: true },
  spoc: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  gst: { type: String, trim: true },
  lut: { type: String, trim: true },

  // Location (cascading)
  country: { type: String, trim: true, default: 'India' },
  state: { type: String, trim: true },
  city: { type: String, trim: true },
  localArea: { type: String, trim: true },

  // Multi-Company Payroll & Tenancy fields
  code: { type: String, trim: true, uppercase: true },
  logo: { type: String, default: '' },
  pan: { type: String, trim: true, uppercase: true },
  tan: { type: String, trim: true, uppercase: true },
  epfCode: { type: String, trim: true },
  esicCode: { type: String, trim: true },
  isPayrollTenant: { type: Boolean, default: false },
  enableATSIntegration: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

companySchema.index({ companyName: 'text' });

const Company = mongoose.model('Company', companySchema);

// Drop any legacy unique index on companyName that may exist in the DB
mongoose.connection.once('open', async () => {
  try {
    await Company.collection.dropIndex('companyName_1');
  } catch (_) {
    // Index doesn't exist — nothing to do
  }
});

module.exports = Company;
