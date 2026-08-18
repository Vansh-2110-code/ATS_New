import { useState, useEffect, useCallback } from 'react';
import {
  Search, Filter, ChevronLeft, ChevronRight, X, Phone,
  Users, UserCheck, Calendar, RefreshCw, ExternalLink,
  FileCheck, CreditCard, Briefcase, Clock,
  TrendingUp, Hash, Edit2, Save, AlertCircle, Zap,
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
  expYears?: number;
  expMonths?: number;
  currentCTC?: string;
  offeredCTC?: string;
  reportingManager?: string;
  address?: string;
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
  createdBy?: { name?: string; employeeId?: string };
  candidateRef?: { name?: string; status?: string };
  isApproved?: boolean;
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
function DetailPanel({ emp, onClose, isAdmin }: { emp: Employee; onClose: () => void; isAdmin: boolean }) {
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(emp);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api.updateJoining(emp._id, form);
      setEditMode(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm(`Are you sure you want to approve ${emp.fullName}'s details? This will lock their joining form and prevent them from making further edits.`)) return;
    setSaving(true);
    setError('');
    try {
      await api.updateJoining(emp._id, { isApproved: true });
      emp.isApproved = true;
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to approve');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex-1">
            <h2 className="text-slate-800" style={{ fontWeight: 700, fontSize: '1.1rem' }}>{editMode ? 'Edit Recruiter Record' : emp.fullName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full" style={{ fontWeight: 600 }}>
                <Hash className="w-3 h-3" />{emp.employeeId}
              </span>
              {emp.isApproved ? (
                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                  Approved & Locked
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                  Pending Approval
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
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
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
                  <label className="text-xs text-slate-500 mb-1 block font-semibold">Date of Birth</label>
                  <input
                    type="date"
                    value={form.dateOfBirth ? new Date(form.dateOfBirth).toISOString().split('T')[0] : ''}
                    onChange={e => {
                      const dobValue = e.target.value ? new Date(e.target.value).toISOString() : '';
                      setForm({ ...form, dateOfBirth: dobValue });
                      if (dobValue) {
                        const age = calculateAge(dobValue);
                        if (age !== null) {
                          setForm(f => ({ ...f, age }));
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-slate-500 font-semibold">Age</label>
                    {form.age && form.dateOfBirth && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full" style={{ fontWeight: 500 }}>
                        <Zap className="w-3 h-3" /> Auto-calculated
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={form.age || ''}
                    disabled
                    placeholder="Auto-calculated from DOB"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-700 cursor-not-allowed"
                  />
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
              {/* Identity */}
              <div className="flex items-center gap-4 bg-green-50 border border-green-100 rounded-2xl p-4">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ fontWeight: 700, fontSize: '1.2rem' }}>
                  {emp.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 truncate" style={{ fontWeight: 600 }}>{emp.fullName}</p>
                  <p className="text-slate-500 text-xs truncate">{emp.email}</p>
                  <p className="text-slate-500 text-xs">{emp.phone}</p>
                </div>
                {emp.department && (
                  <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 bg-slate-100 text-slate-600`} style={{ fontWeight: 600 }}>
                    {emp.department}
                  </span>
                )}
              </div>

              <PanelSection icon={<Phone className="w-4 h-4 text-green-600" />} title="Contact">
                <PRow label="Phone" value={emp.phone} />
                <PRow label="Email" value={emp.email} />
                <PRow label="Emergency Contact" value={emp.emergencyContact} />
                <PRow label="Address" value={emp.address} />
              </PanelSection>

              <PanelSection icon={<Briefcase className="w-4 h-4 text-green-600" />} title="Employment">
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
                {emp.dateOfBirth && !emp.age && (
                  <div className="flex items-center gap-2 px-4 py-2.5">
                    <div className="flex items-center gap-2 flex-1">
                      <Zap className="w-3 h-3 text-green-500 flex-shrink-0" />
                      <p className="text-slate-400 text-xs font-semibold">Age</p>
                    </div>
                    <p className="text-slate-700 text-xs font-semibold">
                      {calculateAge(emp.dateOfBirth)} years
                    </p>
                  </div>
                )}
              </PanelSection>

              <PanelSection icon={<TrendingUp className="w-4 h-4 text-green-600" />} title="Compensation">
                <PRow label="Offered CTC" value={emp.offeredCTC ? `₹ ${emp.offeredCTC}` : undefined} />
                <PRow label="Previous CTC" value={emp.currentCTC ? `₹ ${emp.currentCTC}` : undefined} />
              </PanelSection>

              <PanelSection icon={<CreditCard className="w-4 h-4 text-green-600" />} title="KYC / Documents">
                <PRow label="Blood Group" value={emp.bloodGroup} />
                <PRow label="PAN Number" value={emp.panNumber} />
                {emp.panCardPath && (
                  <div className="flex items-center justify-between px-4 py-2 text-xs">
                    <span className="text-slate-400 font-medium">PAN Card File</span>
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
                    <span className="text-slate-400 font-medium">Aadhaar File</span>
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
                  <div className="flex flex-col gap-1.5 px-4 py-2 border-t border-slate-50 text-xs">
                    <span className="text-slate-400 font-medium mb-0.5">Education Documents:</span>
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

              <PanelSection icon={<Clock className="w-4 h-4 text-slate-400" />} title="Submission Info">
                <PRow label="Submitted On" value={emp.createdAt ? new Date(emp.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : undefined} />
                {emp.createdBy && <PRow label="Submitted By" value={`${emp.createdBy.name || '—'} (${emp.createdBy.employeeId || '—'})`} />}
                {emp.candidateRef && <PRow label="Candidate Ref" value={`${emp.candidateRef.name || '—'} · ${emp.candidateRef.status || '—'}`} />}
              </PanelSection>
            </>
          )}
        </div>
        {!editMode && isAdmin && !emp.isApproved && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
            <button
              onClick={handleApprove}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-xs font-semibold"
            >
              <FileCheck className="w-3.5 h-3.5" /> Approve & Lock Record
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PanelSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
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
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [stats, setStats] = useState({ total: 0, thisMonth: 0, thisWeek: 0 });
  const LIMIT = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: String(LIMIT) };
      if (search.trim()) params.search = search.trim();
      if (deptFilter) params.department = deptFilter;
      const data = await api.getJoiningList(params);
      const list: Employee[] = data.employees || [];
      setEmployees(list);
      setTotal(data.total || 0);
      setTotalPages(Math.max(1, Math.ceil((data.total || 0) / LIMIT)));
    } catch {
      setEmployees([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, deptFilter]);

  // Stats (always unfiltered)
  useEffect(() => {
    api.getJoiningList({ limit: '500' }).then(data => {
      const all: Employee[] = data.employees || [];
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
      setStats({
        total: data.total || 0,
        thisMonth: all.filter(e => new Date(e.createdAt) >= startOfMonth).length,
        thisWeek: all.filter(e => new Date(e.createdAt) >= startOfWeek).length,
      });
    }).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, deptFilter]);

  const hasFilters = !!(search || deptFilter);
  const clearFilters = () => { setSearch(''); setDeptFilter(''); setPage(1); };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl text-slate-800" style={{ fontWeight: 700 }}>Recruiter Records</h1>
            <p className="text-slate-500 text-sm mt-0.5">All onboarding forms submitted via Recruiter Joining Form</p>
          </div>
          <button onClick={load}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50 transition-colors"
            style={{ fontWeight: 500 }}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* ── Stats Cards ── (same layout as CandidateDatabasePage) */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Records',  value: stats.total,      icon: Users,      color: 'text-slate-700',   bg: 'bg-white' },
            { label: 'This Month',     value: stats.thisMonth,  icon: Calendar,   color: 'text-blue-600',    bg: 'bg-blue-50' },
            { label: 'This Week',      value: stats.thisWeek,   icon: UserCheck,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3`}>
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center flex-shrink-0">
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <div className={`text-xl ${s.color}`} style={{ fontWeight: 700 }}>{s.value.toLocaleString()}</div>
                <div className="text-slate-500 text-xs">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters ── (same structure as CandidateDatabasePage) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, employee ID, phone..."
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
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-500 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
          <button onClick={load} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
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
              <FileCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No joining records found{hasFilters ? ' for this filter' : ''}.</p>
              {hasFilters && (
                <button onClick={clearFilters} className="mt-3 text-xs text-green-600 hover:underline">Clear filters</button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {['Employee ID', 'Name', 'Role', 'Department', 'Joining Date', 'Phone', 'Approval', 'Date Added', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs text-slate-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {employees.map(emp => (
                      <tr key={emp._id}
                        onClick={() => setSelected(emp)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors">
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full" style={{ fontWeight: 600 }}>
                            <Hash className="w-3 h-3" />{emp.employeeId}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-green-700 text-xs" style={{ fontWeight: 700 }}>
                                {emp.fullName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-slate-700 text-xs" style={{ fontWeight: 600 }}>{emp.fullName}</p>
                              <p className="text-slate-400 text-xs truncate max-w-[150px]">{emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-600 text-xs">{emp.role || '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          {emp.department
                            ? <span className={`text-xs px-2 py-0.5 rounded-full ${DEPT_COLORS[emp.department] || 'bg-slate-100 text-slate-600'}`} style={{ fontWeight: 600 }}>{emp.department}</span>
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
                          {emp.isApproved ? (
                            <span className="inline-flex items-center bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                              Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {fmtDate(emp.createdAt)}
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setSelected(emp)}
                            className="text-slate-300 hover:text-green-600 p-1 rounded-lg hover:bg-green-50 transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="sm:hidden divide-y divide-slate-50">
                {employees.map(emp => (
                  <div key={emp._id} onClick={() => setSelected(emp)}
                    className="px-4 py-4 flex items-center gap-3 hover:bg-green-50/40 cursor-pointer">
                    <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-sm flex-shrink-0" style={{ fontWeight: 700 }}>
                      {emp.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 text-sm truncate" style={{ fontWeight: 600 }}>{emp.fullName}</p>
                      <p className="text-green-600 text-xs" style={{ fontWeight: 600 }}>{emp.employeeId}</p>
                      <p className="text-slate-400 text-xs truncate">{emp.role} · {emp.department || 'No dept'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-slate-500 text-xs">{fmtDate(emp.joiningDate)}</p>
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
      {selected && <DetailPanel emp={selected} onClose={() => { setSelected(null); load(); }} isAdmin={isAdmin} />}
    </div>
  );
}
