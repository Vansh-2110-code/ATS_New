const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  role: { type: String, required: true },
  date: { type: Date, required: true },
  loginTime: { type: Date },
  markedAt: { type: Date },   // explicit "Mark Attendance" button press time
  logoutTime: { type: Date },
  isWFH: { type: Boolean, default: false },
  status: { type: String, enum: ['Present', 'Absent', 'WFH', 'Half Day', 'Leave'], default: 'Present' },
  isLate: { type: Boolean, default: false },
  lateMinutes: { type: Number, default: 0 },
  leaveRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveRequest' },
  breakMinutes: { type: Number, default: 0 },
  totalHours: { type: Number, default: 0 },
}, { timestamps: true });

attendanceSchema.index({ user: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ status: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
