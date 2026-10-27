import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Users, Search, Edit3, ArrowLeft, Building2, CheckCircle2,
  XCircle, Filter, Loader2, Save, CreditCard, ShieldCheck,
  TrendingUp, History, PlusCircle, Calendar, DollarSign, X, Check,
  Clock, ArrowUpRight, Award, Receipt
} from 'lucide-react';
import api from '../../services/api';

export function EmployeePayrollPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [employmentTab, setEmploymentTab] = useState<'active' | 'exited'>('active');
  const [incrementNote, setIncrementNote] = useState('');

  // Salary Revision Modal
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionProfile, setRevisionProfile] = useState<any>(null);
  const [revisionForm, setRevisionForm] = useState({
    newGrossSalary: 0,
    effectiveDate: new Date().toISOString().split('T')[0],
    reason: 'Annual Increment / Performance Review',
  });
  const [revising, setRevising] = useState(false);

  // Financial History Ledger Drawer
  const [ledgerDrawerOpen, setLedgerDrawerOpen] = useState(false);
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Advance & Reimbursement Modal
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [advanceProfile, setAdvanceProfile] = useState<any>(null);
  const [advanceForm, setAdvanceForm] = useState({
    title: 'Salary Advance',
    totalAmount: 10000,
    monthlyDeduction: 2500,
    disbursedDate: new Date().toISOString().split('T')[0],
    notes: 'Advance for personal emergency'
  });
  const [submittingAdvance, setSubmittingAdvance] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      loadBranches(selectedCompanyId);
      loadProfiles();
    }
  }, [selectedCompanyId, selectedBranchId, employmentTab]);

  const loadCompanies = async () => {
    try {
      const comps = await api.getPayrollCompanies();
      setCompanies(comps);
      if (comps.length > 0) {
        setSelectedCompanyId(comps[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadBranches = async (companyId: string) => {
    try {
      const bList = await api.getPayrollBranches(companyId);
      setBranches(bList);
    } catch (err) {
      console.error(err);
    }
  };

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const data = await api.getPayrollEmployees({
        companyId: selectedCompanyId,
        branchId: selectedBranchId,
        employmentStatus: employmentTab,
      });
      setProfiles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.updatePayrollEmployee(currentProfile._id, {
        grossSalary: Number(currentProfile.grossSalary),
        annualCTC: Number(currentProfile.grossSalary) * 12,
        statutory: currentProfile.statutory,
        bank: currentProfile.bank,
        status: currentProfile.status,
        incrementReason: incrementNote,
        effectiveDate: new Date().toISOString()
      });
      setEditModalOpen(false);
      setIncrementNote('');
      loadProfiles();
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSalaryRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionProfile || !revisionForm.newGrossSalary) return;
    try {
      setRevising(true);
      await api.addSalaryRevision(revisionProfile._id, {
        grossSalary: Number(revisionForm.newGrossSalary),
        annualCTC: Number(revisionForm.newGrossSalary) * 12,
        effectiveDate: revisionForm.effectiveDate,
        reason: revisionForm.reason
      });
      alert(`Salary revision of ₹${revisionForm.newGrossSalary.toLocaleString('en-IN')}/mo recorded successfully.`);
      setRevisionModalOpen(false);
      loadProfiles();
    } catch (err: any) {
      alert(err.message || 'Failed to revise salary');
    } finally {
      setRevising(false);
    }
  };

  const openFinancialHistory = async (empIdOrUserId: string) => {
    setLedgerLoading(true);
    setLedgerDrawerOpen(true);
    try {
      const history = await api.getEmployeeFinancialHistory(empIdOrUserId);
      setLedgerData(history);
    } catch (err: any) {
      console.error('Failed to load financial ledger:', err);
      alert('Could not fetch financial ledger: ' + err.message);
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceProfile) return;
    try {
      setSubmittingAdvance(true);
      await api.addAdvanceOrRecovery(advanceProfile._id, advanceForm);
      alert('Salary advance recorded successfully. Monthly recovery scheduled.');
      setAdvanceModalOpen(false);
      loadProfiles();
    } catch (err: any) {
      alert(err.message || 'Failed to record advance');
    } finally {
      setSubmittingAdvance(false);
    }
  };

  const filtered = profiles.filter((p) => {
    const text = `${p.user?.name || ''} ${p.user?.employeeId || ''} ${p.user?.email || ''} ${p.user?.role || ''}`.toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/payroll/dashboard')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Employee Payroll Master Directory
          </h1>
          <p className="text-sm text-slate-500">
            Maintain employee salary CTC structures, statutory details (PF, ESI, PAN, UAN), salary revisions, and permanent financial histories
          </p>
        </div>

        {/* Company & Branch Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-sm">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none cursor-pointer"
            >
              {companies.map((c) => (
                <option key={c._id} value={c._id}>{c.companyName}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-sm">
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent border-none text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Active vs Inactive/Former Staff Tabs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setEmploymentTab('active')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
            employmentTab === 'active'
              ? 'bg-emerald-600 text-white shadow-emerald-200'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Active Staff ({employmentTab === 'active' ? filtered.length : 'Active'})
        </button>
        <button
          type="button"
          onClick={() => setEmploymentTab('exited')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
            employmentTab === 'exited'
              ? 'bg-slate-800 text-white shadow-slate-300'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <XCircle className="w-4 h-4" />
          Former Staff & Exited ({employmentTab === 'exited' ? filtered.length : 'Archived'})
        </button>
      </div>

      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by employee name, ID, role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 focus:bg-emerald-50/10 transition-colors"
          />
        </div>
        <div className="text-xs font-semibold text-slate-500">
          Showing <span className="text-slate-900">{filtered.length}</span> {employmentTab === 'active' ? 'active' : 'exited'} payroll profiles
        </div>
      </div>

      {/* Employee Payroll Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Role / Designation</th>
                  <th className="py-3.5 px-4">Monthly Gross</th>
                  <th className="py-3.5 px-4">Annual CTC</th>
                  <th className="py-3.5 px-4">Statutory Status</th>
                  <th className="py-3.5 px-4">Bank & Mode</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No matching employee payroll profiles found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs">
                            {(p.user?.name || 'U').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <button
                              onClick={() => openFinancialHistory(p.user?.employeeId || p.user?._id || p._id)}
                              className="font-bold text-slate-900 hover:text-emerald-600 text-left transition-colors"
                            >
                              {p.user?.name || 'Unknown User'}
                            </button>
                            <p className="text-xs text-slate-400 font-mono">{p.user?.employeeId || 'WH-STAFF'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold capitalize text-slate-700">
                        {p.user?.role || 'Staff'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        ₹{(p.grossSalary || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 text-xs">
                        ₹{(p.annualCTC || (p.grossSalary * 12)).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 text-[11px]">
                          <span className="font-mono text-slate-700">PAN: {p.statutory?.panNumber || 'N/A'}</span>
                          <div>
                            {p.statutory?.isPFExempt ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                ✕ PF Opted Out
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ✓ PF Active (12%)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5 text-[11px]">
                          <span className="font-medium text-slate-700">{p.bank?.bankName || 'HDFC Bank'}</span>
                          <span className="text-slate-400 font-mono">A/C: {p.bank?.accountNumber ? '••••' + p.bank.accountNumber.slice(-4) : 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {(() => {
                          const userStatus = p.user?.status;
                          const userEmpStatus = p.user?.employmentStatus;
                          const isFormer = userStatus === 'Former Employee' || userEmpStatus === 'Former Employee' || userStatus === 'Exited' || p.status === 'exited';
                          const isInactive = userStatus === 'Inactive' || userStatus === 'Suspended' || p.status === 'inactive';
                          const isOnLeave = userStatus === 'On Leave' || userEmpStatus === 'On Leave' || p.status === 'on_hold';

                          let badgeLabel = 'ACTIVE';
                          let badgeStyle = 'bg-emerald-100 text-emerald-800';

                          if (isFormer) {
                            badgeLabel = 'FORMER STAFF';
                            badgeStyle = 'bg-slate-100 text-slate-700 border border-slate-300';
                          } else if (isInactive) {
                            badgeLabel = userStatus ? userStatus.toUpperCase() : 'INACTIVE';
                            badgeStyle = 'bg-amber-100 text-amber-800 border border-amber-200';
                          } else if (isOnLeave) {
                            badgeLabel = 'ON LEAVE';
                            badgeStyle = 'bg-purple-100 text-purple-800 border border-purple-200';
                          }

                          return (
                            <span className={`text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full ${badgeStyle}`}>
                              {badgeLabel}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Financial Ledger */}
                          <button
                            onClick={() => openFinancialHistory(p.user?.employeeId || p.user?._id || p._id)}
                            className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-600 hover:text-indigo-700 transition-colors"
                            title="Permanent Financial Ledger"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Revise Salary */}
                          {employmentTab === 'active' && (
                            <button
                              onClick={() => {
                                setRevisionProfile(p);
                                setRevisionForm({
                                  newGrossSalary: p.grossSalary || 0,
                                  effectiveDate: new Date().toISOString().split('T')[0],
                                  reason: 'Annual Increment / Performance Review',
                                });
                                setRevisionModalOpen(true);
                              }}
                              className="p-1.5 hover:bg-emerald-50 rounded-lg text-slate-600 hover:text-emerald-700 transition-colors"
                              title="Revise Salary (Effective Dating)"
                            >
                              <TrendingUp className="w-4 h-4" />
                            </button>
                          )}

                          {/* Add Advance */}
                          {employmentTab === 'active' && (
                            <button
                              onClick={() => {
                                setAdvanceProfile(p);
                                setAdvanceForm({
                                  title: 'Salary Advance',
                                  totalAmount: 10000,
                                  monthlyDeduction: 2500,
                                  disbursedDate: new Date().toISOString().split('T')[0],
                                  notes: 'Advance for personal emergency'
                                });
                                setAdvanceModalOpen(true);
                              }}
                              className="p-1.5 hover:bg-amber-50 rounded-lg text-slate-600 hover:text-amber-700 transition-colors"
                              title="Salary Advance / Recovery"
                            >
                              <PlusCircle className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit Statutory & Bank Profile */}
                          <button
                            onClick={() => {
                              setCurrentProfile(JSON.parse(JSON.stringify(p)));
                              setEditModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
                            title="Edit Bank & Statutory Profile"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: SALARY REVISION & EFFECTIVE DATING */}
      {revisionModalOpen && revisionProfile && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Revise Salary Structure</h3>
                <p className="text-xs text-slate-500 mt-0.5">{revisionProfile.user?.name} ({revisionProfile.user?.employeeId})</p>
              </div>
              <button onClick={() => setRevisionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalaryRevisionSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block">Current Gross Salary</span>
                  <span className="text-base font-bold font-mono text-slate-900">
                    ₹{(revisionProfile.grossSalary || 0).toLocaleString('en-IN')}/mo
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Current Annual CTC</span>
                  <span className="text-sm font-semibold font-mono text-slate-600">
                    ₹{((revisionProfile.grossSalary || 0) * 12).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  New Monthly Gross Salary (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1000"
                  value={revisionForm.newGrossSalary}
                  onChange={(e) => setRevisionForm({ ...revisionForm, newGrossSalary: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 text-sm font-mono font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
                  <span>New Annual CTC: ₹{(Number(revisionForm.newGrossSalary) * 12).toLocaleString('en-IN')}</span>
                  {revisionForm.newGrossSalary > (revisionProfile.grossSalary || 0) && (
                    <span className="text-emerald-600 font-semibold">
                      +{Math.round(((revisionForm.newGrossSalary - (revisionProfile.grossSalary || 0)) / (revisionProfile.grossSalary || 1)) * 100)}% hike
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Effective From Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={revisionForm.effectiveDate}
                  onChange={(e) => setRevisionForm({ ...revisionForm, effectiveDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Revision Reason / Increment Memo
                </label>
                <input
                  type="text"
                  value={revisionForm.reason}
                  onChange={(e) => setRevisionForm({ ...revisionForm, reason: e.target.value })}
                  placeholder="e.g. Annual Appraisal, Promotion, Market Correction"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRevisionModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={revising}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30"
                >
                  {revising && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Revision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SALARY ADVANCE / RECOVERY */}
      {advanceModalOpen && advanceProfile && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Salary Advance</h3>
                <p className="text-xs text-slate-500 mt-0.5">{advanceProfile.user?.name} ({advanceProfile.user?.employeeId})</p>
              </div>
              <button onClick={() => setAdvanceModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdvanceSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Advance Title</label>
                <input
                  type="text"
                  required
                  value={advanceForm.title}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="500"
                    value={advanceForm.totalAmount}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, totalAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monthly Deduction (₹)</label>
                  <input
                    type="number"
                    required
                    min="100"
                    value={advanceForm.monthlyDeduction}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, monthlyDeduction: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Disbursed Date</label>
                <input
                  type="date"
                  required
                  value={advanceForm.disbursedDate}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, disbursedDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Justification</label>
                <input
                  type="text"
                  value={advanceForm.notes}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdvanceModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdvance}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-amber-600/30"
                >
                  {submittingAdvance && <Loader2 className="w-4 h-4 animate-spin" />}
                  Schedule Recovery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER: PERMANENT EMPLOYEE FINANCIAL LEDGER */}
      {ledgerDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">Permanent Financial Ledger</h3>
                  <p className="text-xs text-slate-500">Employee Lifetime Compensation, Payslips & Revisions</p>
                </div>
              </div>
              <button onClick={() => setLedgerDrawerOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {ledgerLoading ? (
              <div className="py-24 text-center text-slate-400">Loading permanent financial history...</div>
            ) : ledgerData ? (
              <div className="space-y-6 text-xs">
                {/* Employee Card */}
                <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-4 rounded-2xl text-white flex items-center justify-between">
                  <div>
                    <div className="text-base font-bold">{ledgerData.employee?.name}</div>
                    <div className="text-xs text-indigo-300 font-mono mt-0.5">
                      {ledgerData.employee?.employeeId} • {ledgerData.employee?.role} • {ledgerData.employee?.email}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-indigo-300 uppercase tracking-wider block">Joined Date</span>
                    <span className="font-semibold text-xs">
                      {ledgerData.employee?.joinedDate ? new Date(ledgerData.employee.joinedDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Lifetime KPI Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Lifetime Gross</span>
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      ₹{(ledgerData.summary?.lifetimeGross || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Lifetime Net Disbursed</span>
                    <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ₹{(ledgerData.summary?.lifetimeNet || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Payslips</span>
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {ledgerData.summary?.payslipCount || 0} Runs
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Lifetime Incentives</span>
                    <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                      ₹{(ledgerData.summary?.lifetimeIncentives || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Salary Revisions Timeline */}
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Salary Increments & Revisions Timeline ({ledgerData.revisions?.length || 0})
                  </h4>
                  {ledgerData.revisions?.length === 0 ? (
                    <div className="p-3 text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl text-center">
                      No historical revisions recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {ledgerData.revisions.map((rev: any, idx: number) => (
                        <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100">₹{(rev.grossSalary || 0).toLocaleString('en-IN')}/mo</span>
                            <span className="text-slate-400 text-[11px] ml-2">CTC: ₹{(rev.annualCTC || 0).toLocaleString('en-IN')}</span>
                            <div className="text-[11px] text-slate-500 mt-0.5">{rev.reason || 'Salary revision'}</div>
                          </div>
                          <div className="text-right text-slate-400 text-[11px]">
                            Effective: <span className="font-semibold text-slate-700 dark:text-slate-300">{new Date(rev.effectiveDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Past Payslips & Disbursal UTR Table */}
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-indigo-600" />
                    Past Monthly Payslips & Payment Disbursals ({ledgerData.payslips?.length || 0})
                  </h4>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500">
                        <tr>
                          <th className="py-2.5 px-3">Month / Year</th>
                          <th className="py-2.5 px-3">Gross Earned</th>
                          <th className="py-2.5 px-3">Net Disbursed</th>
                          <th className="py-2.5 px-3">Payment Status & UTR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {ledgerData.payslips?.map((ps: any) => (
                          <tr key={ps._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                              {ps.month}/{ps.year}
                            </td>
                            <td className="py-2.5 px-3 font-mono">₹{(ps.grossEarned || 0).toLocaleString('en-IN')}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-600">₹{(ps.netSalary || 0).toLocaleString('en-IN')}</td>
                            <td className="py-2.5 px-3">
                              {ps.paymentStatus === 'PAID' ? (
                                <div>
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                    <Check className="w-3 h-3" /> PAID
                                  </span>
                                  {ps.paymentDetails?.utrNumber && (
                                    <div className="text-[10px] font-mono text-slate-400">UTR: {ps.paymentDetails.utrNumber}</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] font-semibold text-amber-600">UNPAID</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Exit Settlement Record (if available) */}
                {ledgerData.settlement && (
                  <div className="bg-rose-50/60 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-200 dark:border-rose-900/40 space-y-1.5">
                    <div className="font-bold text-rose-900 dark:text-rose-300 flex items-center justify-between">
                      <span>Full-and-Final Exit Settlement</span>
                      <span className="text-xs uppercase font-extrabold">{ledgerData.settlement.status}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Last Working Day: {new Date(ledgerData.settlement.lastWorkingDay).toLocaleDateString()}</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        Net: ₹{ledgerData.settlement.netSettlementAmount?.toLocaleString('en-IN')}
                      </span>
                    </div>
                    {ledgerData.settlement.paymentDetails?.utrNumber && (
                      <div className="text-[10px] font-mono text-slate-500">
                        Settlement Disbursed UTR: {ledgerData.settlement.paymentDetails.utrNumber}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Edit Profile Modal (Bank & Statutory) */}
      {editModalOpen && currentProfile && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Edit Payroll Profile: {currentProfile.user?.name}
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Gross (₹)</label>
                  <input
                    type="number"
                    required
                    value={currentProfile.grossSalary || 0}
                    onChange={(e) => setCurrentProfile({ ...currentProfile, grossSalary: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Regime</label>
                  <select
                    value={currentProfile.statutory?.taxRegime || 'new'}
                    onChange={(e) => setCurrentProfile({
                      ...currentProfile,
                      statutory: { ...currentProfile.statutory, taxRegime: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  >
                    <option value="new">New Tax Regime (Default)</option>
                    <option value="old">Old Tax Regime</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Increment / Salary Revision Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Annual Appraisal, Promotion, Incentive Increment"
                  value={incrementNote}
                  onChange={(e) => setIncrementNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* Statutory */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">PAN Number</label>
                  <input
                    type="text"
                    value={currentProfile.statutory?.panNumber || ''}
                    onChange={(e) => setCurrentProfile({
                      ...currentProfile,
                      statutory: { ...currentProfile.statutory, panNumber: e.target.value.toUpperCase() }
                    })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">UAN Number</label>
                  <input
                    type="text"
                    value={currentProfile.statutory?.uanNumber || ''}
                    onChange={(e) => setCurrentProfile({
                      ...currentProfile,
                      statutory: { ...currentProfile.statutory, uanNumber: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Provident Fund (PF) Settings */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block">
                      Provident Fund (PF) Deduction
                    </label>
                    <p className="text-[11px] text-slate-500">
                      {currentProfile.statutory?.isPFExempt
                        ? 'PF Deselected / Opted Out (0% deduction - ₹0 deducted, full in-hand salary)'
                        : 'PF Active (12% EPF will be deducted during monthly payroll calculations)'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={!currentProfile.statutory?.isPFExempt}
                      onChange={(e) => {
                        const isEnabled = e.target.checked;
                        setCurrentProfile({
                          ...currentProfile,
                          statutory: {
                            ...currentProfile.statutory,
                            isPFExempt: !isEnabled
                          }
                        });
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {!currentProfile.statutory?.isPFExempt && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">PF Account / Member ID (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. KN/BLR/1234567/890"
                      value={currentProfile.statutory?.pfNumber || ''}
                      onChange={(e) => setCurrentProfile({
                        ...currentProfile,
                        statutory: { ...currentProfile.statutory, pfNumber: e.target.value }
                      })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Bank */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={currentProfile.bank?.bankName || ''}
                      onChange={(e) => setCurrentProfile({
                        ...currentProfile,
                        bank: { ...currentProfile.bank, bankName: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={currentProfile.bank?.ifscCode || ''}
                      onChange={(e) => setCurrentProfile({
                        ...currentProfile,
                        bank: { ...currentProfile.bank, ifscCode: e.target.value.toUpperCase() }
                      })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono uppercase"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={currentProfile.bank?.accountNumber || ''}
                    onChange={(e) => setCurrentProfile({
                      ...currentProfile,
                      bank: { ...currentProfile.bank, accountNumber: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
