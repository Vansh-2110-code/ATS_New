import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Play, ArrowLeft, Building2, Calendar, Users, DollarSign,
  CheckCircle2, Lock, AlertCircle, Loader2, FileText, ChevronRight,
  ShieldCheck, RefreshCw, Layers, ArrowRight
} from 'lucide-react';
import api from '../../services/api';

export function RunPayrollPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [baseDays, setBaseDays] = useState(30);

  const [currentStep, setCurrentStep] = useState(1);
  const [calculating, setCalculating] = useState(false);
  const [locking, setLocking] = useState(false);
  const [payrollRun, setPayrollRun] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      loadBranches(selectedCompanyId);
    }
  }, [selectedCompanyId]);

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

  const handleCalculate = async () => {
    setError('');
    try {
      setCalculating(true);
      const res = await api.calculatePayroll({
        companyId: selectedCompanyId,
        branchId: selectedBranchId || undefined,
        month: selectedMonth,
        year: selectedYear,
        baseDays: baseDays
      });
      setPayrollRun(res.run);
      const recs = await api.getPayrollRunRecords(res.run._id);
      setRecords(recs);
      setCurrentStep(3);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate payroll');
    } finally {
      setCalculating(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      setLocking(true);
      const updated = await api.updatePayrollStatus({
        runId: payrollRun._id,
        status: newStatus,
        comment: `Workflow moved to ${newStatus}`
      });
      setPayrollRun(updated);
      if (newStatus === 'LOCKED') {
        setCurrentStep(5);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setLocking(false);
    }
  };

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
            Monthly Payroll Processing Wizard
          </h1>
          <p className="text-sm text-slate-500">
            5-Step automated calculation engine: Attendance LOP sync ➔ Statutory deductions ➔ Snapshot freeze
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Step Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { step: 1, label: '1. Select Scope', desc: 'Company & Month' },
          { step: 2, label: '2. Attendance & LOP', desc: 'Sync biometric' },
          { step: 3, label: '3. Gross to Net', desc: 'Statutory calculations' },
          { step: 4, label: '4. Maker Review', desc: 'Audit clearance' },
          { step: 5, label: '5. Lock Snapshot', desc: 'Frozen payslips' },
        ].map((s) => {
          const isDone = currentStep > s.step;
          const isCurrent = currentStep === s.step;
          return (
            <div
              key={s.step}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                isCurrent
                  ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                  : isDone
                  ? 'bg-slate-50 border-slate-200 text-slate-700'
                  : 'bg-white border-slate-100 text-slate-400 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900">{s.label}</span>
                {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              </div>
              <p className="text-[11px] text-slate-500">{s.desc}</p>
            </div>
          );
        })}
      </div>

      {/* ─── STEP 1 & 2: SCOPE & ATTENDANCE ─── */}
      {currentStep <= 2 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Define Payroll Processing Scope</h3>
            <p className="text-xs text-slate-500">Select target entity, branch, pay cycle, and LOP calculation base</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Tenant</label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold"
              >
                {companies.map((c) => (
                  <option key={c._id} value={c._id}>{c.companyName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Branch</label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payroll Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium"
              >
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>{m} {selectedYear}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Calculation Days Base</label>
              <select
                value={baseDays}
                onChange={(e) => setBaseDays(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium"
              >
                <option value={30}>Fixed 30 Days (Standard Corporate)</option>
                <option value={26}>Fixed 26 Days (Industrial Base)</option>
                <option value={31}>Calendar Days in Month</option>
              </select>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 leading-relaxed">
              <strong>Automated Attendance Sync Active:</strong> The engine automatically aggregates daily biometric check-ins, approved leaves, and unauthorized absences. Loss of Pay (LOP) will be calculated on a per-day basis as <code>Gross Salary ÷ {baseDays} × LOP Days</code>.
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleCalculate}
              disabled={calculating}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm transition-colors"
            >
              {calculating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Calculating Gross-to-Net...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  Compute Monthly Payroll
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 3, 4, 5: REVIEW & LOCK ─── */}
      {currentStep >= 3 && payrollRun && (
        <div className="space-y-6">
          {/* Summary KPI Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold uppercase text-slate-400">Total Processed</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{payrollRun.totalProcessed} Staff</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold uppercase text-slate-400">Total Gross Earned</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">₹{(payrollRun.totalGross || 0).toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold uppercase text-slate-400">Total Deductions</span>
              <p className="text-2xl font-bold text-rose-600 mt-1">₹{(payrollRun.totalDeductions || 0).toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-300 shadow-sm">
              <span className="text-xs font-bold uppercase text-emerald-800">Net Take-Home Payable</span>
              <p className="text-2xl font-black text-emerald-700 mt-1">₹{(payrollRun.totalNetPayable || 0).toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Workflow Actions Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900">Current Run Status: {payrollRun.status}</h3>
              <p className="text-xs text-slate-500">
                {payrollRun.status === 'LOCKED'
                  ? 'This monthly payroll has been permanently locked into an immutable historical snapshot.'
                  : 'Review calculated slips below before final maker-checker sign-off.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {payrollRun.status === 'CALCULATED' && (
                <button
                  onClick={() => handleUpdateStatus('UNDER_REVIEW')}
                  disabled={locking}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Submit for Review
                </button>
              )}

              {payrollRun.status === 'UNDER_REVIEW' && (
                <button
                  onClick={() => handleUpdateStatus('APPROVED')}
                  disabled={locking}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Approve Payroll
                </button>
              )}

              {payrollRun.status === 'APPROVED' && (
                <button
                  onClick={() => handleUpdateStatus('LOCKED')}
                  disabled={locking}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
                >
                  <Lock className="w-4 h-4" /> Lock Snapshot Permanently
                </button>
              )}

              {payrollRun.status === 'LOCKED' && (
                <button
                  onClick={() => navigate('/payroll/payslips')}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
                >
                  <FileText className="w-4 h-4" /> Go to Payslip Hub
                </button>
              )}
            </div>
          </div>

          {/* Detailed Employee Record Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm">Calculated Salary Slips ({records.length})</h4>
              <span className="text-xs text-slate-400">All amounts in INR (₹)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Workdays</th>
                    <th className="py-3 px-4">Basic</th>
                    <th className="py-3 px-4">HRA</th>
                    <th className="py-3 px-4">Spl Allow</th>
                    <th className="py-3 px-4">EPF (12%)</th>
                    <th className="py-3 px-4">ESIC (0.75%)</th>
                    <th className="py-3 px-4">PT</th>
                    <th className="py-3 px-4 font-bold text-slate-900">Net Take-Home</th>
                    <th className="py-3 px-4 text-right">Slip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {records.map((r) => {
                    const basic = r.earnings.find((e: any) => e.code === 'BASIC')?.earnedAmount || 0;
                    const hra = r.earnings.find((e: any) => e.code === 'HRA')?.earnedAmount || 0;
                    const spl = r.earnings.find((e: any) => e.code === 'SPL_ALLOW')?.earnedAmount || 0;
                    const pf = r.deductions.find((d: any) => d.code === 'PF_EE')?.amount || 0;
                    const esi = r.deductions.find((d: any) => d.code === 'ESI_EE')?.amount || 0;
                    const pt = r.deductions.find((d: any) => d.code === 'PT')?.amount || 0;

                    return (
                      <tr key={r._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {r.name}
                          <span className="block text-[10px] text-slate-400 font-mono">{r.employeeId}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {r.payableDays} / {r.calculationBaseDays}
                          {r.lopDays > 0 && <span className="text-rose-600 block text-[10px]">(-{r.lopDays} LOP)</span>}
                        </td>
                        <td className="py-3 px-4 font-mono">₹{basic.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 font-mono">₹{hra.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 font-mono">₹{spl.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 font-mono">
                          {pf > 0 ? (
                            <span className="text-rose-600">₹{pf.toLocaleString('en-IN')}</span>
                          ) : (
                            <span className="text-slate-400 font-sans text-[11px] font-semibold">₹0 (Opted Out)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-rose-600">₹{esi.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 font-mono text-rose-600">₹{pt.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-700 text-sm">
                          ₹{r.netSalary.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => navigate(`/payroll/payslips/${r._id}`)}
                            className="px-2 py-1 rounded border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 transition-colors inline-flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
