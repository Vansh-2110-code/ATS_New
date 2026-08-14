import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import {
  Search, Filter, Eye, ChevronDown, X, UserPlus, Columns, Check,
  MapPin, Loader2, Download, Upload, FileSpreadsheet, Printer,
  FileDown, CheckCircle2, AlertCircle, Lock, Mail, MessageSquare,
  Edit3, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { dedupeCompanies } from '../../utils/companyUtils';
import { CANDIDATE_STATUS_OPTIONS, CANDIDATE_STATUS_COLORS } from '../../utils/candidateStatusUtils';
import { CopyableContact } from '../../components/CopyableContact';


const API_BASE = window.location.origin;

// ── Extended status list synchronized with Master Statuses ───────
const STATUS_COLORS: Record<string, string> = {
  ...CANDIDATE_STATUS_COLORS,
  New:                  'bg-slate-100 text-slate-600',
  Screening:            'bg-sky-100 text-sky-700',
  Contacted:            'bg-green-100 text-green-700',
  Interested:           'bg-emerald-100 text-emerald-700',
  'Interview Scheduled':'bg-violet-100 text-violet-700',
  Selected:             'bg-teal-100 text-teal-700',
  Rejected:             'bg-red-100 text-red-600',
  'Eligible Candidates':'bg-emerald-100 text-emerald-700',
  'Wrong Number':       'bg-red-100 text-red-600',
  'Did Not Pick':       'bg-orange-100 text-orange-700',
  'HR Shortlist':       'bg-violet-100 text-violet-700',
  'Written Test':       'bg-indigo-100 text-indigo-700',
  'Operations Round':   'bg-cyan-100 text-cyan-700',
  Documentation:        'bg-sky-100 text-sky-700',
  'Yet To Join':        'bg-pink-100 text-pink-700',
  Joined:               'bg-green-100 text-green-700',
};

// ── Extended source list ──────────────────────────────────────
const SOURCES = [
  'All Sources', 'Naukri', 'LinkedIn', 'Indeed', 'Referral',
  'Walk-In', 'Shine', 'Facebook', 'Social Media', 'Excel Import'
];
const STATUSES = ['All Status', ...CANDIDATE_STATUS_OPTIONS];

// ── Location data ─────────────────────────────────────────────
const CITIES = ['', 'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Ahmedabad'];
const LOCAL_AREAS: Record<string, string[]> = {
  '': [],
  Mumbai:    ['', 'Andheri', 'Bandra', 'Powai', 'Borivali', 'Thane', 'Navi Mumbai'],
  Delhi:     ['', 'Connaught Place', 'Dwarka', 'Rohini', 'Noida', 'Gurgaon'],
  Bangalore: ['', 'Whitefield', 'Koramangala', 'Indiranagar', 'HSR Layout', 'Electronic City'],
  Chennai:   ['', 'Anna Nagar', 'T. Nagar', 'OMR', 'Velachery'],
  Hyderabad: ['', 'Hitech City', 'Gachibowli', 'Madhapur', 'Banjara Hills'],
  Pune:      ['', 'Hinjewadi', 'Kothrud', 'Viman Nagar', 'Wakad'],
  Kolkata:   ['', 'Salt Lake', 'Park Street', 'Newtown'],
  Ahmedabad: ['', 'Navrangpura', 'SG Highway', 'Satellite'],
};

// ── Column definitions ────────────────────────────────────────
type ColKey = 'name' | 'clientName' | 'skills' | 'exp' | 'source' | 'city' | 'localArea' | 'status' | 'recruiter' | 'action';
const ALL_COLUMNS: { key: ColKey; label: string; defaultVisible: boolean }[] = [
  { key: 'name',       label: 'Candidate',        defaultVisible: true },
  { key: 'clientName', label: 'Client / Company', defaultVisible: true },
  { key: 'skills',     label: 'Skills',           defaultVisible: true },
  { key: 'exp',        label: 'Experience',       defaultVisible: true },
  { key: 'source',     label: 'Source',           defaultVisible: true },
  { key: 'city',       label: 'City',             defaultVisible: true },
  { key: 'localArea',  label: 'Local Area',       defaultVisible: true },
  { key: 'status',     label: 'Status',           defaultVisible: true },
  { key: 'recruiter',  label: 'Recruiter',        defaultVisible: true },
  { key: 'action',     label: 'Action',           defaultVisible: true },
];

export function ResumeListPage({ lockedStatus }: { lockedStatus?: string }) {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isTLOrAdminOrManager = ['admin', 'tl', 'manager'].includes(user?.role || '');
  const locationState = location.state as { statusFilter?: string; todayCalls?: boolean } | null;

  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('All Sources');
  const [statusFilter, setStatusFilter] = useState(() => lockedStatus || locationState?.statusFilter || 'All Status');
  const [recruiterFilter, setRecruiterFilter] = useState('All Recruiters');
  const [recruitersList, setRecruitersList] = useState<string[]>([]);
  const [customerFilter, setCustomerFilter] = useState('All Customers');
  const [customersList, setCustomersList] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState('');
  const [localAreaFilter, setLocalAreaFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [totalCandidatesCount, setTotalCandidatesCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Reassign Modal State
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [reassignCand, setReassignCand] = useState<any>(null);
  const [reassignRecruiterId, setReassignRecruiterId] = useState('');
  const [reassignRecruiterName, setReassignRecruiterName] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [reassignError, setReassignError] = useState('');

  // Column visibility
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(
    Object.fromEntries(ALL_COLUMNS.map(c => [c.key, c.defaultVisible])) as Record<ColKey, boolean>
  );
  const [showColDropdown, setShowColDropdown] = useState(false);
  const colRef = useRef<HTMLDivElement>(null);

  // Export / Import state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; total: number; errors?: string[] } | null>(null);
  const [importError, setImportError] = useState('');
  const [multiValueAction, setMultiValueAction] = useState<'clean' | 'keep'>('clean');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selection and Bulk Actions state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);

  // WhatsApp click-to-chat state
  const [waCandidate, setWaCandidate] = useState<any | null>(null);
  const [waTemplate, setWaTemplate] = useState('invite');
  const [waCustomText, setWaCustomText] = useState('');

  // Reassign submit handler
  const handleOpenReassignModal = (cand: any) => {
    setReassignCand(cand);
    setReassignRecruiterId('');
    setReassignRecruiterName('');
    setReassignReason('');
    setReassignError('');
    setReassignModalOpen(true);
  };

  const handleReassignSubmit = async () => {
    if (!reassignCand?.id) return;
    if (!reassignRecruiterId) { setReassignError('Select a recruiter'); return; }
    if (!reassignReason.trim()) { setReassignError('Reason is required'); return; }
    setReassignError('');
    setReassigning(true);
    try {
      await api.reassignCandidate(reassignCand.id, {
        newRecruiterId: reassignRecruiterId,
        newRecruiterName: reassignRecruiterName,
        reason: reassignReason,
      });
      // Refresh candidates list
      setCandidates(prev => prev.map(c => c.id === reassignCand.id ? { ...c, recruiter: reassignRecruiterName } : c));
      setReassignModalOpen(false);
      alert(`Candidate ${reassignCand.name} reassigned to ${reassignRecruiterName} successfully.`);
    } catch (err: any) {
      setReassignError(err.message || 'Failed to reassign candidate');
    } finally {
      setReassigning(false);
    }
  };

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

  // Sync status filter from navigation state
  useEffect(() => {
    if (locationState?.statusFilter) setStatusFilter(locationState.statusFilter);
  }, [locationState?.statusFilter]);

  // Load dynamic lists for filter dropdowns (Recruiters & Customers)
  useEffect(() => {
    api.getUsers({ limit: '500' }).then(res => {
      const users = res.users || (Array.isArray(res) ? res : []);
      const recNames = users
        .filter((u: any) => ['recruiter', 'tl', 'admin', 'manager'].includes(u.role))
        .map((u: any) => u.name)
        .filter(Boolean);
      setRecruitersList(Array.from(new Set(recNames)).sort());
    }).catch(() => {});

    api.getCompanies().then(res => {
      const comps = Array.isArray(res) ? res : (res.companies || []);
      const compNames = comps.map((c: any) => c.companyName || c.name || c).filter(Boolean);
      setCustomersList(Array.from(new Set(compNames)).sort());
    }).catch(() => {});
  }, []);

  // Fetch candidates from API
  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        setLoading(true);
        const params: Record<string, string> = { limit: '1000' };
        if (search) params.search = search;
        if (statusFilter !== 'All Status') params.status = statusFilter;
        if (recruiterFilter !== 'All Recruiters') params.recruiter = recruiterFilter;
        if (customerFilter !== 'All Customers') params.company = customerFilter;
        const data = await api.getCandidates(params);
        const list = data.candidates || (Array.isArray(data) ? data : []);
        if (data.statusCounts) {
          setStatusCounts(data.statusCounts);
        }
        if (data.totalCount != null || data.pagination?.total != null) {
          setTotalCandidatesCount(data.totalCount ?? data.pagination?.total ?? 0);
        }
        setCandidates(list.map((c: any) => ({
          id: c._id || c.id,
          name: c.name,
          candidateId: c.candidateId || '',
          skills: Array.isArray(c.skills) ? c.skills.join(', ') : (c.skills || ''),
          exp: c.experience || '',
          source: c.source || '',
          status: c.status || 'Eligible',
          email: c.email || '',
          city: c.city || '',
          localArea: c.localArea || '',
          resumePath: c.resumePath || '',
          recruiter: c.assignedRecruiterName || 'Unassigned',
          phone: c.phone || '',
          positionApplied: c.positionApplied || '',
          clientName: c.clientName || c.company || c.companyName || c.client || '—',
        })));
      } catch (err) {
        console.error('Failed to load candidates:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCandidates();
  }, [statusFilter, recruiterFilter, customerFilter]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colRef.current && !colRef.current.contains(e.target as Node)) setShowColDropdown(false);
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExportMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Export helpers ──────────────────────────────────────────
  const buildExportParams = (format: string) => {
    const p: Record<string, string> = { format };
    if (search) p.search = search;
    if (sourceFilter !== 'All Sources') p.source = sourceFilter;
    if (statusFilter !== 'All Status') p.status = statusFilter;
    if (cityFilter) p.city = cityFilter;
    p.limit = '30';
    return p;
  };

  const handleExcelDownload = () => {
    const token = localStorage.getItem('ats_token');
    const url = api.getExportUrl(buildExportParams('excel'));
    // Open in hidden iframe to trigger download with auth header
    const a = document.createElement('a');
    a.href = url + (token ? `&token=${token}` : '');
    a.download = 'candidates.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setShowExportMenu(false);
  };

  const handleCsvDownload = () => {
    const token = localStorage.getItem('ats_token');
    const url = api.getExportUrl(buildExportParams('csv'));
    const a = document.createElement('a');
    a.href = url + (token ? `&token=${token}` : '');
    a.download = 'candidates.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setShowExportMenu(false);
  };

  const handlePdfPrint = () => {
    const cols = ['Name', 'Phone', 'Experience', 'Skills', 'Source', 'Status', 'City'];
    const printRows = filtered.slice(0, 30).map(c => `
      <tr>
        <td>${c.name}</td>
        <td>${c.email}</td>
        <td>${c.exp || '—'}</td>
        <td>${c.skills || '—'}</td>
        <td>${c.source || '—'}</td>
        <td>${c.status}</td>
        <td>${c.city || '—'}</td>
      </tr>`).join('');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Candidates Export</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:11px;color:#1e293b}
        h2{color:#166534;margin-bottom:6px}
        p{color:#64748b;margin:0 0 12px}
        table{width:100%;border-collapse:collapse}
        th{background:#f1f5f9;padding:7px 8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #e2e8f0}
        td{padding:6px 8px;border-bottom:1px solid #f1f5f9;vertical-align:top}
        tr:nth-child(even) td{background:#f8fafc}
        @media print{@page{margin:1.5cm}}
      </style></head><body>
      <h2>Candidate List — White Horse Manpower</h2>
      <p>Exported on ${new Date().toLocaleDateString('en-IN', { day:'numeric',month:'long',year:'numeric'})} · Showing up to 30 records</p>
      <table>
        <thead><tr>${cols.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${printRows}</tbody>
      </table>
      <script>window.onload=function(){window.print();window.close();}<\/script>
      </body></html>`);
    win.document.close();
    setShowExportMenu(false);
  };

  const handleResumeLinks = () => {
    const withResumes = filtered.slice(0, 30).filter((c: any) => c.resumePath);
    if (withResumes.length === 0) {
      alert('No candidates in the current view have resumes uploaded.');
      return;
    }
    const base = window.location.origin;
    const content = withResumes.map((c: any, i: number) =>
      `${i + 1}. ${c.name} — ${base}${c.resumePath}`
    ).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'resume-links.txt';
    a.click();
    URL.revokeObjectURL(a.href);
    setShowExportMenu(false);
  };

  // ── Import handler ──────────────────────────────────────────
  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportError('');
    setImportResult(null);
    try {
      const result = await api.importCandidates(importFile, multiValueAction);
      setImportResult(result);
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      // Refresh list
      const params: Record<string, string> = { limit: '1000' };
      if (search) params.search = search;
      if (sourceFilter !== 'All Sources') params.source = sourceFilter;
      if (statusFilter !== 'All Status') params.status = statusFilter;
      const data = await api.getCandidates(params);
      const list = data.candidates || data || [];
      setCandidates(list.map((c: any) => ({
        id: c._id || c.id, name: c.name,
        skills: Array.isArray(c.skills) ? c.skills.join(', ') : (c.skills || ''),
        exp: c.experience || '', source: c.source || '', status: c.status || 'Eligible',
        email: c.email || '', city: c.city || '', localArea: c.localArea || '',
        resumePath: c.resumePath || '',
        recruiter: c.assignedRecruiterName || 'Unassigned',
        phone: c.phone || '',
        positionApplied: c.positionApplied || '',
        clientName: c.clientName || '',
      })));
    } catch (err: any) {
      setImportError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const toggleCol = (key: ColKey) => {
    setVisibleCols(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filtered = candidates.filter(c => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.skills.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All Status' || c.status === statusFilter;
    const matchRecruiter = recruiterFilter === 'All Recruiters' || c.recruiter === recruiterFilter;
    const matchCustomer = customerFilter === 'All Customers' || c.clientName === customerFilter;
    return matchSearch && matchStatus && matchRecruiter && matchCustomer;
  });

  const hasActiveFilters =
    statusFilter !== 'All Status' ||
    recruiterFilter !== 'All Recruiters' || customerFilter !== 'All Customers';

  const clearAll = () => {
    setStatusFilter('All Status');
    setRecruiterFilter('All Recruiters');
    setCustomerFilter('All Customers');
  };

  const visibleCount = Object.values(visibleCols).filter(Boolean).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-slate-800" style={{ fontWeight: 700, fontSize: '1.4rem' }}>Resume List</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {filtered.length} candidates found
            {statusFilter !== 'All Status' && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100" style={{ fontWeight: 500 }}>
                {statusFilter}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Import button */}
          <button
            onClick={() => { setShowImportModal(true); setImportResult(null); setImportError(''); }}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors"
            style={{ fontWeight: 500 }}>
            <Upload className="w-4 h-4" /> Import
          </button>

          {/* Export dropdown */}
          {isAdmin && (
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setShowExportMenu(o => !o)}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors"
                style={{ fontWeight: 500 }}>
                <Download className="w-4 h-4" /> Export
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
              </button>

              {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                <p className="px-4 py-2.5 text-xs text-slate-400 border-b border-slate-50 uppercase tracking-wide" style={{ fontWeight: 600 }}>
                  Export up to 30 records
                </p>
                <button onClick={handleExcelDownload}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors">
                  <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-slate-700 text-sm" style={{ fontWeight: 500 }}>Excel (.xlsx)</p>
                    <p className="text-slate-400 text-xs">Opens in Microsoft Excel</p>
                  </div>
                </button>
                <button onClick={handleCsvDownload}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors border-t border-slate-50">
                  <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileDown className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-slate-700 text-sm" style={{ fontWeight: 500 }}>CSV</p>
                    <p className="text-slate-400 text-xs">Compatible with all tools</p>
                  </div>
                </button>
                <button onClick={handlePdfPrint}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors border-t border-slate-50">
                  <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center">
                    <Printer className="w-3.5 h-3.5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-slate-700 text-sm" style={{ fontWeight: 500 }}>PDF (Print)</p>
                    <p className="text-slate-400 text-xs">Browser print-to-PDF</p>
                  </div>
                </button>
                <button onClick={handleResumeLinks}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors border-t border-slate-50">
                  <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center">
                    <Download className="w-3.5 h-3.5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-slate-700 text-sm" style={{ fontWeight: 500 }}>Resume Links</p>
                    <p className="text-slate-400 text-xs">Download .txt with links</p>
                  </div>
                </button>
              </div>
            )}
            </div>
          )}

          <Link
            to="/recruiter/add"
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
            style={{ fontWeight: 600 }}>
            <UserPlus className="w-4 h-4" /> Add Candidate
          </Link>
        </div>
      </div>

      {/* ── Import Modal ─────────────────────────────────────── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowImportModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-slate-800 text-base" style={{ fontWeight: 700 }}>Import Candidates</h2>
                <p className="text-slate-500 text-xs mt-0.5">Upload an Excel or CSV file to bulk add candidates</p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Template info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs text-blue-700 space-y-1">
              <p className="font-semibold">Required columns:</p>
              <p><span className="font-semibold">Name</span>, <span className="font-semibold">Phone</span> (mandatory)</p>
              <p>Optional: Email, Experience, Skills, Source, Status, City, Local Area, Position Applied</p>
              <p className="text-blue-500 mt-1">Duplicate phone numbers are automatically skipped.</p>
            </div>

            {/* File picker */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${importFile ? 'border-green-400 bg-green-50' : 'border-slate-200 hover:border-slate-300'}`}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={e => { setImportFile(e.target.files?.[0] || null); setImportResult(null); setImportError(''); }}
              />
              {importFile ? (
                <div className="flex items-center justify-center gap-2 text-green-700">
                  <FileSpreadsheet className="w-5 h-5" />
                  <span className="text-sm" style={{ fontWeight: 500 }}>{importFile.name}</span>
                </div>
              ) : (
                <div className="text-slate-400">
                  <Upload className="w-6 h-6 mx-auto mb-2" />
                  <p className="text-sm">Click to select Excel or CSV file</p>
                  <p className="text-xs mt-1">.xlsx, .xls, .csv supported</p>
                </div>
              )}
            </div>

            {/* Multi-value handling option */}
            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-slate-700 mb-2">How to handle multiple emails/phones in a single cell?</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="multiValue" value="clean" checked={multiValueAction === 'clean'} onChange={() => setMultiValueAction('clean')} className="text-green-600 focus:ring-green-500" />
                  <span className="text-slate-700"><strong>Auto-clean</strong> (Extract the first valid entry)</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="multiValue" value="keep" checked={multiValueAction === 'keep'} onChange={() => setMultiValueAction('keep')} className="text-green-600 focus:ring-green-500" />
                  <span className="text-slate-700"><strong>Keep Raw</strong> (Save the exact string as written)</span>
                </label>
              </div>
            </div>

            {/* Results */}
            {importResult && (
              <div className={`mt-3 p-3 rounded-xl text-sm border ${
                importResult.created > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {importResult.created > 0 ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span style={{ fontWeight: 600 }}>{importResult.created > 0 ? 'Import complete' : 'Import finished with no new records'}</span>
                </div>
                <p><strong>{importResult.created}</strong> created · <strong>{importResult.skipped}</strong> skipped (duplicates/errors) · <strong>{importResult.total}</strong> total</p>
                {importResult.errors && importResult.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className={`text-xs cursor-pointer font-semibold ${importResult.created > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                      View reasons ({importResult.errors.length})
                    </summary>
                    <ul className="mt-2 text-xs space-y-1 max-h-32 overflow-y-auto">
                      {importResult.errors.map((e: string, i: number) => (
                        <li key={i} className={`px-2 py-1 rounded bg-white border ${importResult.created > 0 ? 'border-emerald-100 text-emerald-800' : 'border-amber-200 text-amber-800'}`}>
                          {e}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}

            {importError && (
              <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {importError}
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowImportModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors" style={{ fontWeight: 500 }}>
                Close
              </button>
              <button onClick={handleImport} disabled={!importFile || importing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-40 transition-colors" style={{ fontWeight: 600 }}>
                {importing
                  ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Importing…</>
                  : <><Upload className="w-4 h-4" /> Import Now</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search, Filters & Column Visibility */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or skills..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 transition-colors"
            />
          </div>

          {/* Filters toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm transition-colors ${
              hasActiveFilters ? 'border-green-400 bg-green-50 text-green-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            style={{ fontWeight: 500 }}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="bg-green-600 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center" style={{ fontWeight: 700 }}>
                !
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Column Visibility */}
          <div className="relative" ref={colRef}>
            <button
              onClick={() => setShowColDropdown(!showColDropdown)}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              style={{ fontWeight: 500 }}
            >
              <Columns className="w-4 h-4" />
              Columns
              <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded" style={{ fontWeight: 600 }}>
                {visibleCount}/{ALL_COLUMNS.length}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showColDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showColDropdown && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 z-50 p-2">
                <p className="text-xs text-slate-400 px-2 py-1.5 uppercase tracking-wide" style={{ fontWeight: 600 }}>
                  Toggle Columns
                </p>
                {ALL_COLUMNS.filter(c => c.key !== 'action').map(col => (
                  <label
                    key={col.key}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                        visibleCols[col.key] ? 'bg-green-600 border-green-600' : 'border-slate-300'
                      }`}
                      onClick={() => toggleCol(col.key)}
                    >
                      {visibleCols[col.key] && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-slate-600 text-sm">{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-3 items-center">
            {/* Recruiter Filter */}
            <div>
              <label className="block text-xs text-slate-400 mb-1" style={{ fontWeight: 500 }}>Recruiter</label>
              <select
                value={recruiterFilter}
                onChange={e => setRecruiterFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none bg-white text-slate-700"
              >
                <option value="All Recruiters">All Recruiters</option>
                {recruitersList.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Status (Hidden if locked) */}
            {!lockedStatus && (
              <div>
                <label className="block text-xs text-slate-400 mb-1" style={{ fontWeight: 500 }}>Status</label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none bg-white text-slate-700"
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            {/* Customer / Client Name Filter */}
            <div>
              <label className="block text-xs text-slate-400 mb-1" style={{ fontWeight: 500 }}>Customer Name</label>
              <select
                value={customerFilter}
                onChange={e => setCustomerFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none bg-white text-slate-700 font-medium"
              >
                <option value="All Customers">All Customers</option>
                {customersList.map(comp => <option key={comp} value={comp}>{comp}</option>)}
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 self-end pb-0.5"
              >
                <X className="w-3.5 h-3.5" /> Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Status Quick Filters (Official 32 Candidate Statuses) */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter('All Status')}
          className={`text-xs px-3 py-1.5 rounded-full transition-opacity bg-slate-100 text-slate-600 ${statusFilter === 'All Status' ? 'ring-2 ring-offset-1 ring-green-400 font-semibold' : ''}`}
          style={{ fontWeight: 500 }}
        >
          All ({totalCandidatesCount || candidates.length})
        </button>
        {CANDIDATE_STATUS_OPTIONS.map((status) => {
          const color = CANDIDATE_STATUS_COLORS[status] || 'bg-slate-100 text-slate-600 border-slate-200';
          let count = statusCounts[status] ?? 0;
          if (status === 'Eligible' && statusCounts['Eligible Candidates']) {
            count += statusCounts['Eligible Candidates'];
          }
          if (Object.keys(statusCounts).length === 0) {
            count = candidates.filter(c => {
              if (status === 'Eligible') return c.status === 'Eligible' || c.status === 'Eligible Candidates';
              return c.status === status;
            }).length;
          }
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? 'All Status' : status)}
              className={`text-xs px-3 py-1.5 rounded-full transition-opacity border ${color} ${statusFilter === status ? 'ring-2 ring-offset-1 ring-green-400 font-semibold' : ''}`}
              style={{ fontWeight: 500 }}
            >
              {status} ({count})
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-auto max-h-[calc(100vh-280px)]">
          <table className="w-full relative">
            <thead className="sticky top-0 z-20 bg-slate-50 shadow-sm">
              <tr className="border-b border-slate-100">
                <th className="px-5 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedIds(filtered.map(c => c.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-200 text-green-600 focus:ring-green-500"
                  />
                </th>
                {visibleCols.name && (
                  <th className="px-5 py-3 text-left text-xs text-slate-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Candidate</th>
                )}
                {visibleCols.clientName && (
                  <th className="px-5 py-3 text-left text-xs text-slate-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Client / Company</th>
                )}
                {visibleCols.skills && (
                  <th className="px-5 py-3 text-left text-xs text-slate-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Skills</th>
                )}
                {visibleCols.exp && (
                  <th className="px-5 py-3 text-left text-xs text-slate-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Exp</th>
                )}
                {visibleCols.source && (
                  <th className="px-5 py-3 text-left text-xs text-slate-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Source</th>
                )}
                {visibleCols.city && (
                  <th className="px-5 py-3 text-left text-xs text-slate-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>City</th>
                )}
                {visibleCols.localArea && (
                  <th className="px-5 py-3 text-left text-xs text-slate-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Local Area</th>
                )}
                {visibleCols.status && (
                  <th className="px-5 py-3 text-left text-xs text-slate-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Status</th>
                )}
                {visibleCols.recruiter && (
                  <th className="px-5 py-3 text-left text-xs text-slate-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Recruiter</th>
                )}
                {visibleCols.action && (
                  <th className="px-5 py-3 text-center text-xs text-slate-500 uppercase tracking-wide sticky right-0 bg-slate-50 z-30 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] border-l border-slate-200" style={{ fontWeight: 600 }}>Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/60 transition-colors group">
                  <td className="px-5 py-4 w-10 bg-inherit">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(c.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedIds(prev => [...prev, c.id]);
                        } else {
                          setSelectedIds(prev => prev.filter(id => id !== c.id));
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-200 text-green-600 focus:ring-green-500"
                    />
                  </td>
                  {visibleCols.name && (
                    <td className="px-5 py-4 bg-inherit">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-green-700 text-xs" style={{ fontWeight: 600 }}>
                            {c.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="text-slate-700 text-sm" style={{ fontWeight: 500 }}>
                            {c.name} {c.candidateId && <span className="text-[10px] text-slate-400 font-normal ml-1">({c.candidateId})</span>}
                          </p>
                          {c.email ? <CopyableContact type="email" value={c.email} className="text-slate-400 text-xs" showIcon={false} /> : null}
                          {c.phone ? <CopyableContact type="phone" value={c.phone} className="text-slate-400 text-xs" showIcon={false} /> : null}
                        </div>
                      </div>
                    </td>
                  )}
                  {visibleCols.clientName && (
                    <td className="px-5 py-4 bg-inherit">
                      <span className="text-blue-600 text-sm font-semibold">{c.clientName || '—'}</span>
                    </td>
                  )}
                  {visibleCols.skills && (
                    <td className="px-5 py-4 bg-inherit">
                      <p className="text-slate-600 text-sm truncate max-w-[180px]">{c.skills}</p>
                    </td>
                  )}
                  {visibleCols.exp && (
                    <td className="px-5 py-4 bg-inherit">
                      <span className="text-slate-600 text-sm">{c.exp}</span>
                    </td>
                  )}
                  {visibleCols.source && (
                    <td className="px-5 py-4 bg-inherit">
                      <span className="text-slate-500 text-sm">{c.source}</span>
                    </td>
                  )}
                  {visibleCols.city && (
                    <td className="px-5 py-4 bg-inherit">
                      <div className="flex items-center gap-1 text-slate-500 text-sm">
                        {c.city ? (
                          <>
                            <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            {c.city}
                          </>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </div>
                    </td>
                  )}
                  {visibleCols.localArea && (
                    <td className="px-5 py-4 bg-inherit">
                      <span className="text-slate-500 text-sm">{c.localArea || '—'}</span>
                    </td>
                  )}
                  {visibleCols.status && (
                    <td className="px-5 py-4 bg-inherit">
                      <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_COLORS[c.status] ?? 'bg-slate-100 text-slate-600'}`} style={{ fontWeight: 500 }}>
                        {c.status}
                      </span>
                    </td>
                  )}
                  {visibleCols.recruiter && (
                    <td className="px-5 py-4 bg-inherit">
                      <span className="text-slate-600 text-sm">{c.recruiter || 'Unassigned'}</span>
                    </td>
                  )}
                  {visibleCols.action && (
                    <td className="px-5 py-4 text-center sticky right-0 bg-white group-hover:bg-slate-50/90 z-10 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] border-l border-slate-50 transition-colors">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap w-[220px]">
                        <Link
                          to={`/recruiter/candidate/${c.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-50 text-green-600 text-xs rounded-lg hover:bg-green-100 transition-colors"
                          style={{ fontWeight: 500 }}
                          title="View Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </Link>
                        <Link
                          to={`/recruiter/add?id=${c.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-600 text-xs rounded-lg hover:bg-blue-100 transition-colors"
                          style={{ fontWeight: 500 }}
                          title="Edit Profile"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit
                        </Link>
                        {isTLOrAdminOrManager && (
                          <button
                            onClick={() => handleOpenReassignModal(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-orange-50 text-orange-600 text-xs rounded-lg hover:bg-orange-100 transition-colors cursor-pointer"
                            style={{ fontWeight: 500 }}
                            title="Reassign Candidate"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Reassign
                          </button>
                        )}
                        {c.resumePath ? (
                          <a
                            href={`${API_BASE}${c.resumePath}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 text-indigo-600 text-xs rounded-lg hover:bg-indigo-100 transition-colors"
                            style={{ fontWeight: 500 }}
                            title="View Resume"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            Resume
                          </a>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 text-slate-400 text-xs rounded-lg cursor-not-allowed"
                            style={{ fontWeight: 500 }}
                            title="No Resume Uploaded"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            Resume
                          </span>
                        )}
                        {c.phone && (
                          <button
                            onClick={() => setWaCandidate(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-600 text-xs rounded-lg hover:bg-emerald-100 transition-colors"
                            style={{ fontWeight: 500 }}
                            title="WhatsApp Outreach"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            WhatsApp
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {filtered.map(c => (
            <div key={c.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-700 text-sm" style={{ fontWeight: 600 }}>
                      {c.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="text-slate-700 text-sm" style={{ fontWeight: 600 }}>
                      {c.name} {c.candidateId && <span className="text-[10px] text-slate-400 font-normal ml-1">({c.candidateId})</span>}
                    </p>
                    <p className="text-slate-400 text-xs">{c.exp} · {c.source}</p>
                    {(c.city || c.localArea) && (
                      <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {[c.city, c.localArea].filter(Boolean).join(', ')}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {c.email && <CopyableContact type="email" value={c.email} className="text-slate-400 text-xs" showIcon={true} />}
                      {c.phone && <CopyableContact type="phone" value={c.phone} className="text-slate-400 text-xs" showIcon={true} />}
                    </div>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_COLORS[c.status] ?? 'bg-slate-100 text-slate-600'}`} style={{ fontWeight: 500 }}>
                  {c.status}
                </span>
              </div>
              <p className="text-slate-500 text-xs mt-2 ml-13">{c.skills}</p>
              <p className="text-slate-400 text-xs mt-1 ml-13">Assigned to: <strong className="text-slate-600">{c.recruiter || 'Unassigned'}</strong></p>
              <div className="mt-3 flex items-center justify-end gap-2 flex-wrap">
                <Link
                  to={`/recruiter/candidate/${c.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 text-xs rounded-lg"
                  style={{ fontWeight: 500 }}
                >
                  <Eye className="w-3.5 h-3.5" /> View Profile
                </Link>
                <Link
                  to={`/recruiter/add?id=${c.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs rounded-lg"
                  style={{ fontWeight: 500 }}
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                </Link>
                {isTLOrAdminOrManager && (
                  <button
                    onClick={() => handleOpenReassignModal(c)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 text-xs rounded-lg cursor-pointer"
                    style={{ fontWeight: 500 }}
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Reassign
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
              <>
                <Search className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 text-sm" style={{ fontWeight: 500 }}>No candidates found</p>
                <p className="text-slate-400 text-xs mt-1">Try adjusting your search or filters</p>
                {hasActiveFilters && (
                  <button onClick={clearAll} className="mt-3 text-xs text-green-600 hover:text-green-700" style={{ fontWeight: 500 }}>
                    Clear all filters
                  </button>
                )}
              </>
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
      {/* ── Reassign Candidate Modal (TL / Admin / Manager) ── */}
      {reassignModalOpen && reassignCand && (
        <div className="fixed inset-0 bg-slate-950/45 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-orange-500 animate-spin-once" />
                <h3 className="text-slate-800" style={{ fontWeight: 700 }}>Reassign Candidate</h3>
              </div>
              <button onClick={() => setReassignModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-xs text-orange-800 space-y-1">
                <p className="font-semibold">Candidate: {reassignCand.name}</p>
                <p>Current Recruiter: <strong className="text-slate-700">{reassignCand.recruiter || 'Unassigned'}</strong></p>
                <p className="text-orange-600 mt-1">Reassigning will reset all workflow stages and assign to the new recruiter.</p>
              </div>

              {reassignError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
                  {reassignError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Assign To Recruiter *</label>
                <select
                  value={reassignRecruiterId}
                  onChange={e => {
                    setReassignRecruiterId(e.target.value);
                    setReassignRecruiterName(e.target.options[e.target.selectedIndex].text);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 outline-none focus:border-orange-400"
                >
                  <option value="">— Select Recruiter —</option>
                  {recruiterList.map((r: any) => {
                    const rId = r._id || r.id;
                    const rName = r.name || r.userName || r.email || r;
                    return <option key={rId} value={rId}>{rName}</option>;
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Reason for Reassignment *</label>
                <textarea
                  rows={3}
                  value={reassignReason}
                  onChange={e => setReassignReason(e.target.value)}
                  placeholder="Enter reason for reassigning candidate..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-orange-400 bg-slate-50 resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-2 justify-end flex-shrink-0">
              <button
                disabled={reassigning}
                onClick={() => setReassignModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={reassigning || !reassignRecruiterId || !reassignReason.trim()}
                onClick={handleReassignSubmit}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {reassigning ? 'Reassigning...' : 'Reassign Candidate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function RejectedCandidatesPage() {
  return <ResumeListPage lockedStatus="Rejected" />;
}
