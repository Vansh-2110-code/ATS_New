import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Phone, Users, Calendar, FileText, TrendingUp, Clock,
  ArrowRight, AlertCircle, CheckCircle2, ScanLine, UserPlus,
  ListChecks, CalendarCheck, ChevronDown, Briefcase, UserCheck,
  X, PhoneMissed, PhoneOff, PhoneCall, ClipboardList,
  UserX, Building2, BadgeCheck, Clipboard, Loader2, Mail, CheckSquare,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { getGreeting } from '../../utils/greetingUtils';

// ─── Date Filter ────────────────────────────────────────────
type DateRange = 'Day' | 'Week' | 'Quarter' | 'Year' | 'All' | 'Custom';

// ─── Status Cards Icons ───────────────────────────────────────
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

const STATUS_COLOR_LIST = ['emerald','red','orange','amber','violet','indigo','cyan','teal','sky','pink','green'];

const STATUS_COLOR_MAP: Record<string, { card: string; icon: string; badge: string }> = {
  emerald: { card: 'border-emerald-100 bg-emerald-50/60 hover:bg-emerald-50',     icon: 'bg-emerald-100 text-emerald-600', badge: 'text-emerald-700' },
  red:     { card: 'border-red-100     bg-red-50/60     hover:bg-red-50',          icon: 'bg-red-100     text-red-500',     badge: 'text-red-600' },
  orange:  { card: 'border-orange-100  bg-orange-50/60  hover:bg-orange-50',       icon: 'bg-orange-100  text-orange-600',  badge: 'text-orange-700' },
  amber:   { card: 'border-amber-100   bg-amber-50/60   hover:bg-amber-50',        icon: 'bg-amber-100   text-amber-600',   badge: 'text-amber-700' },
  violet:  { card: 'border-violet-100  bg-violet-50/60  hover:bg-violet-50',       icon: 'bg-violet-100  text-violet-600',  badge: 'text-violet-700' },
  indigo:  { card: 'border-indigo-100  bg-indigo-50/60  hover:bg-indigo-50',       icon: 'bg-indigo-100  text-indigo-600',  badge: 'text-indigo-700' },
  cyan:    { card: 'border-cyan-100    bg-cyan-50/60    hover:bg-cyan-50',         icon: 'bg-cyan-100    text-cyan-600',    badge: 'text-cyan-700' },
  teal:    { card: 'border-teal-100    bg-teal-50/60    hover:bg-teal-50',         icon: 'bg-teal-100    text-teal-600',    badge: 'text-teal-700' },
  sky:     { card: 'border-sky-100     bg-sky-50/60     hover:bg-sky-50',          icon: 'bg-sky-100     text-sky-600',     badge: 'text-sky-700' },
  pink:    { card: 'border-pink-100    bg-pink-50/60    hover:bg-pink-50',         icon: 'bg-pink-100    text-pink-600',    badge: 'text-pink-700' },
  green:   { card: 'border-green-100   bg-green-50/60   hover:bg-green-50',        icon: 'bg-green-100   text-green-600',   badge: 'text-green-700' },
};

// ─── Top Metrics ─────────────────────────────────────────────
const colorMap: Record<string, { card: string; icon: string; badge: string; text: string }> = {
  blue:    { card: 'border-green-100  bg-green-50/40',    icon: 'bg-green-100  text-green-600',   badge: 'bg-green-100  text-green-700',  text: 'text-green-600' },
  amber:   { card: 'border-amber-100  bg-amber-50/40',    icon: 'bg-amber-100  text-amber-600',   badge: 'bg-amber-100  text-amber-700',  text: 'text-amber-600' },
  violet:  { card: 'border-violet-100 bg-violet-50/40',   icon: 'bg-violet-100 text-violet-600',  badge: 'bg-violet-100 text-violet-700', text: 'text-violet-600' },
  emerald: { card: 'border-emerald-100 bg-emerald-50/40', icon: 'bg-emerald-100 text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-600' },
};

const activityColors: Record<string, string> = {
  call:   'bg-green-100 text-green-600',
  status: 'bg-violet-100 text-violet-600',
  resume: 'bg-emerald-100 text-emerald-600',
  walkin: 'bg-amber-100 text-amber-600',
  follow: 'bg-slate-100 text-slate-500',
};

export function RecruiterDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const [dateRange, setDateRange] = useState<DateRange>('All');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [division, setDivision] = useState('All');
  const [company, setCompany] = useState('');
  const [customer, setCustomer] = useState('');
  const [recruiter, setRecruiter] = useState('');
  const [companies, setCompanies] = useState<any[]>([]);
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [topJobs, setTopJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashData, setDashData] = useState<any>(null);
  
  const [onboardingStatus, setOnboardingStatus] = useState<{ submitted: boolean; approved: boolean } | null>(null);

  useEffect(() => {
    if (api.getJoiningFormAutoFillData) {
      api.getJoiningFormAutoFillData()
        .then((data: any) => {
          if (data && (data.employeeId || data._id)) {
            setOnboardingStatus({ submitted: true, approved: !!data.isApproved });
          } else {
            setOnboardingStatus({ submitted: false, approved: false });
          }
        })
        .catch(() => {
          setOnboardingStatus({ submitted: false, approved: false });
        });
    }
  }, []);

  const DATE_TABS: DateRange[] = ['Day', 'Week', 'Quarter', 'Year', 'All', 'Custom'];

  useEffect(() => {
    Promise.all([
      (api as any).getCompanyList ? (api as any).getCompanyList() : Promise.resolve([]),
      (api as any).getRecruiters ? (api as any).getRecruiters() : Promise.resolve([]),
      api.getJobs ? api.getJobs({ status: 'Open', limit: '2' }) : Promise.resolve({ jobs: [] })
    ]).then(([compData, recData, jobData]: any) => {
      setCompanies(Array.isArray(compData) ? compData : (compData?.companies || []));
      setRecruiters(Array.isArray(recData) ? recData : (recData?.users || []));
      setTopJobs(jobData?.jobs || []);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [dateRange, customFrom, customTo, division, company, customer, recruiter]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = { range: dateRange.toLowerCase() };
      if (dateRange === 'Custom' && customFrom) params.from = customFrom;
      if (dateRange === 'Custom' && customTo) params.to = customTo;
      if (division) params.division = division;
      if (company) params.company = company;
      if (customer) params.customer = customer;
      if (recruiter) params.recruiter = recruiter;
      const data = await api.getRecruiterDashboard(params);
      setDashData(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const STATUS_CARDS = dashData?.pipeline
    ? Object.entries(dashData.pipeline).map(([label, count]: any, i: number) => ({
        label,
        count: count || 0,
        color: STATUS_COLOR_LIST[i % STATUS_COLOR_LIST.length],
        icon: STATUS_ICON_MAP[label] || UserCheck,
      }))
    : [];

  const followUps = dashData?.followUps || [];
  const metrics = {
    todayCalls: dashData?.metrics?.todayCalls ?? dashData?.todayCalls ?? 0,
    followUpsDue: dashData?.metrics?.followUpsDue ?? dashData?.followUpsDue ?? (dashData?.followUps?.length || 0),
    interviewsScheduled: dashData?.metrics?.scheduledInterviews ?? dashData?.interviewsScheduled ?? 0,
    resumeInflow: dashData?.metrics?.totalCandidates ?? dashData?.resumeInflow ?? 0,
    dailyTarget: dashData?.callTarget?.target ?? dashData?.dailyTarget ?? 50,
  };

  // Navigate to resume list with a status filter passed via router state
  const goToStatus = (status: string) => {
    navigate('/recruiter/resumes', { state: { statusFilter: status } });
  };

  // "Today's Calls" click
  const goToTodayCalls = () => {
    const selectedRec = recruiters.find(r => r._id === recruiter);
    navigate('/recruiter/calls/today', {
      state: {
        recruiterId: recruiter || undefined,
        recruiterName: selectedRec?.name || (recruiter ? undefined : user?.name)
      }
    });
  };

  const goToFollowUps = () => {
    navigate('/recruiter/resumes', { state: { statusFilter: 'Call Back' } });
  };

  const goToInterviews = () => {
    navigate('/recruiter/interviews');
  };

  const goToResumeInflow = () => {
    navigate('/recruiter/resumes');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-slate-800" style={{ fontWeight: 700, fontSize: '1.5rem' }}>
            {getGreeting()}, {user?.name.split(' ')[0]}! 👋
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{today}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            to="/recruiter/resumes"
            className="px-4 py-2 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 transition-colors"
            style={{ fontWeight: 500 }}
          >
            View Resumes
          </Link>
          <Link
            to="/recruiter/walkins"
            className="px-4 py-2 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 transition-colors"
            style={{ fontWeight: 500 }}
          >
            Register Walk-In
          </Link>
        </div>
      </div>

      {/* Onboarding status banner */}
      {onboardingStatus && (
        <div className="transition-all duration-200">
          {!onboardingStatus.submitted ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start justify-between gap-3 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-amber-800">Onboarding Incomplete</h4>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Please submit your comprehensive joining details and upload your records to complete your profile.
                  </p>
                </div>
              </div>
              <Link
                to="/recruiter/joining"
                className="text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
              >
                Complete Onboarding &rarr;
              </Link>
            </div>
          ) : !onboardingStatus.approved ? (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-blue-800">Onboarding Pending Approval</h4>
                <p className="text-xs text-blue-700 mt-0.5">
                  Your joining details have been submitted successfully and are currently pending approval by the administrator.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start justify-between gap-3 shadow-sm">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-800">Onboarding Approved</h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Your onboarding profile is approved and locked. You can view your record at any time.
                  </p>
                </div>
              </div>
              <Link
                to="/recruiter/joining"
                className="text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
              >
                View Record &rarr;
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Moved Division Tabs into the filter bar below */}

      {/* ── Date Filter Bar ── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 mr-1" style={{ fontWeight: 600 }}>FILTER BY:</span>
          
          {/* Division Pills (Division Dashboard style) */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mr-2">
            {['All', 'IT', 'BPO', 'Lateral'].map(div => (
              <button
                key={div}
                onClick={() => setDivision(div)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  division === div ? 'bg-green-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                {div}
              </button>
            ))}
          </div>

          {/* Recruiter Filter (only for TL / Admin) */}
          {user?.role !== 'recruiter' && (
            <select
              value={recruiter}
              onChange={e => setRecruiter(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-green-400 bg-white mr-2"
            >
              <option value="">All Recruiters</option>
              {recruiters.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
            </select>
          )}

          <div className="flex gap-1 flex-wrap">
            {DATE_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setDateRange(tab)}
                className={`px-4 py-1.5 rounded-lg text-xs transition-colors ${
                  dateRange === tab
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                style={{ fontWeight: dateRange === tab ? 600 : 500 }}
              >
                {tab}
              </button>
            ))}
          </div>
          {dateRange === 'Custom' && (
            <div className="flex items-center gap-2 ml-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">From</span>
                <input
                  type="date"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-green-400 bg-white"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">To</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-green-400 bg-white"
                />
              </div>
              <button
                className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700"
                style={{ fontWeight: 600 }}
              >
                Apply
              </button>
              {(customFrom || customTo) && (
                <button
                  onClick={() => { setCustomFrom(''); setCustomTo(''); }}
                  className="p-1.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          {dateRange !== 'Custom' && dateRange !== 'All' && (
            <span className="ml-auto text-xs text-slate-400 hidden sm:block">
              Showing data for: <span style={{ fontWeight: 600 }} className="text-slate-600">{dateRange === 'Day' ? today : `This ${dateRange}`}</span>
            </span>
          )}

          <div className="flex items-center gap-2 flex-wrap ml-auto">
            <select
              value={company}
              onChange={e => setCompany(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-green-400 bg-white"
            >
              <option value="">All Companies</option>
              {companies.map(c => <option key={c._id || c.companyName} value={c.companyName}>{c.companyName}</option>)}
            </select>
            <select
              value={customer}
              onChange={e => setCustomer(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-green-400 bg-white"
            >
              <option value="">All Customers</option>
              {companies.map(c => <option key={`cust-${c._id || c.companyName}`} value={c.companyName}>{c.companyName}</option>)}
            </select>
            {['admin', 'manager', 'tl'].includes(user?.role || '') && (
              <></>
            )}
          </div>
        </div>
      </div>

      {/* ── Top Metrics (4 cards, Today's Calls clickable) ── */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
        </div>
      ) : (
      <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Calls", value: String(metrics.todayCalls), change: `+${metrics.todayCalls} today`, color: 'blue', icon: Phone, onClick: goToTodayCalls, tooltip: "View all candidates called or updated today" },
          { label: 'Follow-Ups Due', value: String(metrics.followUpsDue), change: 'Urgent', color: 'amber', icon: AlertCircle, onClick: goToFollowUps, tooltip: "View follow-up candidates" },
          { label: 'Interviews Scheduled', value: String(metrics.interviewsScheduled), change: 'This week', color: 'violet', icon: Calendar, onClick: goToInterviews, tooltip: "View scheduled interviews" },
          { label: 'Resume Inflow', value: String(metrics.resumeInflow), change: `Total candidates`, color: 'emerald', icon: FileText, onClick: goToResumeInflow, tooltip: "View all candidates in resume pool" },
        ].map((m, i) => {
          const Icon = m.icon;
          const c = colorMap[m.color];
          return (
            <button
              key={i}
              onClick={m.onClick}
              title={m.tooltip}
              className={`bg-white rounded-xl p-5 border shadow-sm text-left transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer group ${c.card}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 ${c.icon}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.badge}`} style={{ fontWeight: 500 }}>
                  {m.change}
                </span>
              </div>
              <div className="text-slate-800 group-hover:text-green-700 transition-colors" style={{ fontWeight: 700, fontSize: '1.75rem' }}>
                {m.value}
              </div>
              <div className="text-slate-500 text-sm mt-0.5 flex items-center justify-between">
                <span>{m.label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-green-600 transition-colors group-hover:translate-x-0.5" />
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Status Pipeline Cards (11 clickable) ── */}
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
            return (
              <div key={i} className="relative">
                <button
                  onClick={() => goToStatus(s.label)}
                  className={`w-full flex flex-col items-start p-3.5 rounded-xl border transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${c.card}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${c.icon}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className={`text-xl mb-0.5 ${c.badge}`} style={{ fontWeight: 800, lineHeight: 1 }}>
                    {s.count}
                  </div>
                  <div className="text-slate-500 text-xs leading-tight">{s.label}</div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Follow-Ups + Quick Actions ── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Follow-Ups */}
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
                    <Clock className="w-3 h-3" />
                    {f.time || f.followUpDate || ''}
                  </div>
                  <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full" style={{ fontWeight: 500 }}>
                    {f.status}
                  </span>
                </div>
                <Link
                  to={`/recruiter/candidate/${f.candidateId || f._id || '1'}`}
                  className="ml-2 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 flex-shrink-0"
                  style={{ fontWeight: 500 }}
                >
                  <Phone className="w-3 h-3" />
                </Link>
              </div>
            ))}
            {followUps.length === 0 && (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">No follow-ups due</div>
            )}
          </div>
        </div>

        {/* Quick Actions + Daily Target */}
        <div className="space-y-4">
          
          {/* Top 2 Open Jobs */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-slate-800 text-sm" style={{ fontWeight: 600 }}>Top Open Jobs</h2>
              <Link to="/admin/jobs" className="text-xs text-green-600 hover:underline">View all</Link>
            </div>
            <div className="space-y-3">
              {topJobs.map(job => (
                <div key={job._id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold text-slate-800">{job.jobTitle}</span>
                    <span className="text-xs text-emerald-600 bg-emerald-100 px-2 rounded-full">{job.positions} open</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> {job.companyName}
                  </div>
                </div>
              ))}
              {topJobs.length === 0 && <div className="text-xs text-slate-400 text-center py-2">No open jobs</div>}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-slate-800 text-sm mb-4" style={{ fontWeight: 600 }}>Quick Actions</h2>
            <div className="space-y-2">
              {[
                { label: 'Add New Candidate',  href: '/recruiter/add',          icon: UserPlus,    color: 'text-green-600' },
                { label: 'Walk-In Queue',       href: '/recruiter/walkin-queue', icon: ListChecks,  color: 'text-emerald-600' },
                { label: 'Interview Schedule',  href: '/recruiter/interviews',   icon: CalendarCheck, color: 'text-violet-600' },
                { label: 'ATS Resume Scanner',  href: '/recruiter/scan',         icon: ScanLine,    color: 'text-amber-600' },
                { label: 'Send Mail',           href: '/email-center',           icon: Mail,        color: 'text-blue-600' },
                { label: 'View All Resumes',    href: '/recruiter/resumes',      icon: FileText,    color: 'text-slate-600' },
              ].map((action, i) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={i}
                    to={action.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
                  >
                    <Icon className={`w-4 h-4 ${action.color}`} />
                    <span className="text-slate-600 text-sm group-hover:text-slate-800">{action.label}</span>
                    <ArrowRight className="w-3 h-3 text-slate-300 ml-auto group-hover:text-slate-400" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Daily Target */}
          <div className="bg-green-600 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm" style={{ fontWeight: 600 }}>Daily Target</span>
            </div>
            <div className="mb-2" style={{ fontWeight: 700, fontSize: '1.5rem' }}>{metrics.todayCalls} / {metrics.dailyTarget}</div>
            <p className="text-green-200 text-xs mb-3">Calls made today</p>
            <div className="bg-green-500 rounded-full h-2">
              <div className="bg-white rounded-full h-2" style={{ width: `${Math.min(100, Math.round((metrics.todayCalls / metrics.dailyTarget) * 100))}%` }} />
            </div>
            <p className="text-green-200 text-xs mt-2">{Math.round((metrics.todayCalls / metrics.dailyTarget) * 100)}% of daily target</p>
          </div>
        </div>
      </div>

      </>
      )}
    </div>
  );
}
