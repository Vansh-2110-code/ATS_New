const mongoose = require('mongoose');

const recruitmentIncentiveSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recruiterName: { type: String, trim: true },
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true, index: true },
  candidateName: { type: String, required: true, trim: true },
  candidateEmployeeId: { type: String, trim: true },
  clientName: { type: String, trim: true },

  // Financial Values
  candidateCTC: { type: Number, default: 0 },
  billingPercentage: { type: Number, default: 8.33 },
  billingAmount: { type: Number, default: 0 },
  incentivePercentage: { type: Number, default: 5 },
  incentiveAmount: { type: Number, default: 0 },

  // 90-Day Retention Milestone Tracking
  dateOfJoining: { type: Date, required: true },
  retentionDaysRequired: { type: Number, default: 90 },
  retentionDueDate: { type: Date },
  retentionCompleted: { type: Boolean, default: false },
  candidateExited: { type: Boolean, default: false },
  candidateExitDate: { type: Date },

  // Invoice & Revenue Linkage
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  invoiceNumber: { type: String, trim: true },
  invoiceStatus: { type: String, enum: ['Draft', 'Pending', 'Paid', 'Overdue', 'Not Invoiced'], default: 'Not Invoiced' },

  // Milestone Lifecycle
  status: {
    type: String,
    enum: [
      'PENDING_RETENTION',
      'RETENTION_PASSED',
      'INVOICE_PAID',
      'APPROVED_FOR_PAYROLL',
      'PAID_IN_PAYROLL',
      'CLAWED_BACK'
    ],
    default: 'PENDING_RETENTION',
    index: true
  },

  // Payroll Disbursal Linking
  includedInPayrollRun: { type: mongoose.Schema.Types.ObjectId, ref: 'PayrollRun' },
  paidMonth: { type: Number },
  paidYear: { type: Number },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  notes: { type: String, trim: true }
}, { timestamps: true });

recruitmentIncentiveSchema.index({ company: 1, recruiter: 1 });
recruitmentIncentiveSchema.index({ candidate: 1 }, { unique: true });

module.exports = mongoose.model('RecruitmentIncentive', recruitmentIncentiveSchema);
