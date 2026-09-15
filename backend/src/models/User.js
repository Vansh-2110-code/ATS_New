const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  employeeId: { type: String, unique: true, sparse: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['recruiter', 'tl', 'manager', 'admin', 'spoc', 'walkin', 'bd', 'business_developer'], required: true },
  roles: { type: [String], default: [] },
  isWFH: { type: Boolean, default: false },
  status: { type: String, enum: ['Active', 'Suspended'], default: 'Active' },
  avatar: { type: String, default: '' },
  faceDescriptor: { type: [Number], default: undefined },
  lastLogin: { type: Date },
  otp: { type: String },
  otpExpiry: { type: Date },
  joinedDate: { type: Date, default: Date.now },
  loginStartTime: { type: String, default: '09:00' },
  loginEndTime: { type: String, default: '19:00' },
  allowHomeLogin: { type: Boolean, default: true },
  disableBiometric: { type: Boolean, default: false },
  isDemoAccount: { type: Boolean, default: false },
  isDemoData: { type: Boolean, default: false },
}, { timestamps: true });

userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ name: 'text', email: 'text' });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otp;
  delete obj.otpExpiry;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
