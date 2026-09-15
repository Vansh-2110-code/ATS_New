import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileSpreadsheet, Download, Search, Filter, Plus, RefreshCw,
  Eye, Edit2, X, Check, ChevronLeft, ChevronRight, Users,
  CheckCircle2, Building2, Briefcase, Calendar, Phone, Mail,
  MapPin, ShieldAlert, Sparkles, Loader2, Award, ArrowUpDown
} from 'lucide-react';
import { Link } from 'react-router';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface EligibleRow {
  _id: string;
  slNo: number;
  status: string;
  recruiter: string;
  skillName: string;
  jobLevel: string;
  vendorSPOC: string;
  companySPOC: string;
  jobId: string;
  dob: string;
  candidateId: string;
  whiteHorseSource: string;
  date: string;
  candidateFirstName: string;
  candidateLastName: string;
  contact: string;
  email: string;
  gender: string;
  education: string;
  totalExperience: string;
  relevantExperience: string;
  company: string;
  skills: string;
  ctc: string;
  ectc: string;
  noticePeriod: string;
  currentLocation: string;
  preferredLocation: string;
  cibilScore: string;
  panCardNumber: string;
  rawCreatedAt?: string;
}

const EMPTY_EDIT_ROW: Partial<EligibleRow> = {
  status: 'Eligible',
  recruiter: '',
  skillName: '',
  jobLevel: '',
  vendorSPOC: '',
  companySPOC: '',
  jobId: '',
  dob: '',
  candidateId: '',
  whiteHorseSource: 'White Horse Manpower',
  date: '',
  candidateFirstName: '',
  candidateLastName: '',
  contact: '',
  email: '',
  gender: '',
  education: '',
  totalExperience: '',
  relevantExperience: '',
  company: '',
  skills: '',
  ctc: '',
  ectc: '',
  noticePeriod: '',
  currentLocation: '',
  preferredLocation: '',
  cibilScore: '',
  panCardNumber: '',
};

export function EligibleTrackerPage() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<EligibleRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Search and Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Eligible');
  const [recruiterFilter, setRecruiterFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('');
  const [jrFilter, setJrFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({ totalEligible: 0, addedToday: 0, filteredCount: 0 });

  // Recruiters list for dropdown
  const [recruiters, setRecruiters] = useState<any[]>([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<Partial<EligibleRow>>({ ...EMPTY_EDIT_ROW });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch Candidates
  const fetchTrackerData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(limit),
      };
      if (search.trim()) params.search = search.trim();
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (recruiterFilter && recruiterFilter !== 'all') params.recruiter = recruiterFilter;
      if (companyFilter.trim()) params.company = companyFilter.trim();
      if (jrFilter.trim()) params.jrNumber = jrFilter.trim();
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;

      const res = await api.getEligibleTracker(params);
      if (res && res.success) {
        setCandidates(res.candidates || []);
        setTotalPages(res.totalPages || 1);
        setTotalCount(res.totalCount || 0);
        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (err: any) {
      console.error('Failed to load eligible tracker data:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, recruiterFilter, companyFilter, jrFilter, fromDate, toDate]);

  useEffect(() => {
    fetchTrackerData();
  }, [fetchTrackerData]);

  // Load recruiter list once
  useEffect(() => {
    api.getRecruiters()
      .then((data: any) => {
        if (Array.isArray(data)) setRecruiters(data);
        else if (data?.users) setRecruiters(data.users);
      })
      .catch(() => {});
  }, []);

  // Export to Excel
  const handleExport = async () => {
    try {
      setExporting(true);
      const params: Record<string, string> = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (recruiterFilter && recruiterFilter !== 'all') params.recruiter = recruiterFilter;
      if (companyFilter.trim()) params.company = companyFilter.trim();
      if (jrFilter.trim()) params.jrNumber = jrFilter.trim();
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;

      await api.exportEligibleTrackerExcel(params);
    } catch (err: any) {
      alert(err.message || 'Failed to export Eligible Tracker Excel');
    } finally {
      setExporting(false);
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setModalMode('create');
    setFormData({
      ...EMPTY_EDIT_ROW,
      recruiter: user?.name || '',
      whiteHorseSource: 'White Horse Manpower',
      status: 'Eligible',
      date: new Date().toLocaleDateString('en-GB'),
    });
    setFormErrors({});
    setShowModal(true);
  };

  // Open Edit Modal
  const openEditModal = (row: EligibleRow) => {
    setModalMode('edit');
    setFormData({ ...row });
    setFormErrors({});
    setShowModal(true);
  };

  // Submit Modal
  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!formData.contact || !formData.contact.trim()) {
      errs.contact = 'Contact / Phone is required';
    }
    if (!formData.candidateFirstName && !formData.candidateLastName) {
      errs.candidateFirstName = 'Candidate First Name is required';
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'create') {
        const res = await api.createEligibleTrackerCandidate(formData);
        if (res?.success) {
          setShowModal(false);
          fetchTrackerData();
        }
      } else if (modalMode === 'edit' && formData._id) {
        const res = await api.updateEligibleTrackerRow(formData._id, formData);
        if (res?.success) {
          setShowModal(false);
          fetchTrackerData();
        }
      }
    } catch (err: any) {
      setFormErrors({ submit: err.message || 'Failed to save candidate details' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0 shadow-inner">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Eligible Tracker</h1>
                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-200">
                  Client Format
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Centralized register of all eligible candidates formatted in the official 29-column Excel structure.
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => fetchTrackerData()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
              title="Refresh register"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
              Refresh
            </button>

            <button
              onClick={handleExport}
              disabled={exporting || candidates.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              {exporting ? 'Generating Excel...' : 'Export to Excel (.xlsx)'}
            </button>

            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Add Eligible Candidate
            </button>
          </div>
        </div>

        {/* Quick KPI Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-5 pt-5 border-t border-slate-100">
          <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/60">
            <span className="text-xs font-medium text-slate-500 block">Total Eligible</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">{stats.totalEligible}</span>
            <span className="text-[11px] text-emerald-600 font-medium">All-time active records</span>
          </div>

          <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/60">
            <span className="text-xs font-medium text-slate-500 block">Added Today</span>
            <span className="text-2xl font-bold text-blue-600 mt-1 block">{stats.addedToday}</span>
            <span className="text-[11px] text-slate-500">Fresh eligible additions</span>
          </div>

          <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/60">
            <span className="text-xs font-medium text-slate-500 block">Filtered Matches</span>
            <span className="text-2xl font-bold text-slate-800 mt-1 block">{totalCount}</span>
            <span className="text-[11px] text-slate-500">Matching active criteria</span>
          </div>

          <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/60">
            <span className="text-xs font-medium text-slate-500 block">Current Page View</span>
            <span className="text-2xl font-bold text-slate-800 mt-1 block">{candidates.length}</span>
            <span className="text-[11px] text-slate-500">Page {page} of {totalPages}</span>
          </div>
        </div>
      </div>

      {/* Slicers & Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 items-end">
          {/* Global Search */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Quick Search
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name, phone, email, PAN, JR..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="Eligible">Eligible (Default)</option>
              <option value="all">All Statuses</option>
              <option value="Eligible Candidates">Eligible Candidates</option>
              <option value="SPOC Shortlisted">SPOC Shortlisted</option>
              <option value="Screening">Screening</option>
              <option value="Interview Scheduled">Interview Scheduled</option>
              <option value="Selected">Selected</option>
              <option value="Joined">Joined</option>
            </select>
          </div>

          {/* Recruiter Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Recruiter
            </label>
            <select
              value={recruiterFilter}
              onChange={(e) => {
                setRecruiterFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">All Recruiters</option>
              {recruiters.map((r: any) => (
                <option key={r._id || r.name} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Company Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Company
            </label>
            <input
              type="text"
              value={companyFilter}
              onChange={(e) => {
                setCompanyFilter(e.target.value);
                setPage(1);
              }}
              placeholder="Filter company..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Date Range: From */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Date Range: To */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Main Excel-styled Data Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Table Container with Horizontal and Vertical Scrolling */}
        <div className="overflow-x-auto max-h-[640px] relative border-b border-slate-200">
          <table className="w-full text-left border-collapse min-w-[3400px]">
            {/* Header row in #8eaadb blue matching the screenshot */}
            <thead className="sticky top-0 z-20 bg-[#8eaadb] text-slate-950 font-bold shadow-sm select-none">
              <tr className="border-b border-slate-400 divide-x divide-slate-400 text-[11px] tracking-wide uppercase">
                <th className="py-2.5 px-3 text-center sticky left-0 z-30 bg-[#8eaadb] w-14 shadow-r">Action</th>
                <th className="py-2.5 px-2.5 text-center w-12">Sl No.</th>
                <th className="py-2.5 px-3 min-w-[120px]">Status</th>
                <th className="py-2.5 px-3 min-w-[150px]">Recruiter</th>
                <th className="py-2.5 px-3 min-w-[150px]">Skill name</th>
                <th className="py-2.5 px-3 min-w-[110px]">Job Level</th>
                <th className="py-2.5 px-3 min-w-[130px]">Vendor SPOC</th>
                <th className="py-2.5 px-3 min-w-[130px]">Company SPOC</th>
                <th className="py-2.5 px-3 min-w-[110px]">JOB ID</th>
                <th className="py-2.5 px-3 min-w-[110px] text-center">DOB</th>
                <th className="py-2.5 px-3 min-w-[130px]">Candidate ID</th>
                <th className="py-2.5 px-3 min-w-[190px]">White Horse Manpower Source</th>
                <th className="py-2.5 px-3 min-w-[110px] text-center">Date</th>
                <th className="py-2.5 px-3 min-w-[150px]">Candidate first Name</th>
                <th className="py-2.5 px-3 min-w-[150px]">Candidate last name</th>
                <th className="py-2.5 px-3 min-w-[130px]">Contact</th>
                <th className="py-2.5 px-3 min-w-[200px]">Email</th>
                <th className="py-2.5 px-3 min-w-[90px] text-center">Gender</th>
                <th className="py-2.5 px-3 min-w-[150px]">Education</th>
                <th className="py-2.5 px-3 min-w-[120px]">Total Experience</th>
                <th className="py-2.5 px-3 min-w-[130px]">Relevant experience</th>
                <th className="py-2.5 px-3 min-w-[160px]">Company</th>
                <th className="py-2.5 px-3 min-w-[180px]">Skills</th>
                <th className="py-2.5 px-3 min-w-[100px]">CTC</th>
                <th className="py-2.5 px-3 min-w-[100px]">ECTC</th>
                <th className="py-2.5 px-3 min-w-[110px]">Notice Period</th>
                <th className="py-2.5 px-3 min-w-[140px]">Current Location</th>
                <th className="py-2.5 px-3 min-w-[140px]">Preferred Location</th>
                <th className="py-2.5 px-3 min-w-[100px] text-center">CIBIL Score</th>
                <th className="py-2.5 px-3 min-w-[130px]">Pan Card Number</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={30} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <span className="text-sm font-medium">Loading Eligible Candidates...</span>
                    </div>
                  </td>
                </tr>
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan={30} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileSpreadsheet className="w-10 h-10 text-slate-300" />
                      <span className="text-sm font-semibold text-slate-700">No Eligible Candidates Found</span>
                      <p className="text-xs text-slate-500 max-w-sm">
                        No candidate matches the selected filters. Change your filter parameters or add a new eligible candidate.
                      </p>
                      <button
                        onClick={openCreateModal}
                        className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add First Candidate
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                candidates.map((row, idx) => (
                  <tr
                    key={row._id || idx}
                    className="hover:bg-blue-50/40 transition-colors divide-x divide-slate-100 group"
                  >
                    {/* Sticky Action Column */}
                    <td className="py-2 px-2 text-center sticky left-0 z-10 bg-white group-hover:bg-blue-50/60 shadow-r">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(row)}
                          className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-100/60 transition"
                          title="Edit Row"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          to={`/recruiter/candidates/${row._id}`}
                          className="p-1 rounded text-slate-500 hover:text-emerald-600 hover:bg-emerald-100/60 transition"
                          title="View Candidate Full Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>

                    {/* 1. Sl No. */}
                    <td className="py-2 px-2.5 text-center font-medium text-slate-500 bg-slate-50/30">
                      {(page - 1) * limit + idx + 1}
                    </td>

                    {/* 2. Status */}
                    <td className="py-2 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {row.status || 'Eligible'}
                      </span>
                    </td>

                    {/* 3. Recruiter */}
                    <td className="py-2 px-3 font-medium text-slate-900">{row.recruiter || '—'}</td>

                    {/* 4. Skill name */}
                    <td className="py-2 px-3">{row.skillName || '—'}</td>

                    {/* 5. Job Level */}
                    <td className="py-2 px-3">{row.jobLevel || '—'}</td>

                    {/* 6. Vendor SPOC */}
                    <td className="py-2 px-3">{row.vendorSPOC || '—'}</td>

                    {/* 7. Company SPOC */}
                    <td className="py-2 px-3">{row.companySPOC || '—'}</td>

                    {/* 8. JOB ID */}
                    <td className="py-2 px-3 font-mono font-medium text-blue-600">{row.jobId || '—'}</td>

                    {/* 9. DOB */}
                    <td className="py-2 px-3 text-center">{row.dob || '—'}</td>

                    {/* 10. Candidate ID */}
                    <td className="py-2 px-3 font-mono text-slate-600">{row.candidateId || '—'}</td>

                    {/* 11. White Horse Manpower Source */}
                    <td className="py-2 px-3">{row.whiteHorseSource || 'White Horse Manpower'}</td>

                    {/* 12. Date */}
                    <td className="py-2 px-3 text-center text-slate-500">{row.date || '—'}</td>

                    {/* 13. Candidate first Name */}
                    <td className="py-2 px-3 font-semibold text-slate-900">{row.candidateFirstName || '—'}</td>

                    {/* 14. Candidate last name */}
                    <td className="py-2 px-3 font-medium text-slate-800">{row.candidateLastName || '—'}</td>

                    {/* 15. Contact */}
                    <td className="py-2 px-3 font-mono text-slate-800">{row.contact || '—'}</td>

                    {/* 16. Email */}
                    <td className="py-2 px-3 text-slate-700 max-w-[200px] truncate" title={row.email}>
                      {row.email || '—'}
                    </td>

                    {/* 17. Gender */}
                    <td className="py-2 px-3 text-center">{row.gender || '—'}</td>

                    {/* 18. Education */}
                    <td className="py-2 px-3">{row.education || '—'}</td>

                    {/* 19. Total Experience */}
                    <td className="py-2 px-3">{row.totalExperience || '—'}</td>

                    {/* 20. Relevant experience */}
                    <td className="py-2 px-3">{row.relevantExperience || '—'}</td>

                    {/* 21. Company */}
                    <td className="py-2 px-3 font-medium text-slate-900">{row.company || '—'}</td>

                    {/* 22. Skills */}
                    <td className="py-2 px-3 text-slate-600 max-w-[200px] truncate" title={row.skills}>
                      {row.skills || '—'}
                    </td>

                    {/* 23. CTC */}
                    <td className="py-2 px-3 font-mono">{row.ctc || '—'}</td>

                    {/* 24. ECTC */}
                    <td className="py-2 px-3 font-mono">{row.ectc || '—'}</td>

                    {/* 25. Notice Period */}
                    <td className="py-2 px-3">{row.noticePeriod || '—'}</td>

                    {/* 26. Current Location */}
                    <td className="py-2 px-3">{row.currentLocation || '—'}</td>

                    {/* 27. Preferred Location */}
                    <td className="py-2 px-3">{row.preferredLocation || '—'}</td>

                    {/* 28. CIBIL Score */}
                    <td className="py-2 px-3 text-center font-mono font-medium">
                      {row.cibilScore ? (
                        <span className={`px-1.5 py-0.5 rounded text-[11px] ${
                          parseInt(row.cibilScore, 10) >= 750 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {row.cibilScore}
                        </span>
                      ) : '—'}
                    </td>

                    {/* 29. Pan Card Number */}
                    <td className="py-2 px-3 font-mono uppercase tracking-wider text-slate-800">
                      {row.panCardNumber || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination Controls */}
        <div className="p-4 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>
              Showing {candidates.length > 0 ? (page - 1) * limit + 1 : 0} to{' '}
              {Math.min(page * limit, totalCount)} of {totalCount} candidates
            </span>
            <div className="flex items-center gap-1.5 ml-2">
              <label>Rows per page:</label>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            <span className="text-xs font-medium text-slate-700 px-2">
              Page {page} of {Math.max(1, totalPages)}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Add or Edit Eligible Candidate */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold shadow-inner">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {modalMode === 'create' ? 'Add Candidate to Eligible Tracker' : 'Edit Eligible Candidate Details'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    All 29 standard tracker columns matching client Excel specification.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleModalSubmit} className="p-6 space-y-6">
              {formErrors.submit && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{formErrors.submit}</span>
                </div>
              )}

              {/* Section 1: Candidate Identity */}
              <div>
                <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  1. Candidate Identity & Contact
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Candidate First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.candidateFirstName || ''}
                      onChange={(e) => setFormData({ ...formData, candidateFirstName: e.target.value })}
                      placeholder="e.g. Rahul"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    {formErrors.candidateFirstName && (
                      <p className="text-rose-500 text-[11px] mt-0.5">{formErrors.candidateFirstName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Candidate Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.candidateLastName || ''}
                      onChange={(e) => setFormData({ ...formData, candidateLastName: e.target.value })}
                      placeholder="e.g. Sharma"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Contact (Phone) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.contact || ''}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    {formErrors.contact && (
                      <p className="text-rose-500 text-[11px] mt-0.5">{formErrors.contact}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="rahul.sharma@example.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Date of Birth (DOB)</label>
                    <input
                      type="date"
                      value={formData.dob ? formData.dob.split('/').reverse().join('-') : ''}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Gender</label>
                    <select
                      value={formData.gender || ''}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-Binary">Non-Binary</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Recruitment & Client SPOC */}
              <div>
                <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  2. Recruitment & Client SPOC Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Recruiter Name</label>
                    <input
                      type="text"
                      value={formData.recruiter || ''}
                      onChange={(e) => setFormData({ ...formData, recruiter: e.target.value })}
                      placeholder="Assigned recruiter"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                    <select
                      value={formData.status || 'Eligible'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                    >
                      <option value="Eligible">Eligible</option>
                      <option value="Eligible Candidates">Eligible Candidates</option>
                      <option value="SPOC Shortlisted">SPOC Shortlisted</option>
                      <option value="Screening">Screening</option>
                      <option value="Interview Scheduled">Interview Scheduled</option>
                      <option value="Selected">Selected</option>
                      <option value="Joined">Joined</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">JOB ID (JR Number)</label>
                    <input
                      type="text"
                      value={formData.jobId || ''}
                      onChange={(e) => setFormData({ ...formData, jobId: e.target.value })}
                      placeholder="e.g. JR-104"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Candidate ID</label>
                    <input
                      type="text"
                      value={formData.candidateId || ''}
                      onChange={(e) => setFormData({ ...formData, candidateId: e.target.value })}
                      placeholder="Auto-generated or custom"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Vendor SPOC</label>
                    <input
                      type="text"
                      value={formData.vendorSPOC || ''}
                      onChange={(e) => setFormData({ ...formData, vendorSPOC: e.target.value })}
                      placeholder="Vendor SPOC name"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Company SPOC</label>
                    <input
                      type="text"
                      value={formData.companySPOC || ''}
                      onChange={(e) => setFormData({ ...formData, companySPOC: e.target.value })}
                      placeholder="Client company SPOC"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Client Company</label>
                    <input
                      type="text"
                      value={formData.company || ''}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="e.g. Infosys, Wipro"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">WHM Source</label>
                    <input
                      type="text"
                      value={formData.whiteHorseSource || 'White Horse Manpower'}
                      onChange={(e) => setFormData({ ...formData, whiteHorseSource: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Professional & Skill Details */}
              <div>
                <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  3. Skill, Experience & Education
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Skill Name</label>
                    <input
                      type="text"
                      value={formData.skillName || ''}
                      onChange={(e) => setFormData({ ...formData, skillName: e.target.value })}
                      placeholder="e.g. Customer Support"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Job Level</label>
                    <input
                      type="text"
                      value={formData.jobLevel || ''}
                      onChange={(e) => setFormData({ ...formData, jobLevel: e.target.value })}
                      placeholder="e.g. L1, Senior, Mid"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Education</label>
                    <input
                      type="text"
                      value={formData.education || ''}
                      onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                      placeholder="e.g. B.Com, B.Tech, Any Grad"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Total Experience</label>
                    <input
                      type="text"
                      value={formData.totalExperience || ''}
                      onChange={(e) => setFormData({ ...formData, totalExperience: e.target.value })}
                      placeholder="e.g. 2 Years"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Relevant Experience</label>
                    <input
                      type="text"
                      value={formData.relevantExperience || ''}
                      onChange={(e) => setFormData({ ...formData, relevantExperience: e.target.value })}
                      placeholder="e.g. 1.5 Years"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Key Skills (Comma separated)</label>
                    <input
                      type="text"
                      value={formData.skills || ''}
                      onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                      placeholder="e.g. Communication, Voice, Voice & Accent, Telecalling"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Compensation, Location & Verification */}
              <div>
                <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  4. Compensation, Location, CIBIL & PAN
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Current CTC</label>
                    <input
                      type="text"
                      value={formData.ctc || ''}
                      onChange={(e) => setFormData({ ...formData, ctc: e.target.value })}
                      placeholder="e.g. 3,50,000"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Expected CTC (ECTC)</label>
                    <input
                      type="text"
                      value={formData.ectc || ''}
                      onChange={(e) => setFormData({ ...formData, ectc: e.target.value })}
                      placeholder="e.g. 4,20,000"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Notice Period</label>
                    <input
                      type="text"
                      value={formData.noticePeriod || ''}
                      onChange={(e) => setFormData({ ...formData, noticePeriod: e.target.value })}
                      placeholder="e.g. Immediate / 15 Days"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Current Location</label>
                    <input
                      type="text"
                      value={formData.currentLocation || ''}
                      onChange={(e) => setFormData({ ...formData, currentLocation: e.target.value })}
                      placeholder="e.g. Bangalore"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Preferred Location</label>
                    <input
                      type="text"
                      value={formData.preferredLocation || ''}
                      onChange={(e) => setFormData({ ...formData, preferredLocation: e.target.value })}
                      placeholder="e.g. Bangalore, Hyderabad"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">CIBIL Score</label>
                    <input
                      type="text"
                      value={formData.cibilScore || ''}
                      onChange={(e) => setFormData({ ...formData, cibilScore: e.target.value })}
                      placeholder="e.g. 780"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">PAN Card Number</label>
                    <input
                      type="text"
                      value={formData.panCardNumber || ''}
                      onChange={(e) => setFormData({ ...formData, panCardNumber: e.target.value.toUpperCase() })}
                      placeholder="e.g. ABCDE1234F"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {modalMode === 'create' ? 'Save Eligible Candidate' : 'Update Tracker Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
