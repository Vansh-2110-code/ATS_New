import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Upload, ScanLine, PhoneCall, Clock, CheckCircle2, Award,
  Users, Search, Filter, Calendar, RefreshCw, ArrowRight,
  TrendingUp, FileText, Database, Shield, AlertCircle, ChevronRight, UserCheck, BarChart3
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

interface MisSummary {
  totalScanned: number;
  utilised: number;
  unused: number;
  selected: number;
  joined: number;
  utilizationRate: number;
}

interface UserBreakdownItem {
  userId: string;
  name: string;
  employeeId: string;
  email: string;
  role: string;
  scanned: number;
  utilised: number;
  unused: number;
  selected: number;
  joined: number;
  utilizationRate: number;
}

interface RecentCandidate {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  positionApplied?: string;
  status: string;
  scannedByName?: string;
  scannedDate?: string;
  firstCallSubmitted?: boolean;
  candidateContacted?: boolean;
}

export function MisDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isSuperOrAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const [range, setRange] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom'>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<MisSummary>({
    totalScanned: 0,
    utilised: 0,
    unused: 0,
    selected: 0,
    joined: 0,
    utilizationRate: 0,
  });
  const [userBreakdown, setUserBreakdown] = useState<UserBreakdownItem[]>([]);
  const [recentCandidates, setRecentCandidates] = useState<RecentCandidate[]>([]);
  const [teamSearch, setTeamSearch] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await api.getMisStats({
        range,
        startDate: range === 'custom' ? startDate : undefined,
        endDate: range === 'custom' ? endDate : undefined,
      });
      if (data) {
        setSummary(data.summary || {
          totalScanned: 0,
          utilised: 0,
          unused: 0,
          selected: 0,
          joined: 0,
          utilizationRate: 0,
        });
        setUserBreakdown(data.userBreakdown || []);
        setRecentCandidates(data.recentCandidates || []);
      }
    } catch (err) {
      console.error('Failed to load MIS statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [range]);

  const handleCustomFilterApply = () => {
    if (startDate && endDate) {
      setRange('custom');
      fetchStats();
    }
  };

  const filteredTeam = userBreakdown.filter(item => {
    if (!teamSearch.trim()) return true;
    const q = teamSearch.toLowerCase();
    return item.name.toLowerCase().includes(q) ||
           item.employeeId.toLowerCase().includes(q) ||
           item.email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 pb-12">
      {/* ── Header & Range Bar ── */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border border-emerald-200">
              <ScanLine className="w-3.5 h-3.5" />
              MIS Sourcing & Data Entry Hub
            </span>
            {isSuperOrAdmin && (
              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-[11px] font-semibold border border-purple-200">
                Admin Executive View
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mt-2">
            {isSuperOrAdmin ? 'Data Entry Productivity & Utilization Tracker' : 'My Sourcing & Scan Performance'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isSuperOrAdmin
              ? 'Real-time overview of resumes uploaded, recruiter utilization rates, and hiring funnel conversions per team member.'
              : `Track all resumes you scan, how many are picked up by recruiters, and how many lead to selections.`}
          </p>
        </div>

        {/* Date Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'week', label: 'Last 7 Days' },
            { id: 'month', label: 'Last 30 Days' },
            { id: 'all', label: 'All-Time' },
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setRange(btn.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                range === btn.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
          <button
            onClick={fetchStats}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Custom Range Selector (Collapsible) ── */}
      {range === 'custom' && (
        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Select Custom Date Range:
          </span>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-emerald-500"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-emerald-500"
          />
          <button
            onClick={handleCustomFilterApply}
            className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
          >
            Apply Range
          </button>
        </div>
      )}

      {/* ── Key Performance Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Scanned */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Candidates Scanned</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Upload className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-black text-slate-800 tracking-tight">
              {loading ? '...' : summary.totalScanned.toLocaleString()}
            </h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              Entered via ATS scanner / bulk upload
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
        </div>

        {/* Utilised */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recruiter Utilised</span>
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-black text-blue-600 tracking-tight">
              {loading ? '...' : summary.utilised.toLocaleString()}
            </h3>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">
                {summary.utilizationRate}% of pool
              </span>
              <span className="text-xs text-slate-400">Called / Processed</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
        </div>

        {/* Still Unused */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Still Untouched</span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-black text-amber-600 tracking-tight">
              {loading ? '...' : summary.unused.toLocaleString()}
            </h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              Waiting in General / Calling Pool
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
        </div>

        {/* Selected */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Interview Selects</span>
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-black text-purple-600 tracking-tight">
              {loading ? '...' : summary.selected.toLocaleString()}
            </h3>
            <p className="text-xs text-slate-400 mt-1">Cleared L1/L2/Final rounds</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
        </div>

        {/* Joined */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Joined White Horse</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-black text-emerald-700 tracking-tight">
              {loading ? '...' : summary.joined.toLocaleString()}
            </h3>
            <p className="text-xs text-slate-400 mt-1">Confirmed client joinings</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
        </div>
      </div>

      {/* ── Utilization Health Bar ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1 max-w-md">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Data Utilization Pipeline</span>
          </div>
          <h4 className="text-lg font-bold">
            {summary.utilizationRate}% of Scanned Resumes are Actively Utilised
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Candidates uploaded by your team are continuously feeding the live calling queues. Unused candidates remain recyclable for 30+ days.
          </p>
        </div>

        <div className="flex-1 max-w-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-blue-400">Utilised: {summary.utilised} ({summary.utilizationRate}%)</span>
            <span className="text-amber-400">Untouched: {summary.unused} ({summary.totalScanned ? 100 - summary.utilizationRate : 0}%)</span>
          </div>
          <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden flex p-0.5 border border-slate-700">
            <div
              style={{ width: `${summary.utilizationRate}%` }}
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-700"
            />
          </div>
        </div>

        {/* Quick Sourcing Action Buttons */}
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => navigate('/recruiter/scan')}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <ScanLine className="w-3.5 h-3.5" /> Bulk Scan Resumes
          </button>
          <button
            onClick={() => navigate('/admin/excel-import')}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
          >
            <Upload className="w-3.5 h-3.5" /> Import Excel
          </button>
        </div>
      </div>

      {/* ── Admin Section: Per-Employee Breakdown Table ── */}
      {isSuperOrAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-slate-800 text-base">
                  Data Entry & MIS Team Breakdown
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Individual performance breakdown showing who scanned, what recruiters utilised, and conversions.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by name (e.g. Sohail)..."
                  value={teamSearch}
                  onChange={e => setTeamSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-purple-400 w-56"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="py-3 px-5">Team Member</th>
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4 text-center">Total Scanned</th>
                  <th className="py-3 px-4 text-center">Utilised by Recruiters</th>
                  <th className="py-3 px-4 text-center">Still Unused</th>
                  <th className="py-3 px-4 text-center">Selections</th>
                  <th className="py-3 px-4 text-center">Joinings</th>
                  <th className="py-3 px-5 text-right">Utilization Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredTeam.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      No data entry or MIS activity found for this period. Try switching the date range.
                    </td>
                  </tr>
                ) : (
                  filteredTeam.map((item, idx) => (
                    <tr key={item.userId || idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-5 font-semibold text-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center">
                            {item.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-xs">{item.name}</p>
                            <p className="text-[10px] text-slate-400">{item.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-500">
                        {item.employeeId}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200">
                          {item.scanned}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-semibold">
                          {item.utilised}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md text-xs font-semibold">
                          {item.unused}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-xs font-semibold">
                          {item.selected}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-md text-xs font-bold">
                          {item.joined}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              style={{ width: `${item.utilizationRate}%` }}
                              className="bg-emerald-500 h-full rounded-full"
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-700 min-w-[34px]">
                            {item.utilizationRate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Recent Scanned Candidates ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              Recently Scanned Profiles
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live feed of candidate resumes entered into the ATS.
            </p>
          </div>
          <button
            onClick={() => navigate('/recruiter/ats-database')}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            Open Full ATS Database <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <th className="py-3 px-5">Candidate Name</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Role / Position</th>
                <th className="py-3 px-4">Scanned By</th>
                <th className="py-3 px-4">Date Added</th>
                <th className="py-3 px-5 text-right">Recruiter Action Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {recentCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No recent candidates uploaded in this timeframe.
                  </td>
                </tr>
              ) : (
                recentCandidates.map(cand => {
                  const isUtilised = cand.firstCallSubmitted || cand.candidateContacted || !['Screening', 'New', 'Unassigned'].includes(cand.status);
                  return (
                    <tr key={cand._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-5 font-semibold text-slate-800">
                        {cand.name}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono">
                        {cand.phone || cand.email || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {cand.positionApplied || 'General Applicant'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold text-[11px]">
                          {cand.scannedByName || 'MIS / Sourcer'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {cand.scannedDate
                          ? new Date(cand.scannedDate).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Recent'}
                      </td>
                      <td className="py-3 px-5 text-right">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                            isUtilised
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {isUtilised ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> Utilised ({cand.status})
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" /> Still Untouched
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
