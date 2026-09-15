import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import {
  Phone, Calendar, AlertCircle, TrendingUp, ArrowRight, Users, Edit3, Loader2, Mail,
  X, Eye, BarChart3, Zap, Target, Award, CheckCircle2, FileText,
  PhoneOff, PhoneMissed, PhoneCall, ClipboardList, UserX, Building2,
  BadgeCheck, Clipboard, UserPlus, Clock, Briefcase, UserCheck, FileCheck
} from 'lucide-react';
import api from '../../services/api';
import { getGreeting } from '../../utils/greetingUtils';
import { TLCandidateViewModal } from './TLCandidateViewModal';
import { TeamPerformanceReviews } from '../../components/TeamPerformanceReviews';

import { CANDIDATE_STATUS_OPTIONS } from '../../utils/candidateStatusUtils';
import { SlicerFilteredDataView } from '../../components/SlicerFilteredDataView';
import { dedupeCompanies } from '../../utils/companyUtils';

type DateRange = 'Day' | 'Week' | 'Month' | 'Quarter' | 'Year' | 'All' | 'Custom';

interface TeamMember {
  id: string;
  name: string;
  calls: number;
  totalCalls: number;
  eligible: number;
  finalSelect: number;
  docCompleted: number;
  offerAccept: number;
  joined: number;
  target: number;
  interviews: number;
  totalInterviewsScheduled: number;
  followUps: number;
  totalCandidates: number;
  activeCandidates: number;
  status: string;
  joinedDate: string;
}

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

const topColorMap: Record<string, { card: string; icon: string; badge: string; text: string }> = {
  blue:    { card: 'border-blue-100   bg-blue-50/40',     icon: 'bg-blue-100   text-blue-600',    badge: 'bg-blue-100   text-blue-700',   text: 'text-blue-600' },
  amber:   { card: 'border-amber-100  bg-amber-50/40',    icon: 'bg-amber-100  text-amber-600',   badge: 'bg-amber-100  text-amber-700',  text: 'text-amber-600' },
  violet:  { card: 'border-violet-100 bg-violet-50/40',   icon: 'bg-violet-100 text-violet-600',  badge: 'bg-violet-100 text-violet-700', text: 'text-violet-600' },
  emerald: { card: 'border-emerald-100 bg-emerald-50/40', icon: 'bg-emerald-100 text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-600' },
  cyan:    { card: 'border-cyan-100    bg-cyan-50/40',    icon: 'bg-cyan-100    text-cyan-600',    badge: 'bg-cyan-100    text-cyan-700',    text: 'text-cyan-600' },
};

export function TLDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [summary, setSummary] = useState({
    totalCalls: 0,
    eligible: 0,
    finalSelect: 0,
    docCompleted: 0,
    offerAccept: 0,
    joined: 0,
  });
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Recruiter Dashboard Slicer & Filter State
  const [dateRange, setDateRange] = useState<DateRange>('Month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [division, setDivision] = useState('BPO');
  const [company, setCompany] = useState('');
  const [customer, setCustomer] = useState('');
  const [recruiter, setRecruiter] = useState('');
  const [companies, setCompanies] = useState<any[]>([]);
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [dashData, setDashData] = useState<any>(null);
  const [activeSlicer, setActiveSlicer] = useState<string>('All');

  // Recruiter detail view state
  const [selectedRecruiter, setSelectedRecruiter] = useState<TeamMember | null>(null);
  const [recruiterCandidates, setRecruiterCandidates] = useState<any[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [tlCandidate, setTlCandidate] = useState<any>(null);
  const [pendingJoiningCount, setPendingJoiningCount] = useState(0);

  const DATE_TABS: DateRange[] = ['Day', 'Week', 'Month', 'Quarter', 'Year', 'All', 'Custom'];

  // Load Companies & Recruiters list
  useEffect(() => {
    Promise.all([
      (api as any).getCompanyList ? (api as any).getCompanyList() : Promise.resolve([]),
      (api as any).getRecruiters ? (api as any).getRecruiters() : Promise.resolve([]),
    ]).then(([compData, recData]: any) => {
      const rawComps = Array.isArray(compData) ? compData : (compData?.companies || []);
      const rawRecs = Array.isArray(recData) ? recData : (recData?.users || recData?.recruiters || []);
      setCompanies(dedupeCompanies(rawComps));
      setRecruiters(rawRecs);
    }).catch(console.error);
  }, []);

  // Load TL Dashboard & Recruiter Dashboard Metrics
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        let fromVal = customFrom;
        let toVal = customTo;
        if (dateRange === 'Custom' && fromVal && toVal && new Date(fromVal) > new Date(toVal)) {
          const tmp = fromVal;
          fromVal = toVal;
          toVal = tmp;
          setCustomFrom(fromVal);
          setCustomTo(toVal);
        }

        const params: Record<string, string> = { range: dateRange.toLowerCase() };
        if (dateRange === 'Custom') {
          params.range = 'custom';
          if (fromVal) {
            params.from = fromVal;
            params.startDate = fromVal;
          }
          if (toVal) {
            params.to = toVal;
            params.endDate = toVal;
          }
        }
        if (division) params.division = division;
        if (company) params.company = company;
        if (customer) params.customer = customer;
        if (recruiter) params.recruiter = recruiter;

        const [tlData, rDashData, tasksData] = await Promise.all([
          api.getTLDashboard(params),
          api.getRecruiterDashboard(params).catch(() => null),
          api.getTasks({ status: 'Pending,In Progress' }).catch(() => ({ tasks: [] })),
        ]);

        const t = tlData.teamMembers || tlData.team || tlData.recruiters || [];
        setTeam(t.map((r: any) => ({
          id: r._id || r.id,
          name: r.name || '',
          calls: r.calls ?? r.todayCalls ?? 0,
          totalCalls: r.totalCalls ?? 0,
          eligible: r.eligible ?? 0,
          finalSelect: r.finalSelect ?? 0,
          docCompleted: r.docCompleted ?? 0,
          offerAccept: r.offerAccept ?? 0,
          joined: r.joined ?? 0,
          target: r.target ?? r.callTarget ?? r.dailyTarget ?? 50,
          interviews: r.interviews ?? r.todayInterviews ?? r.interviewsScheduled ?? 0,
          totalInterviewsScheduled: r.totalInterviewsScheduled ?? 0,
          followUps: r.followUps ?? r.pendingFollowUps ?? 0,
          totalCandidates: r.totalCandidates ?? 0,
          activeCandidates: r.activeCandidates ?? 0,
          status: r.onTarget ? 'on-target' : (r.status || 'offline'),
          joinedDate: r.joined || r.loginTime || '—',
        })));

        if (tlData.summary) {
          setSummary(tlData.summary);
        }

        if (rDashData) {
          setDashData(rDashData);
        }

        setTasks(tasksData.tasks || []);

        api.getJoiningList({ limit: '1', status: 'pending' }).then(res => {
          setPendingJoiningCount(res.pendingCount || res.total || 0);
        }).catch(() => {});
      } catch (err) {
        console.error('Failed to load TL dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [dateRange, customFrom, customTo, division, company, customer, recruiter]);

  // Load candidates for selected recruiter
  const loadRecruiterCandidates = async (recruiterId: string) => {
    setLoadingCandidates(true);
    try {
      const res = await api.getCandidates({ recruiter: recruiterId, limit: '200' });
      setRecruiterCandidates(res.candidates || res.data || []);
    } catch (err) {
      console.error('Failed to load recruiter candidates:', err);
      setRecruiterCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  };

  // Open recruiter detail
  const openRecruiterDetail = (recruiterMember: TeamMember) => {
    setSelectedRecruiter(recruiterMember);
    loadRecruiterCandidates(recruiterMember.id);
  };

  // Open TL Candidate View Modal
  const openTLCandidateView = (cand: any) => {
    setTlCandidate(cand);
  };

  // Metric aggregates for TL Overview
  const totalCallsDone = summary.totalCalls ?? team.reduce((s, r) => s + (r.totalCalls || 0), 0);
  const totalEligible = summary.eligible ?? team.reduce((s, r) => s + (r.eligible || 0), 0);
  const totalFinalSelect = summary.finalSelect ?? team.reduce((s, r) => s + (r.finalSelect || 0), 0);
  const totalDocCompleted = summary.docCompleted ?? team.reduce((s, r) => s + (r.docCompleted || 0), 0);
  const totalOfferAccept = summary.offerAccept ?? team.reduce((s, r) => s + (r.offerAccept || 0), 0);
  const totalJoined = summary.joined ?? team.reduce((s, r) => s + (r.joined || 0), 0);

  const STATUS_CARDS = CANDIDATE_STATUS_OPTIONS.map((label, i) => ({
    label,
    count: dashData?.pipeline?.[label] || 0,
    color: STATUS_COLOR_LIST[i % STATUS_COLOR_LIST.length],
    icon: STATUS_ICON_MAP[label] || UserCheck,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h1 className="text-slate-800 flex items-center gap-2" style={{ fontWeight: 800, fontSize: '1.5rem' }}>
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Team Lead'}! 👋
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Team Overview & Recruiter Performance Tracking ({todayStr})
          </p>
        </div>
      </div>

      {/* ── Division Tabs ── */}
      <div className="flex gap-2 border-b border-slate-200">
        {['IT', 'BPO', 'Lateral'].map(div => (
          <button
            key={div}
            onClick={() => setDivision(div)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${division === div ? 'border-green-600 text-green-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {div}
          </button>
        ))}
      </div>

      {/* ── Pending Joining Approvals Alert Banner ── */}
      {pendingJoiningCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl p-4 shadow-sm flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm">
                {pendingJoiningCount} Recruiter Joining {pendingJoiningCount === 1 ? 'Form' : 'Forms'} Pending Verification
              </p>
              <p className="text-white/85 text-xs">
                Recruiters from your team have submitted onboarding forms and KYC documents awaiting your approval.
              </p>
            </div>
          </div>
          <Link
            to="/admin/joining"
            className="px-4 py-2 bg-white text-amber-800 rounded-xl text-xs font-bold hover:bg-amber-50 transition-colors shadow-xs"
          >
            Review & Verify Now →
          </Link>
        </div>
      )}

      {/* ── Date & Filter Bar ── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-xs px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 mr-1" style={{ fontWeight: 600 }}>FILTER BY:</span>
          <div className="flex gap-1 flex-wrap">
            {DATE_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setDateRange(tab);
                  if (tab === 'Custom' && (!customFrom || !customTo)) {
                    const now = new Date();
                    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                    const todayDay = now.toISOString().split('T')[0];
                    setCustomFrom(firstDay);
                    setCustomTo(todayDay);
                  }
                }}
                className={`px-4 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
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
              value={recruiter}
              onChange={e => setRecruiter(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-green-400 bg-white"
            >
              <option value="">All Recruiters</option>
              {(team.length > 0 ? team : recruiters.map((r: any) => ({ id: r._id || r.id, name: r.name }))).map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Key Summary Metrics Slicers (6 Items) ── */}
      <div>
        <h2 className="text-slate-800 text-sm mb-3" style={{ fontWeight: 700 }}>Team Overview Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Calls Done", value: String(totalCallsDone), change: 'Calls', color: 'blue', icon: Phone, slicerKey: 'Today Calls' },
            { label: 'Eligible', value: String(totalEligible), change: 'Eligible', color: 'emerald', icon: UserCheck, slicerKey: 'Eligible Candidates' },
            { label: 'Final Select', value: String(totalFinalSelect), change: 'L1/Final', color: 'violet', icon: BadgeCheck, slicerKey: '__final_select_group' },
            { label: 'Documentation Completed', value: String(totalDocCompleted), change: 'Doc Done', color: 'amber', icon: FileText, slicerKey: 'Documentation' },
            { label: 'Offer Accept', value: String(totalOfferAccept), change: 'Offered', color: 'purple', icon: Target, slicerKey: 'Offer Accept' },
            { label: 'Joined', value: String(totalJoined), change: 'Placed', color: 'emerald', icon: CheckCircle2, slicerKey: 'Joined' },
          ].map((m, i) => {
            const Icon = m.icon || UserPlus;
            const c = topColorMap[m.color] || topColorMap.emerald;
            const isSelected = activeSlicer === m.slicerKey;
            return (
              <button
                key={i}
                onClick={() => setActiveSlicer(isSelected ? 'All' : m.slicerKey)}
                className={`bg-white rounded-xl p-4 border shadow-xs text-left transition-all hover:shadow-md cursor-pointer ${c.card} ${
                  isSelected ? 'ring-2 ring-green-600 shadow-md border-green-400' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${c.icon}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${c.badge}`}>
                    {m.change}
                  </span>
                </div>
                <div className="text-slate-800 font-extrabold text-xl leading-tight">{m.value}</div>
                <div className="text-slate-500 text-xs mt-1 font-medium flex items-center justify-between">
                  <span className="truncate">{m.label}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0 ml-1" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Status Pipeline Cards (11 clickable) ── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-xs p-5">
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
            const isSelected = activeSlicer === s.label;
            return (
              <div key={i} className="relative">
                <button
                  onClick={() => setActiveSlicer(isSelected ? 'All' : s.label)}
                  className={`w-full flex flex-col items-start p-3.5 rounded-xl border transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${c.card} ${
                    isSelected ? 'ring-2 ring-green-600 shadow-md scale-102 border-green-400' : ''
                  }`}
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

      {/* ── In-Place Slicer Filtered Data Section ── */}
      <SlicerFilteredDataView
        slicerName={activeSlicer}
        division={division !== 'All' ? division : undefined}
        company={company}
        customer={customer}
        recruiter={recruiter}
        range={dateRange}
        fromDate={customFrom}
        toDate={customTo}
        onClear={() => setActiveSlicer('All')}
        title="Team Overview Pipeline Slicer"
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Recruiter Performance Table ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between bg-white px-5 py-3 rounded-xl border border-slate-100 shadow-xs">
            <h2 className="text-slate-800 text-sm" style={{ fontWeight: 700 }}>
              Recruiter Performance ({dateRange})
            </h2>
            <span className="text-xs text-slate-400 font-medium">Select date range above</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="px-4 py-3">Recruiter</th>
                    <th className="px-3 py-3 text-center">Total Calls</th>
                    <th className="px-3 py-3 text-center">Eligible</th>
                    <th className="px-3 py-3 text-center">Final Select</th>
                    <th className="px-3 py-3 text-center">Doc Completed</th>
                    <th className="px-3 py-3 text-center">Offer Accept</th>
                    <th className="px-3 py-3 text-center">Joined</th>
                    <th className="px-3 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {team.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">No recruiters found.</td>
                    </tr>
                  ) : (
                    team.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <button onClick={() => openRecruiterDetail(r)} className="font-bold text-slate-800 hover:text-green-600 transition-colors text-left cursor-pointer">
                            {r.name}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-center font-semibold text-blue-600">{r.totalCalls}</td>
                        <td className="px-3 py-3 text-center font-semibold text-emerald-600">{r.eligible}</td>
                        <td className="px-3 py-3 text-center font-semibold text-indigo-600">{r.finalSelect}</td>
                        <td className="px-3 py-3 text-center font-semibold text-amber-600">{r.docCompleted}</td>
                        <td className="px-3 py-3 text-center font-semibold text-purple-600">{r.offerAccept}</td>
                        <td className="px-3 py-3 text-center font-bold text-green-700">{r.joined}</td>
                        <td className="px-3 py-3 text-right">
                          <button
                            onClick={() => openRecruiterDetail(r)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-green-600 transition-colors cursor-pointer"
                            title="View Candidates"
                          >
                            <Eye className="w-4 h-4" />
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

        {/* Right Panel */}
        <div className="space-y-4">
          {/* My Tasks */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-slate-800 text-sm" style={{ fontWeight: 600 }}>
                My Tasks
                <span className="ml-2 bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded-full">{tasks.length}</span>
              </h3>
              <Link to="/admin/tasks" className="text-xs text-green-600 hover:underline" style={{ fontWeight: 500 }}>
                View all
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {tasks.slice(0, 5).map(task => {
                const redirectUrl = task.entityType === 'candidate'
                  ? `/recruiter/candidate/${task.entityId || task.candidateId}`
                  : task.entityType === 'job'
                    ? `/recruiter/jobs/${task.entityId}`
                    : '/admin/tasks';

                return (
                  <div key={task._id}
                    onClick={() => navigate(redirectUrl)}
                    className="px-5 py-3 hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-slate-700 text-sm truncate group-hover:text-green-600" style={{ fontWeight: 600 }}>{task.title}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${task.priority === 'Urgent' ? 'bg-red-100 text-red-600' :
                          task.priority === 'High' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mt-1 line-clamp-1">{task.description || 'No description'}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                        <Zap className="w-3 h-3" /> {task.taskCategory}
                      </div>
                      <span className="text-green-600 text-[10px] font-bold group-hover:underline">Details</span>
                    </div>
                  </div>
                );
              })}
              {tasks.length === 0 && (
                <div className="px-5 py-8 text-center text-slate-400 text-xs italic">No pending tasks</div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-slate-800 text-sm mb-4" style={{ fontWeight: 600 }}>Quick Actions</h2>
            <div className="space-y-2">
              {[
                { label: 'View Resumes', href: '/recruiter/resumes', icon: Phone, color: 'text-green-600' },
                { label: 'Interview Schedule', href: '/recruiter/interviews', icon: Calendar, color: 'text-violet-600' },
                { label: 'Add Candidate', href: '/recruiter/add', icon: Users, color: 'text-emerald-600' },
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
        </div>

        {/* Team Performance Reviews Section */}
        <div className="mt-8 lg:col-span-3">
          <TeamPerformanceReviews />
        </div>
      </div>

      {/* Recruiter Detail Modal */}
      {selectedRecruiter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                  {selectedRecruiter.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h2 className="text-lg text-slate-800" style={{ fontWeight: 700 }}>{selectedRecruiter.name}</h2>
                  <p className="text-xs text-slate-500">Joined: {selectedRecruiter.joinedDate}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecruiter(null)}
                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Performance Metrics Grid */}
              <div>
                <h3 className="text-slate-800 text-sm mb-4 flex items-center gap-2" style={{ fontWeight: 600 }}>
                  <BarChart3 className="w-4 h-4 text-green-600" /> Performance Metrics
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Calls Today', value: selectedRecruiter.calls, target: selectedRecruiter.target, icon: Phone, color: 'bg-green-50 text-green-600' },
                    { label: 'Interviews', value: selectedRecruiter.interviews, icon: Calendar, color: 'bg-violet-50 text-violet-600' },
                    { label: 'Follow-Ups', value: selectedRecruiter.followUps, icon: AlertCircle, color: 'bg-amber-50 text-amber-600' },
                    { label: 'Active/Total', value: `${selectedRecruiter.activeCandidates}/${selectedRecruiter.totalCandidates}`, icon: Users, color: 'bg-blue-50 text-blue-600' },
                  ].map((metric, i) => {
                    const Icon = metric.icon;
                    return (
                      <div key={i} className={`rounded-lg p-4 ${metric.color}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="w-4 h-4" />
                          <span className="text-xs text-slate-600">{metric.label}</span>
                        </div>
                        <div className="text-xl" style={{ fontWeight: 700 }}>{metric.value}</div>
                        {metric.target && (
                          <div className="text-xs text-slate-500 mt-1">Target: {metric.target}</div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Call Progress Bar */}
                <div className="mt-4 bg-white border border-slate-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-600" style={{ fontWeight: 500 }}>Call Target Progress</span>
                    <span className="text-sm text-slate-800" style={{ fontWeight: 700 }}>
                      {Math.min(100, Math.round((selectedRecruiter.calls / selectedRecruiter.target) * 100))}%
                    </span>
                  </div>
                  <div className="bg-slate-100 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all"
                      style={{ width: `${Math.min(100, (selectedRecruiter.calls / selectedRecruiter.target) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Candidates List */}
              <div>
                {loadingCandidates ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-green-600" />
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {recruiterCandidates.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-sm">
                        No candidates found for this recruiter
                      </div>
                    ) : (
                      recruiterCandidates.slice(0, 25).map((cand: any) => (
                        <button
                          key={cand._id || cand.id}
                          onClick={() => openTLCandidateView(cand)}
                          className="w-full text-left p-3 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-green-300 transition-colors group cursor-pointer"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm text-slate-800 group-hover:text-green-600" style={{ fontWeight: 500 }}>
                                {cand.name || cand.candidateName || 'Unknown'}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {cand.firstCallStatus || cand.status || 'No status'} • {cand.qualification || '—'}
                              </p>
                            </div>
                            <Eye className="w-4 h-4 text-slate-300 group-hover:text-green-600" />
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                <button
                  onClick={() => setSelectedRecruiter(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  style={{ fontWeight: 500 }}
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    navigate(`/tl/my-team`);
                    setSelectedRecruiter(null);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors cursor-pointer"
                  style={{ fontWeight: 500 }}
                >
                  View All Candidates
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TL Candidate Modal */}
      {tlCandidate && (
        <TLCandidateViewModal
          candidate={tlCandidate}
          onClose={() => setTlCandidate(null)}
          onSaved={() => {
            if (selectedRecruiter) {
              loadRecruiterCandidates(selectedRecruiter.id);
            }
          }}
        />
      )}
    </div>
  );
}
