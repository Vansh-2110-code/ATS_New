import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import {
  Monitor, Clock, FileText, AlertTriangle, Shield, Activity, TrendingUp, TrendingDown,
  Loader2, ExternalLink, Phone, Users, Calendar, ArrowRight, AlertCircle, CheckCircle2,
  ScanLine, UserPlus, ListChecks, CalendarCheck, Briefcase, UserCheck, X, PhoneMissed,
  PhoneOff, PhoneCall, ClipboardList, FileCheck, UserX, Building2, BadgeCheck, Clipboard,
  DollarSign, BarChart2, Edit3, UserCog, StickyNote, ChevronDown, Database, CheckSquare,
  Mail, FileSpreadsheet, Plus, Trash2, RefreshCw, Filter, Flame, Download, Search,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { getGreeting } from '../../utils/greetingUtils';
import { TeamStructureManager } from '../../components/TeamStructureManager';
import { TeamPerformanceReviews } from '../../components/TeamPerformanceReviews';
import { SlicerFilteredDataView } from '../../components/SlicerFilteredDataView';
import { dedupeCompanies } from '../../utils/companyUtils';

// ─── Source Links ─────────────────────────────────────────────────────────────
const SOURCE_LINKS: Record<string, string> = {
  Naukri: 'https://www.naukri.com',
  LinkedIn: 'https://www.linkedin.com/jobs',
  Indeed: 'https://www.indeed.co.in',
  Referral: '',
  'Walk-In': '',
  Direct: '',
  Monster: 'https://www.monsterindia.com',
  Shine: 'https://www.shine.com',
  Apna: 'https://apna.co',
  IIMJobs: 'https://www.iimjobs.com',
};

const ALERT_STYLES: Record<string, string> = {
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  error: 'bg-red-50 border-red-200 text-red-700',
  info: 'bg-green-50 border-green-200 text-green-700',
};
const ALERT_ICONS: Record<string, string> = { warning: '⚠️', error: '🔴', info: 'ℹ️' };

// ─── Recruiter constants ───────────────────────────────────────────────────────
const STATUS_ICON_MAP: Record<string, any> = {
  'Eligible Candidates': UserCheck,
  'Wrong Number': PhoneOff,
  'Did Not Pick': PhoneMissed,
  'Call Back': PhoneCall,
  'HR Shortlist': ClipboardList,
  'Written Test': FileText,
  'Operations Round': Building2,
  'Selected': BadgeCheck,
  'Documentation': Clipboard,
  'Yet To Join': UserX,
  'Joined': CheckCircle2,
  'New': UserPlus,
  'Contacted': Phone,
  'Interested': CheckCircle2,
  'Interview Scheduled': Calendar,
  'Rejected': X,
};

const STATUS_COLOR_LIST = ['emerald', 'red', 'orange', 'amber', 'violet', 'indigo', 'cyan', 'teal', 'sky', 'pink', 'green'];

const STATUS_COLOR_MAP: Record<string, { card: string; icon: string; badge: string }> = {
  emerald: { card: 'border-emerald-100 bg-emerald-50/60 hover:bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', badge: 'text-emerald-700' },
  red: { card: 'border-red-100 bg-red-50/60 hover:bg-red-50', icon: 'bg-red-100 text-red-500', badge: 'text-red-600' },
  orange: { card: 'border-orange-100 bg-orange-50/60 hover:bg-orange-50', icon: 'bg-orange-100 text-orange-600', badge: 'text-orange-700' },
  amber: { card: 'border-amber-100 bg-amber-50/60 hover:bg-amber-50', icon: 'bg-amber-100 text-amber-600', badge: 'text-amber-700' },
  violet: { card: 'border-violet-100 bg-violet-50/60 hover:bg-violet-50', icon: 'bg-violet-100 text-violet-600', badge: 'text-violet-700' },
  indigo: { card: 'border-indigo-100 bg-indigo-50/60 hover:bg-indigo-50', icon: 'bg-indigo-100 text-indigo-600', badge: 'text-indigo-700' },
  cyan: { card: 'border-cyan-100 bg-cyan-50/60 hover:bg-cyan-50', icon: 'bg-cyan-100 text-cyan-600', badge: 'text-cyan-700' },
  teal: { card: 'border-teal-100 bg-teal-50/60 hover:bg-teal-50', icon: 'bg-teal-100 text-teal-600', badge: 'text-teal-700' },
  sky: { card: 'border-sky-100 bg-sky-50/60 hover:bg-sky-50', icon: 'bg-sky-100 text-sky-600', badge: 'text-sky-700' },
  pink: { card: 'border-pink-100 bg-pink-50/60 hover:bg-pink-50', icon: 'bg-pink-100 text-pink-600', badge: 'text-pink-700' },
  green: { card: 'border-green-100 bg-green-50/60 hover:bg-green-50', icon: 'bg-green-100 text-green-600', badge: 'text-green-700' },
};

const colorMap: Record<string, { card: string; icon: string; badge: string }> = {
  blue: { card: 'border-green-100 bg-green-50/40', icon: 'bg-green-100 text-green-600', badge: 'bg-green-100 text-green-700' },
  amber: { card: 'border-amber-100 bg-amber-50/40', icon: 'bg-amber-100 text-amber-600', badge: 'bg-amber-100 text-amber-700' },
  violet: { card: 'border-violet-100 bg-violet-50/40', icon: 'bg-violet-100 text-violet-600', badge: 'bg-violet-100 text-violet-700' },
  emerald: { card: 'border-emerald-100 bg-emerald-50/40', icon: 'bg-emerald-100 text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
};

const activityColors: Record<string, string> = {
  call: 'bg-green-100 text-green-600',
  status: 'bg-violet-100 text-violet-600',
  resume: 'bg-emerald-100 text-emerald-600',
  walkin: 'bg-amber-100 text-amber-600',
  follow: 'bg-slate-100 text-slate-500',
};

// ─── TL constants ──────────────────────────────────────────────────────────────
const TL_STATUS_COLORS: Record<string, { dot: string; badge: string }> = {
  online: { dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
  break: { dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700' },
  offline: { dot: 'bg-slate-300', badge: 'bg-slate-100 text-slate-500' },
  'on-target': { dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
};

// ─── Manager constants ─────────────────────────────────────────────────────────
const PIE_COLORS = ['#16A34A', '#7C3AED', '#059669', '#D97706', '#DC2626'];

// ─── Types ─────────────────────────────────────────────────────────────────────
type DateRange = 'Day' | 'Week' | 'Quarter' | 'Year' | 'All' | 'Custom';
type Tab = 'overview' | 'divisionDashboard' | 'recruiting' | 'team' | 'structure' | 'analytics' | 'businessDev';
const DATE_TABS: DateRange[] = ['Day', 'Week', 'Quarter', 'Year', 'All', 'Custom'];
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'divisionDashboard', label: 'Division Dashboard' },
  { id: 'recruiting', label: 'Recruiting' },
  { id: 'team', label: 'Team' },
  { id: 'structure', label: 'Team Structure' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'businessDev', label: 'Business Development' },
];

export function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fmt = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${(n / 1000).toFixed(0)}K`;

  const location = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (window.location.pathname === '/business-development' || window.location.pathname === '/bd') return 'businessDev';
    if (user?.role === 'bd' || user?.role === 'business_developer') return 'businessDev';
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && TABS.some(t => t.id === tabParam)) return tabParam as Tab;
    return 'overview';
  });

  useEffect(() => {
    if (location.pathname === '/business-development' || location.pathname === '/bd') {
      setActiveTab('businessDev');
    }
  }, [location.pathname]);
  const [loading, setLoading] = useState(true);
  const isFirstRender = useRef(true);

  // ── Overview state ──────────────────────────────────────────────────────────
  const [sourceData, setSourceData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [adminMetrics, setAdminMetrics] = useState<any>({});
  const [revenueCandidates, setRevenueCandidates] = useState<any[]>([]);
  const [revenueSearch, setRevenueSearch] = useState('');
  const [totalCandidateRevenue, setTotalCandidateRevenue] = useState(0);

  // ── Division Dashboard state ────────────────────────────────────────────────
  const [activeDivision, setActiveDivision] = useState<'BPO' | 'IT' | 'Lateral'>('BPO');
  const [divisionData, setDivisionData] = useState<any>(null);
  const [divLoading, setDivLoading] = useState(false);
  const [divCandidateSlicer, setDivCandidateSlicer] = useState<'all' | 'offered' | 'yetToJoin' | 'joined'>('all');
  const [divCompanyFilter, setDivCompanyFilter] = useState<string>('All Companies');
  const [divTlFilter, setDivTlFilter] = useState<string>('All Team Leaders');
  const [divRecruiterFilter, setDivRecruiterFilter] = useState<string>('All Recruiters');
  const [allClientNames, setAllClientNames] = useState<string[]>([]);

  // ── Recruiter state ─────────────────────────────────────────────────────────
  const [dateRange, setDateRange] = useState<DateRange>('Day');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [recLoading, setRecLoading] = useState(false);
  const [dashData, setDashData] = useState<any>(null);
  const [analyticsDateRange, setAnalyticsDateRange] = useState<DateRange>('Month');
  const [recDivision, setRecDivision] = useState<string>('All');
  const [recruiterFilter, setRecruiterFilter] = useState<string>('All');
  const [recruitersList, setRecruitersList] = useState<any[]>([]);
  const [teamLeadersList, setTeamLeadersList] = useState<any[]>([]);
  const [filteredRecruitersList, setFilteredRecruitersList] = useState<any[]>([]);
  const [overviewSlicer, setOverviewSlicer] = useState<string>('All');
  const [recruitingSlicer, setRecruitingSlicer] = useState<string>('All');
  const [recCompanyFilter, setRecCompanyFilter] = useState<string>('All Companies');

  // ── TL state ────────────────────────────────────────────────────────────────
  const [teams, setTeams] = useState<any[]>([]);
  const [teamSummary, setTeamSummary] = useState<any>({ totalCalls: 0, totalInterviews: 0, totalFollowUps: 0, activeRecruiters: 0 });

  // ── Manager state ───────────────────────────────────────────────────────────
  const [conversionData, setConversionData] = useState<any[]>([]);
  const [recruiterData, setRecruiterData] = useState<any[]>([]);
  const [mgrSourceData, setMgrSourceData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({});

  // ── Business Development state ──────────────────────────────────────────────
  const [bizDevRecords, setBizDevRecords] = useState<any[]>([]);
  const [bizDevStats, setBizDevStats] = useState<any>({});
  const [bizDevLoading, setBizDevLoading] = useState(false);
  const [bizDevSearch, setBizDevSearch] = useState('');
  const [bizDevFilters, setBizDevFilters] = useState<any>({
    clientStatus: '',
    callStatus: '',
    serviceOffered: '',
    executiveName: '',
    startDate: '',
    endDate: '',
    kpiFilter: '',
  });
  const [bizDevPage, setBizDevPage] = useState(1);
  const [bizDevLimit] = useState(20);
  const [bizDevTotal, setBizDevTotal] = useState(0);
  const [bizDevSort, setBizDevSort] = useState<any>({ by: 'date', order: 'desc' });
  const [selectedBizDev, setSelectedBizDev] = useState<any>(null);
  const [isBizDevModalOpen, setIsBizDevModalOpen] = useState(false);
  const [bizDevModalMode, setBizDevModalMode] = useState<'add' | 'edit'>('add');
  const [bizDevForm, setBizDevForm] = useState<any>({
    date: new Date().toISOString().slice(0, 10),
    executiveName: '',
    companyName: '',
    contactPerson: '',
    designation: '',
    mobileNo: '',
    emailId: '',
    city: '',
    industry: '',
    source: 'LinkedIn',
    serviceOffered: 'Permanent Recruitment',
    callStatus: 'Connected',
    interested: 'No',
    requirement: '',
    noOfPositions: 0,
    followUpDate: '',
    meetingFixed: 'No',
    proposalSent: 'No',
    agreementSent: 'No',
    clientStatus: 'Cold',
    expectedRevenue: 0,
    ctc: 0,
    placementPercentage: 8.33,
    remarks: '',
  });

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // ── Helpers to map API responses ────────────────────────────────────────────
  const applyTLData = (tlData: any) => {
    // If Admin/Manager, tlData should have .teams and .summary
    if (tlData.teams && tlData.summary) {
      setTeams(tlData.teams);
      setTeamSummary(tlData.summary);
    } else {
      // Fallback for single TL view (though AdminDashboard now calls all-teams)
      const t = tlData.teamMembers || tlData.team || tlData.recruiters || [];
      const mappedRecruiters = t.map((r: any) => ({
        id: r._id || r.id,
        name: r.name || '',
        calls: r.calls ?? r.todayCalls ?? 0,
        target: r.target ?? r.callTarget ?? r.dailyTarget ?? 50,
        interviews: r.interviews ?? r.todayInterviews ?? r.interviewsScheduled ?? 0,
        followUps: r.followUps ?? r.pendingFollowUps ?? 0,
        joinedCount: r.joinedCount ?? 0,
        status: r.onTarget ? 'on-target' : r.status || 'offline',
        joined: r.joined || r.loginTime || '—',
      }));
      setTeams([{ tlName: 'Self', recruiters: mappedRecruiters, stats: { totalCalls: mappedRecruiters.reduce((s: any, r: any) => s + r.calls, 0) } }]);
      setTeamSummary({
        totalCalls: mappedRecruiters.reduce((s: any, r: any) => s + r.calls, 0),
        totalInterviews: mappedRecruiters.reduce((s: any, r: any) => s + r.interviews, 0),
        totalFollowUps: mappedRecruiters.reduce((s: any, r: any) => s + r.followUps, 0),
        activeRecruiters: mappedRecruiters.length
      });
    }
  };

  const applyManagerData = (mgrData: any) => {
    const rawFunnel = mgrData.funnelData || mgrData.conversionData || mgrData.funnel || [];
    setConversionData(rawFunnel.map((f: any) => ({
      month: f.month,
      resumes: f.resumes ?? f.applied ?? 0,
      interviews: f.interviews ?? f.interviewed ?? 0,
      hired: f.hired ?? f.selected ?? f.joined ?? 0,
    })));
    setRecruiterData((mgrData.recruiterProductivity || mgrData.recruiterData || []).map((r: any) => ({
      ...r,
      placed: r.placed ?? r.placements ?? 0,
    })));
    setMgrSourceData((mgrData.sourceDistribution || mgrData.sourceData || []).map((s: any, i: number) => ({
      name: s.name || s.source || '',
      value: s.value ?? s.count ?? 0,
      color: s.color || PIE_COLORS[i % PIE_COLORS.length],
    })));
    setRevenueData(mgrData.revenueData || mgrData.revenueTrend || []);
    const kpiData = mgrData.kpis || mgrData.summary || {};
    setKpis({ ...kpiData, conversionRate: kpiData.conversionRate ?? kpiData.interviewToHireRate ?? '—' });
  };

  const loadManagerData = async () => {
    try {
      const params: any = { range: analyticsDateRange.toLowerCase() };
      if (analyticsDateRange === 'Custom') {
        params.startDate = customFrom;
        params.endDate = customTo;
      }
      const data = await api.getManagerDashboard(params);
      applyManagerData(data);
    } catch (err) {
      console.error('Failed to load analytics data:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics' && !isFirstRender.current) {
      loadManagerData();
    }
  }, [activeTab, analyticsDateRange]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Business Development Functions ──────────────────────────────────────────
  const loadBizDevData = async () => {
    try {
      setBizDevLoading(true);
      const params: Record<string, string> = {
        page: bizDevPage.toString(),
        limit: bizDevLimit.toString(),
        sortBy: bizDevSort.by,
        sortOrder: bizDevSort.order,
        range: dateRange.toLowerCase(),
      };
      if (dateRange === 'Custom') {
        if (customFrom) params.startDate = customFrom;
        if (customTo) params.endDate = customTo;
      }
      if (bizDevSearch) params.search = bizDevSearch;
      if (bizDevFilters.clientStatus) params.clientStatus = bizDevFilters.clientStatus;
      if (bizDevFilters.callStatus) params.callStatus = bizDevFilters.callStatus;
      if (bizDevFilters.serviceOffered) params.serviceOffered = bizDevFilters.serviceOffered;
      if (bizDevFilters.executiveName) params.executiveName = bizDevFilters.executiveName;
      if (bizDevFilters.startDate) params.startDate = bizDevFilters.startDate;
      if (bizDevFilters.endDate) params.endDate = bizDevFilters.endDate;
      if (bizDevFilters.kpiFilter) params.kpiFilter = bizDevFilters.kpiFilter;

      const [recordsRes, statsRes] = await Promise.all([
        api.getBizDevRecords(params),
        api.getBizDevStats(params),
      ]);

      setBizDevRecords(recordsRes.records || []);
      setBizDevTotal(recordsRes.total || 0);
      setBizDevStats(statsRes || {});
    } catch (err) {
      console.error('Failed to load business development data:', err);
    } finally {
      setBizDevLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'businessDev') {
      loadBizDevData();
    }
  }, [activeTab, bizDevPage, bizDevSearch, bizDevFilters, bizDevSort, dateRange, customFrom, customTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBizDevSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setBizDevLoading(true);
      // Format followUpDate as empty if not set
      const body = { ...bizDevForm };
      if (!body.followUpDate) body.followUpDate = null;
      if (bizDevModalMode === 'add') {
        await api.createBizDevRecord(body);
      } else {
        await api.updateBizDevRecord(selectedBizDev._id, body);
      }
      setIsBizDevModalOpen(false);
      loadBizDevData();
    } catch (err) {
      console.error('Failed to save business development record:', err);
    } finally {
      setBizDevLoading(false);
    }
  };

  const handleBizDevDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      setBizDevLoading(true);
      await api.deleteBizDevRecord(id);
      loadBizDevData();
    } catch (err) {
      console.error('Failed to delete business development record:', err);
    } finally {
      setBizDevLoading(false);
    }
  };

  const handleBizDevExport = async () => {
    try {
      const params: Record<string, string> = {
        range: dateRange.toLowerCase(),
      };
      if (dateRange === 'Custom') {
        if (customFrom) params.startDate = customFrom;
        if (customTo) params.endDate = customTo;
      }
      if (bizDevSearch) params.search = bizDevSearch;
      if (bizDevFilters.clientStatus) params.clientStatus = bizDevFilters.clientStatus;
      if (bizDevFilters.callStatus) params.callStatus = bizDevFilters.callStatus;
      if (bizDevFilters.serviceOffered) params.serviceOffered = bizDevFilters.serviceOffered;
      if (bizDevFilters.executiveName) params.executiveName = bizDevFilters.executiveName;
      if (bizDevFilters.startDate) params.startDate = bizDevFilters.startDate;
      if (bizDevFilters.endDate) params.endDate = bizDevFilters.endDate;
      if (bizDevFilters.kpiFilter) params.kpiFilter = bizDevFilters.kpiFilter;

      await api.exportBizDevExcel(params);
    } catch (err) {
      console.error('Failed to export biz dev records:', err);
    }
  };

  const openAddBizDevModal = () => {
    setBizDevModalMode('add');
    setSelectedBizDev(null);
    setBizDevForm({
      date: new Date().toISOString().slice(0, 10),
      executiveName: user?.name || '',
      companyName: '',
      contactPerson: '',
      designation: '',
      mobileNo: '',
      emailId: '',
      city: '',
      industry: '',
      source: 'LinkedIn',
      serviceOffered: 'Permanent Recruitment',
      callStatus: 'Connected',
      interested: 'No',
      requirement: '',
      noOfPositions: 0,
      followUpDate: '',
      meetingFixed: 'No',
      proposalSent: 'No',
      agreementSent: 'No',
      clientStatus: 'Cold',
      expectedRevenue: 0,
      ctc: 0,
      placementPercentage: 8.33,
      remarks: '',
    });
    setIsBizDevModalOpen(true);
  };

  const openEditBizDevModal = (record: any) => {
    setBizDevModalMode('edit');
    setSelectedBizDev(record);
    setBizDevForm({
      date: record.date ? new Date(record.date).toISOString().slice(0, 10) : '',
      executiveName: record.executiveName || '',
      companyName: record.companyName || '',
      contactPerson: record.contactPerson || '',
      designation: record.designation || '',
      mobileNo: record.mobileNo || '',
      emailId: record.emailId || '',
      city: record.city || '',
      industry: record.industry || '',
      source: record.source || 'LinkedIn',
      serviceOffered: record.serviceOffered || 'Permanent Recruitment',
      callStatus: record.callStatus || 'Connected',
      interested: record.interested || 'No',
      requirement: record.requirement || '',
      noOfPositions: record.noOfPositions || 0,
      followUpDate: record.followUpDate ? new Date(record.followUpDate).toISOString().slice(0, 10) : '',
      meetingFixed: record.meetingFixed || 'No',
      proposalSent: record.proposalSent || 'No',
      agreementSent: record.agreementSent || 'No',
      clientStatus: record.clientStatus || 'Cold',
      expectedRevenue: record.expectedRevenue || 0,
      ctc: record.ctc || 0,
      placementPercentage: record.placementPercentage || 8.33,
      remarks: record.remarks || '',
    });
    setIsBizDevModalOpen(true);
  };

  // ── Initial full load ────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [adminData, tlData, mgrData, recData] = await Promise.all([
          api.getAdminDashboard(),
          api.getAllTeamsDashboard(),

          api.getManagerDashboard(),
          api.getRecruiterDashboard({ range: 'day' }),
        ]);
        const m = adminData.metrics || adminData.kpis || {};
        setAdminMetrics({ ...m, resumesReceived: m.resumesReceived ?? m.totalResumes ?? '—' });
        setSourceData(adminData.sourceChart || adminData.sourceData || adminData.resumeInflow || []);
        setAlerts((adminData.alerts || []).map((a: any) => ({ ...a, msg: a.msg || a.message || '' })));
        setRevenueCandidates(adminData.revenueCandidates || []);
        setTotalCandidateRevenue(adminData.totalRevenue || 0);
        applyTLData(tlData);
        applyManagerData(mgrData);
        setDashData(recData);
      } catch (err) {
        console.error('Failed to load admin super-dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load recruiters and team leaders list for filter dropdowns
  useEffect(() => {
    Promise.all([
      api.getRecruiters().catch(() => []),
      api.getUsers({ limit: '1000' }).catch(() => ({ users: [] }))
    ]).then(([recRes, userRes]: any) => {
      const recs = Array.isArray(recRes) ? recRes : (recRes?.users || []);
      setRecruitersList(recs);

      const allUsers = Array.isArray(userRes) ? userRes : (userRes?.users || []);
      // Team Leaders: users with role 'tl', 'manager', or 'admin'
      const tls = allUsers.filter((u: any) => ['tl', 'manager', 'admin'].includes(u.role) && u.status !== 'Inactive');
      setTeamLeadersList(tls.length > 0 ? tls : allUsers);
    }).catch(err => console.error('Failed to load team leaders list:', err));
  }, []);

  // Cascade Recruiter dropdown based on selected Team Leader
  useEffect(() => {
    if (!divTlFilter || divTlFilter === 'All Team Leaders') {
      setFilteredRecruitersList(recruitersList);
    } else {
      const selectedTlObj = teamLeadersList.find(t => (t._id || t.id || t.name) === divTlFilter);
      const tlIdParam = selectedTlObj?._id || selectedTlObj?.id || divTlFilter;
      api.getTeamMembers(tlIdParam)
        .then((res: any) => {
          const members = res?.members || res?.data || (Array.isArray(res) ? res : []);
          setFilteredRecruitersList(members.length > 0 ? members : recruitersList);
        })
        .catch(() => {
          setFilteredRecruitersList(recruitersList);
        });
    }
  }, [divTlFilter, recruitersList, teamLeadersList]);

  // ── Admin date-filter refresh ───────────────────────────────────────────────
  useEffect(() => {
    if (dateRange === 'Custom' && (!customFrom || !customTo)) return;
    const loadAdminData = async () => {
      try {
        const params: Record<string, string> = { range: dateRange.toLowerCase() };
        if (dateRange === 'Custom') {
          params.from = customFrom;
          params.to = customTo;
        }
        const adminData = await api.getAdminDashboard(params);
        const m = adminData.metrics || adminData.kpis || {};
        setAdminMetrics({ ...m, resumesReceived: m.resumesReceived ?? m.totalResumes ?? '—' });
        setSourceData(adminData.sourceChart || adminData.sourceData || adminData.resumeInflow || []);
        if (adminData.alerts) {
          setAlerts((adminData.alerts || []).map((a: any) => ({ ...a, msg: a.msg || a.message || '' })));
        }
        if (adminData.revenueCandidates) {
          setRevenueCandidates(adminData.revenueCandidates);
          setTotalCandidateRevenue(adminData.totalRevenue || 0);
        }
      } catch (err) {
        console.error('Failed to update admin dashboard for date range:', err);
      }
    };
    loadAdminData();
  }, [dateRange, customFrom, customTo]);

  // ── Recruiter date-filter refresh (skip first render) ───────────────────────
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (dateRange === 'Custom' && (!customFrom || !customTo)) return;
    const loadRec = async () => {
      try {
        setRecLoading(true);
        const params: Record<string, string> = { range: dateRange.toLowerCase() };
        if (dateRange === 'Custom') { params.from = customFrom; params.to = customTo; }
        if (recDivision && recDivision !== 'All') params.division = recDivision;
        if (recruiterFilter && recruiterFilter !== 'All') params.recruiter = recruiterFilter;
        const data = await api.getRecruiterDashboard(params);
        setDashData(data);
      } catch (err) {
        console.error('Recruiter data reload failed:', err);
      } finally {
        setRecLoading(false);
      }
    };
    loadRec();
  }, [dateRange, customFrom, customTo, recDivision, recruiterFilter]);

  // ── Division Dashboard loader ───────────────────────────────────────────────
  // Load ONLY created companies from Company Management (deduplicated & sorted A-Z)
  useEffect(() => {
    api.getCompanyList().then((data: any) => {
      const raw = Array.isArray(data) ? data : (data.companies || []);
      const uniqueSorted = dedupeCompanies(raw).map((c: any) => typeof c === 'string' ? c : c.companyName || c.name || '').filter(Boolean);
      setAllClientNames(uniqueSorted as string[]);
    }).catch(() => { });
  }, []);

  useEffect(() => {
    if (activeTab === 'divisionDashboard') {
      const loadDiv = async () => {
        try {
          setDivLoading(true);
          const data = await api.getDivisionDashboard(
            activeDivision,
            divCompanyFilter,
            divTlFilter,
            divRecruiterFilter,
            dateRange.toLowerCase(),
            customFrom,
            customTo
          );
          setDivisionData(data);
        } catch (err) {
          console.error('Failed to load division dashboard:', err);
        } finally {
          setDivLoading(false);
        }
      };
      loadDiv();
    }
  }, [activeTab, activeDivision, divCompanyFilter, divTlFilter, divRecruiterFilter, dateRange, customFrom, customTo]);

  // ── Derived values ───────────────────────────────────────────────────────────
  const STATUS_CARDS = dashData?.pipeline
    ? Object.entries(dashData.pipeline).map(([label, count]: any, i: number) => ({
      label, count: count || 0,
      color: STATUS_COLOR_LIST[i % STATUS_COLOR_LIST.length],
      icon: STATUS_ICON_MAP[label] || UserCheck,
    }))
    : [];

  const followUps = dashData?.followUps || [];
  const recentActivity = dashData?.recentActivity || [];
  const recMetrics = {
    todayCalls: dashData?.metrics?.todayCalls ?? dashData?.todayCalls ?? 0,
    followUpsDue: dashData?.metrics?.followUpsDue ?? dashData?.followUpsDue ?? (dashData?.followUps?.length || 0),
    interviewsScheduled: dashData?.metrics?.scheduledInterviews ?? dashData?.interviewsScheduled ?? 0,
    resumeInflow: dashData?.metrics?.totalCandidates ?? dashData?.resumeInflow ?? 0,
    dailyTarget: dashData?.callTarget?.target ?? dashData?.dailyTarget ?? 50,
  };

  const totalCalls = teamSummary.totalCalls || 0;
  const totalInterviews = teamSummary.totalInterviews || 0;
  const totalFollowUps = teamSummary.totalFollowUps || 0;

  const goToStatus = (status: string) => navigate('/admin/candidates', { state: { statusFilter: status } });
  const goToTodayCalls = () => navigate('/recruiter/resumes', { state: { todayCalls: true } });
  const goToSource = (source: string) => navigate('/admin/candidates', { state: { sourceFilter: source } });

  // ── Sticky Notes ───────────────────────────────────────────────────────────
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteText, setNoteText] = useState(() => localStorage.getItem('ats_sticky_notes') || '');
  const saveNote = (v: string) => { setNoteText(v); localStorage.setItem('ats_sticky_notes', v); };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* ── Sticky Notes Widget ─────────────────────────────────────── */}
      <div className="fixed bottom-34 right-6 z-40">
        {notesOpen ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl shadow-2xl w-72 flex flex-col overflow-hidden mb-2 animate-in slide-in-from-bottom-3 duration-150">
            <div className="flex items-center justify-between px-4 py-3 bg-amber-100 border-b border-amber-200">
              <div className="flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-amber-700" />
                <span className="text-amber-800 text-sm" style={{ fontWeight: 600 }}>Quick Notes</span>
              </div>
              <button onClick={() => setNotesOpen(false)} className="text-amber-600 hover:text-amber-800 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={noteText}
              onChange={e => saveNote(e.target.value)}
              placeholder="Type your notes here... Auto-saved."
              className="flex-1 p-4 bg-amber-50 text-slate-700 text-sm resize-none outline-none min-h-[180px]"
              style={{ fontFamily: 'inherit' }}
            />
            <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 flex justify-between items-center">
              <span className="text-amber-600 text-xs">Auto-saved</span>
              {noteText && (
                <button onClick={() => saveNote('')} className="text-amber-500 hover:text-red-500 text-xs cursor-pointer" style={{ fontWeight: 500 }}>
                  Clear
                </button>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setNotesOpen(true)}
            className="w-11 h-11 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 relative cursor-pointer"
            title="Admin Quick Notes"
          >
            <StickyNote className="w-5 h-5" />
            {noteText && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />}
          </button>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-slate-800" style={{ fontWeight: 700, fontSize: '1.5rem' }}>
            {getGreeting()}, {user?.name.split(' ')[0]}! 👋
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">System overview — {today}</p>
        </div>
        <span className="self-start sm:self-auto px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 text-xs rounded-full" style={{ fontWeight: 600 }}>
          Admin · Super Access
        </span>
      </div>

      {/* Tab Bar & Date Range Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-xs">
        {/* Tab Bar */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl flex-wrap">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm transition-all ${activeTab === tab.id ? 'bg-white text-slate-800 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Global Date Range Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date Range:</span>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {DATE_TABS.map(r => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1.5 rounded-lg transition-all ${dateRange === r ? 'bg-green-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                {r}
              </button>
            ))}
          </div>

          {dateRange === 'Custom' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-green-500 bg-white"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-green-500 bg-white"
              />
              {(customFrom || customTo) && (
                <button
                  onClick={() => { setCustomFrom(''); setCustomTo(''); }}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════ TAB: OVERVIEW ══════════════ */}
      {activeTab === 'overview' && (
        <>
          {/* Top Row: Pipeline Statuses */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-slate-700 text-xs font-bold uppercase tracking-wider">Recruitment Pipeline Statuses</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Open Positions', value: adminMetrics.openPositionsCount ?? adminMetrics.openJobsCount ?? '0', sub: 'Active Vacancies', icon: Briefcase, color: 'blue', href: '/admin/jobs?status=Open' },
                { label: 'Offer Selected', value: adminMetrics.selectedCount ?? '0', sub: 'Offered / Selected', icon: BadgeCheck, color: 'emerald', href: '/admin/candidates?statusFilter=Selected' },
                { label: 'Operations Round', value: adminMetrics.opsRoundCount ?? adminMetrics.operationsRoundCount ?? '0', sub: 'In Ops Round', icon: Building2, color: 'violet', href: '/admin/candidates?statusFilter=Operations%20Round' },
                { label: 'HR Round', value: adminMetrics.hrRoundCount ?? '0', sub: 'In HR Round', icon: ClipboardList, color: 'amber', href: '/admin/candidates?statusFilter=HR%20Shortlist' },
                { label: 'Yet to Join', value: adminMetrics.yetToJoinCount ?? adminMetrics.followToJoinCount ?? '0', sub: 'Offer Accepted', icon: UserCheck, color: 'purple', href: '/admin/candidates?statusFilter=Yet%20To%20Join' },
                { label: 'Joined', value: adminMetrics.joinedCount ?? '0', sub: 'Successfully Placed', icon: CheckCircle2, color: 'green', href: '/admin/candidates?statusFilter=Joined' },
              ].map((m, i) => {
                const Icon = m.icon;
                const bg: Record<string, string> = {
                  blue: 'bg-blue-50 text-blue-600 border-blue-100',
                  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                  violet: 'bg-violet-50 text-violet-600 border-violet-100',
                  amber: 'bg-amber-50 text-amber-600 border-amber-100',
                  purple: 'bg-purple-50 text-purple-600 border-purple-100',
                  green: 'bg-green-50 text-green-600 border-green-100',
                };
                const handleClick = () => {
                  if (m.href.includes('statusFilter=')) {
                    const status = decodeURIComponent(m.href.split('statusFilter=')[1]);
                    navigate('/admin/candidates', { state: { statusFilter: status } });
                  } else if (m.href.includes('status=')) {
                    navigate('/admin/jobs');
                  } else {
                    navigate(m.href);
                  }
                };
                return (
                  <button key={i} onClick={handleClick}
                    className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm text-left hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer w-full flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider truncate max-w-[80%]">{m.label}</span>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${bg[m.color]}`}><Icon className="w-3.5 h-3.5" /></div>
                    </div>
                    <div>
                      <div className="text-xl text-slate-800" style={{ fontWeight: 700 }}>{m.value}</div>
                      <div className="text-[11px] text-slate-400 font-medium truncate mt-0.5">{m.sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Second Row: System & Business Metrics */}
          <div className="space-y-2 mb-5">
            <div className="flex items-center justify-between">
              <h3 className="text-slate-700 text-xs font-bold uppercase tracking-wider">System & Business Metrics</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { label: 'Active Logins Today', value: adminMetrics.activeLogins ?? '—', sub: 'System Users', icon: Monitor, color: 'blue', href: '/admin/attendance' },
                { label: 'Attendance Rate', value: adminMetrics.attendanceRate ? `${adminMetrics.attendanceRate}%` : '—', sub: 'System Users', icon: Clock, color: 'emerald', href: '/admin/attendance' },
                { label: 'Pending Alerts', value: alerts.length || '0', sub: `${alerts.filter((a: any) => a.type === 'error').length} critical`, icon: AlertTriangle, color: 'amber', href: '/admin/logs' },
                { label: 'Total Candidate Revenue', value: fmt(totalCandidateRevenue), sub: 'From Placements', icon: DollarSign, color: 'emerald', href: 'tab:analytics' },
                { label: 'Revenue (This Month)', value: adminMetrics.currentMonthRevenue ? fmt(adminMetrics.currentMonthRevenue) : '₹0', sub: 'Business', icon: DollarSign, color: 'emerald', href: '/revenue' },
                { label: 'Total Candidates', value: adminMetrics.totalCandidates ?? '—', sub: 'Resume DB', icon: Users, color: 'violet', href: '/recruiter/resumes' },
                { label: 'Pending Follow-ups', value: adminMetrics.pendingFollowUps ?? '0', sub: 'Action Required', icon: AlertCircle, color: 'amber', href: '/tl/follow-ups' },
                { label: 'Rejected Candidates', value: adminMetrics.rejectedCount ?? '0', sub: 'Closed/Dropped', icon: X, color: 'red', href: '/admin/candidates?statusFilter=Rejected' },
              ].map((m, i) => {
                const Icon = m.icon;
                const bg: Record<string, string> = {
                  blue: 'bg-blue-50 text-blue-600 border-blue-100',
                  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                  violet: 'bg-violet-50 text-violet-600 border-violet-100',
                  amber: 'bg-amber-50 text-amber-600 border-amber-100',
                  red: 'bg-red-50 text-red-600 border-red-100',
                };
                const handleClick = () => {
                  if (m.href.includes('statusFilter=')) {
                    const status = decodeURIComponent(m.href.split('statusFilter=')[1]);
                    navigate('/admin/candidates', { state: { statusFilter: status } });
                  } else if (m.href.includes('status=')) {
                    navigate('/admin/jobs');
                  } else if (m.href.startsWith('tab:')) {
                    setActiveTab(m.href.replace('tab:', '') as any);
                  } else {
                    navigate(m.href);
                  }
                };
                return (
                  <button key={i} onClick={handleClick}
                    className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm text-left hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer w-full flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider truncate max-w-[80%]">{m.label}</span>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${bg[m.color]}`}><Icon className="w-3.5 h-3.5" /></div>
                    </div>
                    <div>
                      <div className="text-xl text-slate-800" style={{ fontWeight: 700 }}>{m.value}</div>
                      <div className="text-[11px] text-slate-400 font-medium truncate mt-0.5">{m.sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-5">
            {/* Resume Inflow by Source */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-800 text-sm" style={{ fontWeight: 600 }}>Resume Inflow by Source</h3>
                <span className="text-slate-400 text-xs">Today</span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={sourceData} barSize={32} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="source" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #E2E8F0', borderRadius: 8 }} />
                  <Bar dataKey="count" name="Resumes" fill="#16A34A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                {sourceData.map((s: any, i: number) => {
                  const url = SOURCE_LINKS[s.source] || SOURCE_LINKS[s.name] || '';
                  const label = s.source || s.name || '';
                  return (
                    <div key={i} className="flex items-center gap-1">
                      <button
                        onClick={() => goToSource(label)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 bg-green-50 text-green-700 border border-green-100 rounded-full hover:bg-green-100 transition-colors"
                        style={{ fontWeight: 500 }}
                        title={`View ${label} candidates`}
                      >
                        {label}
                      </button>
                      {url && (
                        <a href={url} target="_blank" rel="noopener noreferrer"
                          className="p-1 text-slate-400 hover:text-green-600 transition-colors"
                          title={`Open ${label} website`}>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Nav */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Attendance', href: '/admin/attendance', icon: Clock, desc: 'Login/logout & WFH', color: 'blue' },
              { label: 'User Management', href: '/admin/users', icon: UserCog, desc: 'Add, edit & manage users', color: 'violet' },
              { label: 'Access Control', href: '/admin/access', icon: Shield, desc: 'Roles & permissions', color: 'violet' },
              { label: 'System Logs', href: '/admin/logs', icon: Activity, desc: 'Activity & audit trail', color: 'emerald' },
              { label: 'Revenue', href: '/revenue', icon: TrendingUp, desc: 'Revenue & invoices', color: 'amber' },
            ].map((n, i) => {
              const Icon = n.icon;
              const bg: Record<string, string> = {
                blue: 'bg-green-50 text-green-600 border-green-100',
                violet: 'bg-violet-50 text-violet-600 border-violet-100',
                emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                amber: 'bg-amber-50 text-amber-600 border-amber-100',
              };
              return (
                <Link key={i} to={n.href} className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 border ${bg[n.color]}`}><Icon className="w-5 h-5" /></div>
                  <p className="text-slate-800 text-sm" style={{ fontWeight: 600 }}>{n.label}</p>
                  <p className="text-slate-400 text-xs mt-1">{n.desc}</p>
                </Link>
              );
            })}
          </div>

          {/* Admin Shortcuts: New Modules */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Job Requirements', href: '/admin/jobs', icon: Briefcase, desc: 'Manage JRs & job openings', color: 'bg-teal-50 text-teal-600 border-teal-100' },
              { label: 'Companies', href: '/admin/companies', icon: Building2, desc: 'Company profiles & tracking', color: 'bg-sky-50 text-sky-600 border-sky-100' },
              { label: 'Candidate DB', href: '/admin/candidates', icon: Database, desc: 'Full candidate database', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
              { label: 'Team Tasks', href: '/admin/tasks', icon: CheckSquare, desc: 'Assign & track daily tasks', color: 'bg-rose-50 text-rose-600 border-rose-100' },
              { label: 'ATS Records', href: '/admin/ats-records', icon: FileSpreadsheet, desc: 'Scanned resumes & Excel export', color: 'bg-green-50 text-green-600 border-green-100' },
            ].map((n, i) => {
              const Icon = n.icon;
              return (
                <Link key={i} to={n.href} className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 border ${n.color}`}><Icon className="w-5 h-5" /></div>
                  <p className="text-slate-800 text-sm" style={{ fontWeight: 600 }}>{n.label}</p>
                  <p className="text-slate-400 text-xs mt-1">{n.desc}</p>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* ══════════════ TAB: DIVISION DASHBOARD ══════════════ */}
      {activeTab === 'divisionDashboard' && (
        <div className="space-y-6">
          {/* Division Selector Header */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex justify-between items-center flex-wrap gap-3">
            <div>
              <h2 className="text-slate-800 text-base" style={{ fontWeight: 700 }}>Division Overview</h2>
              <p className="text-slate-500 text-xs mt-0.5">Filter dashboard and onboarding metrics by division</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Team Leader Filter (Req 27) */}
              <div>
                <label className="block text-xs text-slate-400 mb-1" style={{ fontWeight: 500 }}>Team Leader</label>
                <select
                  value={divTlFilter}
                  onChange={e => {
                    setDivTlFilter(e.target.value);
                    setDivRecruiterFilter('All Recruiters');
                  }}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none bg-white text-slate-700 min-w-44 font-semibold"
                >
                  <option value="All Team Leaders">All Team Leaders</option>
                  {teamLeadersList.map(tl => (
                    <option key={tl._id || tl.id || tl.name} value={tl._id || tl.id || tl.name}>
                      {tl.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Recruiter Filter (Cascaded under Team Leader) */}
              <div>
                <label className="block text-xs text-slate-400 mb-1" style={{ fontWeight: 500 }}>Recruiter</label>
                <select
                  value={divRecruiterFilter}
                  onChange={e => setDivRecruiterFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none bg-white text-slate-700 min-w-44 font-semibold"
                >
                  <option value="All Recruiters">All Recruiters</option>
                  {filteredRecruitersList.map(r => (
                    <option key={r._id || r.id || r.name} value={r._id || r.id || r.name}>{r.name}</option>
                  ))}
                </select>
              </div>

              {/* Company Filter */}
              <div>
                <label className="block text-xs text-slate-400 mb-1" style={{ fontWeight: 500 }}>Company</label>
                <select
                  value={divCompanyFilter}
                  onChange={e => setDivCompanyFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none bg-white text-slate-700 min-w-44"
                >
                  <option value="All Companies">All Companies</option>
                  {allClientNames.map(comp => (
                    <option key={comp} value={comp}>{comp}</option>
                  ))}
                </select>
              </div>

              {/* Division Pills */}
              <div>
                <label className="block text-xs text-slate-400 mb-1" style={{ fontWeight: 500 }}>Division</label>
                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
                  {(['BPO', 'IT', 'Lateral'] as const).map(div => (
                    <button
                      key={div}
                      onClick={() => { setActiveDivision(div); setDivCompanyFilter('All Companies'); }}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeDivision === div ? 'bg-green-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'
                        }`}
                    >
                      {div} Division
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {divLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
          ) : !divisionData ? (
            <div className="text-center py-12 text-slate-400 text-sm">Failed to load division dashboard data.</div>
          ) : (
            <>
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                {[
                  { label: 'Active JRs', value: divisionData.totalJRs, color: 'text-blue-600', bg: 'bg-blue-50', link: `/admin/jobs?division=${activeDivision}&tlId=${encodeURIComponent(divTlFilter)}&recruiter=${encodeURIComponent(divRecruiterFilter)}${divCompanyFilter && divCompanyFilter !== 'All Companies' ? `&company=${encodeURIComponent(divCompanyFilter)}` : ''}` },
                  { label: 'Open Positions', value: divisionData.openPositions, color: 'text-indigo-600', bg: 'bg-indigo-50', link: `/admin/jobs?division=${activeDivision}&status=Open&tlId=${encodeURIComponent(divTlFilter)}&recruiter=${encodeURIComponent(divRecruiterFilter)}${divCompanyFilter && divCompanyFilter !== 'All Companies' ? `&company=${encodeURIComponent(divCompanyFilter)}` : ''}` },
                  { label: 'Screening Round', value: divisionData.pipeline?.screening || 0, color: 'text-amber-600', bg: 'bg-amber-50', link: `/admin/candidates?statusIn=${encodeURIComponent('Eligible,Screening,Shortlisted,Submitted to Client,Submitted To Client,Sublitted To Client,Walkin Company,Walkin WHM,Call Back,Hold,No Response,Duplicate-Client,Walk-in Submitted,Contacted,Interested,Selected for Call,New,HR Shortlist')}&division=${activeDivision}&tlId=${encodeURIComponent(divTlFilter)}&recruiter=${encodeURIComponent(divRecruiterFilter)}${divCompanyFilter && divCompanyFilter !== 'All Companies' ? `&clientName=${encodeURIComponent(divCompanyFilter)}` : ''}` },
                  { label: 'Interview Stage', value: divisionData.pipeline?.interview || 0, color: 'text-violet-600', bg: 'bg-violet-50', link: `/admin/candidates?statusIn=${encodeURIComponent('VNA Select,VNA Reject,Test Select,Test Reject,L1 Select,L1 Reject,L2 Select,L2 Reject,Final Reject,Interview Scheduled,Interview Rescheduled,Interview Completed,Interview,Selected for Interview,Written Test,Operations Round,Interview Feedback Pending,No Show')}&division=${activeDivision}&tlId=${encodeURIComponent(divTlFilter)}&recruiter=${encodeURIComponent(divRecruiterFilter)}${divCompanyFilter && divCompanyFilter !== 'All Companies' ? `&clientName=${encodeURIComponent(divCompanyFilter)}` : ''}` },
                  { label: 'Offered / Selected', value: divisionData.pipeline?.offer || 0, color: 'text-pink-600', bg: 'bg-pink-50', slicerKey: 'offered', link: `/admin/candidates?statusIn=${encodeURIComponent('Document Initialized,Documennt Initialted,Documentation Completed,Documentation Incomplete,Waiting for Offer,Offer Accept,Offered,Offer Released,Offer Accepted,Document Pending,Documentation,Selected,Final Select,Client Select')}&division=${activeDivision}&tlId=${encodeURIComponent(divTlFilter)}&recruiter=${encodeURIComponent(divRecruiterFilter)}${divCompanyFilter && divCompanyFilter !== 'All Companies' ? `&clientName=${encodeURIComponent(divCompanyFilter)}` : ''}` },
                  { label: 'Yet To Join', value: divisionData.pipeline?.yetToJoin || 0, color: 'text-purple-600', bg: 'bg-purple-50', slicerKey: 'yetToJoin', link: `/admin/candidates?statusIn=${encodeURIComponent('Yet To Join,Joining Date Confirmed,Joining Postponed')}&division=${activeDivision}&tlId=${encodeURIComponent(divTlFilter)}&recruiter=${encodeURIComponent(divRecruiterFilter)}${divCompanyFilter && divCompanyFilter !== 'All Companies' ? `&clientName=${encodeURIComponent(divCompanyFilter)}` : ''}` },
                  { label: 'Joined Candidates', value: divisionData.pipeline?.joined || 0, color: 'text-emerald-600', bg: 'bg-emerald-50', slicerKey: 'joined', link: `/admin/candidates?statusFilter=Joined&division=${activeDivision}&tlId=${encodeURIComponent(divTlFilter)}&recruiter=${encodeURIComponent(divRecruiterFilter)}${divCompanyFilter && divCompanyFilter !== 'All Companies' ? `&clientName=${encodeURIComponent(divCompanyFilter)}` : ''}` },
                ].map((s, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (s.slicerKey) {
                        setDivCandidateSlicer(s.slicerKey as any);
                      } else {
                        navigate(s.link);
                      }
                    }}
                    className={`${s.bg} rounded-2xl p-4 border border-slate-100 shadow-sm text-center hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer w-full ${s.slicerKey && divCandidateSlicer === s.slicerKey ? 'ring-2 ring-purple-500/50 shadow-md' : ''
                      }`}
                  >
                    <div className={`text-2xl ${s.color}`} style={{ fontWeight: 700 }}>{s.value}</div>
                    <div className="text-slate-500 text-xs mt-0.5" style={{ fontWeight: 500 }}>{s.label}</div>
                  </button>
                ))}
              </div>

              {/* Interactive Candidate Slicer & Tables */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden space-y-0">
                {/* Slicer Navigation Bar */}
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center flex-wrap gap-3">
                  <div>
                    <h3 className="text-slate-800 text-sm font-bold flex items-center gap-2">
                      <span>Candidate Onboarding Breakdown — {activeDivision}</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Filter candidate lists by onboarding and joining status</p>
                  </div>

                  {/* Interactive Slicer Pills */}
                  <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                    <button
                      onClick={() => setDivCandidateSlicer('all')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${divCandidateSlicer === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      All Candidates ({(
                        [...(divisionData.offeredCandidates || []), ...(divisionData.yetToJoinCandidates || []), ...(divisionData.joinedCandidates || [])]
                          .filter((c: any) => divCompanyFilter === 'All Companies' || c.clientName === divCompanyFilter).length
                      )})
                    </button>
                    <button
                      onClick={() => setDivCandidateSlicer('offered')}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${divCandidateSlicer === 'offered' ? 'bg-pink-600 text-white shadow-sm' : 'text-pink-700 hover:bg-pink-50'
                        }`}
                    >
                      <span>Offered / Selected</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${divCandidateSlicer === 'offered' ? 'bg-pink-700 text-white' : 'bg-pink-100 text-pink-800'}`}>
                        {(divisionData.offeredCandidates || []).filter((c: any) => divCompanyFilter === 'All Companies' || c.clientName === divCompanyFilter).length}
                      </span>
                    </button>
                    <button
                      onClick={() => setDivCandidateSlicer('yetToJoin')}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${divCandidateSlicer === 'yetToJoin' ? 'bg-purple-600 text-white shadow-sm' : 'text-purple-700 hover:bg-purple-50'
                        }`}
                    >
                      <span>Yet To Join</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${divCandidateSlicer === 'yetToJoin' ? 'bg-purple-700 text-white' : 'bg-purple-100 text-purple-800'}`}>
                        {(divisionData.yetToJoinCandidates || []).filter((c: any) => divCompanyFilter === 'All Companies' || c.clientName === divCompanyFilter).length}
                      </span>
                    </button>
                    <button
                      onClick={() => setDivCandidateSlicer('joined')}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${divCandidateSlicer === 'joined' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-50'
                        }`}
                    >
                      <span>Joined</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${divCandidateSlicer === 'joined' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                        {(divisionData.joinedCandidates || []).filter((c: any) => divCompanyFilter === 'All Companies' || c.clientName === divCompanyFilter).length}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Offered / Selected Candidate Table */}
                {(divCandidateSlicer === 'offered' || divCandidateSlicer === 'all') && (
                  <div className="border-b border-slate-100 last:border-b-0">
                    <div className="bg-pink-50/50 px-5 py-2.5 border-b border-pink-100/50 flex justify-between items-center">
                      <span className="text-xs font-bold text-pink-900 uppercase tracking-wide flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-pink-600"></span>
                        Offered / Selected Candidates ({(divisionData.offeredCandidates || []).filter((c: any) => divCompanyFilter === 'All Companies' || c.clientName === divCompanyFilter).length})
                        {divCompanyFilter !== 'All Companies' && <span className="text-pink-500 font-normal normal-case">· {divCompanyFilter}</span>}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-left text-xs text-slate-500 uppercase tracking-wide">
                            <th className="px-5 py-3 font-semibold">Candidate Name</th>
                            <th className="px-5 py-3 font-semibold">Position Applied</th>
                            <th className="px-5 py-3 font-semibold">Company / Client</th>
                            <th className="px-5 py-3 font-semibold">Recruiter</th>
                            <th className="px-5 py-3 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-700">
                          {(() => {
                            const rows = (divisionData.offeredCandidates || []).filter((c: any) =>
                              divCompanyFilter === 'All Companies' || c.clientName === divCompanyFilter
                            );
                            if (rows.length === 0) return (
                              <tr>
                                <td colSpan={5} className="text-center py-8 text-slate-400 text-sm">
                                  {divCompanyFilter !== 'All Companies'
                                    ? `No 'Offered / Selected' candidates for ${divCompanyFilter} under ${activeDivision}.`
                                    : `No candidates marked 'Offered / Selected' under ${activeDivision} division.`}
                                </td>
                              </tr>
                            );
                            return rows.map((c: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-3 font-medium text-slate-900">{c.name}</td>
                                <td className="px-5 py-3">{c.positionApplied || '—'}</td>
                                <td className="px-5 py-3 font-medium text-blue-600">{c.clientName || '—'}</td>
                                <td className="px-5 py-3 text-slate-500 text-xs">{c.assignedRecruiterName || '—'}</td>
                                <td className="px-5 py-3">
                                  <span className="px-2.5 py-1 text-xs font-semibold bg-pink-100 text-pink-700 rounded-full border border-pink-200">
                                    {c.status || 'Offered'}
                                  </span>
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Candidate Table Render */}
                {(divCandidateSlicer === 'yetToJoin' || divCandidateSlicer === 'all') && (
                  <div className="border-b border-slate-100 last:border-b-0">
                    <div className="bg-purple-50/50 px-5 py-2.5 border-b border-purple-100/50 flex justify-between items-center">
                      <span className="text-xs font-bold text-purple-900 uppercase tracking-wide flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                        Yet To Join Candidates ({(divisionData.yetToJoinCandidates || []).filter((c: any) => divCompanyFilter === 'All Companies' || c.clientName === divCompanyFilter).length})
                        {divCompanyFilter !== 'All Companies' && <span className="text-purple-500 font-normal normal-case">· {divCompanyFilter}</span>}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-left text-xs text-slate-500 uppercase tracking-wide">
                            <th className="px-5 py-3 font-semibold">Candidate Name</th>
                            <th className="px-5 py-3 font-semibold">Position Applied</th>
                            <th className="px-5 py-3 font-semibold">Company / Client</th>
                            <th className="px-5 py-3 font-semibold">Recruiter</th>
                            <th className="px-5 py-3 font-semibold">Expected Joining Date</th>
                            <th className="px-5 py-3 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-700">
                          {(() => {
                            const rows = (divisionData.yetToJoinCandidates || []).filter((c: any) =>
                              divCompanyFilter === 'All Companies' || c.clientName === divCompanyFilter
                            );
                            if (rows.length === 0) return (
                              <tr>
                                <td colSpan={6} className="text-center py-8 text-slate-400 text-sm">
                                  {divCompanyFilter !== 'All Companies'
                                    ? `No 'Yet To Join' candidates for ${divCompanyFilter} under ${activeDivision}.`
                                    : `No candidates marked 'Yet To Join' under ${activeDivision} division.`}
                                </td>
                              </tr>
                            );
                            return rows.map((c: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-3 font-medium text-slate-900">{c.name}</td>
                                <td className="px-5 py-3">{c.positionApplied || '—'}</td>
                                <td className="px-5 py-3 font-medium text-blue-600">{c.clientName || '—'}</td>
                                <td className="px-5 py-3 text-slate-500 text-xs">{c.assignedRecruiterName || '—'}</td>
                                <td className="px-5 py-3 text-purple-700 font-semibold whitespace-nowrap">
                                  {c.dateOfJoining || c.expectedDateOfJoining ? new Date(c.dateOfJoining || c.expectedDateOfJoining).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pending Confirmation'}
                                </td>
                                <td className="px-5 py-3">
                                  <span className="px-2.5 py-1 text-xs font-semibold bg-purple-100 text-purple-700 rounded-full border border-purple-200">
                                    {c.status || c.candidateStatusPostOffer || 'Yet To Join'}
                                  </span>
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {(divCandidateSlicer === 'joined' || divCandidateSlicer === 'all') && (
                  <div>
                    <div className="bg-emerald-50/50 px-5 py-2.5 border-b border-emerald-100/50 flex justify-between items-center">
                      <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        Onboarded / Joined Candidates ({(divisionData.joinedCandidates || []).filter((c: any) => divCompanyFilter === 'All Companies' || c.clientName === divCompanyFilter).length})
                        {divCompanyFilter !== 'All Companies' && <span className="text-emerald-500 font-normal normal-case">· {divCompanyFilter}</span>}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-left text-xs text-slate-500 uppercase tracking-wide">
                            <th className="px-5 py-3 font-semibold">Candidate Name</th>
                            <th className="px-5 py-3 font-semibold">Position Applied</th>
                            <th className="px-5 py-3 font-semibold">Company / Client</th>
                            <th className="px-5 py-3 font-semibold">Recruiter</th>
                            <th className="px-5 py-3 font-semibold">Date of Joining</th>
                            <th className="px-5 py-3 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-700">
                          {(() => {
                            const rows = (divisionData.joinedCandidates || []).filter((c: any) =>
                              divCompanyFilter === 'All Companies' || c.clientName === divCompanyFilter
                            );
                            if (rows.length === 0) return (
                              <tr>
                                <td colSpan={6} className="text-center py-8 text-slate-400 text-sm">
                                  {divCompanyFilter !== 'All Companies'
                                    ? `No joined candidates for ${divCompanyFilter} under ${activeDivision}.`
                                    : `No candidates joined under ${activeDivision} division yet.`}
                                </td>
                              </tr>
                            );
                            return rows.map((c: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-3 font-medium text-slate-900">{c.name}</td>
                                <td className="px-5 py-3">{c.positionApplied || '—'}</td>
                                <td className="px-5 py-3 font-medium text-blue-600">{c.clientName || '—'}</td>
                                <td className="px-5 py-3 text-slate-500 text-xs">{c.assignedRecruiterName || '—'}</td>
                                <td className="px-5 py-3 text-emerald-600 font-semibold whitespace-nowrap">
                                  {c.dateOfJoining ? new Date(c.dateOfJoining).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                </td>
                                <td className="px-5 py-3">
                                  <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200">
                                    {c.status || 'Joined'}
                                  </span>
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════ TAB: RECRUITING ══════════════ */}
      {activeTab === 'recruiting' && (
        <>
          {/* Filter Bar: Date, Division, Company & Recruiter */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center flex-wrap gap-4">

              {/* Date Filter – dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">DATE:</span>
                <select
                  value={dateRange}
                  onChange={e => setDateRange(e.target.value as DateRange)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none bg-white text-slate-700 font-medium focus:border-green-400 min-w-32"
                >
                  {DATE_TABS.map(tab => (
                    <option key={tab} value={tab}>{tab}</option>
                  ))}
                </select>
                {dateRange === 'Custom' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400">From</span>
                      <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-green-400 bg-white" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400">To</span>
                      <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-green-400 bg-white" />
                    </div>
                    {(customFrom || customTo) && (
                      <button onClick={() => { setCustomFrom(''); setCustomTo(''); }}
                        className="p-1.5 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-slate-200 hidden sm:block" />

              {/* Division Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">DIVISION:</span>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                  {['All', 'BPO', 'IT', 'Lateral'].map(div => (
                    <button
                      key={div}
                      onClick={() => setRecDivision(div)}
                      className={`px-3 py-1 rounded-md font-semibold transition-all ${recDivision === div ? 'bg-green-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      {div}
                    </button>
                  ))}
                </div>
              </div>

              {/* Company Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">COMPANY:</span>
                <select
                  value={recCompanyFilter}
                  onChange={e => setRecCompanyFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none bg-white text-slate-700 font-medium focus:border-green-400 min-w-44"
                >
                  <option value="All Companies">All Companies</option>
                  {allClientNames.map(comp => (
                    <option key={comp} value={comp}>{comp}</option>
                  ))}
                </select>
              </div>

              {/* Recruiter Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">RECRUITER:</span>
                <select
                  value={recruiterFilter}
                  onChange={e => setRecruiterFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-green-500 bg-white cursor-pointer"
                >
                  <option value="All">All Recruiters</option>
                  {recruitersList.map(r => (
                    <option key={r._id || r.id} value={r._id || r.id}>
                      {r.name} ({r.role || 'Recruiter'})
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </div>


          {recLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
            </div>
          ) : (
            <>
              {/* Top 4 Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Today's Calls", value: String(recMetrics.todayCalls), change: `+${recMetrics.todayCalls}`, color: 'blue', icon: Phone, clickable: true },
                  { label: 'Follow-Ups Due', value: String(recMetrics.followUpsDue), change: 'Urgent', color: 'amber', icon: AlertCircle, clickable: false },
                  { label: 'Interviews Scheduled', value: String(recMetrics.interviewsScheduled), change: 'This week', color: 'violet', icon: Calendar, clickable: false },
                  { label: 'Resume Inflow', value: String(recMetrics.resumeInflow), change: `+${recMetrics.resumeInflow} today`, color: 'emerald', icon: FileText, clickable: false },
                ].map((m, i) => {
                  const Icon = m.icon;
                  const c = colorMap[m.color];
                  const content = (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.icon}`}><Icon className="w-4 h-4" /></div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${c.badge}`} style={{ fontWeight: 500 }}>{m.change}</span>
                      </div>
                      <div className="text-slate-800" style={{ fontWeight: 700, fontSize: '1.75rem' }}>{m.value}</div>
                      <div className="text-slate-500 text-sm mt-0.5 flex items-center gap-1">
                        {m.label}{m.clickable && <ArrowRight className="w-3 h-3 text-green-500 ml-auto" />}
                      </div>
                    </>
                  );
                  return m.clickable ? (
                    <button key={i} onClick={goToTodayCalls}
                      className={`bg-white rounded-xl p-5 border shadow-sm text-left transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${c.card}`}>{content}</button>
                  ) : (
                    <div key={i} className={`bg-white rounded-xl p-5 border shadow-sm ${c.card}`}>{content}</div>
                  );
                })}
              </div>

              {/* Pipeline Status Cards */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-slate-800 text-sm" style={{ fontWeight: 600 }}>Candidate Pipeline Status</h2>
                    <p className="text-slate-400 text-xs mt-0.5">Click any card to view filtered candidate list</p>
                  </div>
                  <span className="text-xs text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
                    {STATUS_CARDS.reduce((s, c) => s + c.count, 0)} total
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                  {STATUS_CARDS.map((s, i) => {
                    const Icon = s.icon;
                    const c = STATUS_COLOR_MAP[s.color];
                    const isSelected = recruitingSlicer === s.label;
                    return (
                      <button key={i} onClick={() => setRecruitingSlicer(isSelected ? 'All' : s.label)}
                        className={`flex flex-col items-start p-3.5 rounded-xl border transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${c.card} ${isSelected ? 'ring-2 ring-green-600 shadow-md scale-102 border-green-400' : ''
                          }`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${c.icon}`}><Icon className="w-4 h-4" /></div>
                        <div className={`text-xl mb-0.5 ${c.badge}`} style={{ fontWeight: 800, lineHeight: 1 }}>{s.count}</div>
                        <div className="text-slate-500 text-xs leading-tight">{s.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* In-Place Slicer Filtered Data Table for Recruiting Tab */}
              <SlicerFilteredDataView
                slicerName={recruitingSlicer}
                division={recDivision}
                recruiter={recruiterFilter}
                range={dateRange}
                fromDate={customFrom}
                toDate={customTo}
                onClear={() => setRecruitingSlicer('All')}
                title="Recruiting Pipeline Slicer"
              />

              {/* Follow-Ups + Quick Actions */}
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h2 className="text-slate-800 text-sm" style={{ fontWeight: 600 }}>Today's Follow-Ups</h2>
                      <p className="text-slate-400 text-xs mt-0.5">Scheduled callbacks & pending actions</p>
                    </div>
                    <Link to="/recruiter/resumes" className="text-xs text-green-600 flex items-center gap-1" style={{ fontWeight: 500 }}>
                      View all <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {followUps.map((f: any, i: number) => (
                      <div key={i} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                        <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-green-700 text-sm" style={{ fontWeight: 600 }}>
                            {(f.name || f.candidateName || '').split(' ').map((n: string) => n[0]).join('')}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-700 text-sm truncate" style={{ fontWeight: 500 }}>{f.name || f.candidateName}</p>
                          <p className="text-slate-400 text-xs">{f.skills}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
                            <Clock className="w-3 h-3" />{f.time || f.followUpDate || ''}
                          </div>
                          <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full" style={{ fontWeight: 500 }}>{f.status}</span>
                        </div>
                        <Link to={`/recruiter/candidate/${f.candidateId || f._id || '1'}`}
                          className="ml-2 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 flex-shrink-0">
                          <Phone className="w-3 h-3" />
                        </Link>
                      </div>
                    ))}
                    {followUps.length === 0 && <div className="px-5 py-8 text-center text-slate-400 text-sm">No follow-ups due</div>}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                    <h2 className="text-slate-800 text-sm mb-4" style={{ fontWeight: 600 }}>Quick Actions</h2>
                    <div className="space-y-2">
                      {[
                        { label: 'Add New Candidate', href: '/recruiter/add', icon: UserPlus, color: 'text-green-600' },
                        { label: 'Create Job (JR)', href: '/recruiter/jobs/new', icon: Briefcase, color: 'text-teal-600' },
                        { label: 'Joining Form', href: '/recruiter/joining', icon: FileCheck, color: 'text-emerald-600' },
                        { label: 'Walk-In Queue', href: '/recruiter/walkin-queue', icon: ListChecks, color: 'text-emerald-600' },
                        { label: 'Interview Schedule', href: '/recruiter/interviews', icon: CalendarCheck, color: 'text-violet-600' },
                        { label: 'ATS Resume Scanner', href: '/recruiter/scan', icon: ScanLine, color: 'text-amber-600' },
                        { label: 'Send Mail', href: '/email-center', icon: Mail, color: 'text-blue-600' },
                        { label: 'View All Resumes', href: '/recruiter/resumes', icon: FileText, color: 'text-slate-600' },
                      ].map((action, i) => {
                        const Icon = action.icon;
                        return (
                          <Link key={i} to={action.href}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group">
                            <Icon className={`w-4 h-4 ${action.color}`} />
                            <span className="text-slate-600 text-sm group-hover:text-slate-800">{action.label}</span>
                            <ArrowRight className="w-3 h-3 text-slate-300 ml-auto group-hover:text-slate-400" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-green-600 rounded-xl p-5 text-white">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm" style={{ fontWeight: 600 }}>Daily Target</span>
                    </div>
                    <div className="mb-2" style={{ fontWeight: 700, fontSize: '1.5rem' }}>
                      {recMetrics.todayCalls} / {recMetrics.dailyTarget}
                    </div>
                    <p className="text-green-200 text-xs mb-3">Calls made today</p>
                    <div className="bg-green-500 rounded-full h-2">
                      <div className="bg-white rounded-full h-2"
                        style={{ width: `${Math.min(100, Math.round((recMetrics.todayCalls / recMetrics.dailyTarget) * 100))}%` }} />
                    </div>
                    <p className="text-green-200 text-xs mt-2">
                      {Math.round((recMetrics.todayCalls / recMetrics.dailyTarget) * 100)}% of daily target
                    </p>
                  </div>
                </div>
              </div>

              {/* Activity Feed */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="text-slate-800 text-sm" style={{ fontWeight: 600 }}>Recent Activity</h2>
                </div>
                <div className="px-5 py-2 divide-y divide-slate-50">
                  {recentActivity.map((a: any, i: number) => (
                    <div key={i} className="py-3 flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${activityColors[a.type] || 'bg-slate-100 text-slate-500'}`}
                        style={{ fontWeight: 700 }}>•</div>
                      <p className="text-slate-600 text-sm flex-1">{a.text}</p>
                      <span className="text-slate-400 text-xs flex-shrink-0">{a.time}</span>
                    </div>
                  ))}
                  {recentActivity.length === 0 && <p className="py-6 text-center text-slate-400 text-sm">No recent activity</p>}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ══════════════ TAB: TEAM ══════════════ */}
      {activeTab === 'team' && (
        <>
          {/* Team Summary Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Calls Today', value: totalCalls, icon: Phone, color: 'blue', href: '/recruiter/resumes' },
              { label: 'Interviews Scheduled', value: totalInterviews, icon: Calendar, color: 'violet', href: '/recruiter/interviews' },
              { label: 'Pending Follow-Ups', value: totalFollowUps, icon: AlertCircle, color: 'amber', href: '/tl/follow-ups' },
              { label: 'Active Recruiters', value: `${teamSummary.activeRecruiters || 0}`, icon: Users, color: 'emerald', href: '' },
            ].map((m, i) => {
              const Icon = m.icon;
              const colors: Record<string, string> = {
                blue: 'bg-green-50 text-green-600', violet: 'bg-violet-50 text-violet-600',
                amber: 'bg-amber-50 text-amber-600', emerald: 'bg-emerald-50 text-emerald-600',
              };
              const card = (
                <>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colors[m.color]}`}><Icon className="w-4 h-4" /></div>
                  <div className="text-slate-800 mb-0.5" style={{ fontWeight: 700, fontSize: '1.75rem' }}>{m.value}</div>
                  <div className="text-slate-500 text-sm">{m.label}</div>
                </>
              );
              return m.href ? (
                <button key={i} onClick={() => navigate(m.href)}
                  className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm text-left hover:shadow-md hover:-translate-y-0.5 transition-all w-full">{card}</button>
              ) : (
                <div key={i} className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">{card}</div>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-8">
              <h2 className="text-slate-800 text-sm" style={{ fontWeight: 600 }}>Team Performance — Today</h2>

              {teams.map(tl => (
                <div key={tl.tlId} className="space-y-4">
                  {/* TL Header Card */}
                  <div className="bg-green-600 rounded-xl p-4 text-white flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{tl.tlName} <span className="font-normal opacity-80">(Team Leader)</span></p>
                        <p className="text-xs text-green-100">{tl.recruiters.length} Recruiters · {tl.stats.totalCalls} Calls · {tl.stats.totalJoined} Joined</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-green-100">Team Conversion</p>
                      <p className="text-sm font-bold">{tl.stats.totalCalls > 0 ? Math.round((tl.stats.totalInterviews / tl.stats.totalCalls) * 100) : 0}%</p>
                    </div>
                  </div>

                  {/* Recruiters in this team */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {tl.recruiters.map((r: any) => {
                      const pct = Math.round((r.calls / r.target) * 100);
                      const sc = TL_STATUS_COLORS[r.status] || TL_STATUS_COLORS.offline;
                      return (
                        <div key={r.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
                                  <span className="text-green-700 text-xs" style={{ fontWeight: 600 }}>
                                    {r.name.split(' ').map((n: string) => n[0]).join('')}
                                  </span>
                                </div>
                                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${sc.dot}`} />
                              </div>
                              <div>
                                <p className="text-slate-700 text-xs" style={{ fontWeight: 600 }}>{r.name}</p>
                                <p className="text-slate-400 text-[10px]">{r.employeeId}</p>
                              </div>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${sc.badge}`} style={{ fontWeight: 500 }}>{r.status}</span>
                          </div>
                          <div className="mb-3">
                            <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                              <span>Calls: {r.calls}/{r.target}</span>
                              <span style={{ fontWeight: 500 }}>{pct}%</span>
                            </div>
                            <div className="bg-slate-100 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full transition-all ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-green-500' : 'bg-amber-500'}`}
                                style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-50">
                            <div>
                              <div className="text-slate-700 text-xs font-bold">{r.calls}</div>
                              <div className="text-slate-400 text-[9px]">Calls</div>
                            </div>
                            <div>
                              <div className="text-violet-600 text-xs font-bold">{r.interviews}</div>
                              <div className="text-slate-400 text-[9px]">Intv</div>
                            </div>
                            <div>
                              <div className={`text-xs font-bold ${r.followUps > 5 ? 'text-red-500' : 'text-amber-600'}`}>{r.followUps}</div>
                              <div className="text-slate-400 text-[9px]">F-Up</div>
                            </div>
                            <div className="border-l border-slate-50 pl-2">
                              <div className="text-emerald-600 text-xs font-bold">{r.joinedCount}</div>
                              <div className="text-slate-400 text-[9px]">Joined</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {teams.length === 0 && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 text-center text-slate-400 text-sm">No teams found</div>
              )}
            </div>


            <div className="space-y-4">
              <div className="bg-green-600 rounded-xl p-5 text-white">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm" style={{ fontWeight: 600 }}>Team Health</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Avg calls/recruiter', value: teamSummary.activeRecruiters ? Math.round(totalCalls / teamSummary.activeRecruiters) : 0 },
                    { label: 'Total active members', value: teamSummary.activeRecruiters || 0 },
                    { label: 'Interviews / 100 calls', value: totalCalls > 0 ? Math.round((totalInterviews / totalCalls) * 100) : 0 },
                  ].map((s, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-green-200">{s.label}</span>
                      <span className="text-white" style={{ fontWeight: 700 }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Team Performance Reviews Section */}
            <div className="pt-4 border-t border-slate-100">
              <TeamPerformanceReviews />
            </div>
          </div>
        </>
      )}

      {/* ══════════════ TAB: TEAM STRUCTURE ══════════════ */}
      {activeTab === 'structure' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-slate-800 text-lg mb-4" style={{ fontWeight: 600 }}>Team Structure Management</h2>
            <p className="text-slate-500 text-sm mb-6">Manage Team Leaders and assign recruiters to their teams.</p>
            {/* TeamStructureManager component will go here */}
            <TeamStructureManager />
          </div>
        </div>
      )}

      {/* ══════════════ TAB: ANALYTICS ══════════════ */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Date Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 mr-1" style={{ fontWeight: 600 }}>FILTER BY:</span>
            <div className="flex gap-1 flex-wrap">
              {DATE_TABS.map(tab => (
                <button key={tab} onClick={() => setAnalyticsDateRange(tab)}
                  className={`px-4 py-1.5 rounded-lg text-xs transition-colors ${analyticsDateRange === tab ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  style={{ fontWeight: analyticsDateRange === tab ? 600 : 500 }}>{tab}</button>
              ))}
            </div>
            {analyticsDateRange === 'Custom' && (
              <div className="flex items-center gap-2 ml-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">From</span>
                  <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-green-400 bg-white" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">To</span>
                  <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-green-400 bg-white" />
                </div>
                {(customFrom || customTo) && (
                  <button onClick={() => { setCustomFrom(''); setCustomTo(''); }}
                    className="p-1.5 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                )}
              </div>
            )}
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Placements', value: kpis.totalPlacements ?? '—', sub: 'This month', trend: kpis.placementsTrend || '+0%', up: (kpis.placementsTrend || '').startsWith('+'), icon: Users, color: 'blue', href: '/manager/reports' },
              { label: 'Interview → Hire', value: kpis.conversionRate ?? '—', sub: 'Conversion', trend: kpis.conversionTrend || '+0%', up: (kpis.conversionTrend || '').startsWith('+'), icon: TrendingUp, color: 'emerald', href: '/manager/reports' },
              { label: 'Revenue Earned', value: totalCandidateRevenue ? fmt(totalCandidateRevenue) : (kpis.revenue ? fmt(kpis.revenue) : '—'), sub: 'From Placements', trend: kpis.revenueTrend || '+0%', up: (kpis.revenueTrend || '').startsWith('+'), icon: DollarSign, color: 'violet', href: 'tab:analytics' },
              { label: 'Avg Time to Hire', value: kpis.avgTimeToHire ?? '—', sub: 'From source', trend: kpis.timeToHireTrend || '0d', up: (kpis.timeToHireTrend || '').startsWith('-'), icon: Calendar, color: 'amber', href: '/manager/reports' },
            ].map((m, i) => {
              const Icon = m.icon;
              const bg: Record<string, string> = {
                blue: 'bg-green-50 text-green-600', emerald: 'bg-emerald-50 text-emerald-600',
                violet: 'bg-violet-50 text-violet-600', amber: 'bg-amber-50 text-amber-600',
              };
              return (
                <button key={i} onClick={() => { if (m.href.startsWith('tab:')) { setActiveTab(m.href.replace('tab:', '') as any); } else { navigate(m.href); } }}
                  className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm text-left hover:shadow-md hover:-translate-y-0.5 transition-all w-full">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${bg[m.color]}`}><Icon className="w-4 h-4" /></div>
                  <div className="text-slate-800 mb-0.5" style={{ fontWeight: 700, fontSize: '1.5rem' }}>{m.value}</div>
                  <div className="text-slate-500 text-xs mb-1.5">{m.sub}</div>
                  <div className={`text-xs flex items-center gap-1 ${m.up ? 'text-emerald-600' : 'text-red-500'}`} style={{ fontWeight: 500 }}>
                    {m.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {m.trend} vs last month
                  </div>
                </button>
              );
            })}
          </div>

          {/* Charts Row 1: Recruitment Funnel + Revenue Trend */}
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-slate-800 text-sm mb-4" style={{ fontWeight: 600 }}>Recruitment Funnel (6 months)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={conversionData} barSize={16} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #E2E8F0', borderRadius: 8 }} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="resumes" name="Resumes" fill="#BBF7D0" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="interviews" name="Interviews" fill="#4ADE80" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="hired" name="Hired" fill="#16A34A" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-slate-800 text-sm mb-4" style={{ fontWeight: 600 }}>Revenue Trend (6 months)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => fmt(v as number)} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [fmt(v as number), 'Revenue']} contentStyle={{ fontSize: 12, border: '1px solid #E2E8F0', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="revenue" stroke="#16A34A" strokeWidth={2.5} dot={{ fill: '#16A34A', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>


          {/* Revenue Search Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-wrap gap-4">
              <div>
                <h3 className="font-semibold text-slate-800 flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-500" /> Candidate Revenue</h3>
                <p className="text-xs text-slate-500 mt-1">Search for a candidate to view their specific revenue contribution. Total: {fmt(totalCandidateRevenue)}</p>
              </div>
              <div className="relative max-w-sm w-full">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input type="text" placeholder="Search candidate name..." value={revenueSearch} onChange={e => setRevenueSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Candidate Name</th>
                    <th className="px-4 py-3 font-medium">Joining Salary</th>
                    <th className="px-4 py-3 font-medium">Placement %</th>
                    <th className="px-4 py-3 font-medium text-right">Revenue Generated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {revenueCandidates.filter(c => c.name.toLowerCase().includes(revenueSearch.toLowerCase())).slice(0, 5).map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-700 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-slate-600">₹{c.joiningSalary}</td>
                      <td className="px-4 py-3 text-slate-600">{c.placementPercentage}%</td>
                      <td className="px-4 py-3 text-emerald-600 font-semibold text-right">₹{c.revenueGenerated?.toLocaleString()}</td>
                    </tr>
                  ))}
                  {revenueCandidates.filter(c => c.name.toLowerCase().includes(revenueSearch.toLowerCase())).length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No revenue data found for this search.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Charts Row 2: Recruiter Productivity + Source Distribution */}
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-slate-800 text-sm mb-4" style={{ fontWeight: 600 }}>Recruiter Productivity — Today</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={recruiterData} barSize={20} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #E2E8F0', borderRadius: 8 }} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="calls" name="Calls" fill="#BBF7D0" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="interviews" name="Interviews" fill="#4ADE80" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="placed" name="Placed" fill="#16A34A" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-slate-800 text-sm mb-4" style={{ fontWeight: 600 }}>Candidate Source</h3>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={mgrSourceData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                    {mgrSourceData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #E2E8F0', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {mgrSourceData.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-slate-600">{s.name}</span>
                    </div>
                    <span className="text-slate-500" style={{ fontWeight: 500 }}>{s.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Link to full reports */}
          <div className="flex justify-end mt-4">
            <Link to="/manager/reports" className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700" style={{ fontWeight: 500 }}>
              <BarChart2 className="w-4 h-4" /> Full Analytics Report
            </Link>
          </div>
        </div>
      )}

      {/* ══════════════ TAB: BUSINESS DEVELOPMENT ══════════════ */}
      {activeTab === 'businessDev' && (
        <div className="space-y-6">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { key: 'callsToday', label: 'Calls Today', value: bizDevStats.callsToday ?? 0, icon: Phone, color: 'blue' },
              { key: 'callsThisWeek', label: 'Calls This Week', value: bizDevStats.callsThisWeek ?? 0, icon: Calendar, color: 'indigo' },
              { key: 'connectedCalls', label: 'Connected Calls', value: bizDevStats.connectedCalls ?? 0, icon: BadgeCheck, color: 'emerald' },
              { key: 'followUpsDue', label: 'Follow-ups Due', value: bizDevStats.followUpsDue ?? 0, icon: Clock, color: 'amber' },
              { key: 'meetingsScheduled', label: 'Meetings Scheduled', value: bizDevStats.meetingsScheduled ?? 0, icon: CalendarCheck, color: 'violet' },
              { key: 'proposalsPending', label: 'Proposals Pending', value: bizDevStats.proposalsPending ?? 0, icon: FileText, color: 'pink' },
              { key: 'agreementsPending', label: 'Agreements Pending', value: bizDevStats.agreementsPending ?? 0, icon: FileCheck, color: 'sky' },
              { key: 'hotLeads', label: 'Hot Leads', value: bizDevStats.hotLeads ?? 0, icon: Flame, color: 'red' },
              { key: 'convertedClients', label: 'Converted Clients', value: bizDevStats.convertedClients ?? 0, icon: UserCheck, color: 'emerald' },
              { key: 'expectedRevenue', label: 'Expected Revenue', value: bizDevStats.expectedRevenue ? fmt(bizDevStats.expectedRevenue) : '₹0', icon: DollarSign, color: 'green' },
              { key: 'conversionPct', label: 'Conversion %', value: `${bizDevStats.conversionPct ?? 0}%`, icon: TrendingUp, color: 'teal' },
              { key: 'avgCallsPerDay', label: 'Avg Calls/Day', value: bizDevStats.avgCallsPerDay ?? 0, icon: Activity, color: 'slate' },
            ].map((card, i) => {
              const Icon = card.icon;
              const isSelected = card.key && bizDevFilters.kpiFilter === card.key;
              const bgColors: Record<string, string> = {
                blue: 'bg-blue-50 text-blue-600 border-blue-100',
                indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
                emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                amber: 'bg-amber-50 text-amber-600 border-amber-100',
                violet: 'bg-violet-50 text-violet-600 border-violet-100',
                pink: 'bg-pink-50 text-pink-600 border-pink-100',
                sky: 'bg-sky-50 text-sky-600 border-sky-100',
                red: 'bg-red-50 text-red-600 border-red-100',
                green: 'bg-green-50 text-green-600 border-green-100',
                teal: 'bg-teal-50 text-teal-600 border-teal-100',
                slate: 'bg-slate-100 text-slate-600 border-slate-200',
              };
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (card.key && !['expectedRevenue', 'conversionPct', 'avgCallsPerDay'].includes(card.key)) {
                      setBizDevFilters((prev: any) => ({
                        ...prev,
                        kpiFilter: prev.kpiFilter === card.key ? '' : card.key
                      }));
                      setBizDevPage(1);
                    }
                  }}
                  className={`bg-white rounded-xl p-4 border shadow-sm flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all text-left cursor-pointer ${
                    isSelected ? 'ring-2 ring-green-600 border-green-500 bg-green-50/20' : 'border-slate-100'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 border ${bgColors[card.color]}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-slate-800 text-lg font-bold leading-none">{card.value}</div>
                    <div className="text-slate-500 text-[11px] font-medium mt-1">{card.label}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Search, filters and actions bar */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <input
                    type="text"
                    value={bizDevSearch}
                    onChange={e => { setBizDevSearch(e.target.value); setBizDevPage(1); }}
                    placeholder="Search company, contact..."
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-full sm:w-60 focus:outline-none focus:border-green-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadBizDevData()}
                    className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200"
                    title="Refresh data"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleBizDevExport}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" /> Export Excel
                  </button>
                </div>
              </div>

              <button
                onClick={openAddBizDevModal}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold ml-auto lg:ml-0"
              >
                <Plus className="w-3.5 h-3.5" /> Add Lead Row
              </button>
            </div>

            {/* Filter inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-100">
              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-1">Lead Temperature</label>
                <select
                  value={bizDevFilters.clientStatus}
                  onChange={e => { setBizDevFilters({ ...bizDevFilters, clientStatus: e.target.value }); setBizDevPage(1); }}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-green-500"
                >
                  <option value="">All</option>
                  <option value="Cold">Cold</option>
                  <option value="Warm">Warm</option>
                  <option value="Hot">Hot</option>
                  <option value="Converted">Converted</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-1">Call Status</label>
                <select
                  value={bizDevFilters.callStatus}
                  onChange={e => { setBizDevFilters({ ...bizDevFilters, callStatus: e.target.value }); setBizDevPage(1); }}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-green-500"
                >
                  <option value="">All</option>
                  <option value="Connected">Connected</option>
                  <option value="No Answer">No Answer</option>
                  <option value="Switched Off">Switched Off</option>
                  <option value="Busy">Busy</option>
                  <option value="Wrong Number">Wrong Number</option>
                  <option value="Call Back Later">Call Back Later</option>
                  <option value="Meeting Fixed">Meeting Fixed</option>
                  <option value="Proposal Sent">Proposal Sent</option>
                  <option value="Not Interested">Not Interested</option>
                  <option value="Converted">Converted</option>
                  <option value="Existing Client">Existing Client</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-1">Service Offered</label>
                <select
                  value={bizDevFilters.serviceOffered}
                  onChange={e => { setBizDevFilters({ ...bizDevFilters, serviceOffered: e.target.value }); setBizDevPage(1); }}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-green-500"
                >
                  <option value="">All</option>
                  <option value="Permanent Recruitment">Permanent Recruitment</option>
                  <option value="Contract Staffing">Contract Staffing</option>
                  <option value="Executive Search">Executive Search</option>
                  <option value="Healthcare Recruitment">Healthcare Recruitment</option>
                  <option value="IT Recruitment">IT Recruitment</option>
                  <option value="Non IT Recruitment">Non IT Recruitment</option>
                  <option value="RPO">RPO</option>
                  <option value="NEXORA ATS">NEXORA ATS</option>
                  <option value="HRMS">HRMS</option>
                  <option value="Payroll">Payroll</option>
                  <option value="Attendance">Attendance</option>
                  <option value="Multiple Services">Multiple Services</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-1">Executive Name</label>
                <input
                  type="text"
                  value={bizDevFilters.executiveName}
                  onChange={e => { setBizDevFilters({ ...bizDevFilters, executiveName: e.target.value }); setBizDevPage(1); }}
                  placeholder="Filter Executive..."
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-1">Start Date</label>
                <input
                  type="date"
                  value={bizDevFilters.startDate}
                  onChange={e => { setBizDevFilters({ ...bizDevFilters, startDate: e.target.value }); setBizDevPage(1); }}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-1">End Date</label>
                <input
                  type="date"
                  value={bizDevFilters.endDate}
                  onChange={e => { setBizDevFilters({ ...bizDevFilters, endDate: e.target.value }); setBizDevPage(1); }}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
                />
              </div>
            </div>

            {(bizDevFilters.clientStatus || bizDevFilters.callStatus || bizDevFilters.serviceOffered || bizDevFilters.executiveName || bizDevFilters.startDate || bizDevFilters.endDate || bizDevFilters.kpiFilter || bizDevSearch) && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    setBizDevFilters({
                      clientStatus: '',
                      callStatus: '',
                      serviceOffered: '',
                      executiveName: '',
                      startDate: '',
                      endDate: '',
                      kpiFilter: '',
                    });
                    setBizDevSearch('');
                    setBizDevPage(1);
                  }}
                  className="text-red-500 hover:text-red-700 text-xs font-semibold"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>

          {/* Spreadsheet Table Grid */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            {bizDevLoading && bizDevRecords.length === 0 ? (
              <div className="p-20 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-green-600 mb-2" />
                <span className="text-sm">Loading spreadsheet...</span>
              </div>
            ) : bizDevRecords.length === 0 ? (
              <div className="p-20 text-center text-slate-400">
                <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold">No records found</p>
                <p className="text-xs mt-1">Try adjusting your filters or search query, or add a new row.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-700 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-center w-12">Sl</th>
                        <th className="px-4 py-3 font-semibold min-w-[100px]">Date</th>
                        <th className="px-4 py-3 font-semibold min-w-[120px]">Executive</th>
                        <th className="px-4 py-3 font-semibold min-w-[150px]">Company Name</th>
                        <th className="px-4 py-3 font-semibold min-w-[120px]">Contact Person</th>
                        <th className="px-4 py-3 font-semibold min-w-[120px]">Designation</th>
                        <th className="px-4 py-3 font-semibold min-w-[100px]">Mobile No</th>
                        <th className="px-4 py-3 font-semibold min-w-[150px]">Email ID</th>
                        <th className="px-4 py-3 font-semibold min-w-[100px]">City</th>
                        <th className="px-4 py-3 font-semibold min-w-[100px]">Industry</th>
                        <th className="px-4 py-3 font-semibold min-w-[90px]">Source</th>
                        <th className="px-4 py-3 font-semibold min-w-[150px]">Service Offered</th>
                        <th className="px-4 py-3 font-semibold min-w-[120px]">Call Status</th>
                        <th className="px-4 py-3 font-semibold text-center min-w-[80px]">Interested</th>
                        <th className="px-4 py-3 font-semibold min-w-[150px]">Requirement</th>
                        <th className="px-4 py-3 font-semibold text-center min-w-[80px]">Positions</th>
                        <th className="px-4 py-3 font-semibold min-w-[100px]">Follow-up</th>
                        <th className="px-4 py-3 font-semibold text-center min-w-[90px]">Meeting Fixed</th>
                        <th className="px-4 py-3 font-semibold text-center min-w-[90px]">Proposal Sent</th>
                        <th className="px-4 py-3 font-semibold text-center min-w-[90px]">Agreement Sent</th>
                        <th className="px-4 py-3 font-semibold min-w-[100px]">Client Status</th>
                        <th className="px-4 py-3 font-semibold min-w-[120px]">Expected Rev</th>
                        <th className="px-4 py-3 font-semibold min-w-[200px]">Remarks</th>
                        <th className="px-4 py-3 font-semibold text-center sticky right-0 bg-slate-50 border-l border-slate-100 min-w-[100px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bizDevRecords.map((rec, index) => {
                        const globalIndex = (bizDevPage - 1) * bizDevLimit + index + 1;
                        let statusColor = 'bg-slate-50 text-slate-700';
                        if (rec.clientStatus === 'Hot') statusColor = 'bg-red-50 text-red-700 border-red-100';
                        else if (rec.clientStatus === 'Warm') statusColor = 'bg-amber-50 text-amber-700 border-amber-100';
                        else if (rec.clientStatus === 'Cold') statusColor = 'bg-blue-50 text-blue-700 border-blue-100';
                        else if (rec.clientStatus === 'Converted') statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';

                        return (
                          <tr key={rec._id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 text-center text-slate-400 font-semibold">{globalIndex}</td>
                            <td className="px-4 py-3 whitespace-nowrap">{rec.date ? new Date(rec.date).toLocaleDateString('en-GB') : '—'}</td>
                            <td className="px-4 py-3 font-medium text-slate-700">{rec.executiveName || '—'}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{rec.companyName}</td>
                            <td className="px-4 py-3">{rec.contactPerson || '—'}</td>
                            <td className="px-4 py-3">{rec.designation || '—'}</td>
                            <td className="px-4 py-3">{rec.mobileNo || '—'}</td>
                            <td className="px-4 py-3 truncate max-w-[150px]" title={rec.emailId}>{rec.emailId || '—'}</td>
                            <td className="px-4 py-3">{rec.city || '—'}</td>
                            <td className="px-4 py-3">{rec.industry || '—'}</td>
                            <td className="px-4 py-3">{rec.source || '—'}</td>
                            <td className="px-4 py-3">{rec.serviceOffered || '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${rec.callStatus === 'Converted' || rec.callStatus === 'Existing Client' ? 'bg-emerald-100 text-emerald-800' :
                                  rec.callStatus === 'Not Interested' || rec.callStatus === 'Wrong Number' ? 'bg-red-100 text-red-800' :
                                    rec.callStatus === 'Meeting Fixed' || rec.callStatus === 'Proposal Sent' ? 'bg-indigo-100 text-indigo-800' :
                                      'bg-slate-100 text-slate-800'
                                }`}>
                                {rec.callStatus}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">{rec.interested}</td>
                            <td className="px-4 py-3 max-w-[150px] truncate" title={rec.requirement}>{rec.requirement || '—'}</td>
                            <td className="px-4 py-3 text-center font-medium">{rec.noOfPositions || 0}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-amber-600 font-medium">
                              {rec.followUpDate ? new Date(rec.followUpDate).toLocaleDateString('en-GB') : '—'}
                            </td>
                            <td className="px-4 py-3 text-center">{rec.meetingFixed}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-1.5 py-0.5 rounded font-medium text-[10px] ${rec.proposalSent === 'Yes' ? 'text-emerald-700 bg-emerald-50' :
                                  rec.proposalSent === 'Pending' ? 'text-amber-700 bg-amber-50' : 'text-slate-500'
                                }`}>{rec.proposalSent}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-1.5 py-0.5 rounded font-medium text-[10px] ${rec.agreementSent === 'Yes' ? 'text-emerald-700 bg-emerald-50' :
                                  rec.agreementSent === 'Pending' ? 'text-amber-700 bg-amber-50' : 'text-slate-500'
                                }`}>{rec.agreementSent}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusColor}`}>
                                {rec.clientStatus}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-800">
                              {rec.expectedRevenue ? `₹${rec.expectedRevenue.toLocaleString('en-IN')}` : '₹0'}
                            </td>
                            <td className="px-4 py-3 max-w-[200px] truncate" title={rec.remarks}>{rec.remarks || '—'}</td>
                            <td className="px-4 py-3 text-center sticky right-0 bg-white border-l border-slate-100 whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => openEditBizDevModal(rec)}
                                  className="p-1 hover:bg-slate-100 text-slate-500 hover:text-green-600 rounded transition-colors"
                                  title="Edit row"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleBizDevDelete(rec._id)}
                                  className="p-1 hover:bg-slate-100 text-slate-500 hover:text-red-600 rounded transition-colors"
                                  title="Delete row"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination footer */}
                {bizDevTotal > bizDevLimit && (
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Showing {((bizDevPage - 1) * bizDevLimit) + 1} to {Math.min(bizDevPage * bizDevLimit, bizDevTotal)} of {bizDevTotal} entries
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setBizDevPage(prev => Math.max(prev - 1, 1))}
                        disabled={bizDevPage === 1}
                        className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] rounded disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setBizDevPage(prev => Math.min(prev + 1, Math.ceil(bizDevTotal / bizDevLimit)))}
                        disabled={bizDevPage >= Math.ceil(bizDevTotal / bizDevLimit)}
                        className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] rounded disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ MODAL: ADD/EDIT BIZ DEV RECORD ══════════════ */}
      {isBizDevModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-slate-800 text-sm font-bold">
                {bizDevModalMode === 'add' ? 'Add New Business Development Lead' : 'Edit Lead Details'}
              </h2>
              <button onClick={() => setIsBizDevModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleBizDevSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* Section 1: Company Profile */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-green-600 mb-3 border-b border-slate-100 pb-1.5">
                    1. Company Profile
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Company Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={bizDevForm.companyName}
                        onChange={e => setBizDevForm({ ...bizDevForm, companyName: e.target.value })}
                        placeholder="e.g. Whitehorse Tech"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Contact Person</label>
                      <input
                        type="text"
                        value={bizDevForm.contactPerson}
                        onChange={e => setBizDevForm({ ...bizDevForm, contactPerson: e.target.value })}
                        placeholder="e.g. John Doe"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Designation</label>
                      <input
                        type="text"
                        value={bizDevForm.designation}
                        onChange={e => setBizDevForm({ ...bizDevForm, designation: e.target.value })}
                        placeholder="e.g. HR Manager"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Mobile No</label>
                      <input
                        type="text"
                        value={bizDevForm.mobileNo}
                        onChange={e => setBizDevForm({ ...bizDevForm, mobileNo: e.target.value })}
                        placeholder="e.g. 9876543210"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Email ID</label>
                      <input
                        type="email"
                        value={bizDevForm.emailId}
                        onChange={e => setBizDevForm({ ...bizDevForm, emailId: e.target.value })}
                        placeholder="e.g. info@company.com"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">City</label>
                      <input
                        type="text"
                        value={bizDevForm.city}
                        onChange={e => setBizDevForm({ ...bizDevForm, city: e.target.value })}
                        placeholder="e.g. Bangalore"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Industry</label>
                      <input
                        type="text"
                        value={bizDevForm.industry}
                        onChange={e => setBizDevForm({ ...bizDevForm, industry: e.target.value })}
                        placeholder="e.g. IT Services"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-green-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Lead Context */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-green-600 mb-3 border-b border-slate-100 pb-1.5">
                    2. Lead Context & Performance
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Date</label>
                      <input
                        type="date"
                        value={bizDevForm.date}
                        onChange={e => setBizDevForm({ ...bizDevForm, date: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Executive Name</label>
                      <input
                        type="text"
                        value={bizDevForm.executiveName}
                        onChange={e => setBizDevForm({ ...bizDevForm, executiveName: e.target.value })}
                        placeholder="Executive calling"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Source</label>
                      <select
                        value={bizDevForm.source}
                        onChange={e => setBizDevForm({ ...bizDevForm, source: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-green-500"
                      >
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Naukri">Naukri</option>
                        <option value="Reference">Reference</option>
                        <option value="Website">Website</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Service Offered</label>
                      <select
                        value={bizDevForm.serviceOffered}
                        onChange={e => setBizDevForm({ ...bizDevForm, serviceOffered: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-green-500"
                      >
                        <option value="Permanent Recruitment">Permanent Recruitment</option>
                        <option value="Contract Staffing">Contract Staffing</option>
                        <option value="Executive Search">Executive Search</option>
                        <option value="Healthcare Recruitment">Healthcare Recruitment</option>
                        <option value="IT Recruitment">IT Recruitment</option>
                        <option value="Non IT Recruitment">Non IT Recruitment</option>
                        <option value="RPO">RPO</option>
                        <option value="NEXORA ATS">NEXORA ATS</option>
                        <option value="HRMS">HRMS</option>
                        <option value="Payroll">Payroll</option>
                        <option value="Attendance">Attendance</option>
                        <option value="Multiple Services">Multiple Services</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Lead Temperature (Client Status)</label>
                      <select
                        value={bizDevForm.clientStatus}
                        onChange={e => setBizDevForm({ ...bizDevForm, clientStatus: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-green-500"
                      >
                        <option value="Cold">Cold</option>
                        <option value="Warm">Warm</option>
                        <option value="Hot">Hot</option>
                        <option value="Converted">Converted</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">CTC (INR)</label>
                      <input
                        type="number"
                        value={bizDevForm.ctc}
                        onChange={e => {
                          const ctc = parseInt(e.target.value) || 0;
                          const rev = Math.round(ctc * ((bizDevForm.placementPercentage || 0) / 100));
                          setBizDevForm({ ...bizDevForm, ctc, expectedRevenue: rev });
                        }}
                        placeholder="e.g. 1000000"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Placement %</label>
                      <input
                        type="number"
                        step="0.01"
                        value={bizDevForm.placementPercentage}
                        onChange={e => {
                          const pct = parseFloat(e.target.value) || 0;
                          const rev = Math.round((bizDevForm.ctc || 0) * (pct / 100));
                          setBizDevForm({ ...bizDevForm, placementPercentage: pct, expectedRevenue: rev });
                        }}
                        placeholder="e.g. 8.33"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Expected Revenue (INR)</label>
                      <input
                        type="number"
                        value={bizDevForm.expectedRevenue}
                        onChange={e => setBizDevForm({ ...bizDevForm, expectedRevenue: parseInt(e.target.value) || 0 })}
                        placeholder="Expected deal value"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-green-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Call & Sales Process */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-green-600 mb-3 border-b border-slate-100 pb-1.5">
                    3. Call & Sales Process
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Call Status</label>
                      <select
                        value={bizDevForm.callStatus}
                        onChange={e => setBizDevForm({ ...bizDevForm, callStatus: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-green-500"
                      >
                        <option value="Connected">Connected</option>
                        <option value="No Answer">No Answer</option>
                        <option value="Switched Off">Switched Off</option>
                        <option value="Busy">Busy</option>
                        <option value="Wrong Number">Wrong Number</option>
                        <option value="Call Back Later">Call Back Later</option>
                        <option value="Meeting Fixed">Meeting Fixed</option>
                        <option value="Proposal Sent">Proposal Sent</option>
                        <option value="Not Interested">Not Interested</option>
                        <option value="Converted">Converted</option>
                        <option value="Existing Client">Existing Client</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Interested</label>
                      <select
                        value={bizDevForm.interested}
                        onChange={e => setBizDevForm({ ...bizDevForm, interested: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-green-500"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">No. of Positions</label>
                      <input
                        type="number"
                        value={bizDevForm.noOfPositions}
                        onChange={e => setBizDevForm({ ...bizDevForm, noOfPositions: parseInt(e.target.value) || 0 })}
                        placeholder="Positions"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Requirement Description</label>
                      <input
                        type="text"
                        value={bizDevForm.requirement}
                        onChange={e => setBizDevForm({ ...bizDevForm, requirement: e.target.value })}
                        placeholder="e.g. IT Recruitment requirements"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Follow-up Date</label>
                      <input
                        type="date"
                        value={bizDevForm.followUpDate}
                        onChange={e => setBizDevForm({ ...bizDevForm, followUpDate: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Meeting Fixed</label>
                      <select
                        value={bizDevForm.meetingFixed}
                        onChange={e => setBizDevForm({ ...bizDevForm, meetingFixed: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-green-500"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Proposal Sent</label>
                      <select
                        value={bizDevForm.proposalSent}
                        onChange={e => setBizDevForm({ ...bizDevForm, proposalSent: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-green-500"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Agreement Sent</label>
                      <select
                        value={bizDevForm.agreementSent}
                        onChange={e => setBizDevForm({ ...bizDevForm, agreementSent: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-green-500"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 4: Remarks */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-green-600 mb-3 border-b border-slate-100 pb-1.5">
                    4. Remarks & Feedback
                  </h3>
                  <div>
                    <textarea
                      value={bizDevForm.remarks}
                      onChange={e => setBizDevForm({ ...bizDevForm, remarks: e.target.value })}
                      placeholder="Add remarks or notes from interaction..."
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-green-500 resize-none"
                    />
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end items-center gap-3 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setIsBizDevModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bizDevLoading}
                  className="flex items-center gap-1.5 px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  {bizDevLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                  {bizDevModalMode === 'add' ? 'Add Lead' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
