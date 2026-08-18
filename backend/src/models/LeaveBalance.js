const mongoose = require('mongoose');

const leaveBalanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  year: { type: Number, required: true }, // e.g. 2026
  accruedLeaves: { type: Number, default: 0 }, // 1.5 per month
  usedLeaves: { type: Number, default: 0 },
  pendingLeaves: { type: Number, default: 0 },
  currentBalance: { type: Number, default: 0 },
  lastAccruedMonth: { type: String }, // e.g. "2026-08"
  history: [{
    month: String, // "2026-08"
    credited: Number,
    used: Number,
    description: String,
    date: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

leaveBalanceSchema.index({ user: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('LeaveBalance', leaveBalanceSchema);
