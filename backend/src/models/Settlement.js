const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  employeeId: { type: String, required: true, trim: true, index: true },
  employeeName: { type: String, required: true, trim: true },
  designation: { type: String, trim: true },
  department: { type: String, trim: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  
  joiningDate: { type: Date, required: true },
  resignationDate: { type: Date, required: true },
  lastWorkingDay: { type: Date, required: true },
  exitReason: { type: String, trim: true },
  
  noticePeriodDays: { type: Number, default: 30 },
  noticeServedDays: { type: Number, default: 30 },
  noticeShortfallDays: { type: Number, default: 0 },
  
  payable: {
    unpaidSalaryDays: { type: Number, default: 0 },
    unpaidSalaryAmount: { type: Number, default: 0 },
    leaveEncashmentDays: { type: Number, default: 0 },
    leaveEncashmentAmount: { type: Number, default: 0 },
    gratuityAmount: { type: Number, default: 0 },
    pendingIncentives: { type: Number, default: 0 },
    reimbursements: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    otherPayable: { type: Number, default: 0 },
    otherPayableRemark: { type: String, trim: true },
    totalPayable: { type: Number, default: 0 }
  },
  
  deductions: {
    noticeShortfallAmount: { type: Number, default: 0 },
    advanceRecovery: { type: Number, default: 0 },
    assetDamage: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },
    providentFund: { type: Number, default: 0 },
    tds: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    otherDeductionRemark: { type: String, trim: true },
    totalDeductions: { type: Number, default: 0 }
  },
  
  netSettlementAmount: { type: Number, default: 0 },
  netSettlementInWords: { type: String, trim: true },
  
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'DISBURSED'],
    default: 'DRAFT',
    index: true
  },
  
  paymentDetails: {
    paymentMode: { type: String, enum: ['bank_transfer', 'cheque', 'cash', 'none'], default: 'bank_transfer' },
    utrNumber: { type: String, trim: true },
    paymentDate: { type: Date },
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    paymentRemarks: { type: String, trim: true }
  },
  
  clearances: {
    itAssets: { type: Boolean, default: false },
    accounts: { type: Boolean, default: false },
    hr: { type: Boolean, default: false },
    department: { type: Boolean, default: false },
    remarks: { type: String, trim: true }
  },
  
  relievingLetterIssued: { type: Boolean, default: false },
  experienceCertificateIssued: { type: Boolean, default: false },
  relievingLetterDate: { type: Date },
  
  settledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  disbursedAt: { type: Date }
}, { timestamps: true });

settlementSchema.index({ company: 1, status: 1 });
settlementSchema.index({ employeeId: 1 });

module.exports = mongoose.model('Settlement', settlementSchema);
