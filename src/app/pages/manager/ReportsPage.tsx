import { useState, useEffect, Fragment } from 'react';
import { Download, Filter, TrendingUp, TrendingDown, ChevronUp, ChevronDown, Briefcase, FileText, DollarSign, Users, Search, CheckCircle2, Clock, Building2, UserCheck, Layers } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../../services/api';

export function ReportsPage() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(todayStr);
  const [sortField, setSortField] = useState<string>('revenue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [departmentData, setDepartmentData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active View Tab
  const [activeView, setActiveView] = useState<
    'active-jr' | 'active-profiles' | 'expected-revenue' | 'lead-performance' | 'recruiter' | 'customer' | 'division' | 'aging' | 'conversion'
  >('active-jr');

  // Reports Datasets
  const [customerData, setCustomerData] = useState<any[]>([]);
  const [divisionData, setDivisionData] = useState<any[]>([]);
  const [agingData, setAgingData] = useState<any>({ avgStageAging: {}, candidates: [] });
  const [conversionData, setConversionData] = useState<any[]>([]);

  // 4 New Specific Reports Datasets
  const [activeJRsData, setActiveJRsData] = useState<any[]>([]);
  const [activeProfilesData, setActiveProfilesData] = useState<any[]>([]);
  const [expectedRevenueData, setExpectedRevenueData] = useState<{
    joinedCandidates?: any[];
    customerRevenue: any[];
    divisionRevenue: any[];
    totalExpectedRevenue: number;
    totalJoinedRevenue?: number;
  }>({ joinedCandidates: [], customerRevenue: [], divisionRevenue: [], totalExpectedRevenue: 0 });
  const [leadPerformanceData, setLeadPerformanceData] = useState<any[]>([]);

  // Sub-filters for views
  const [activeJRSearch, setActiveJRSearch] = useState('');
  const [activeProfileFilter, setActiveProfileFilter] = useState<string>('All');
  const [divisionFilter, setDivisionFilter] = useState<string>('All Divisions');
  const [tlFilter, setTlFilter] = useState<string>('All Team Leads');
  const [tlsList, setTlsList] = useState<string[]>([]);
  const [revenueSubView, setRevenueSubView] = useState<'customer' | 'division' | 'candidate'>('customer');
  const [expandedJR, setExpandedJR] = useState<string | null>(null);

  const fmt = (n: number) => {
    if (!n) return '₹0';
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
    return `₹${(n / 1000).toFixed(0)} K`;
  };

  const loadReports = async (from: string, to: string, div = divisionFilter, tl = tlFilter) => {
    try {
      setLoading(true);
      const params: Record<string, string> = { from, to };
      if (div && div !== 'All Divisions') params.division = div;
      if (tl && tl !== 'All Team Leads') params.tlId = tl;

      const data = await api.getManagerReports(params);
      const raw = data.reports || data.performanceData || data.recruiterPerformance || [];
      setPerformanceData(raw.map((r: any) => ({
        recruiter: r.recruiter || r.name || '',
        calls: r.calls ?? r.totalCalls ?? 0,
        interviews: r.interviews ?? 0,
        placed: r.placed ?? r.placements ?? 0,
        convRate: r.convRate || (r.conversionRate != null ? `${r.conversionRate}%` : '0%'),
        revenue: r.revenue ?? ((r.placements || 0) * 25000),
        trend: r.trend || ((r.conversionRate ?? 0) > 30 ? 'up' : 'down'),
      })));
      setMonthlyData(data.monthlyData || data.monthlyOverview || []);

      // Fetch advanced reports data
      const advData = await api.getAdvancedReports(params);
      setCustomerData(advData.customerReport || []);
      setDivisionData(advData.divisionReport || []);
      setAgingData(advData.aging || { avgStageAging: {}, candidates: [] });
      setConversionData(advData.conversionReport || []);

      // 4 New Specific Reports Datasets
      const jrs = advData.activeJRsReport || [];
      const profiles = advData.activeProfilesReport || [];
      setActiveJRsData(jrs);
      setActiveProfilesData(profiles);
      setExpectedRevenueData(advData.expectedRevenueReport || { customerRevenue: [], divisionRevenue: [], totalExpectedRevenue: 0 });
      setLeadPerformanceData(advData.leadRecruiterPerformanceReport || []);

      // Populate TLs list
      const uniqueTLs = new Set<string>();
      jrs.forEach((j: any) => { if (j.teamLeader && j.teamLeader !== 'Unassigned') uniqueTLs.add(j.teamLeader); });
      profiles.forEach((p: any) => { if (p.teamLeader && p.teamLeader !== 'Unassigned') uniqueTLs.add(p.teamLeader); });
      if (advData.leadRecruiterPerformanceReport) {
        advData.leadRecruiterPerformanceReport.forEach((l: any) => {
          if (l.role === 'Team Lead' && l.name) uniqueTLs.add(l.name);
        });
      }
      setTlsList(Array.from(uniqueTLs).sort());

      // Fetch additional dashboard data for department distribution
      const dashData = await api.getManagerDashboard();
      setDepartmentData(dashData.departmentDistribution || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports(dateFrom, dateTo, divisionFilter, tlFilter);
  }, []);

  const sorted = [...performanceData].sort((a, b) => {
    const va = (a as any)[sortField];
    const vb = (b as any)[sortField];
    if (typeof va === 'number' && typeof vb === 'number') {
      return sortDir === 'asc' ? va - vb : vb - va;
    }
    return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 text-slate-300" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-green-500" /> : <ChevronDown className="w-3 h-3 text-green-500" />;
  };

  const getActiveInactiveGroup = (status: string) => {
    if (!status) return 'Active';
    const s = String(status).trim().toLowerCase();
    const inactiveExact = [
      'candidate drop post l2 select', 'no show', 'test reject', 'not eligible', 'final reject',
      'l1 reject', 'l2 reject', 'offer reject', 'duplicate-client', 'duplicate client',
      'not interested', 'no response', 'not reachable', 'candidate drop post l1 select',
      'candidate drop during final stage', 'vna reject', 'joined and abort', 'black list', 'blacklist',
      'exited', 'rejected', 'wrong number', 'unreachable', 'did not pick', 'unanswered calls',
      'offer declined', 'rejected – communication', 'rejected – experience mismatch',
      'rejected – salary mismatch', 'rejected – location constraint', 'rejected – notice period',
      'rejected – second round', 'rejected – interview round', 'background verification failed',
      'duplicate profile'
    ];
    if (inactiveExact.includes(s)) return 'Inactive';
    if (
      s.includes('reject') || s.includes('drop') || s.includes('no show') ||
      s.includes('not eligible') || s.includes('duplicate') || s.includes('abort') ||
      s.includes('black') || s.includes('no response') || s.includes('not interested') ||
      s.includes('did not pick') || s.includes('unreachable') || s.includes('wrong number')
    ) {
      return 'Inactive';
    }
    return 'Active';
  };

  // Filtered Active Profiles
  const filteredActiveProfiles = activeProfilesData.filter(c => {
    if (activeProfileFilter === 'Active') {
      if (getActiveInactiveGroup(c.status) !== 'Active') return false;
    } else if (activeProfileFilter === 'Inactive') {
      if (getActiveInactiveGroup(c.status) !== 'Inactive') return false;
    } else if (activeProfileFilter === 'Joined') {
      if (c.status !== 'Joined') return false;
    } else if (activeProfileFilter === 'Documentation') {
      if (!['Documentation', 'Document Pending', 'Documents Pending', 'Document Initialized', 'Documentation Completed', 'Documentation Incomplete'].includes(c.status)) return false;
    } else if (activeProfileFilter === 'Pending Customer') {
      if (!['HR Shortlist', 'SPOC Shortlisted', 'Selected for Call', 'Operations Round', 'Interview Scheduled', 'Written Test', 'Submitted to Client', 'Selected', 'Test Select', 'Final Select'].includes(c.status)) return false;
    } else if (activeProfileFilter === 'Yet To Join') {
      if (!['Yet To Join', 'Joining Date Confirmed', 'Joining Postponed', 'Offer Accept', 'Offer Accepted', 'Offered', 'Offer Released', 'Waiting for Offer'].includes(c.status)) return false;
    } else if (activeProfileFilter === 'Screening') {
      if (!['Screening', 'Contacted', 'Interested', 'Selected for Call', 'Eligible Candidates', 'Call Back', 'Eligible'].includes(c.status)) return false;
    }
    return true;
  });

  // Filtered Active JRs
  const filteredActiveJRs = activeJRsData.filter(j =>
    !activeJRSearch.trim() ||
    j.jrNumber.toLowerCase().includes(activeJRSearch.toLowerCase()) ||
    j.customerName.toLowerCase().includes(activeJRSearch.toLowerCase()) ||
    j.jobTitle.toLowerCase().includes(activeJRSearch.toLowerCase()) ||
    j.skills.toLowerCase().includes(activeJRSearch.toLowerCase()) ||
    (j.division && j.division.toLowerCase().includes(activeJRSearch.toLowerCase())) ||
    (j.teamLeader && j.teamLeader.toLowerCase().includes(activeJRSearch.toLowerCase()))
  );

  // Generic CSV exporter for current view
  const exportCurrentViewCSV = () => {
    let filename = `report_${activeView}_${dateFrom}_${dateTo}.csv`;
    let csv = '';

    if (activeView === 'active-jr') {
      filename = `active_jr_report_${dateFrom}_${dateTo}.csv`;
      csv = 'JR Number,Customer Name,Job Title,Division,Team Leader,Skills,Open Positions,Active Profiles in Pipeline,Creator / Owner,Status\n' +
        filteredActiveJRs.map(j => `"${j.jrNumber}","${j.customerName}","${j.jobTitle}","${j.division || 'BPO'}","${j.teamLeader || 'Unassigned'}","${j.skills.replace(/"/g, '""')}",${j.positions},${j.activeProfilesCount},"${j.createdBy}","${j.status}"`).join('\n');
    } else if (activeView === 'active-profiles') {
      filename = `active_profiles_report_${dateFrom}_${dateTo}.csv`;
      csv = 'Candidate Name,Phone,Email,Position Applied,Customer Name,Division,Active Status,Active/Inactive,JR Number,Recruiter,Team Leader,Days Pending,Last Updated\n' +
        filteredActiveProfiles.map(c => `"${c.name}","${c.phone}","${c.email}","${c.positionApplied}","${c.clientName}","${c.division || 'BPO'}","${c.status}","${getActiveInactiveGroup(c.status)}","${c.jrNumber}","${c.recruiter}","${c.teamLeader || 'Unassigned'}",${c.daysPending},"${c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : ''}"`).join('\n');
    } else if (activeView === 'expected-revenue') {
      filename = `expected_revenue_report_${revenueSubView}_${dateFrom}_${dateTo}.csv`;
      if (revenueSubView === 'candidate') {
        csv = 'Candidate Name,Customer / Client Name,Date of Joining,Offered CTC,Recruiter,Team Leader,Revenue Generated\n' +
          (expectedRevenueData.joinedCandidates || []).map(c => `"${c.name}","${c.customerName}","${c.doj || c.joinedDate || '—'}",${c.ctc || 0},"${c.recruiter}","${c.teamLeader || 'Unassigned'}",${c.revenue || 0}`).join('\n');
      } else if (revenueSubView === 'customer') {
        csv = 'Customer Name,Yet To Join Count,Joined Count,Expected Revenue,Actual Joined Revenue\n' +
          expectedRevenueData.customerRevenue.map(c => `"${c.customerName}",${c.yetToJoinCount},${c.joinedCount},${c.expectedRevenue},${c.actualJoinedRevenue}`).join('\n');
      } else {
        csv = 'Division,Yet To Join Count,Joined Count,Expected Revenue,Actual Joined Revenue\n' +
          expectedRevenueData.divisionRevenue.map(d => `"${d.division}",${d.yetToJoinCount},${d.joinedCount},${d.expectedRevenue},${d.actualJoinedRevenue}`).join('\n');
      }
    } else if (activeView === 'lead-performance') {
      filename = `lead_recruiter_performance_${dateFrom}_${dateTo}.csv`;
      csv = 'Name,Employee ID,Role,Profiles Submitted,Selects,Joinees,Joinees vs Submitted %,Joinees vs Selects %\n' +
        leadPerformanceData.map(l => `"${l.name}","${l.employeeId}","${l.role}",${l.submitted},${l.selects},${l.joinees},"${l.joineesVsSubmittedRatio}","${l.joineesVsSelectsRatio}"`).join('\n');
    } else {
      csv = 'Recruiter,Calls,Interviews,Placed,Conv Rate,Revenue\n' +
        performanceData.map((r: any) => `"${r.recruiter}",${r.calls},${r.interviews},${r.placed},"${r.convRate}",${r.revenue}`).join('\n');
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-slate-800 font-bold text-xl">System Analytics & Management Reports</h1>
          <p className="text-slate-500 text-sm mt-0.5">Comprehensive tracking of active JRs, pipeline profiles, revenue & recruiter performance</p>
        </div>
        <button
          onClick={exportCurrentViewCSV}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-semibold shadow-sm"
        >
          <Download className="w-4 h-4" />
          Export Report (CSV)
        </button>
      </div>

      {/* Date & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
              <Filter className="w-4 h-4 text-slate-400" />
              <span>Date Range:</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white"
              />
              <span className="text-slate-400 text-sm">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white"
              />
            </div>
            <button
              onClick={() => loadReports(dateFrom, dateTo, divisionFilter, tlFilter)}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-semibold shadow-sm"
            >
              Apply Filter
            </button>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { label: 'This Month', from: firstOfMonth, to: todayStr },
              { label: 'Last Month', from: new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0], to: new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0] },
              { label: 'Year To Date', from: `${today.getFullYear()}-01-01`, to: todayStr }
            ].map(preset => (
              <button
                key={preset.label}
                onClick={() => {
                  setDateFrom(preset.from);
                  setDateTo(preset.to);
                  loadReports(preset.from, preset.to, divisionFilter, tlFilter);
                }}
                className="px-3 py-1.5 border border-slate-200 text-slate-600 text-xs rounded-lg hover:bg-slate-50 font-medium transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Division & Team Leader Global Slicers */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Division:</span>
            <select
              value={divisionFilter}
              onChange={e => {
                const newDiv = e.target.value;
                setDivisionFilter(newDiv);
                loadReports(dateFrom, dateTo, newDiv, tlFilter);
              }}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium bg-slate-50 text-slate-700 outline-none focus:border-green-500"
            >
              <option value="All Divisions">All Divisions</option>
              <option value="BPO">BPO</option>
              <option value="IT">IT</option>
              <option value="Lateral">Lateral</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Team Leader:</span>
            <select
              value={tlFilter}
              onChange={e => {
                const newTl = e.target.value;
                setTlFilter(newTl);
                loadReports(dateFrom, dateTo, divisionFilter, newTl);
              }}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium bg-slate-50 text-slate-700 outline-none focus:border-green-500"
            >
              <option value="All Team Leads">All Team Leads</option>
              {tlsList.map(tl => (
                <option key={tl} value={tl}>{tl}</option>
              ))}
            </select>
          </div>

          {(divisionFilter !== 'All Divisions' || tlFilter !== 'All Team Leads') && (
            <button
              onClick={() => {
                setDivisionFilter('All Divisions');
                setTlFilter('All Team Leads');
                loadReports(dateFrom, dateTo, 'All Divisions', 'All Team Leads');
              }}
              className="text-xs text-red-600 hover:text-red-700 font-semibold underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Open JRs', value: activeJRsData.length, color: 'emerald', icon: Briefcase },
          { label: 'Active Pipeline Profiles', value: activeProfilesData.length, color: 'blue', icon: Users },
          { label: 'Total Expected Revenue', value: fmt(expectedRevenueData.totalExpectedRevenue), color: 'violet', icon: DollarSign },
          { label: 'Avg Conv. Rate', value: performanceData.length ? (performanceData.reduce((s: number, r: any) => s + parseFloat(r.convRate || '0'), 0) / performanceData.length).toFixed(1) + '%' : '—', color: 'amber', icon: TrendingUp },
        ].map((s, i) => {
          const bgMap: Record<string, string> = {
            blue: 'text-blue-600 bg-blue-50',
            emerald: 'text-emerald-600 bg-emerald-50',
            violet: 'text-violet-600 bg-violet-50',
            amber: 'text-amber-600 bg-amber-50',
          };
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-slate-800">{s.value}</div>
                <div className="text-slate-500 text-xs mt-0.5 font-medium">{s.label}</div>
              </div>
              <div className={`p-3 rounded-xl ${bgMap[s.color]}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Report View Tabs Navigation */}
      <div className="bg-white rounded-xl border border-slate-100 p-2 shadow-sm overflow-x-auto">
        <div className="flex gap-1.5 min-w-max">
          {[
            { id: 'active-jr', label: '1. Active JR Report', icon: Briefcase },
            { id: 'active-profiles', label: '2. Active Status Profiles', icon: Users },
            { id: 'expected-revenue', label: '3. Expected Revenue', icon: DollarSign },
            { id: 'lead-performance', label: '4. Lead & Recruiter Performance', icon: TrendingUp },
            { id: 'recruiter', label: 'Recruiter Wise', icon: UserCheck },
            { id: 'customer', label: 'Customer Wise', icon: Building2 },
            { id: 'division', label: 'Division Wise', icon: Layers },
            { id: 'aging', label: 'Aging Report', icon: Clock },
            { id: 'conversion', label: 'Conversion Ratio', icon: TrendingUp },
          ].map(v => {
            const Icon = v.icon;
            const isActive = activeView === v.id;
            return (
              <button
                key={v.id}
                onClick={() => setActiveView(v.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. ACTIVE JR REPORT VIEW */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeView === 'active-jr' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-slate-800 font-bold text-sm">Active Job Requisitions (JRs)</h3>
              <p className="text-slate-500 text-xs mt-0.5">List of open requirement JRs with Division & Team Leader mappings</p>
            </div>
            <div className="relative w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search JR #, Client, Title, Division, TL..."
                value={activeJRSearch}
                onChange={e => setActiveJRSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-green-500 bg-slate-50/50"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-left text-slate-500 uppercase tracking-wide">
                    <th className="px-3.5 py-3 font-semibold">JR Number</th>
                    <th className="px-3.5 py-3 font-semibold">Customer / Client</th>
                    <th className="px-3.5 py-3 font-semibold">Job Title</th>
                    <th className="px-3.5 py-3 font-semibold">Division</th>
                    <th className="px-3.5 py-3 font-semibold">Team Leader</th>
                    <th className="px-3.5 py-3 font-semibold">Required Skills</th>
                    <th className="px-3 py-3 font-semibold text-center">Open Pos.</th>
                    <th className="px-3 py-3 font-semibold text-center">Active Pipeline</th>
                    <th className="px-3.5 py-3 font-semibold">Created By</th>
                    <th className="px-3 py-3 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredActiveJRs.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-slate-400">No active job requisitions found matching your criteria.</td>
                    </tr>
                  ) : (
                    filteredActiveJRs.map(j => (
                      <Fragment key={j._id}>
                        <tr className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-3.5 py-3.5 font-mono font-bold text-blue-600">{j.jrNumber}</td>
                          <td className="px-3.5 py-3.5 font-semibold text-slate-900">{j.customerName}</td>
                          <td className="px-3.5 py-3.5 font-medium">{j.jobTitle}</td>
                          <td className="px-3.5 py-3.5">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              j.division === 'IT' ? 'bg-cyan-100 text-cyan-800' :
                              j.division === 'Lateral' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {j.division || 'BPO'}
                            </span>
                          </td>
                          <td className="px-3.5 py-3.5 font-medium text-slate-700">{j.teamLeader || 'Unassigned'}</td>
                          <td className="px-3.5 py-3.5 max-w-xs truncate text-slate-600" title={j.skills}>{j.skills}</td>
                          <td className="px-3 py-3.5 text-center font-semibold text-slate-800">{j.positions}</td>
                          <td className="px-3 py-3.5 text-center">
                            <span className={`px-2.5 py-1 rounded-full font-bold ${j.activeProfilesCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                              {j.activeProfilesCount} active
                            </span>
                          </td>
                          <td className="px-3.5 py-3.5 font-medium text-slate-700">{j.createdBy}</td>
                          <td className="px-3 py-3.5 text-center">
                            <button
                              onClick={() => setExpandedJR(expandedJR === j._id ? null : j._id)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                            >
                              {expandedJR === j._id ? 'Hide Candidates' : 'View Pipeline'}
                            </button>
                          </td>
                        </tr>
                        {/* Expanded Candidate Pipeline */}
                        {expandedJR === j._id && (
                          <tr className="bg-slate-50/80">
                            <td colSpan={10} className="p-4">
                              <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
                                <h4 className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5 text-blue-600" />
                                  Active Pipeline Candidates for {j.jrNumber} – {j.jobTitle} ({j.activeCandidates.length})
                                </h4>
                                {j.activeCandidates.length === 0 ? (
                                  <p className="text-slate-400 text-xs italic">No active candidates linked to this JR currently in progress.</p>
                                ) : (
                                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                                    {j.activeCandidates.map((c: any) => (
                                      <div key={c._id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                                        <div className="font-bold text-slate-800">{c.name}</div>
                                        <div className="text-slate-500">{c.phone} · {c.email || 'No email'}</div>
                                        <div className="mt-1 flex items-center justify-between text-[11px]">
                                          <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-semibold">{c.status}</span>
                                          <span className="text-slate-500 font-medium">{c.recruiter}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. ACTIVE STATUS PROFILES REPORT VIEW */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeView === 'active-profiles' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-slate-800 font-bold text-sm">Active Pipeline Profiles Report</h3>
              <p className="text-slate-500 text-xs mt-0.5">Filter active candidates across Documentation, Pending with Customer, Yet to Join & Screening with TL mappings</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['All', 'Active', 'Inactive', 'Joined', 'Documentation', 'Pending Customer', 'Yet To Join', 'Screening'].map(flt => (
                <button
                  key={flt}
                  onClick={() => setActiveProfileFilter(flt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeProfileFilter === flt
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {flt}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-left text-slate-500 uppercase tracking-wide">
                    <th className="px-3.5 py-3 font-semibold">Candidate Name</th>
                    <th className="px-3.5 py-3 font-semibold">Contact Info</th>
                    <th className="px-3.5 py-3 font-semibold">Position Applied</th>
                    <th className="px-3.5 py-3 font-semibold">Customer / Client</th>
                    <th className="px-3.5 py-3 font-semibold">Division</th>
                    <th className="px-3.5 py-3 font-semibold">Active Status</th>
                    <th className="px-3.5 py-3 font-semibold">Active/Inactive</th>
                    <th className="px-3.5 py-3 font-semibold">JR Number</th>
                    <th className="px-3.5 py-3 font-semibold">Recruiter</th>
                    <th className="px-3.5 py-3 font-semibold">Team Leader</th>
                    <th className="px-3.5 py-3 font-semibold text-center">Days Pending</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  {filteredActiveProfiles.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-12 text-slate-400">No active profiles matching the selected status filter.</td>
                    </tr>
                  ) : (
                    filteredActiveProfiles.map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-3.5 py-3.5 font-bold text-slate-900">{c.name}</td>
                        <td className="px-3.5 py-3.5 text-slate-500">{c.phone} {c.email ? `· ${c.email}` : ''}</td>
                        <td className="px-3.5 py-3.5 font-medium">{c.positionApplied}</td>
                        <td className="px-3.5 py-3.5 font-semibold text-blue-600">{c.clientName}</td>
                        <td className="px-3.5 py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            c.division === 'IT' ? 'bg-cyan-100 text-cyan-800' :
                            c.division === 'Lateral' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {c.division || 'BPO'}
                          </span>
                        </td>
                        <td className="px-3.5 py-3.5">
                          <span className={`px-2.5 py-1 rounded-full font-semibold ${
                            c.status === 'Joined' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            c.status === 'Offer Accept' ? 'bg-purple-100 text-purple-700' :
                            c.status.includes('Document') ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-3.5 py-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            getActiveInactiveGroup(c.status) === 'Active'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-red-100 text-red-800 border border-red-300'
                          }`}>
                            {getActiveInactiveGroup(c.status)}
                          </span>
                        </td>
                        <td className="px-3.5 py-3.5 font-mono text-slate-600">{c.jrNumber}</td>
                        <td className="px-3.5 py-3.5 text-slate-600">{c.recruiter}</td>
                        <td className="px-3.5 py-3.5 font-medium text-slate-700">{c.teamLeader || 'Unassigned'}</td>
                        <td className="px-3.5 py-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded font-semibold ${
                            c.daysPending > 14 ? 'bg-red-100 text-red-700' :
                            c.daysPending > 7 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {c.daysPending} days
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
      {/* 3. EXPECTED REVENUE REPORT VIEW */}
      {/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
      {activeView === 'expected-revenue' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-slate-800 font-bold text-sm">Expected Placement Revenue Report</h3>
              <p className="text-slate-500 text-xs mt-0.5">Projected revenue based on offered CTC and Yet to Join pipeline</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setRevenueSubView('customer')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  revenueSubView === 'customer' ? 'bg-violet-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Customer Wise Revenue
              </button>
              <button
                onClick={() => setRevenueSubView('division')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  revenueSubView === 'division' ? 'bg-violet-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Division Wise Revenue
              </button>
              <button
                onClick={() => setRevenueSubView('candidate')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  revenueSubView === 'candidate' ? 'bg-violet-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Candidate Wise Report
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 bg-violet-50/50 border-b border-violet-100 flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-700 font-semibold text-xs">
                {revenueSubView === 'candidate' ? 'Total Joined Candidates:' : 'Total Projected Revenue:'}
              </span>
              <span className="text-violet-700 font-extrabold text-base">
                {revenueSubView === 'candidate'
                  ? `${(expectedRevenueData.joinedCandidates || []).length} Joinees (${fmt(expectedRevenueData.totalJoinedRevenue || (expectedRevenueData.joinedCandidates || []).reduce((s, c) => s + (c.revenue || 0), 0))})`
                  : fmt(expectedRevenueData.totalExpectedRevenue)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  {revenueSubView === 'candidate' ? (
                    <tr className="bg-slate-50 border-b border-slate-100 text-left text-slate-500 uppercase tracking-wide">
                      <th className="px-4 py-3 font-semibold">Candidate Name</th>
                      <th className="px-4 py-3 font-semibold">Customer / Client Name</th>
                      <th className="px-4 py-3 font-semibold">Date of Joining (DOJ)</th>
                      <th className="px-4 py-3 font-semibold">CTC Offered</th>
                      <th className="px-4 py-3 font-semibold">Recruiter</th>
                      <th className="px-4 py-3 font-semibold">Team Leader</th>
                      <th className="px-4 py-3 font-semibold text-right text-emerald-700">Revenue Generated</th>
                    </tr>
                  ) : (
                    <tr className="bg-slate-50 border-b border-slate-100 text-left text-slate-500 uppercase tracking-wide">
                      <th className="px-5 py-3 font-semibold">{revenueSubView === 'customer' ? 'Customer / Client Name' : 'Division'}</th>
                      <th className="px-5 py-3 font-semibold text-center">Yet To Join Candidates</th>
                      <th className="px-5 py-3 font-semibold text-center">Joined Candidates</th>
                      <th className="px-5 py-3 font-semibold text-right text-violet-700">Expected Revenue (Projected)</th>
                      <th className="px-5 py-3 font-semibold text-right text-emerald-700">Actual Joined Revenue</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  {revenueSubView === 'candidate' ? (
                    (expectedRevenueData.joinedCandidates || []).length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-10 text-slate-400">No joined candidates available for the selected period.</td></tr>
                    ) : (
                      (expectedRevenueData.joinedCandidates || []).map((c, i) => (
                        <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-slate-900">{c.name}</td>
                          <td className="px-4 py-3.5 font-semibold text-blue-600">{c.customerName}</td>
                          <td className="px-4 py-3.5 text-slate-600">{c.doj || c.joinedDate || '—'}</td>
                          <td className="px-4 py-3.5 font-semibold text-slate-800">{c.ctc ? `₹${Number(c.ctc).toLocaleString('en-IN')}` : '—'}</td>
                          <td className="px-4 py-3.5 text-slate-600">{c.recruiter}</td>
                          <td className="px-4 py-3.5 font-medium text-slate-700">{c.teamLeader || 'Unassigned'}</td>
                          <td className="px-4 py-3.5 text-right font-bold text-emerald-700">{fmt(c.revenue)}</td>
                        </tr>
                      ))
                    )
                  ) : revenueSubView === 'customer' ? (
                    expectedRevenueData.customerRevenue.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-10 text-slate-400">No customer revenue data available.</td></tr>
                    ) : (
                      expectedRevenueData.customerRevenue.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-slate-900">{r.customerName}</td>
                          <td className="px-5 py-3.5 text-center font-semibold text-purple-600">{r.yetToJoinCount}</td>
                          <td className="px-5 py-3.5 text-center font-semibold text-emerald-600">{r.joinedCount}</td>
                          <td className="px-5 py-3.5 text-right font-bold text-violet-700">{fmt(r.expectedRevenue)}</td>
                          <td className="px-5 py-3.5 text-right font-bold text-emerald-700">{fmt(r.actualJoinedRevenue)}</td>
                        </tr>
                      ))
                    )
                  ) : (
                    expectedRevenueData.divisionRevenue.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-10 text-slate-400">No division revenue data available.</td></tr>
                    ) : (
                      expectedRevenueData.divisionRevenue.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-slate-900">{r.division} Division</td>
                          <td className="px-5 py-3.5 text-center font-semibold text-purple-600">{r.yetToJoinCount}</td>
                          <td className="px-5 py-3.5 text-center font-semibold text-emerald-600">{r.joinedCount}</td>
                          <td className="px-5 py-3.5 text-right font-bold text-violet-700">{fmt(r.expectedRevenue)}</td>
                          <td className="px-5 py-3.5 text-right font-bold text-emerald-700">{fmt(r.actualJoinedRevenue)}</td>
                        </tr>
                      ))
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
      {/* 4. LEAD & RECRUITER PERFORMANCE REPORT VIEW */}
      {/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
      {activeView === 'lead-performance' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex justify-between items-center">
            <div>
              <h3 className="text-slate-800 font-bold text-sm">Team Leads & Recruiter Performance Ratios</h3>
              <p className="text-slate-500 text-xs mt-0.5">Ratio of Joinees vs Profiles Submitted & Joinees vs Selects</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-left text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Employee ID</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold text-center">Profiles Submitted</th>
                    <th className="px-4 py-3 font-semibold text-center">Selects</th>
                    <th className="px-4 py-3 font-semibold text-center">Joinees</th>
                    <th className="px-4 py-3 font-semibold text-center text-blue-700 bg-blue-50/50">Joinees Vs Submitted</th>
                    <th className="px-4 py-3 font-semibold text-center text-emerald-700 bg-emerald-50/50">Joinees Vs Selects</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  {leadPerformanceData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400">No performance activity recorded for this period.</td>
                    </tr>
                  ) : (
                    leadPerformanceData.map((l, i) => (
                      <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-slate-900">{l.name}</td>
                        <td className="px-4 py-3.5 font-mono text-slate-500">{l.employeeId}</td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${l.role.includes('Lead') ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                            {l.role}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center font-medium">{l.submitted}</td>
                        <td className="px-4 py-3.5 text-center font-semibold text-blue-600">{l.selects}</td>
                        <td className="px-4 py-3.5 text-center font-bold text-emerald-600">{l.joinees}</td>
                        <td className="px-4 py-3.5 text-center font-extrabold text-blue-700 bg-blue-50/30">
                          {l.joineesVsSubmittedRatio} ({l.joinees}/{l.submitted})
                        </td>
                        <td className="px-4 py-3.5 text-center font-extrabold text-emerald-700 bg-emerald-50/30">
                          {l.joineesVsSelectsRatio} ({l.joinees}/{l.selects})
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
      {/* 5. EXISTING VIEWS: RECRUITER, CUSTOMER, DIVISION, AGING, CONVERSION */}
      {/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
      {activeView === 'recruiter' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-slate-800 text-sm font-bold">Recruiter Performance Breakdown</h3>
            <span className="text-slate-400 text-xs">Click column headers to sort</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 uppercase tracking-wide text-slate-500 font-semibold">
                  {[
                    { label: 'Recruiter', field: 'recruiter' },
                    { label: 'Calls', field: 'calls' },
                    { label: 'Interviews', field: 'interviews' },
                    { label: 'Placed', field: 'placed' },
                    { label: 'Conv. Rate', field: 'convRate' },
                    { label: 'Revenue', field: 'revenue' },
                    { label: 'Trend', field: 'trend' },
                  ].map(col => (
                    <th
                      key={col.field}
                      onClick={() => toggleSort(col.field)}
                      className="px-5 py-3 text-left cursor-pointer hover:text-slate-700 select-none font-semibold"
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        <SortIcon field={col.field} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sorted.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-700 text-xs font-bold">
                            {r.recruiter.split(' ').map((n: string) => n[0]).join('')}
                          </span>
                        </div>
                        <span className="text-slate-700 text-sm font-semibold">{r.recruiter}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 text-sm">{r.calls.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-sm">{r.interviews}</td>
                    <td className="px-5 py-3.5">
                      <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold">{r.placed}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 text-sm">{r.convRate}</td>
                    <td className="px-5 py-3.5 text-slate-700 text-sm font-semibold">{fmt(r.revenue)}</td>
                    <td className="px-5 py-3.5">
                      {r.trend === 'up'
                        ? <span className="flex items-center gap-1 text-emerald-600 text-xs font-semibold"><TrendingUp className="w-3.5 h-3.5" /> Up</span>
                        : <span className="flex items-center gap-1 text-red-500 text-xs font-semibold"><TrendingDown className="w-3.5 h-3.5" /> Down</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === 'customer' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-slate-800 text-sm font-bold">Customer Performance Breakdown</h3>
            <span className="text-slate-400 text-xs">Grouped by client company</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-left text-slate-500 uppercase tracking-wide font-semibold">
                  <th className="px-5 py-3">Client Company</th>
                  <th className="px-5 py-3 text-center">Profiles Shared</th>
                  <th className="px-5 py-3 text-center">Interviews Scheduled</th>
                  <th className="px-5 py-3 text-center">Selected</th>
                  <th className="px-5 py-3 text-center">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700">
                {customerData.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-400">No client data available for this range</td></tr>
                ) : (
                  customerData.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-bold text-slate-900">{c._id || 'General'}</td>
                      <td className="px-5 py-3.5 text-center font-medium">{c.shared}</td>
                      <td className="px-5 py-3.5 text-center font-medium">{c.interviews}</td>
                      <td className="px-5 py-3.5 text-center text-blue-600 font-bold">{c.selected}</td>
                      <td className="px-5 py-3.5 text-center text-emerald-600 font-bold">{c.joined}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === 'division' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-slate-800 text-sm font-bold">Division Performance Breakdown</h3>
            <span className="text-slate-400 text-xs">Grouped by ATS Division</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-left text-slate-500 uppercase tracking-wide font-semibold">
                  <th className="px-5 py-3">ATS Division</th>
                  <th className="px-5 py-3 text-center">Profiles Shared</th>
                  <th className="px-5 py-3 text-center">Interviews Scheduled</th>
                  <th className="px-5 py-3 text-center">Selected</th>
                  <th className="px-5 py-3 text-center">Yet To Join</th>
                  <th className="px-5 py-3 text-center">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700">
                {divisionData.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-slate-400">No division data available</td></tr>
                ) : (
                  divisionData.map((d, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-bold text-slate-900">{d._id || 'BPO'} Division</td>
                      <td className="px-5 py-3.5 text-center font-medium">{d.shared}</td>
                      <td className="px-5 py-3.5 text-center font-medium">{d.interviews}</td>
                      <td className="px-5 py-3.5 text-center text-blue-600 font-bold">{d.selected}</td>
                      <td className="px-5 py-3.5 text-center text-purple-600 font-bold">{d.yetToJoin || 0}</td>
                      <td className="px-5 py-3.5 text-center text-emerald-600 font-bold">{d.joined}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === 'aging' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {['Applied', 'Screening', 'Interview', 'Offer', 'Joining'].map(stg => {
              const avgDays = agingData.avgStageAging?.[stg] || 0;
              return (
                <div key={stg} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm text-center">
                  <div className="text-2xl text-violet-600 font-bold">{avgDays} Days</div>
                  <div className="text-slate-500 text-xs mt-0.5 font-medium">{stg} Stage (Avg)</div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-slate-800 text-sm font-bold">Pipeline Candidates Aging Details</h3>
              <span className="text-xs text-slate-400">Showing active candidates in process</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-left text-slate-500 uppercase tracking-wide font-semibold">
                    <th className="px-5 py-3">Candidate Name</th>
                    <th className="px-5 py-3">Current Stage</th>
                    <th className="px-5 py-3">Detailed Status</th>
                    <th className="px-5 py-3">Pending Since</th>
                    <th className="px-5 py-3">Days Pending</th>
                    <th className="px-5 py-3">Recruiter</th>
                    <th className="px-5 py-3">Team Lead</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  {(!agingData.candidates || agingData.candidates.length === 0) ? (
                    <tr><td colSpan={7} className="text-center py-10 text-slate-400">No active candidates in the pipeline</td></tr>
                  ) : (
                    agingData.candidates.map((c: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3.5 font-bold text-slate-900">{c.name}</td>
                        <td className="px-5 py-3.5">
                          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full font-medium">{c.stage}</span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">{c.status}</td>
                        <td className="px-5 py-3.5 text-slate-600">{c.pendingSince ? new Date(c.pendingSince).toLocaleDateString() : '--'}</td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 text-xs rounded font-semibold ${
                            c.daysPending > 15 ? 'bg-red-50 text-red-600' :
                            c.daysPending > 7 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
                          }`}>
                            {c.daysPending} days
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">{c.recruiter}</td>
                        <td className="px-5 py-3.5 text-slate-600">{c.teamLead || '--'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeView === 'conversion' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-slate-800 text-sm font-bold">Recruiter Conversion Ratio</h3>
            <span className="text-slate-400 text-xs">Profiles shared to achieve selections & joins</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-left text-slate-500 uppercase tracking-wide font-semibold">
                  <th className="px-5 py-3">Recruiter</th>
                  <th className="px-5 py-3 text-center">Shared Profiles</th>
                  <th className="px-5 py-3 text-center">Interviews</th>
                  <th className="px-5 py-3 text-center">Selected</th>
                  <th className="px-5 py-3 text-center">Joined</th>
                  <th className="px-5 py-3 text-center text-blue-600">Shared : Select</th>
                  <th className="px-5 py-3 text-center text-emerald-600">Shared : Join</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700">
                {conversionData.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400">No conversion metrics available</td></tr>
                ) : (
                  conversionData.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-bold text-slate-900">{r.recruiter}</td>
                      <td className="px-5 py-3.5 text-center font-medium">{r.shared}</td>
                      <td className="px-5 py-3.5 text-center font-medium">{r.interviews}</td>
                      <td className="px-5 py-3.5 text-center text-blue-600 font-bold">{r.selected}</td>
                      <td className="px-5 py-3.5 text-center text-emerald-600 font-bold">{r.joined}</td>
                      <td className="px-5 py-3.5 text-center text-blue-700 font-bold bg-blue-50/30">{r.sharedPerSelect}</td>
                      <td className="px-5 py-3.5 text-center text-emerald-700 font-bold bg-emerald-50/30">{r.sharedPerJoin}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

