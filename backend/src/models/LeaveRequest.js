const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  role: { type: String, required: true },
  department: { type: String },
  leaveType: {
    type: String,
    enum: ['Paid Leave', 'Casual Leave', 'Sick Leave', 'Half Day (Morning)', 'Half Day (Evening)', 'Unpaid Leave'],
    default: 'Paid Leave',
    required: true,
  },
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true },
  daysCount: { type: Number, required: true, default: 1 },
  reason: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
    default: 'Pending',
  },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedByName: { type: String },
  reviewRemarks: { type: String, trim: true },
  reviewedAt: { type: Date },
}, { timestamps: true });

leaveRequestSchema.index({ user: 1, fromDate: 1 });
leaveRequestSchema.index({ status: 1 });
leaveRequestSchema.index({ fromDate: 1, toDate: 1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
