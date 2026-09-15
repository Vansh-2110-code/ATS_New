import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  TrendingUp, Award, Calendar, DollarSign, CheckCircle2, AlertCircle,
  RefreshCw, Search, Filter, ArrowUpRight, ShieldCheck, Clock,
  FileText, User, Building2, UserX, AlertTriangle, Sparkles, ChevronRight
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export function RecruiterIncentivePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [incentives, setIncentives] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAdminOrManager = user && ['admin', 'manager'].includes(user.role);

  useEffect(() => {
    loadIncentives();
  }, [statusFilter]);

  const loadIncentives = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const res = await api.getIncentives(params);
      setIncentives(res.incentives || []);
      setSummary(res.summary || null);
    } catch (err) {
      console.error('Failed to load incentives:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncATS = async () => {
    try {
      setSyncing(true);
      const res = await api.syncIncentives();
      alert(`✅ Sync Complete: ${res.createdCount} new candidate placements imported, ${res.updatedCount} retention statuses updated.`);
      await loadIncentives();
    } catch (err: any) {
      alert('Sync failed: ' + (err.message || 'Error'));
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string, notes?: string) => {
    try {
      setActionLoading(id);
      await api.updateIncentiveStatus(id, { status: newStatus, notes });
      await loadIncentives();
    } catch (err: any) {
      alert('Update failed: ' + (err.message || 'Error'));
    } finally {
      setActionLoading(null);
    }
  };

  const filteredIncentives = incentives.filter(inc => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      inc.candidateName?.toLowerCase().includes(q) ||
      inc.recruiterName?.toLowerCase().includes(q) ||
      inc.clientName?.toLowerCase().includes(q) ||
      inc.invoiceNumber?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              ATS Milestone Automation
            </span>
            <span className="text-xs text-slate-400 font-mono">90-Day Retention Guarantee</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2.5">
            <Award className="w-7 h-7 text-emerald-600" />
            Recruiter Incentives & Retention Engine
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Automated tracking of joined placements, 90-day retention countdown, invoice payment verification, and payroll disbursal.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdminOrManager && (
            <button
              onClick={handleSyncATS}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-emerald-200 transition"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing ATS...' : 'Sync ATS Placements'}
            </button>
          )}
          <button
            onClick={() => navigate('/invoices/create')}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            Create Invoice
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Joined Placements</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{summary?.totalCandidates || 0}</p>
          <span className="text-xs text-slate-500">Incentive Pipeline</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">In Retention</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">{summary?.pendingRetention || 0}</p>
          <span className="text-xs text-slate-500">1–89 Days Active</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">Retention Passed</span>
          <p className="text-2xl font-bold text-blue-600 mt-1">{summary?.retentionPassed || 0}</p>
          <span className="text-xs text-slate-500">90+ Days Completed</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">Invoice Realized</span>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{summary?.invoicePaid || 0}</p>
          <span className="text-xs text-slate-500">Client Paid</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm bg-linear-to-br from-emerald-50/50 to-white">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Approved for Payroll</span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">₹{(summary?.totalApprovedAmount || 0).toLocaleString('en-IN')}</p>
          <span className="text-xs text-emerald-600 font-medium">{summary?.approvedForPayroll || 0} Slips Ready</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider block">Early Attrition</span>
          <p className="text-2xl font-bold text-red-600 mt-1">{summary?.clawedBack || 0}</p>
          <span className="text-xs text-red-500">Clawed Back</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {[
            { key: '', label: 'All Placements' },
            { key: 'PENDING_RETENTION', label: 'In Retention' },
            { key: 'RETENTION_PASSED', label: 'Retention Passed' },
            { key: 'INVOICE_PAID', label: 'Invoice Paid' },
            { key: 'APPROVED_FOR_PAYROLL', label: 'Approved for Payroll' },
            { key: 'PAID_IN_PAYROLL', label: 'Disbursed' },
            { key: 'CLAWED_BACK', label: 'Attrition / Clawed Back' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === tab.key
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search candidate, recruiter, client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Main Incentives Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-sm font-medium">Loading incentive data...</p>
          </div>
        ) : filteredIncentives.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-700">No placements found</p>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Click "Sync ATS Placements" above to import all candidates marked as 'Joined' from the ATS database.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50/80 text-xs uppercase text-slate-500 font-bold border-b border-slate-200/80">
                <tr>
                  <th className="px-4 py-3.5">Candidate & Client</th>
                  <th className="px-4 py-3.5">Recruiter</th>
                  <th className="px-4 py-3.5">Joining Date</th>
                  <th className="px-4 py-3.5">90-Day Retention Progress</th>
                  <th className="px-4 py-3.5 text-right">Billing & Incentive</th>
                  <th className="px-4 py-3.5 text-center">Invoice Status</th>
                  <th className="px-4 py-3.5 text-center">Milestone Status</th>
                  {isAdminOrManager && <th className="px-4 py-3.5 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIncentives.map((inc) => {
                  const doj = new Date(inc.dateOfJoining);
                  const now = new Date();
                  const daysElapsed = Math.max(0, Math.floor((now.getTime() - doj.getTime()) / (1000 * 60 * 60 * 24)));
                  const retentionPercent = Math.min(100, Math.round((daysElapsed / (inc.retentionDaysRequired || 90)) * 100));

                  return (
                    <tr key={inc._id} className="hover:bg-slate-50/70 transition">
                      {/* Candidate & Client */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{inc.candidateName}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{inc.clientName || 'Partner Client'}</span>
                        </div>
                      </td>

                      {/* Recruiter */}
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-800">{inc.recruiterName || 'Assigned Recruiter'}</div>
                        <div className="text-xs text-slate-400 font-mono">{inc.recruiter?.employeeId || 'WH-REC'}</div>
                      </td>

                      {/* Joining Date */}
                      <td className="px-4 py-3.5">
                        <div className="text-slate-800 font-medium">
                          {doj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="text-xs text-slate-400">
                          {daysElapsed} days in role
                        </div>
                      </td>

                      {/* Retention Progress Bar */}
                      <td className="px-4 py-3.5 min-w-[180px]">
                        {inc.candidateExited ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            <UserX className="w-3 h-3" /> Exited Early (Clawback)
                          </span>
                        ) : (
                          <div>
                            <div className="flex justify-between items-center text-xs mb-1">
                              <span className="font-semibold text-slate-700">
                                {daysElapsed >= 90 ? '90 Days Completed' : `Day ${daysElapsed} of 90`}
                              </span>
                              <span className={`font-bold ${daysElapsed >= 90 ? 'text-emerald-600' : 'text-slate-500'}`}>
                                {retentionPercent}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  daysElapsed >= 90 ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${retentionPercent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Billing & Incentive */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="font-bold text-emerald-700 text-base">
                          ₹{(inc.incentiveAmount || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="text-xs text-slate-400">
                          From ₹{(inc.billingAmount || 0).toLocaleString('en-IN')} billing
                        </div>
                      </td>

                      {/* Invoice Status */}
                      <td className="px-4 py-3.5 text-center">
                        {inc.invoiceNumber ? (
                          <div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              inc.invoiceStatus === 'Paid'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                              {inc.invoiceStatus === 'Paid' ? '✓ Paid' : inc.invoiceStatus}
                            </span>
                            <span className="block text-[10px] text-slate-400 font-mono mt-0.5">{inc.invoiceNumber}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => navigate('/invoices/create')}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                          >
                            + Bill Now
                          </button>
                        )}
                      </td>

                      {/* Milestone Status */}
                      <td className="px-4 py-3.5 text-center">
                        {inc.status === 'APPROVED_FOR_PAYROLL' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approved for Payroll
                          </span>
                        )}
                        {inc.status === 'PAID_IN_PAYROLL' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Disbursed in Slip
                          </span>
                        )}
                        {inc.status === 'INVOICE_PAID' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                            Ready for Approval
                          </span>
                        )}
                        {inc.status === 'RETENTION_PASSED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                            Awaiting Payment
                          </span>
                        )}
                        {inc.status === 'PENDING_RETENTION' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                            In Retention (90d)
                          </span>
                        )}
                        {inc.status === 'CLAWED_BACK' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            Clawed Back
                          </span>
                        )}
                      </td>

                      {/* Actions (Admin / Manager) */}
                      {isAdminOrManager && (
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {inc.status !== 'APPROVED_FOR_PAYROLL' && inc.status !== 'PAID_IN_PAYROLL' && inc.status !== 'CLAWED_BACK' && (
                              <button
                                onClick={() => handleUpdateStatus(inc._id, 'APPROVED_FOR_PAYROLL')}
                                disabled={actionLoading === inc._id}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
                                title="Approve this incentive for inclusion in next payroll run"
                              >
                                {actionLoading === inc._id ? '...' : 'Approve'}
                              </button>
                            )}

                            {inc.status !== 'CLAWED_BACK' && inc.status !== 'PAID_IN_PAYROLL' && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Flag ${inc.candidateName} as early dropout? This will claw back the incentive.`)) {
                                    handleUpdateStatus(inc._id, 'CLAWED_BACK', 'Early dropout before retention completed');
                                  }
                                }}
                                disabled={actionLoading === inc._id}
                                className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold transition"
                                title="Flag early exit"
                              >
                                Dropout
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default RecruiterIncentivePage;
