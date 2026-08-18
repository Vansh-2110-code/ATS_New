import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  Search, Filter, ChevronLeft, ChevronRight, ExternalLink,
  Users, UserCheck, UserX, Flag, RefreshCw, X, Phone, Download,
  Mail, MessageSquare,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { CANDIDATE_STATUS_OPTIONS, CANDIDATE_STATUS_COLORS } from '../../utils/candidateStatusUtils';

const SOURCES = ['Naukri', 'LinkedIn', 'Indeed', 'Walk-In', 'Referral', 'Monster', 'Company Website', 'Social Media', 'Other'];

const STATUSES = [
  ...CANDIDATE_STATUS_OPTIONS,
];

const STATUS_COLORS: Record<string, string> = {
  ...CANDIDATE_STATUS_COLORS,
};

const SOURCE_COLORS: Record<string, string> = {
  'Naukri': 'bg-amber-50 text-amber-700 border border-amber-200',
  'LinkedIn': 'bg-blue-50 text-blue-700 border border-blue-200',
  'Indeed': 'bg-violet-50 text-violet-700 border border-violet-200',
  'Walk-In': 'bg-green-50 text-green-700 border border-green-200',
  'Referral': 'bg-rose-50 text-rose-700 border border-rose-200',
};

const OWNERSHIP_STATUS_COLORS: Record<string, string> = {
  'Assigned': 'bg-green-50 text-green-700 border border-green-200',
  'Expired': 'bg-orange-50 text-orange-700 border border-orange-200',
  'Unassigned': 'bg-slate-50 text-slate-600 border border-slate-200',
  'General Data': 'bg-purple-50 text-purple-700 border border-purple-200',
};

export function CandidateDatabasePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const stateFilter = (location.state as any)?.sourceFilter as string | undefined;
  const stateStatusFilter = (location.state as any)?.statusFilter as string | undefined;

  // Role-based access: Only Admin and Manager can view candidate database
  useEffect(() => {
    if (user && !['admin', 'manager'].includes(user.role)) {
      navigate('/recruiter');
    }
  }, [user, navigate]);

  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState(stateFilter || '');
  const [statusFilter, setStatusFilter] = useState(stateStatusFilter || '');
  const [reassignFilter, setReassignFilter] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [stats, setStats] = useState({ total: 0, selected: 0, joined: 0, reassignPending: 0 });
  const [exporting, setExporting] = useState(false);

  // Selection and Bulk Actions state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);

  // Top Scrollbar and Table Width refs
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [tableWidth, setTableWidth] = useState(2800);

  const handleTopScroll = () => {
    if (topScrollRef.current && tableContainerRef.current) {
      tableContainerRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  const handleTableScroll = () => {
    if (topScrollRef.current && tableContainerRef.current) {
      topScrollRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
    }
  };

  // WhatsApp click-to-chat state
  const [waCandidate, setWaCandidate] = useState<any | null>(null);
  const [waTemplate, setWaTemplate] = useState('invite');
  const [waCustomText, setWaCustomText] = useState('');

  const getWaMessage = (temp: string, cand: any) => {
    if (!cand) return '';
    const name = cand.name || 'Candidate';
    const role = cand.positionApplied || 'the open position';
    const company = cand.clientName || 'our client';
    if (temp === 'invite') {
      return `Hello ${name}, you have been shortlisted for the position of ${role} at ${company}. Please confirm your availability for an interview. - White Horse Manpower`;
    }
    if (temp === 'docs') {
      return `Hello ${name}, we require your onboarding documents (Aadhaar, PAN, educational marksheets) for the position at ${company}. Please share them soon. - White Horse Manpower`;
    }
    if (temp === 'noResponse') {
      return `Hello ${name}, I tried calling you regarding your job application at White Horse Manpower. Please call me back when you are free.`;
    }
    return '';
  };

  useEffect(() => {
    if (waCandidate) {
      setWaCustomText(getWaMessage(waTemplate, waCandidate));
    }
  }, [waCandidate, waTemplate]);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (sourceFilter) params.source = sourceFilter;
      if (statusFilter) params.status = statusFilter;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      
      await api.exportCandidatesExcel(params);
    } catch (err: any) {
      console.error('Export failed:', err);
      alert(err.message || 'Failed to export candidates. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleSendBulkEmail = async () => {
    if (!emailSubject || !emailBody) return;
    try {
      setEmailSending(true);
      await api.bulkEmailCandidates(selectedIds, emailSubject, emailBody);
      alert('Bulk emails sent successfully!');
      setEmailModalOpen(false);
      setEmailSubject('');
      setEmailBody('');
      setSelectedIds([]);
    } catch (err: any) {
      alert(err.message || 'Failed to send bulk emails');
    } finally {
      setEmailSending(false);
    }
  };

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: page.toString(), limit: '25' };
      if (search) params.search = search;
      if (sourceFilter) params.source = sourceFilter;
      if (statusFilter) params.status = statusFilter;
      if (reassignFilter) params.reassignRequested = 'true';
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      const data = await api.getCandidates(params);
      setCandidates(data.candidates || []);
      setPagination(data.pagination || { total: 0, pages: 1 });
      setTimeout(() => {
        if (tableRef.current) setTableWidth(tableRef.current.scrollWidth);
      }, 100);
    } catch {
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [search, sourceFilter, statusFilter, reassignFilter, fromDate, toDate, page]);

  // Stats fetch (no filters)
  useEffect(() => {
    Promise.all([
      api.getCandidates({ limit: '1' }),
      api.getCandidates({ status: 'Final Select', limit: '1' }),
      api.getCandidates({ status: 'Joined', limit: '1' }),
      api.getCandidates({ limit: '1', reassignRequested: 'true' }).catch(() => ({ pagination: { total: 0 } })),
    ]).then(([all, sel, joined, reassign]) => {
      const counts = all.statusCounts || {};
      const selectedCount = sel.pagination?.total ?? (counts['Final Select'] || counts['Selected'] || 0);
      const joinedCount = joined.pagination?.total ?? (counts['Joined'] || 0);
      setStats({
        total: all.pagination?.totalCandidates || all.totalCount || all.pagination?.total || 0,
        selected: selectedCount,
        joined: joinedCount,
        reassignPending: (reassign as any).pagination?.total || 0,
      });
    }).catch(() => {});
  }, []);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, sourceFilter, statusFilter, reassignFilter, fromDate, toDate]);

  const clearFilters = () => {
    setSearch('');
    setSourceFilter('');
    setStatusFilter('');
    setReassignFilter(false);
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const hasFilters = !!(search || sourceFilter || statusFilter || reassignFilter || fromDate || toDate);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl text-slate-800" style={{ fontWeight: 700 }}>Candidate Database</h1>
            <p className="text-slate-500 text-sm mt-0.5">All candidates across all recruiters and sources</p>
          </div>
          <div className="flex gap-2">
            {user?.role === 'admin' && (
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm px-4 py-2 rounded-xl transition-colors shadow-sm disabled:opacity-50"
                style={{ fontWeight: 500 }}
              >
                {exporting ? (
                  <RefreshCw className="w-4 h-4 text-green-600 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 text-green-600" />
                )}
                {exporting ? 'Exporting...' : 'Export Candidates'}
              </button>
            )}
            <button onClick={() => navigate('/recruiter/add')}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-xl transition-colors"
              style={{ fontWeight: 500 }}>
              + Add Candidate
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Candidates', value: stats.total, icon: Users, color: 'text-slate-700', bg: 'bg-white', filter: false },
            { label: 'Selected', value: stats.selected, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', filter: false },
            { label: 'Joined', value: stats.joined, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50', filter: false },
            { label: 'Reassign Pending', value: stats.reassignPending, icon: RefreshCw, color: 'text-orange-500', bg: reassignFilter ? 'bg-orange-100 ring-2 ring-orange-400' : 'bg-orange-50', filter: true },
          ].map((s, i) => (
            <div key={i}
              onClick={() => s.filter && setReassignFilter(f => !f)}
              className={`${s.bg} rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3 ${s.filter ? 'cursor-pointer hover:bg-orange-100 transition-colors' : ''}`}>
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center flex-shrink-0">
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <div className={`text-xl ${s.color}`} style={{ fontWeight: 700 }}>{s.value.toLocaleString()}</div>
                <div className="text-slate-500 text-xs">{s.label}</div>
                {s.filter && <div className="text-orange-400 text-xs">{reassignFilter ? 'Click to clear' : 'Click to filter'}</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, phone, email, skills…"
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500/30"
            />
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <Filter className="w-4 h-4" />
          </div>
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
            className="text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-green-500/30">
            <option value="">All Sources</option>
            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-green-500/30">
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-green-500/30 text-slate-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-green-500/30 text-slate-600"
            />
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-500 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
          <button onClick={fetchCandidates} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-400 ml-auto">{pagination.total.toLocaleString()} candidates</span>
        </div>

        {/* Active source filter badge */}
        {sourceFilter && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-sm">Filtered by source:</span>
            <span className={`text-xs px-2.5 py-1 rounded-full ${SOURCE_COLORS[sourceFilter] || 'bg-slate-100 text-slate-600'}`} style={{ fontWeight: 500 }}>
              {sourceFilter}
            </span>
            <button onClick={() => setSourceFilter('')} className="text-slate-400 hover:text-red-500">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading candidates…
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-16 text-center">
              <UserX className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No candidates found</p>
            </div>
          ) : (
            <>
              {/* Top Horizontal Scrollbar */}
              <div
                ref={topScrollRef}
                onScroll={handleTopScroll}
                className="overflow-x-auto overflow-y-hidden bg-slate-100/90 border-b border-slate-200 sticky top-0 z-10"
              >
                <div style={{ width: `${tableWidth}px`, height: '12px' }} />
              </div>

              <div ref={tableContainerRef} onScroll={handleTableScroll} className="overflow-x-auto">
                <table ref={tableRef} className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-3 text-left w-10" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={candidates.length > 0 && selectedIds.length === candidates.length}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedIds(candidates.map(c => c._id));
                            } else {
                              setSelectedIds([]);
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-200 text-green-600 focus:ring-green-500"
                        />
                      </th>
                      {[
                        'Name', 'Job Title', 'Date of application', 'Email ID', 'Phone Number',
                        'Current Location', 'Preferred Locations', 'Total Experience', 'Curr. Company name',
                        'Curr. Company Designation', 'Department', 'Role', 'Industry', 'Key Skills',
                        'Annual Salary', 'Notice period/ Availability to join', 'Resume Headline', 'Summary',
                        'Under Graduation degree', 'UG Specialization', 'UG University/institute Name',
                        'UG Graduation year', 'Post graduation degree', 'PG specialization',
                        'PG university/institute name', 'PG graduation year', 'Doctorate degree',
                        'Doctorate specialization', 'Doctorate university/institute name',
                        'Doctorate graduation year', 'Gender', 'Marital Status', 'Home Town/City',
                        'Pin Code', 'Work permit for USA', 'Date of Birth', 'Permanent Address', ''
                      ].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs text-slate-500 uppercase tracking-wide whitespace-nowrap" style={{ fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {candidates.map(c => (
                      <tr key={c._id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/recruiter/candidate/${c._id}`)}>
                        <td className="px-4 py-3 w-10" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(c._id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedIds(prev => [...prev, c._id]);
                              } else {
                                setSelectedIds(prev => prev.filter(id => id !== c._id));
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-200 text-green-600 focus:ring-green-500"
                          />
                        </td>

                        {/* 1. Name */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-green-700 text-xs" style={{ fontWeight: 600 }}>
                                {c.name?.[0]?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div>
                              <p className="text-slate-700 text-xs" style={{ fontWeight: 600 }}>
                                {c.name} {c.candidateId && <span className="text-[10px] text-slate-400 font-normal ml-1">({c.candidateId})</span>}
                              </p>
                              {c.flagged && <span className="text-red-400 text-xs flex items-center gap-0.5"><Flag className="w-3 h-3" />Flagged</span>}
                              {c.reassignRequested && <span className="text-orange-500 text-xs flex items-center gap-0.5"><RefreshCw className="w-3 h-3" />Reassign Requested</span>}
                              {c.candidateActiveStatus === 'Inactive' && !c.reassignRequested && <span className="text-orange-400 text-xs">Inactive</span>}
                            </div>
                          </div>
                        </td>

                        {/* 2. Job Title */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.positionApplied || '—'}</td>
                        
                        {/* 3. Date of application */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.dateOfApplication || '—'}</td>

                        {/* 4. Email ID */}
                        <td className="px-4 py-3 text-slate-600 text-xs">{c.email || '—'}</td>

                        {/* 5. Phone Number */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.phone || '—'}</td>

                        {/* 6. Current Location */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.currentLocation || '—'}</td>

                        {/* 7. Preferred Locations */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.preferredLocation || '—'}</td>

                        {/* 8. Total Experience */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.experience || '—'}</td>

                        {/* 9. Curr. Company name */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.currentCompany || '—'}</td>

                        {/* 10. Curr. Company Designation */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.currentRole || '—'}</td>

                        {/* 11. Department */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.department || '—'}</td>

                        {/* 12. Role */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.eligibleRole || '—'}</td>

                        {/* 13. Industry */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.industry || '—'}</td>

                        {/* 14. Key Skills */}
                        <td className="px-4 py-3 text-slate-600 text-xs max-w-[200px] truncate" title={c.skills?.join(', ') || ''}>{c.skills?.join(', ') || '—'}</td>

                        {/* 15. Annual Salary */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.currentCTC || '—'}</td>

                        {/* 16. Notice period */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.noticePeriod || '—'}</td>

                        {/* 17. Resume Headline */}
                        <td className="px-4 py-3 text-slate-600 text-xs max-w-[200px] truncate" title={c.resumeHeadline || ''}>{c.resumeHeadline || '—'}</td>

                        {/* 18. Summary */}
                        <td className="px-4 py-3 text-slate-600 text-xs max-w-[200px] truncate" title={c.comments || ''}>{c.comments || '—'}</td>

                        {/* 19. Under Graduation degree */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.qualification || '—'}</td>

                        {/* 20. UG Specialization */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.ugSpecialization || '—'}</td>

                        {/* 21. UG University Name */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.university || '—'}</td>

                        {/* 22. UG Graduation year */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.yearOfGraduation || '—'}</td>

                        {/* 23. Post graduation degree */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.pgDegree || '—'}</td>

                        {/* 24. PG specialization */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.pgSpecialization || '—'}</td>

                        {/* 25. PG university name */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.pgUniversity || '—'}</td>

                        {/* 26. PG graduation year */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.pgGraduationYear || '—'}</td>

                        {/* 27. Doctorate degree */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.doctorateDegree || '—'}</td>

                        {/* 28. Doctorate specialization */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.doctorateSpecialization || '—'}</td>

                        {/* 29. Doctorate university name */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.doctorateUniversity || '—'}</td>

                        {/* 30. Doctorate graduation year */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.doctorateGraduationYear || '—'}</td>

                        {/* 31. Gender */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.gender || '—'}</td>

                        {/* 32. Marital Status */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.maritalStatus || '—'}</td>

                        {/* 33. Home Town/City */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.homeTownCity || '—'}</td>

                        {/* 34. Pin Code */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.pinCode || '—'}</td>

                        {/* 35. Work permit for USA */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.usaWorkPermit || '—'}</td>

                        {/* 36. Date of Birth */}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{c.dateOfBirth ? new Date(c.dateOfBirth).toLocaleDateString('en-IN') : '—'}</td>

                        {/* 37. Permanent Address */}
                        <td className="px-4 py-3 text-slate-600 text-xs max-w-[200px] truncate" title={c.permanentAddress || ''}>{c.permanentAddress || '—'}</td>

                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => navigate(`/recruiter/candidate/${c._id}`)}
                              className="text-slate-300 hover:text-green-600 p-1 rounded-lg hover:bg-green-50 transition-colors"
                              title="View Details">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                            {c.phone && (
                              <button onClick={() => setWaCandidate(c)}
                                className="text-slate-300 hover:text-emerald-600 p-1 rounded-lg hover:bg-emerald-50 transition-colors"
                                title="WhatsApp Candidate">
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Page {page} of {pagination.pages} · {pagination.total.toLocaleString()} total
              </span>
              <div className="flex gap-1">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-slate-100 text-slate-600 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}
                  className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-slate-100 text-slate-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

      {/* ── Floating Bulk Actions Panel ── */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-40 border border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="text-sm font-medium">
            <span className="text-green-400 font-bold mr-1">{selectedIds.length}</span> candidates selected
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEmailSubject('');
                setEmailBody('');
                setEmailModalOpen(true);
              }}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              <Mail className="w-3.5 h-3.5" /> Send Bulk Email
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-slate-400 hover:text-white text-xs font-semibold px-3 py-2 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ── Bulk Email Modal ── */}
      {emailModalOpen && (
        <div className="fixed inset-0 bg-slate-950/45 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-green-600" />
                <h3 className="text-slate-800" style={{ fontWeight: 700 }}>Send Bulk Email</h3>
              </div>
              <button onClick={() => setEmailModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <p className="text-slate-500 text-xs">Sending to {selectedIds.length} selected candidate(s). You can use `{'{name}'}` to personalize the email body.</p>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Email Subject *</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  placeholder="e.g. Job Opportunity at White Horse Manpower"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-green-400 bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Email Body *</label>
                <textarea
                  rows={8}
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                  placeholder="Dear {name},&#10;&#10;We have an exciting opportunity for you..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-green-400 bg-slate-50 resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-2 justify-end flex-shrink-0">
              <button
                disabled={emailSending}
                onClick={() => setEmailModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={emailSending || !emailSubject.trim() || !emailBody.trim()}
                onClick={handleSendBulkEmail}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {emailSending ? 'Sending...' : 'Send Emails'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── WhatsApp Modal ── */}
      {waCandidate && (
        <div className="fixed inset-0 bg-slate-950/45 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <h3 className="text-slate-800" style={{ fontWeight: 700 }}>WhatsApp Outreach</h3>
              </div>
              <button onClick={() => setWaCandidate(null)} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Select Outreach Template</label>
                <select
                  value={waTemplate}
                  onChange={e => setWaTemplate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 outline-none"
                >
                  <option value="invite">Interview Invitation</option>
                  <option value="docs">Onboarding Document Request</option>
                  <option value="noResponse">Call Follow-up / No Response</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Custom Message Text</label>
                <textarea
                  rows={5}
                  value={waCustomText}
                  onChange={e => setWaCustomText(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-400 bg-slate-50 resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-2 justify-end flex-shrink-0">
              <button
                onClick={() => setWaCandidate(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const url = `https://wa.me/91${waCandidate.phone}?text=${encodeURIComponent(waCustomText)}`;
                  window.open(url, '_blank');
                  setWaCandidate(null);
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Open WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
