import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Users, DollarSign, Clock, CheckCircle2, AlertCircle, Play,
  Building2, MapPin, Calendar, FileText, ChevronRight, Download,
  ArrowUpRight, ShieldCheck, RefreshCw, Settings, Sparkles, TrendingUp
} from 'lucide-react';
import api from '../../services/api';

const STATUS_STEPS = [
  { key: 'DRAFT', label: 'Draft', desc: 'Scope selected' },
  { key: 'CALCULATED', label: 'Calculated', desc: 'Gross & LOP synced' },
  { key: 'UNDER_REVIEW', label: 'Under Review', desc: 'HR Audit' },
  { key: 'APPROVED', label: 'Approved', desc: 'Finance clearance' },
  { key: 'PAYMENT_INITIATED', label: 'Payment Sent', desc: 'Bank NEFT' },
  { key: 'PAID', label: 'Paid', desc: 'Payslips released' },
];

export function PayrollDashboard() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      loadBranches(selectedCompanyId);
      loadDashboardStats();
    }
  }, [selectedCompanyId, selectedBranchId, selectedMonth, selectedYear]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const comps = await api.getPayrollCompanies();
      setCompanies(comps);
      if (comps.length > 0) {
        setSelectedCompanyId(comps[0]._id);
      }
    } catch (err) {
      console.error('Failed to load companies:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async (companyId: string) => {
    try {
      const bList = await api.getPayrollBranches(companyId);
      setBranches(bList);
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const data = await api.getPayrollDashboard({
        companyId: selectedCompanyId,
        branchId: selectedBranchId,
        month: String(selectedMonth),
        year: String(selectedYear)
      });
      setStats(data);

      if (data.runId) {
        const recs = await api.getPayrollRunRecords(data.runId);
        setRecentRecords(recs.slice(0, 8));
      } else {
        setRecentRecords([]);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentStepIdx = STATUS_STEPS.findIndex(s => s.key === (stats?.runStatus || 'DRAFT'));

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Enterprise Multi-Tenant
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">NEXORA Core Payroll</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Payroll Intelligence Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Real-time gross-to-net calculations, statutory compliance & recruiter ROI
          </p>
        </div>

        {/* Global Company & Branch Switcher */}
        <div className="flex flex-wrap items-center gap-3">
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
            <MapPin className="w-4 h-4 text-emerald-600" />
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

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-sm">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent border-none text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>{m} {selectedYear}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => navigate('/payroll/run')}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors"
          >
            <Play className="w-4 h-4 fill-white" />
            Run Payroll Wizard
          </button>
        </div>
      </div>

      {/* 6-Stage Interactive Status Lifecycle Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Monthly Payroll Lifecycle Pipeline
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            Status: {stats?.runStatus || 'DRAFT'}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {STATUS_STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIdx;
            const isCurrent = idx === currentStepIdx;
            return (
              <div
                key={step.key}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isCurrent
                    ? 'bg-emerald-50/80 border-emerald-500 shadow-sm'
                    : isCompleted
                    ? 'bg-slate-50 border-slate-200 text-slate-700'
                    : 'bg-white border-slate-100 text-slate-400 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900">{step.label}</span>
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  ) : null}
                </div>
                <p className="text-[11px] text-slate-500">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 13 Real-Time KPI Cards (Structured 4-Column Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Employees */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Employees</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats?.totalActiveEmployees || 0}</p>
          <p className="text-xs text-slate-400 mt-1">Eligible: {stats?.eligibleEmployees || 0} staff</p>
        </div>

        {/* Card 2: Processed vs Pending */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Processed / Pending</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-emerald-600">{stats?.processedEmployees || 0}</p>
            <span className="text-slate-300">/</span>
            <p className="text-lg font-semibold text-amber-600">{stats?.pendingEmployees || 0}</p>
          </div>
          <p className="text-xs text-slate-400 mt-1">On-Hold: {stats?.onHoldEmployees || 0} employees</p>
        </div>

        {/* Card 3: Total Gross Earnings */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Gross Earnings</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">₹{(stats?.totalGross || 0).toLocaleString('en-IN')}</p>
          <p className="text-xs text-slate-400 mt-1">Standard Basic + HRA + Allowances</p>
        </div>

        {/* Card 4: Total Net Payable */}
        <div className="bg-white p-5 rounded-2xl border-2 border-emerald-500/80 shadow-sm bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between text-emerald-800 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Net Payable</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700">₹{(stats?.totalNetPayable || 0).toLocaleString('en-IN')}</p>
          <p className="text-xs text-emerald-600 font-medium mt-1">Disbursement take-home amount</p>
        </div>

        {/* Card 5: Total Deductions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Deductions</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-600">₹{(stats?.totalDeductions || 0).toLocaleString('en-IN')}</p>
          <p className="text-xs text-slate-400 mt-1">EPF, ESIC, PT & TDS Deductions</p>
        </div>

        {/* Card 6: Employer Contributions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Employer Contribution</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">₹{(stats?.totalEmployerContribution || 0).toLocaleString('en-IN')}</p>
          <p className="text-xs text-slate-400 mt-1">EPF (12%) + ESIC (3.25%)</p>
        </div>

        {/* Card 7: Total Payroll Cost (CTC) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Payroll Cost (CTC)</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">₹{(stats?.totalPayrollCost || 0).toLocaleString('en-IN')}</p>
          <p className="text-xs text-slate-400 mt-1">Gross Earned + Employer Contribution</p>
        </div>

        {/* Card 8: Recruiter Variable Pay / Incentives */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Recruiter Incentives</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">₹{(stats?.totalIncentives || 0).toLocaleString('en-IN')}</p>
          <p className="text-xs text-slate-400 mt-1">ATS Joinings payout (50% immediate)</p>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => navigate('/payroll/masters')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Salary Masters & Builder
                </h3>
                <p className="text-xs text-slate-500">Components, formulas & statutory PT slabs</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
          </div>
        </div>

        <div
          onClick={() => navigate('/payroll/employees')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Employee Payroll Master
                </h3>
                <p className="text-xs text-slate-500">Gross, CTC, UAN, PAN & bank account details</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
          </div>
        </div>

        <div
          onClick={() => navigate('/payroll/payslips')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Payslip Hub & Downloads
                </h3>
                <p className="text-xs text-slate-500">Branded PDF payslips & single-download lock</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </div>

      {/* Recent Payroll Run Records Preview */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Current Processed Payroll Records</h3>
            <p className="text-xs text-slate-500">Snapshot calculations for {stats?.runStatus || 'DRAFT'} status</p>
          </div>
          <button
            onClick={() => navigate('/payroll/run')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            Open Full Wizard <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Standard Gross</th>
                <th className="py-3 px-4">Payable Days</th>
                <th className="py-3 px-4">Earned Gross</th>
                <th className="py-3 px-4">Total Deductions</th>
                <th className="py-3 px-4">Net Take-Home</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {recentRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No calculated payroll records for this month yet. Click <strong>Run Payroll Wizard</strong> above to process.
                  </td>
                </tr>
              ) : (
                recentRecords.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                        {r.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p>{r.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{r.employeeId || 'WH-STAFF'}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-xs capitalize">{r.designation}</td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">₹{(r.grossStandard || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{r.payableDays} / {r.calculationBaseDays}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">₹{(r.grossEarned || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 font-mono text-rose-600 font-medium">₹{(r.totalDeductions || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700">₹{(r.netSalary || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => navigate(`/payroll/payslips/${r._id}`)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 font-medium transition-colors inline-flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" /> View Slip
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
