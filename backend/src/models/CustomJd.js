const mongoose = require('mongoose');

const customJdSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  category: { type: String, default: 'General Operations', trim: true },
  experience: { type: String, default: '', trim: true },
  location: { type: String, default: '', trim: true },
  salary: { type: String, default: '', trim: true },
  skills: [{ type: String, trim: true }],
  text: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByName: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

customJdSchema.index({ title: 'text', category: 'text' });
customJdSchema.index({ isActive: 1 });

module.exports = mongoose.model('CustomJd', customJdSchema);
