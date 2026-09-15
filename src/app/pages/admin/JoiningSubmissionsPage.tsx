import { useState, useEffect, useCallback } from 'react';
import {
  Search, Filter, ChevronLeft, ChevronRight, X, Phone,
  Users, UserCheck, Calendar, RefreshCw, ExternalLink,
  FileCheck, CreditCard, Briefcase, Clock,
  TrendingUp, Hash, Edit2, Save, AlertCircle, Zap,
  CheckCircle2, AlertTriangle, FileText, Check, ShieldAlert,
  Building2, User as UserIcon
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { calculateAge } from '../../utils/ageCalculator';

// ─── Types ───────────────────────────────────────────────────
interface Employee {
  _id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  department?: string;
  joiningDate: string;
  dateOfBirth?: string;
  age?: number;
  expYears?: number;
  expMonths?: number;
  currentCTC?: string;
  offeredCTC?: string;
  reportingManager?: string;
  address?: string;
  permanentAddress?: string;
  localAddress?: string;
  emergencyContact?: string;
  bloodGroup?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  panCardPath?: string;
  aadhaarCardPath?: string;
  highestDocumentPath?: string;
  marksheetPath?: string;
  degreeCertificatePath?: string;
  resumePath?: string;
  photoPath?: string;
  bankProofPath?: string;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  accountType?: string;
  guardianName?: string;
  undertakingAccepted?: boolean;
  references?: Array<{ name: string; relationship: string; contactNumber: string }>;
  createdBy?: { _id?: string; name?: string; employeeId?: string };
  candidateRef?: { name?: string; status?: string };
  isApproved?: boolean;
  approvalStatus?: 'draft' | 'pending' | 'approved' | 'rejected';
  approvedBy?: { _id?: string; name?: string; employeeId?: string };
  approvedByName?: string;
  approvedAt?: string;
  rejectionRemarks?: string;
  rejectedDocuments?: string[];
  submittedAt?: string;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────
const DEPARTMENTS = ['Recruitment', 'Operations', 'Finance', 'HR', 'IT', 'Admin', 'Sales'];

const DEPT_COLORS: Record<string, string> = {
  Recruitment: 'bg-emerald-100 text-emerald-700',
  Operations:  'bg-blue-100 text-blue-700',
  Finance:     'bg-amber-100 text-amber-700',
  HR:          'bg-purple-100 text-purple-700',
  IT:          'bg-cyan-100 text-cyan-700',
  Admin:       'bg-red-100 text-red-700',
  Sales:       'bg-orange-100 text-orange-700',
};

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}
function fmtExp(years?: number, months?: number) {
  if (!years && !months) return '—';
  return [years && `${years}y`, months && `${months}m`].filter(Boolean).join(' ');
}

// ─── Detail Side Panel ────────────────────────────────────────
function DetailPanel({
  emp,
  onClose,
  canApprove,
  isAdmin,
  onRefresh,
}: {
  emp: Employee;
  onClose: () => void;
  canApprove: boolean;
  isAdmin: boolean;
  onRefresh: () => void;
}) {
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(emp);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Rejection box state
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [rejectedDocs, setRejectedDocs] = useState<string[]>([]);

  const isApproved = !!emp.isApproved || emp.approvalStatus === 'approved';
  const isRejected = emp.approvalStatus === 'rejected';

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api.updateJoining(emp._id, form);
      setEditMode(false);
      setSuccessMsg('Record updated successfully');
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm(`Approve and lock ${emp.fullName}'s joining form? All KYC documents will be marked verified and the profile locked.`)) return;
    setSaving(true);
    setError('');
    try {
      await api.approveJoining(emp._id);
      emp.isApproved = true;
      emp.approvalStatus = 'approved';
      setSuccessMsg('Joining form approved and verified successfully!');
      setTimeout(() => {
        onRefresh();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to approve');
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionRemarks.trim() && rejectedDocs.length === 0) {
      setError('Please select the document(s) needing re-upload or write remarks explaining what needs correction.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const finalRemarks = rejectionRemarks.trim() || (rejectedDocs.length > 0 ? `Please re-upload clear: ${rejectedDocs.join(', ')}` : 'Please correct the highlighted documents.');
      await api.rejectJoining(emp._id, finalRemarks, rejectedDocs);
      emp.isApproved = false;
      emp.approvalStatus = 'rejected';
      emp.rejectionRemarks = finalRemarks;
      emp.rejectedDocuments = rejectedDocs;
      setSuccessMsg('Changes requested. Recruiter only needs to re-upload the rejected document.');
      setTimeout(() => {
        onRefresh();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to reject');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex-1">
            <h2 className="text-slate-800" style={{ fontWeight: 700, fontSize: '1.15rem' }}>
              {editMode ? 'Edit Recruiter Record' : emp.fullName}
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2.5 py-0.5 rounded-full" style={{ fontWeight: 600 }}>
                <Hash className="w-3 h-3" />{emp.employeeId}
              </span>
              {isApproved ? (
                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved & Verified
                </span>
              ) : isRejected ? (
                <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                  <AlertCircle className="w-3 h-3 text-red-600" /> Changes Requested
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                  <Clock className="w-3 h-3 text-amber-600" /> Pending Verification
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editMode && isAdmin && (
              <button onClick={() => setEditMode(true)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {editMode && (
              <button onClick={() => { setEditMode(false); setForm(emp); setError(''); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Cancel">
                <X className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
          {successMsg && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-200 font-semibold">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" /> {successMsg}
            </div>
          )}

          {/* Status Alert Banner in View Mode */}
          {!editMode && (
            isApproved ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-emerald-900 text-sm font-bold">Onboarding Form & KYC Verified</p>
                  <p className="text-emerald-700 text-xs mt-0.5">
                    Verified and locked by <strong>{emp.approvedByName || emp.approvedBy?.name || 'Authorized Approver'}</strong> {emp.approvedAt ? `on ${fmtDate(emp.approvedAt)}` : ''}.
                  </p>
                </div>
              </div>
            ) : isRejected ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-900 text-sm font-bold">Changes Requested by Team Lead</p>
                  <p className="text-red-700 text-xs mt-0.5">
                    Reviewed by <strong>{emp.approvedByName || emp.approvedBy?.name || 'Team Lead'}</strong> {emp.approvedAt ? `on ${fmtDate(emp.approvedAt)}` : ''}:
                  </p>
                  {emp.rejectionRemarks && (
                    <div className="mt-2 p-2.5 bg-white/90 border border-red-200 rounded-xl text-xs text-red-800 font-medium">
                      "{emp.rejectionRemarks}"
                    </div>
                  )}
                  {emp.rejectedDocuments && emp.rejectedDocuments.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-red-800 font-bold">Document(s) Pending Re-upload:</span>
                      {emp.rejectedDocuments.map(d => (
                        <span key={d} className="px-2.5 py-0.5 bg-red-100 border border-red-300 text-red-800 text-[11px] rounded-full font-bold">
                          {d === 'aadhaarCard' ? 'Aadhaar Card' : d === 'panCard' ? 'PAN Card' : d === 'bankProof' ? 'Bank Proof' : d === 'highestDocument' ? 'Qualification Marksheet' : d === 'photo' ? 'Photo' : d === 'resume' ? 'Resume' : d}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-amber-900 text-sm font-bold">Pending Verification</p>
                  <p className="text-amber-700 text-xs mt-0.5">
                    Review all personal details, uploaded KYC IDs, education certificates, and bank proofs below before approving or requesting corrections.
                  </p>
                </div>
              </div>
            )
          )}

          {editMode ? (
            // Edit Mode
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-semibold">Full Name</label>
                  <input type="text" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-semibold">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-semibold">Phone</label>
                  <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-semibold">Role</label>
                  <input type="text" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-semibold">Department</label>
                  <input type="text" value={form.department || ''} onChange={e => setForm({ ...form, department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-semibold">Joining Date</label>
                  <input type="date" value={form.joiningDate ? new Date(form.joiningDate).toISOString().split('T')[0] : ''}
                    onChange={e => setForm({ ...form, joiningDate: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-semibold">Current CTC</label>
                  <input type="text" value={form.currentCTC || ''} onChange={e => setForm({ ...form, currentCTC: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-semibold">Offered CTC</label>
                  <input type="text" value={form.offeredCTC || ''} onChange={e => setForm({ ...form, offeredCTC: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-semibold">Blood Group</label>
                  <input type="text" value={form.bloodGroup || ''} onChange={e => setForm({ ...form, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-semibold">PAN Number</label>
                  <input type="text" value={form.panNumber || ''} onChange={e => setForm({ ...form, panNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-semibold">Aadhaar Number</label>
                  <input type="text" value={form.aadhaarNumber || ''} onChange={e => setForm({ ...form, aadhaarNumber: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button onClick={() => { setEditMode(false); setForm(emp); setError(''); }}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  style={{ fontWeight: 500 }}>
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  style={{ fontWeight: 500 }}>
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            // View Mode
            <>
              {/* Identity & Photo */}
              <div className="flex items-center gap-4 bg-green-50 border border-green-100 rounded-2xl p-4">
                {emp.photoPath ? (
                  <img
                    src={emp.photoPath.startsWith('http') ? emp.photoPath : `https://ats.whitehorsemanpower.in${emp.photoPath}`}
                    alt={emp.fullName}
                    className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 bg-green-600 rounded-full flex items-center justify-center text-white flex-shrink-0 font-bold text-lg">
                    {emp.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 truncate" style={{ fontWeight: 700, fontSize: '1rem' }}>{emp.fullName}</p>
                  <p className="text-slate-500 text-xs truncate">{emp.email}</p>
                  <p className="text-slate-500 text-xs">{emp.phone}</p>
                </div>
                {emp.department && (
                  <span className={`text-xs px-2.5 py-1 rounded-full flex-shrink-0 font-semibold ${DEPT_COLORS[emp.department] || 'bg-slate-100 text-slate-600'}`}>
                    {emp.department}
                  </span>
                )}
              </div>

              {/* Contact & Address */}
              <PanelSection icon={<Phone className="w-4 h-4 text-green-600" />} title="Contact & Address">
                <PRow label="Phone" value={emp.phone} />
                <PRow label="Email" value={emp.email} />
                <PRow label="Emergency Contact" value={emp.emergencyContact} />
                <PRow label="Permanent Address" value={emp.permanentAddress || emp.address} />
                <PRow label="Local Address" value={emp.localAddress} />
              </PanelSection>

              {/* Employment */}
              <PanelSection icon={<Briefcase className="w-4 h-4 text-green-600" />} title="Role & Employment">
                <PRow label="Role" value={emp.role} />
                <PRow label="Department" value={emp.department} />
                <PRow label="Joining Date" value={emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : undefined} />
                <PRow label="Reporting Manager" value={emp.reportingManager} />
                <PRow label="Experience" value={fmtExp(emp.expYears, emp.expMonths)} />
                {emp.age && (
                  <div className="flex items-center gap-2 px-4 py-2.5">
                    <div className="flex items-center gap-2 flex-1">
                      <Zap className="w-3 h-3 text-green-500 flex-shrink-0" />
                      <p className="text-slate-400 text-xs font-semibold">Age</p>
                    </div>
                    <p className="text-slate-700 text-xs font-semibold">
                      {emp.age} years {emp.dateOfBirth && <span className="text-slate-400 text-xs ml-1">({new Date(emp.dateOfBirth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})</span>}
                    </p>
                  </div>
                )}
                {emp.resumePath && (
                  <div className="flex items-center justify-between px-4 py-2.5 text-xs bg-slate-50/50">
                    <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" /> Candidate Resume
                    </span>
                    <a
                      href={emp.resumePath.startsWith('http') ? emp.resumePath : `https://ats.whitehorsemanpower.in${emp.resumePath}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1 font-bold"
                    >
                      <ExternalLink className="w-3 h-3" /> View / Download Resume
                    </a>
                  </div>
                )}
              </PanelSection>

              {/* Compensation */}
              <PanelSection icon={<TrendingUp className="w-4 h-4 text-green-600" />} title="Compensation">
                <PRow label="Offered CTC" value={emp.offeredCTC ? `₹ ${emp.offeredCTC}` : undefined} />
                <PRow label="Previous CTC" value={emp.currentCTC ? `₹ ${emp.currentCTC}` : undefined} />
              </PanelSection>

              {/* KYC & Verification Documents */}
              <PanelSection icon={<CreditCard className="w-4 h-4 text-green-600" />} title="KYC & Verification Documents">
                <PRow label="Blood Group" value={emp.bloodGroup} />
                <PRow label="PAN Number" value={emp.panNumber} />
                {emp.panCardPath && (
                  <div className="flex items-center justify-between px-4 py-2 text-xs">
                    <span className="text-slate-400 font-medium">PAN Card Document</span>
                    <a
                      href={emp.panCardPath.startsWith('http') ? emp.panCardPath : `https://ats.whitehorsemanpower.in${emp.panCardPath}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <ExternalLink className="w-3 h-3" /> View PAN Card
                    </a>
                  </div>
                )}
                <PRow label="Aadhaar" value={emp.aadhaarNumber} />
                {emp.aadhaarCardPath && (
                  <div className="flex items-center justify-between px-4 py-2 text-xs">
                    <span className="text-slate-400 font-medium">Aadhaar Document</span>
                    <a
                      href={emp.aadhaarCardPath.startsWith('http') ? emp.aadhaarCardPath : `https://ats.whitehorsemanpower.in${emp.aadhaarCardPath}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <ExternalLink className="w-3 h-3" /> View Aadhaar Card
                    </a>
                  </div>
                )}
                {(emp.highestDocumentPath || emp.marksheetPath || emp.degreeCertificatePath) && (
                  <div className="flex flex-col gap-1.5 px-4 py-2.5 border-t border-slate-50 text-xs">
                    <span className="text-slate-500 font-semibold mb-0.5">Education Certificates:</span>
                    {emp.highestDocumentPath && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Highest Qualification Doc</span>
                        <a
                          href={emp.highestDocumentPath.startsWith('http') ? emp.highestDocumentPath : `https://ats.whitehorsemanpower.in${emp.highestDocumentPath}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <ExternalLink className="w-3 h-3" /> View Doc
                        </a>
                      </div>
                    )}
                    {emp.marksheetPath && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Marksheet</span>
                        <a
                          href={emp.marksheetPath.startsWith('http') ? emp.marksheetPath : `https://ats.whitehorsemanpower.in${emp.marksheetPath}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <ExternalLink className="w-3 h-3" /> View Marksheet
                        </a>
                      </div>
                    )}
                    {emp.degreeCertificatePath && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Degree Certificate</span>
                        <a
                          href={emp.degreeCertificatePath.startsWith('http') ? emp.degreeCertificatePath : `https://ats.whitehorsemanpower.in${emp.degreeCertificatePath}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <ExternalLink className="w-3 h-3" /> View Degree
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </PanelSection>

              {/* Bank & Salary Account Details */}
              <PanelSection icon={<Building2 className="w-4 h-4 text-green-600" />} title="Bank & Salary Account Details">
                <PRow label="Bank Name" value={emp.bankName} />
                <PRow label="Account Holder" value={emp.accountHolderName} />
                <PRow label="Account Number" value={emp.accountNumber} />
                <PRow label="IFSC Code" value={emp.ifscCode} />
                <PRow label="Branch" value={emp.branchName} />
                <PRow label="Account Type" value={emp.accountType} />
                {emp.bankProofPath && (
                  <div className="flex items-center justify-between px-4 py-2.5 text-xs bg-slate-50/50">
                    <span className="text-slate-500 font-semibold">Bank Proof (Cancelled Cheque / Passbook)</span>
                    <a
                      href={emp.bankProofPath.startsWith('http') ? emp.bankProofPath : `https://ats.whitehorsemanpower.in${emp.bankProofPath}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1 font-bold"
                    >
                      <ExternalLink className="w-3 h-3" /> View Bank Proof
                    </a>
                  </div>
                )}
              </PanelSection>

              {/* Submission & Audit Info */}
              <PanelSection icon={<Clock className="w-4 h-4 text-slate-400" />} title="Submission & Approval Details">
                <PRow label="Submitted On" value={emp.createdAt ? new Date(emp.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : undefined} />
                {emp.createdBy && <PRow label="Submitted By" value={`${emp.createdBy.name || '—'} (${emp.createdBy.employeeId || '—'})`} />}
                {emp.approvedByName && <PRow label="Approved / Reviewed By" value={emp.approvedByName} />}
                {emp.approvedAt && <PRow label="Approval Date" value={new Date(emp.approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />}
                {emp.candidateRef && <PRow label="Candidate Ref" value={`${emp.candidateRef.name || '—'} · ${emp.candidateRef.status || '—'}`} />}
              </PanelSection>
            </>
          )}

          {/* Inline Rejection Box */}
          {/* Inline Rejection Box */}
          {rejectMode && (
            <div className="bg-red-50/80 border border-red-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-800 uppercase tracking-wide flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600" /> Request Corrections / Document Re-upload
                </span>
                <button onClick={() => setRejectMode(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-red-700">
                Select the specific document(s) that need correction. The recruiter will <strong>only</strong> have to re-upload the selected items while all other details stay preserved:
              </p>

              {/* Document selection chips */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-red-800 uppercase tracking-wide">
                  Select Document(s) to Reject:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: 'aadhaarCard', label: 'Aadhaar Card' },
                    { key: 'panCard', label: 'PAN Card' },
                    { key: 'bankProof', label: 'Bank Proof / Cheque' },
                    { key: 'highestDocument', label: 'Marksheet / Degree' },
                    { key: 'photo', label: 'Passport Photo' },
                    { key: 'resume', label: 'Resume' },
                  ].map(doc => {
                    const isSelected = rejectedDocs.includes(doc.key);
                    return (
                      <button
                        key={doc.key}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setRejectedDocs(prev => prev.filter(k => k !== doc.key));
                          } else {
                            setRejectedDocs(prev => [...prev, doc.key]);
                            if (!rejectionRemarks) {
                              setRejectionRemarks(`Please re-upload a clear and valid copy of your ${doc.label}.`);
                            }
                          }
                        }}
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-red-600 text-white border-red-700 shadow-xs'
                            : 'bg-white text-slate-700 border-red-200 hover:bg-red-100/50'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}{doc.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <textarea
                rows={3}
                value={rejectionRemarks}
                onChange={e => setRejectionRemarks(e.target.value)}
                placeholder="e.g. Please re-upload clear Aadhaar card; bank account number has a typo."
                className="w-full px-3 py-2 border border-red-200 rounded-xl text-xs bg-white outline-none focus:border-red-400 resize-none text-slate-800"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setRejectMode(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={saving || (!rejectionRemarks.trim() && rejectedDocs.length === 0)}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-1"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  Confirm & Send to Recruiter
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons in Footer */}
        {!editMode && canApprove && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              {isApproved ? 'Status: Approved & Verified' : 'Action required: Review documents before approving'}
            </span>
            <div className="flex items-center gap-2">
              {!isApproved && !rejectMode && (
                <button
                  onClick={() => { setRejectMode(true); setRejectionRemarks(''); setError(''); }}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg disabled:opacity-50 transition-colors text-xs font-semibold"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Request Changes / Reject
                </button>
              )}
              {!isApproved && (
                <button
                  onClick={handleApprove}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors text-xs font-bold shadow-xs"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Approve & Lock Record
                </button>
              )}
              {isApproved && (
                <div className="flex items-center gap-1 text-emerald-700 text-xs font-semibold bg-emerald-100/70 px-3 py-1.5 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> All Documents Verified
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PanelSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-2xs">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-50 bg-slate-50/60">
        {icon}
        <p className="text-slate-700 text-xs uppercase tracking-wide" style={{ fontWeight: 700 }}>{title}</p>
      </div>
      <div className="divide-y divide-slate-50">{children}</div>
    </div>
  );
}

function PRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-start gap-2 px-4 py-2.5">
      <p className="text-slate-400 text-xs w-36 flex-shrink-0 pt-px" style={{ fontWeight: 500 }}>{label}</p>
      <p className="text-slate-700 text-xs flex-1 break-words" style={{ fontWeight: value ? 500 : 400 }}>
        {value || <span className="text-slate-300">—</span>}
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export function JoiningSubmissionsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isTL = user?.role === 'tl' || user?.role === 'manager';
  const canApprove = isAdmin || isTL;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [stats, setStats] = useState({ total: 0, thisMonth: 0, pending: 0, approved: 0 });
  const LIMIT = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: String(LIMIT) };
      if (search.trim()) params.search = search.trim();
      if (deptFilter) params.department = deptFilter;
      if (statusFilter !== 'all') params.status = statusFilter;

      const data = await api.getJoiningList(params);
      const list: Employee[] = data.employees || [];
      setEmployees(list);
      setTotal(data.total || 0);
      setTotalPages(Math.max(1, Math.ceil((data.total || 0) / LIMIT)));
      if (typeof data.pendingCount === 'number') {
        setPendingApprovalsCount(data.pendingCount);
      }
    } catch {
      setEmployees([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, deptFilter, statusFilter]);

  // Overall Stats
  const loadStats = useCallback(() => {
    api.getJoiningList({ limit: '500' }).then(data => {
      const all: Employee[] = data.employees || [];
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const pendingNum = all.filter(e => !e.isApproved && e.approvalStatus !== 'rejected').length;
      const approvedNum = all.filter(e => e.isApproved || e.approvalStatus === 'approved').length;

      setStats({
        total: data.total || 0,
        thisMonth: all.filter(e => new Date(e.createdAt) >= startOfMonth).length,
        pending: pendingNum,
        approved: approvedNum,
      });
      setPendingApprovalsCount(pendingNum);
    }).catch(() => {});
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, deptFilter, statusFilter]);

  const hasFilters = !!(search || deptFilter || statusFilter !== 'all');
  const clearFilters = () => { setSearch(''); setDeptFilter(''); setStatusFilter('all'); setPage(1); };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl text-slate-800" style={{ fontWeight: 700 }}>
              {isTL ? 'Recruiter Joining Approvals' : 'Recruiter Records & Approvals'}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {isTL
                ? 'Review, verify KYC documents, and approve submitted onboarding forms for your team recruiters'
                : 'All comprehensive onboarding forms submitted by recruiters across branches'}
            </p>
          </div>
          <button onClick={() => { load(); loadStats(); }}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50 transition-colors"
            style={{ fontWeight: 500 }}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700 flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl text-slate-800" style={{ fontWeight: 700 }}>{stats.total.toLocaleString()}</div>
              <div className="text-slate-500 text-xs">Total Submissions</div>
            </div>
          </div>

          <div
            onClick={() => setStatusFilter('pending')}
            className={`cursor-pointer rounded-2xl p-4 shadow-sm border transition-all flex items-center gap-3 ${
              statusFilter === 'pending' ? 'bg-amber-100/70 border-amber-300 ring-2 ring-amber-400/30' : 'bg-amber-50 border-amber-100 hover:border-amber-200'
            }`}
          >
            <div className="w-10 h-10 bg-white rounded-xl shadow-xs flex items-center justify-center text-amber-600 flex-shrink-0 font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl text-amber-700 font-bold">{stats.pending.toLocaleString()}</div>
              <div className="text-amber-800 text-xs font-semibold">Pending Approval</div>
            </div>
          </div>

          <div
            onClick={() => setStatusFilter('approved')}
            className={`cursor-pointer rounded-2xl p-4 shadow-sm border transition-all flex items-center gap-3 ${
              statusFilter === 'approved' ? 'bg-emerald-100/70 border-emerald-300 ring-2 ring-emerald-400/30' : 'bg-emerald-50 border-emerald-100 hover:border-emerald-200'
            }`}
          >
            <div className="w-10 h-10 bg-white rounded-xl shadow-xs flex items-center justify-center text-emerald-600 flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl text-emerald-700 font-bold">{stats.approved.toLocaleString()}</div>
              <div className="text-emerald-800 text-xs font-semibold">Approved & Verified</div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl shadow-xs flex items-center justify-center text-blue-600 flex-shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl text-blue-700 font-bold">{stats.thisMonth.toLocaleString()}</div>
              <div className="text-slate-500 text-xs">Submitted This Month</div>
            </div>
          </div>
        </div>

        {/* ── Status Tabs ── */}
        <div className="flex gap-2 border-b border-slate-200 overflow-x-auto pb-px">
          {[
            { id: 'all', label: 'All Records', count: stats.total },
            { id: 'pending', label: 'Pending Verification', count: stats.pending, badgeColor: 'bg-amber-500 text-white' },
            { id: 'approved', label: 'Approved & Locked', count: stats.approved, badgeColor: 'bg-emerald-600 text-white' },
            { id: 'rejected', label: 'Changes Requested' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              {typeof tab.count === 'number' && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${tab.badgeColor || 'bg-slate-100 text-slate-600'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by recruiter name, employee ID, phone..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500/30"
            />
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <Filter className="w-4 h-4" />
          </div>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
            className="text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-green-500/30">
            <option value="">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {hasFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-500 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors font-medium">
              <X className="w-3.5 h-3.5" /> Clear Filters
            </button>
          )}
          <span className="text-xs text-slate-400 ml-auto">{total.toLocaleString()} record{total !== 1 ? 's' : ''}</span>
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading records…
            </div>
          ) : employees.length === 0 ? (
            <div className="py-16 text-center">
              <FileCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-600 font-semibold text-sm">No joining records found</p>
              <p className="text-slate-400 text-xs mt-1">
                {statusFilter === 'pending'
                  ? 'All recruiter onboarding forms have been reviewed!'
                  : hasFilters ? 'Try adjusting your search or filters.' : 'No submissions recorded yet.'}
              </p>
              {hasFilters && (
                <button onClick={clearFilters} className="mt-3 text-xs text-green-600 hover:underline font-semibold">Clear filters</button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {['Employee ID', 'Name', 'Role', 'Department', 'Joining Date', 'Phone', 'Verification Status', 'Submitted', 'Action'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs text-slate-500 uppercase tracking-wide font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {employees.map(emp => {
                      const isAppr = emp.isApproved || emp.approvalStatus === 'approved';
                      const isRej = emp.approvalStatus === 'rejected';

                      return (
                        <tr key={emp._id}
                          onClick={() => setSelected(emp)}
                          className="hover:bg-slate-50/80 cursor-pointer transition-colors group">
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                              <Hash className="w-3 h-3" />{emp.employeeId}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              {emp.photoPath ? (
                                <img
                                  src={emp.photoPath.startsWith('http') ? emp.photoPath : `https://ats.whitehorsemanpower.in${emp.photoPath}`}
                                  alt={emp.fullName}
                                  className="w-7 h-7 rounded-full object-cover border border-slate-200 flex-shrink-0"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                  <span className="text-green-700 text-xs font-bold">
                                    {emp.fullName.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div>
                                <p className="text-slate-800 text-xs font-bold">{emp.fullName}</p>
                                <p className="text-slate-400 text-xs truncate max-w-[160px]">{emp.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-slate-600 text-xs font-medium">{emp.role || '—'}</p>
                          </td>
                          <td className="px-4 py-3">
                            {emp.department
                              ? <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${DEPT_COLORS[emp.department] || 'bg-slate-100 text-slate-600'}`}>{emp.department}</span>
                              : <span className="text-slate-300 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1 text-slate-600 text-xs whitespace-nowrap">
                              <Calendar className="w-3 h-3 text-slate-300" /> {fmtDate(emp.joiningDate)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1 text-slate-600 text-xs">
                              <Phone className="w-3 h-3 text-slate-300" /> {emp.phone}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {isAppr ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[11px] px-2.5 py-0.5 rounded-full font-bold">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved
                              </span>
                            ) : isRej ? (
                              <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[11px] px-2.5 py-0.5 rounded-full font-bold">
                                <AlertCircle className="w-3 h-3 text-red-600" /> Changes Req.
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[11px] px-2.5 py-0.5 rounded-full font-bold animate-pulse">
                                <Clock className="w-3 h-3 text-amber-600" /> Pending Review
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                            {fmtDate(emp.createdAt)}
                          </td>
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setSelected(emp)}
                              className="px-3 py-1 bg-slate-100 hover:bg-green-600 hover:text-white text-slate-700 text-xs rounded-lg transition-colors font-semibold flex items-center gap-1"
                            >
                              Verify <ExternalLink className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="sm:hidden divide-y divide-slate-50">
                {employees.map(emp => (
                  <div key={emp._id} onClick={() => setSelected(emp)}
                    className="px-4 py-4 flex items-center gap-3 hover:bg-green-50/40 cursor-pointer">
                    <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-sm flex-shrink-0 font-bold">
                      {emp.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 text-sm truncate font-bold">{emp.fullName}</p>
                      <p className="text-green-600 text-xs font-semibold">{emp.employeeId}</p>
                      <p className="text-slate-400 text-xs truncate">{emp.role} · {emp.department || 'No dept'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        emp.isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {emp.isApproved ? 'Approved' : 'Pending'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 ml-auto mt-1" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Page {page} of {totalPages} · {total.toLocaleString()} total
                  </span>
                  <div className="flex gap-1">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                      className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-slate-100 text-slate-600 transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                      className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-slate-100 text-slate-600 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selected && (
        <DetailPanel
          emp={selected}
          onClose={() => { setSelected(null); load(); loadStats(); }}
          canApprove={canApprove}
          isAdmin={isAdmin}
          onRefresh={() => { load(); loadStats(); }}
        />
      )}
    </div>
  );
}
