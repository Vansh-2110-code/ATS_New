import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  UserMinus, Search, Plus, Filter, CheckCircle2, Clock, AlertTriangle,
  Download, Printer, ArrowRight, ShieldCheck, DollarSign, FileText, Check,
  Building, User, Calendar, RefreshCw, X, Eye, FileCheck
} from 'lucide-react';

interface SettlementRecord {
  _id: string;
  user: {
    _id: string;
    email: string;
    avatar?: string;
    joinedDate?: string;
  };
  employeeId: string;
  employeeName: string;
  designation: string;
  department: string;
  joiningDate: string;
  resignationDate: string;
  lastWorkingDay: string;
  exitReason: string;
  noticePeriodDays: number;
  noticeServedDays: number;
  noticeShortfallDays: number;
  payable: {
    unpaidSalaryDays: number;
    unpaidSalaryAmount: number;
    leaveEncashmentDays: number;
    leaveEncashmentAmount: number;
    gratuityAmount: number;
    pendingIncentives: number;
    bonus: number;
    otherPayable: number;
    otherPayableRemark?: string;
    totalPayable: number;
  };
  deductions: {
    noticeShortfallAmount: number;
    advanceRecovery: number;
    assetDamage: number;
    professionalTax: number;
    providentFund: number;
    tds: number;
    otherDeductions: number;
    otherDeductionRemark?: string;
    totalDeductions: number;
  };
  netSettlementAmount: number;
  netSettlementInWords?: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'DISBURSED';
  paymentDetails?: {
    paymentMode: string;
    utrNumber?: string;
    paymentDate?: string;
    paymentRemarks?: string;
  };
  clearances?: {
    itAssets: boolean;
    accounts: boolean;
    hr: boolean;
    department: boolean;
    remarks?: string;
  };
  relievingLetterIssued?: boolean;
  experienceCertificateIssued?: boolean;
  relievingLetterDate?: string;
  createdAt: string;
}

export function SettlementHubPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'initiate' | 'clearance'>('list');
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modal states
  const [selectedSettlement, setSelectedSettlement] = useState<SettlementRecord | null>(null);
  const [viewDocType, setViewDocType] = useState<'settlement' | 'relieving' | 'experience' | null>(null);
  const [disburseModalItem, setDisburseModalItem] = useState<SettlementRecord | null>(null);
  const [disburseForm, setDisburseForm] = useState({
    utrNumber: '',
    paymentMode: 'bank_transfer',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentRemarks: '',
    relievingLetterIssued: true,
  });

  // New Exit & Settlement Form
  const [activeEmployees, setActiveEmployees] = useState<any[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [initForm, setInitForm] = useState({
    resignationDate: new Date().toISOString().split('T')[0],
    lastWorkingDay: '',
    noticePeriodDays: 30,
    noticeServedDays: 30,
    exitReason: 'Career Growth / Better Opportunity',
    unpaidSalaryDays: 0,
    bonus: 0,
    otherPayable: 0,
    otherPayableRemark: '',
    assetDamage: 0,
    otherDeductions: 0,
    otherDeductionRemark: '',
  });
  const [calculationPreview, setCalculationPreview] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSettlements();
    loadActiveEmployees();
  }, [statusFilter]);

  async function loadSettlements() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      const data = await api.getSettlements(params);
      setSettlements(data || []);
    } catch (err: any) {
      console.error('Failed to load settlements:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadActiveEmployees() {
    try {
      const data = await api.getPayrollEmployees({ status: 'active' });
      setActiveEmployees(data || []);
    } catch (err: any) {
      console.error('Failed to load employees for exit:', err);
    }
  }

  // Auto-calculate last working day based on resignation date + notice period
  useEffect(() => {
    if (initForm.resignationDate && initForm.noticePeriodDays) {
      const d = new Date(initForm.resignationDate);
      d.setDate(d.getDate() + Number(initForm.noticePeriodDays));
      setInitForm(prev => ({ ...prev, lastWorkingDay: d.toISOString().split('T')[0] }));
    }
  }, [initForm.resignationDate, initForm.noticePeriodDays]);

  // Recalculate preview when fields change
  async function triggerPreviewCalculation(empId: string, formValues = initForm) {
    if (!empId) return;
    setCalculating(true);
    try {
      const preview = await api.previewSettlement({
        userId: empId,
        resignationDate: formValues.resignationDate,
        lastWorkingDay: formValues.lastWorkingDay,
        noticePeriodDays: formValues.noticePeriodDays,
        noticeServedDays: formValues.noticeServedDays,
        unpaidSalaryDays: formValues.unpaidSalaryDays,
        bonus: formValues.bonus,
        otherPayable: formValues.otherPayable,
        otherPayableRemark: formValues.otherPayableRemark,
        assetDamage: formValues.assetDamage,
        otherDeductions: formValues.otherDeductions,
        otherDeductionRemark: formValues.otherDeductionRemark,
      });
      setCalculationPreview(preview);
    } catch (err: any) {
      console.error('Settlement preview error:', err);
    } finally {
      setCalculating(false);
    }
  }

  function handleEmployeeSelect(userId: string) {
    setSelectedEmpId(userId);
    triggerPreviewCalculation(userId, initForm);
  }

  async function handleFinalizeSettlement() {
    if (!selectedEmpId || !calculationPreview) return;
    if (!confirm(`Are you sure you want to approve and finalize Full-and-Final settlement of ₹${calculationPreview.netSettlementAmount.toLocaleString('en-IN')}? This will update the employee status to Former Staff and lock their active payroll.`)) {
      return;
    }
    setSubmitting(true);
    try {
      await api.finalizeSettlement({
        userId: selectedEmpId,
        resignationDate: initForm.resignationDate,
        lastWorkingDay: initForm.lastWorkingDay,
        exitReason: initForm.exitReason,
        noticePeriodDays: initForm.noticePeriodDays,
        noticeServedDays: initForm.noticeServedDays,
        payable: calculationPreview.payable,
        deductions: calculationPreview.deductions,
        netSettlementAmount: calculationPreview.netSettlementAmount,
        clearances: { itAssets: true, accounts: true, hr: true, department: true }
      });
      alert('Full-and-Final Settlement generated and approved successfully!');
      setActiveTab('list');
      setSelectedEmpId('');
      setCalculationPreview(null);
      loadSettlements();
      loadActiveEmployees();
    } catch (err: any) {
      alert(`Settlement finalization failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisburseSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!disburseModalItem || !disburseForm.utrNumber.trim()) {
      alert('Please enter a valid UTR / Transaction Reference number');
      return;
    }
    try {
      await api.disburseSettlement(disburseModalItem._id, disburseForm);
      alert('Settlement disbursal and UTR recorded. Relieving documentation generated.');
      setDisburseModalItem(null);
      loadSettlements();
    } catch (err: any) {
      alert(`Disbursal failed: ${err.message}`);
    }
  }

  async function toggleClearance(settlement: SettlementRecord, field: 'itAssets' | 'accounts' | 'hr' | 'department') {
    const updatedClearances = {
      ...(settlement.clearances || { itAssets: false, accounts: false, hr: false, department: false }),
      [field]: !settlement.clearances?.[field]
    };
    try {
      await api.updateSettlementClearance(settlement._id, { clearances: updatedClearances });
      setSettlements(prev => prev.map(s => s._id === settlement._id ? { ...s, clearances: updatedClearances } : s));
    } catch (err: any) {
      alert(`Failed to update clearance: ${err.message}`);
    }
  }

  const filteredSettlements = settlements.filter(s => {
    if (!search) return true;
    const term = search.toLowerCase();
    return s.employeeName?.toLowerCase().includes(term) || s.employeeId?.toLowerCase().includes(term) || s.designation?.toLowerCase().includes(term);
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl shadow-xl border border-indigo-800/40 text-white">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-500/20 rounded-xl border border-rose-500/40 text-rose-400">
              <UserMinus className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Full-and-Final Settlement & Exit Hub</h1>
              <p className="text-slate-400 text-sm mt-0.5">
                Zoho & Keka compliant resignation pipeline, gratuity & leave encashment, asset clearance, and automated relieving letters.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('initiate')}
            className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 shadow-lg transition-all ${
              activeTab === 'initiate'
                ? 'bg-rose-600 text-white shadow-rose-600/30 ring-2 ring-rose-400'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Initiate Exit & F&F</span>
          </button>
          <button
            onClick={() => { setActiveTab('list'); loadSettlements(); }}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all"
            title="Refresh Settlements"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'list'
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>All Settlement Ledgers ({settlements.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('initiate')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'initiate'
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <UserMinus className="w-4 h-4" />
          <span>Initiate Resignation & F&F Calculator</span>
        </button>
        <button
          onClick={() => setActiveTab('clearance')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'clearance'
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Exit Clearance Checklist</span>
        </button>
      </div>

      {/* TAB 1: ALL SETTLEMENTS LIST */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by Employee Name, ID, or Designation..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                <option value="">All Settlement Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="APPROVED">Approved (Pending Disbursal)</option>
                <option value="DISBURSED">Disbursed (Settled & Relieved)</option>
              </select>
            </div>
          </div>

          {/* Settlements Table */}
          {loading ? (
            <div className="py-20 text-center text-slate-400">Loading settlement records...</div>
          ) : filteredSettlements.length === 0 ? (
            <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
              <UserMinus className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No settlement records found</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                No employees have active resignation or full-and-final settlement proceedings in this filter.
              </p>
              <button
                onClick={() => setActiveTab('initiate')}
                className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium rounded-lg"
              >
                Initiate Resignation Now
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Employee</th>
                      <th className="py-3.5 px-4">Resignation / LWD</th>
                      <th className="py-3.5 px-4">Total Payable</th>
                      <th className="py-3.5 px-4">Deductions</th>
                      <th className="py-3.5 px-4">Net Settlement</th>
                      <th className="py-3.5 px-4">Status & UTR</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredSettlements.map(s => {
                      const isDisbursed = s.status === 'DISBURSED';
                      const isApproved = s.status === 'APPROVED';

                      return (
                        <tr key={s._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{s.employeeName}</div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">{s.employeeId} • {s.designation}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-xs text-slate-700 dark:text-slate-300">
                              LWD: <span className="font-semibold text-rose-600 dark:text-rose-400">{new Date(s.lastWorkingDay).toLocaleDateString()}</span>
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              Resigned: {new Date(s.resignationDate).toLocaleDateString()}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-medium text-emerald-600 dark:text-emerald-400">
                              ₹{(s.payable?.totalPayable || 0).toLocaleString('en-IN')}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Unpaid: ₹{s.payable?.unpaidSalaryAmount?.toLocaleString('en-IN') || 0}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-medium text-rose-600 dark:text-rose-400">
                              ₹{(s.deductions?.totalDeductions || 0).toLocaleString('en-IN')}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Shortfall: ₹{s.deductions?.noticeShortfallAmount?.toLocaleString('en-IN') || 0}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                              ₹{(s.netSettlementAmount || 0).toLocaleString('en-IN')}
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">Final Disbursable</span>
                          </td>

                          <td className="py-3.5 px-4">
                            {isDisbursed ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Disbursed
                                </span>
                                {s.paymentDetails?.utrNumber && (
                                  <div className="text-[11px] font-mono text-slate-500 mt-1">
                                    UTR: {s.paymentDetails.utrNumber}
                                  </div>
                                )}
                              </div>
                            ) : isApproved ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
                                <Clock className="w-3.5 h-3.5" /> Approved
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                Draft
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Breakdown */}
                              <button
                                onClick={() => { setSelectedSettlement(s); setViewDocType('settlement'); }}
                                className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors"
                                title="View Settlement Slip"
                              >
                                View F&F
                              </button>

                              {/* Relieving Letter */}
                              <button
                                onClick={() => { setSelectedSettlement(s); setViewDocType('relieving'); }}
                                className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-medium transition-colors"
                                title="Relieving Letter"
                              >
                                Relieving
                              </button>

                              {/* Record Payment UTR */}
                              {!isDisbursed && (
                                <button
                                  onClick={() => {
                                    setDisburseModalItem(s);
                                    setDisburseForm({
                                      utrNumber: '',
                                      paymentMode: 'bank_transfer',
                                      paymentDate: new Date().toISOString().split('T')[0],
                                      paymentRemarks: '',
                                      relievingLetterIssued: true,
                                    });
                                  }}
                                  className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
                                >
                                  Disburse
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INITIATE RESIGNATION & F&F CALCULATOR */}
      {activeTab === 'initiate' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: Inputs */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UserMinus className="w-5 h-5 text-rose-500" />
                Initiate Resignation & Settlement Calculator
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Select an active staff member to configure notice period served, calculate leave encashment, gratuity, and recoveries.
              </p>
            </div>

            {/* Select Employee */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Select Active Employee <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedEmpId}
                onChange={e => handleEmployeeSelect(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                <option value="">-- Choose active employee --</option>
                {activeEmployees.map(p => (
                  <option key={p.user?._id || p._id} value={p.user?._id || p._id}>
                    {p.user?.name || 'Unnamed'} ({p.user?.employeeId || 'No ID'}) - ₹{(p.grossSalary || 0).toLocaleString('en-IN')}/mo
                  </option>
                ))}
              </select>
            </div>

            {/* Resignation Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Resignation Tender Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={initForm.resignationDate}
                  onChange={e => {
                    const val = e.target.value;
                    setInitForm(prev => {
                      const next = { ...prev, resignationDate: val };
                      triggerPreviewCalculation(selectedEmpId, next);
                      return next;
                    });
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Agreed Last Working Day (LWD) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={initForm.lastWorkingDay}
                  onChange={e => {
                    const val = e.target.value;
                    setInitForm(prev => {
                      const next = { ...prev, lastWorkingDay: val };
                      triggerPreviewCalculation(selectedEmpId, next);
                      return next;
                    });
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            {/* Notice Period Served */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Notice Required (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  value={initForm.noticePeriodDays}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setInitForm(prev => {
                      const next = { ...prev, noticePeriodDays: val };
                      triggerPreviewCalculation(selectedEmpId, next);
                      return next;
                    });
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Notice Served (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  value={initForm.noticeServedDays}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setInitForm(prev => {
                      const next = { ...prev, noticeServedDays: val };
                      triggerPreviewCalculation(selectedEmpId, next);
                      return next;
                    });
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Unpaid Salary Days
                </label>
                <input
                  type="number"
                  min="0"
                  max="31"
                  value={initForm.unpaidSalaryDays}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setInitForm(prev => {
                      const next = { ...prev, unpaidSalaryDays: val };
                      triggerPreviewCalculation(selectedEmpId, next);
                      return next;
                    });
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            {/* Exit Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Primary Reason for Leaving
              </label>
              <input
                type="text"
                value={initForm.exitReason}
                onChange={e => setInitForm(prev => ({ ...prev, exitReason: e.target.value }))}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                placeholder="e.g. Higher Education, Relocation, Voluntary Career Transition"
              />
            </div>

            {/* Adjustments: Additions & Deductions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1.5">
                  Other Payables / Bonus (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={initForm.bonus || ''}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setInitForm(prev => {
                      const next = { ...prev, bonus: val };
                      triggerPreviewCalculation(selectedEmpId, next);
                      return next;
                    });
                  }}
                  placeholder="0"
                  className="w-full px-3.5 py-2 text-sm bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-600 dark:text-rose-400 mb-1.5">
                  Asset Damage / Deductions (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={initForm.assetDamage || ''}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setInitForm(prev => {
                      const next = { ...prev, assetDamage: val };
                      triggerPreviewCalculation(selectedEmpId, next);
                      return next;
                    });
                  }}
                  placeholder="0"
                  className="w-full px-3.5 py-2 text-sm bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Right Panel: Live F&F Calculation Preview */}
          <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 to-indigo-950 p-6 rounded-2xl border border-indigo-800/40 text-white shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-indigo-800/50">
                <div>
                  <h3 className="font-bold text-base">Full-and-Final Summary</h3>
                  <p className="text-xs text-indigo-300">Live statutory & exit breakdown</p>
                </div>
                {calculating && <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />}
              </div>

              {calculationPreview ? (
                <div className="mt-4 space-y-4">
                  {/* Employee & Monthly Gross Tag */}
                  <div className="bg-indigo-900/40 p-3 rounded-xl border border-indigo-700/50 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm">{calculationPreview.employee?.name}</div>
                      <div className="text-xs text-indigo-300">{calculationPreview.employee?.employeeId} • {calculationPreview.employee?.role}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-indigo-300">Monthly Gross</div>
                      <div className="font-bold text-sm text-indigo-100">₹{calculationPreview.salary?.monthlyGross?.toLocaleString('en-IN')}</div>
                    </div>
                  </div>

                  {/* Earnings / Payables Breakdown */}
                  <div className="space-y-1.5 text-xs">
                    <div className="font-semibold text-emerald-400 uppercase tracking-wider text-[10px]">Settlement Earnings</div>
                    <div className="flex justify-between text-slate-300">
                      <span>Unpaid Days Salary ({calculationPreview.payable?.unpaidSalaryDays} days)</span>
                      <span className="font-mono text-emerald-300">+₹{(calculationPreview.payable?.unpaidSalaryAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Leave Encashment ({calculationPreview.payable?.leaveEncashmentDays} days)</span>
                      <span className="font-mono text-emerald-300">+₹{(calculationPreview.payable?.leaveEncashmentAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    {calculationPreview.payable?.gratuityAmount > 0 && (
                      <div className="flex justify-between text-slate-300">
                        <span>Gratuity ({calculationPreview.payable?.completedYears} yrs service)</span>
                        <span className="font-mono text-emerald-300">+₹{(calculationPreview.payable?.gratuityAmount || 0).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {calculationPreview.payable?.pendingIncentives > 0 && (
                      <div className="flex justify-between text-slate-300">
                        <span>Pending Placement Incentives</span>
                        <span className="font-mono text-emerald-300">+₹{(calculationPreview.payable?.pendingIncentives || 0).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {calculationPreview.payable?.bonus > 0 && (
                      <div className="flex justify-between text-slate-300">
                        <span>Bonus / Other Payable</span>
                        <span className="font-mono text-emerald-300">+₹{(calculationPreview.payable?.bonus || 0).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-emerald-400 pt-1 border-t border-indigo-800/40">
                      <span>Total Settlement Gross</span>
                      <span>₹{(calculationPreview.payable?.totalPayable || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Deductions Breakdown */}
                  <div className="space-y-1.5 text-xs pt-2 border-t border-indigo-800/40">
                    <div className="font-semibold text-rose-400 uppercase tracking-wider text-[10px]">Settlement Deductions</div>
                    {calculationPreview.deductions?.noticeShortfallDays > 0 && (
                      <div className="flex justify-between text-slate-300">
                        <span>Notice Shortfall ({calculationPreview.deductions?.noticeShortfallDays} days)</span>
                        <span className="font-mono text-rose-300">-₹{(calculationPreview.deductions?.noticeShortfallAmount || 0).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {calculationPreview.deductions?.advanceRecovery > 0 && (
                      <div className="flex justify-between text-slate-300">
                        <span>Outstanding Salary Advance</span>
                        <span className="font-mono text-rose-300">-₹{(calculationPreview.deductions?.advanceRecovery || 0).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {calculationPreview.deductions?.assetDamage > 0 && (
                      <div className="flex justify-between text-slate-300">
                        <span>Asset Damage / Hardware Cost</span>
                        <span className="font-mono text-rose-300">-₹{(calculationPreview.deductions?.assetDamage || 0).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-300">
                      <span>Statutory (PT + PF on unpaid)</span>
                      <span className="font-mono text-rose-300">
                        -₹{((calculationPreview.deductions?.professionalTax || 0) + (calculationPreview.deductions?.providentFund || 0)).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold text-rose-400 pt-1 border-t border-indigo-800/40">
                      <span>Total Deductions</span>
                      <span>₹{(calculationPreview.deductions?.totalDeductions || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Net Payable Banner */}
                  <div className="bg-gradient-to-r from-emerald-950/80 to-teal-950/80 p-4 rounded-xl border border-emerald-500/30 text-center space-y-1">
                    <div className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">Net Disbursable Settlement</div>
                    <div className="text-3xl font-extrabold text-white">
                      ₹{calculationPreview.netSettlementAmount?.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[11px] text-emerald-300/80 italic">{calculationPreview.netSettlementInWords}</div>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center text-indigo-300 text-sm">
                  Select an employee on the left to view instant full-and-final calculation breakdown.
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-6 border-t border-indigo-800/50 mt-6">
              <button
                onClick={handleFinalizeSettlement}
                disabled={!calculationPreview || submitting}
                className="w-full py-3 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Settlement...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Approve & Finalize Settlement</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-center text-slate-400 mt-2">
                This locks active monthly payroll for this employee and transitions their account to Former Staff.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EXIT CLEARANCE CHECKLIST */}
      {activeTab === 'clearance' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-500" />
              Departmental Exit Clearances
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Verify IT assets, accounts settlements, HR exit interviews, and departmental handover for departing personnel.
            </p>

            <div className="mt-6 space-y-4">
              {settlements.map(s => (
                <div key={s._id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">{s.employeeName}</div>
                    <div className="text-xs text-slate-500 font-mono">{s.employeeId} • {s.designation} • LWD: {new Date(s.lastWorkingDay).toLocaleDateString()}</div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* IT Assets Clearance */}
                    <button
                      onClick={() => toggleClearance(s, 'itAssets')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        s.clearances?.itAssets
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-300'
                      }`}
                    >
                      {s.clearances?.itAssets ? <Check className="w-3.5 h-3.5" /> : null}
                      IT Assets (Laptop/SIM)
                    </button>

                    {/* Accounts Clearance */}
                    <button
                      onClick={() => toggleClearance(s, 'accounts')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        s.clearances?.accounts
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-300'
                      }`}
                    >
                      {s.clearances?.accounts ? <Check className="w-3.5 h-3.5" /> : null}
                      Accounts (Advances)
                    </button>

                    {/* HR Clearance */}
                    <button
                      onClick={() => toggleClearance(s, 'hr')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        s.clearances?.hr
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-300'
                      }`}
                    >
                      {s.clearances?.hr ? <Check className="w-3.5 h-3.5" /> : null}
                      HR (Exit Interview)
                    </button>

                    {/* Department Clearance */}
                    <button
                      onClick={() => toggleClearance(s, 'department')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        s.clearances?.department
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-300'
                      }`}
                    >
                      {s.clearances?.department ? <Check className="w-3.5 h-3.5" /> : null}
                      Team Lead Handover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DISBURSE SETTLEMENT & ENTER UTR */}
      {disburseModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">Record Settlement Disbursal</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter bank transaction UTR to officially settle and mark as Relieved.
                </p>
              </div>
              <button onClick={() => setDisburseModalItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-rose-50 dark:bg-rose-950/30 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/40 text-xs">
              <div className="font-semibold text-rose-900 dark:text-rose-300">
                Settling {disburseModalItem.employeeName} ({disburseModalItem.employeeId})
              </div>
              <div className="text-rose-700 dark:text-rose-400 mt-0.5">
                Net Disbursable Amount: <span className="font-bold text-sm">₹{disburseModalItem.netSettlementAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <form onSubmit={handleDisburseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bank UTR / Transaction Reference Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={disburseForm.utrNumber}
                  onChange={e => setDisburseForm(prev => ({ ...prev, utrNumber: e.target.value }))}
                  placeholder="e.g. HDFC2026102700987654"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={disburseForm.paymentMode}
                    onChange={e => setDisburseForm(prev => ({ ...prev, paymentMode: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="bank_transfer">NEFT / RTGS Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={disburseForm.paymentDate}
                    onChange={e => setDisburseForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Remarks / Disbursal Notes
                </label>
                <input
                  type="text"
                  value={disburseForm.paymentRemarks}
                  onChange={e => setDisburseForm(prev => ({ ...prev, paymentRemarks: e.target.value }))}
                  placeholder="e.g. Disbursed from White Horse Corporate HDFC Account"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="relievingDoc"
                  checked={disburseForm.relievingLetterIssued}
                  onChange={e => setDisburseForm(prev => ({ ...prev, relievingLetterIssued: e.target.checked }))}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <label htmlFor="relievingDoc" className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  Automatically issue Official Relieving Letter and Experience Certificate
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDisburseModalItem(null)}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-semibold shadow-lg shadow-rose-600/30"
                >
                  Confirm Disbursal & Mark Settled
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW FULL-AND-FINAL SLIP / RELIEVING LETTER */}
      {selectedSettlement && viewDocType && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 print:hidden">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewDocType('settlement')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    viewDocType === 'settlement' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Settlement Slip
                </button>
                <button
                  onClick={() => setViewDocType('relieving')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    viewDocType === 'relieving' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Relieving Letter
                </button>
                <button
                  onClick={() => setViewDocType('experience')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    viewDocType === 'experience' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Experience Certificate
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button onClick={() => { setSelectedSettlement(null); setViewDocType(null); }} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* DOCUMENT 1: SETTLEMENT STATEMENT SLIP */}
            {viewDocType === 'settlement' && (
              <div className="space-y-6 text-slate-900 dark:text-slate-100">
                <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-800">
                  <h2 className="text-xl font-bold tracking-tight">WHITE HORSE MANPOWER CONSULTANCY PVT. LTD.</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Corporate Office: Bangalore, Karnataka, India</p>
                  <div className="inline-block mt-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold uppercase tracking-wider">
                    Full-and-Final Settlement Statement
                  </div>
                </div>

                {/* Employee Meta Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                  <div>
                    <span className="text-slate-400 block">Employee Name:</span>
                    <span className="font-semibold">{selectedSettlement.employeeName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Employee ID:</span>
                    <span className="font-semibold">{selectedSettlement.employeeId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Designation:</span>
                    <span className="font-semibold">{selectedSettlement.designation}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Department:</span>
                    <span className="font-semibold">{selectedSettlement.department || 'Operations'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Date of Joining:</span>
                    <span className="font-semibold">{new Date(selectedSettlement.joiningDate).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Resignation Date:</span>
                    <span className="font-semibold">{new Date(selectedSettlement.resignationDate).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Last Working Day:</span>
                    <span className="font-semibold text-rose-600">{new Date(selectedSettlement.lastWorkingDay).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Settlement Status:</span>
                    <span className="font-semibold text-emerald-600">{selectedSettlement.status}</span>
                  </div>
                </div>

                {/* Financials Table */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                  {/* Earnings */}
                  <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    <div className="font-bold text-emerald-600 border-b border-slate-200 dark:border-slate-800 pb-2">
                      PAYABLE PARTICULARS
                    </div>
                    <div className="flex justify-between">
                      <span>Unpaid Salary ({selectedSettlement.payable?.unpaidSalaryDays || 0} days)</span>
                      <span className="font-mono">₹{(selectedSettlement.payable?.unpaidSalaryAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Leave Encashment ({selectedSettlement.payable?.leaveEncashmentDays || 0} days)</span>
                      <span className="font-mono">₹{(selectedSettlement.payable?.leaveEncashmentAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gratuity</span>
                      <span className="font-mono">₹{(selectedSettlement.payable?.gratuityAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pending Placement Incentives</span>
                      <span className="font-mono">₹{(selectedSettlement.payable?.pendingIncentives || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bonus / Other Additions</span>
                      <span className="font-mono">₹{(selectedSettlement.payable?.bonus || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-2 border-t border-slate-200 dark:border-slate-800 text-emerald-600">
                      <span>TOTAL PAYABLE (A)</span>
                      <span>₹{(selectedSettlement.payable?.totalPayable || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    <div className="font-bold text-rose-600 border-b border-slate-200 dark:border-slate-800 pb-2">
                      DEDUCTION PARTICULARS
                    </div>
                    <div className="flex justify-between">
                      <span>Notice Shortfall ({selectedSettlement.deductions?.noticeShortfallDays || 0} days)</span>
                      <span className="font-mono">₹{(selectedSettlement.deductions?.noticeShortfallAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Advance Recoveries</span>
                      <span className="font-mono">₹{(selectedSettlement.deductions?.advanceRecovery || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Asset Damage</span>
                      <span className="font-mono">₹{(selectedSettlement.deductions?.assetDamage || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Professional Tax (PT)</span>
                      <span className="font-mono">₹{(selectedSettlement.deductions?.professionalTax || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Provident Fund (PF)</span>
                      <span className="font-mono">₹{(selectedSettlement.deductions?.providentFund || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-2 border-t border-slate-200 dark:border-slate-800 text-rose-600">
                      <span>TOTAL DEDUCTIONS (B)</span>
                      <span>₹{(selectedSettlement.deductions?.totalDeductions || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Net Settlement Banner */}
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase font-bold text-slate-500">NET SETTLEMENT AMOUNT (A - B)</span>
                    <div className="text-xs text-slate-400 italic">{selectedSettlement.netSettlementInWords}</div>
                  </div>
                  <div className="text-2xl font-black text-emerald-600">
                    ₹{selectedSettlement.netSettlementAmount.toLocaleString('en-IN')}
                  </div>
                </div>

                {selectedSettlement.paymentDetails?.utrNumber && (
                  <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    Bank UTR Reference: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{selectedSettlement.paymentDetails.utrNumber}</span> • Mode: {selectedSettlement.paymentDetails.paymentMode} • Disbursed Date: {selectedSettlement.paymentDetails.paymentDate ? new Date(selectedSettlement.paymentDetails.paymentDate).toLocaleDateString() : 'N/A'}
                  </div>
                )}
              </div>
            )}

            {/* DOCUMENT 2: OFFICIAL RELIEVING LETTER */}
            {viewDocType === 'relieving' && (
              <div className="space-y-6 text-slate-800 dark:text-slate-200 font-serif leading-relaxed text-sm p-4">
                <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-800 font-sans">
                  <h2 className="text-xl font-bold tracking-tight">WHITE HORSE MANPOWER CONSULTANCY PVT. LTD.</h2>
                  <p className="text-xs text-slate-500">Bangalore, Karnataka, India • www.whitehorsemanpower.in</p>
                </div>

                <div className="flex justify-between text-xs font-sans text-slate-500">
                  <span>Ref: WHM/REL/{new Date().getFullYear()}/{selectedSettlement.employeeId}</span>
                  <span>Date: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>

                <div className="font-sans text-xs">
                  <div><strong>To,</strong></div>
                  <div>{selectedSettlement.employeeName}</div>
                  <div>Employee ID: {selectedSettlement.employeeId}</div>
                  <div>Bangalore, India</div>
                </div>

                <div className="font-bold text-center uppercase tracking-wide text-sm font-sans underline">
                  Sub: Relieving Order & Discharge of Service
                </div>

                <p>
                  Dear <strong>{selectedSettlement.employeeName}</strong>,
                </p>

                <p>
                  This has reference to your resignation letter dated <strong>{new Date(selectedSettlement.resignationDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>. We wish to inform you that your resignation has been formally accepted by the Management, and you are relieved from your duties and responsibilities as <strong>{selectedSettlement.designation}</strong> with White Horse Manpower Consultancy Pvt. Ltd. at the close of business hours on <strong>{new Date(selectedSettlement.lastWorkingDay).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
                </p>

                <p>
                  We confirm that you have successfully handed over all company assets, credentials, and departmental responsibilities. Your Full-and-Final Settlement has been processed and disbursed in accordance with company policies.
                </p>

                <p>
                  We take this opportunity to thank you for your contributions during your tenure with us from <strong>{new Date(selectedSettlement.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong> to <strong>{new Date(selectedSettlement.lastWorkingDay).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>, and wish you all the very best in your future career endeavors.
                </p>

                <div className="pt-8 flex justify-between font-sans text-xs">
                  <div>
                    <div className="h-12 flex items-end font-semibold text-slate-900 dark:text-slate-100">Authorized Signatory</div>
                    <div className="text-slate-500">White Horse Manpower Consultancy</div>
                  </div>
                  <div className="text-right">
                    <div className="h-12 flex items-end justify-end font-semibold text-slate-900 dark:text-slate-100">HR & Compliance Division</div>
                    <div className="text-slate-500">Seal & Verification</div>
                  </div>
                </div>
              </div>
            )}

            {/* DOCUMENT 3: EXPERIENCE CERTIFICATE */}
            {viewDocType === 'experience' && (
              <div className="space-y-6 text-slate-800 dark:text-slate-200 font-serif leading-relaxed text-sm p-4">
                <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-800 font-sans">
                  <h2 className="text-xl font-bold tracking-tight">WHITE HORSE MANPOWER CONSULTANCY PVT. LTD.</h2>
                  <p className="text-xs text-slate-500">Bangalore, Karnataka, India • www.whitehorsemanpower.in</p>
                </div>

                <div className="text-center font-bold text-base font-sans uppercase tracking-widest text-slate-900 dark:text-slate-100 underline pt-2">
                  TO WHOMSOEVER IT MAY CONCERN
                </div>

                <div className="text-right text-xs font-sans text-slate-500">
                  Date: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>

                <p className="text-justify indent-8">
                  This is to certify that <strong>{selectedSettlement.employeeName}</strong> (Employee Code: <strong>{selectedSettlement.employeeId}</strong>) was employed with <strong>White Horse Manpower Consultancy Pvt. Ltd.</strong> from <strong>{new Date(selectedSettlement.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong> to <strong>{new Date(selectedSettlement.lastWorkingDay).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>. At the time of leaving, they were designated as <strong>{selectedSettlement.designation}</strong> in our <strong>{selectedSettlement.department || 'Recruitment & Operations'}</strong> division.
                </p>

                <p className="text-justify">
                  During their tenure with our organization, we found them to be diligent, dedicated, and professional in discharging their responsibilities. They maintained good professional conduct and cordial working relations with colleagues and management.
                </p>

                <p>
                  We wish <strong>{selectedSettlement.employeeName}</strong> success in all future professional and personal endeavors.
                </p>

                <div className="pt-10 flex justify-between font-sans text-xs">
                  <div>
                    <div className="h-12 flex items-end font-semibold text-slate-900 dark:text-slate-100">Head of Human Resources</div>
                    <div className="text-slate-500">White Horse Manpower Consultancy</div>
                  </div>
                  <div className="text-right">
                    <div className="h-12 flex items-end justify-end font-semibold text-slate-900 dark:text-slate-100">Official Company Seal</div>
                    <div className="text-slate-500">Bangalore Head Office</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
