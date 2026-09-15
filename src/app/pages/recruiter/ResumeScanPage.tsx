import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router';
import {
  Upload, FileText, CheckCircle2, XCircle, AlertCircle, Loader2,
  User, Mail, Phone, MapPin, Briefcase, GraduationCap, Star,
  Zap, TrendingUp, Target, ChevronRight, RotateCcw, Download,
  Link as LinkIcon, Award, BookOpen, Clock, Lightbulb, X,
  ThumbsUp, ThumbsDown, Info, BarChart2, FileSearch, Send, Sparkles,
  Trophy, TrendingDown, Cpu, Database, Compass, Building2, Check,
  Layers, ArrowRight, UserCheck, ShieldCheck, Search, Filter,
  CheckCircle, ChevronDown, RefreshCw
} from 'lucide-react';
import api from '../../services/api';
import { matchKeywords, generateSuggestions, weightedScore, getFitTier } from '../../utils/atsKeywordEngine';
import { matchSkills, parseSkillRequirements } from '../../utils/skillsMatchingEngine';
import { SkillsMatchDisplay } from '../../components/SkillsMatchDisplay';
import { CLIENT_JD_PRESETS } from './clientJdPresets';

/* ─── Types ─────────────────────────────────────────────── */
type ParseStep = { label: string; status: 'pending' | 'running' | 'done' | 'error' };

export interface UniversalRoleRecommendation {
  roleName: string;
  domain: string;
  matchScore: number;
  tier: 'Top Match' | 'Good Fit' | 'Low Fit' | 'Potential Fit' | string;
  matchedSkills: string[];
  missingSkills: string[];
  recommendationReason?: string;
}

export interface MatchedActiveJob {
  _id?: string;
  jrNumber: string;
  jobTitle: string;
  companyName: string;
  location: string;
  experience: string;
  positions: number;
  status?: string;
  matchScore: number;
  tier: string;
  matchedSkills: string[];
  missingSkills: string[];
}

export interface UniversalRoleProfile {
  bestFitRole: string;
  primaryDomain: string;
  confidenceScore: number;
  seniority: {
    level: string;
    years: number;
    label: string;
  };
  topRecommendations: UniversalRoleRecommendation[];
  matchedActiveJobs: MatchedActiveJob[];
}

interface ScoreBreakdown {
  skillMatch:          number;
  experienceRelevance: number;
  roleAlignment:       number;
  educationRelevance:  number;
  resumeQuality:       number;
}

interface ParsedResume {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github?: string;
  summary: string;
  atsScore: number;
  fitTier?: 'Top Match' | 'Good Fit' | 'Low Fit';
  scoreBreakdown?: ScoreBreakdown;
  skills: { name: string; level: 'expert' | 'intermediate' | 'beginner' }[];
  experience: { title: string; company: string; duration: string; points: string[] }[];
  education: { degree: string; institution: string; year: string; gpa?: string }[];
  certifications: string[];
  keywords: { found: string[]; missing: string[] };
  suggestions: { type: 'error' | 'warning' | 'success'; text: string }[];
  structuredFeedback?: {
    strengths:   { type: 'success'; text: string }[];
    weaknesses:  { type: 'error' | 'warning'; text: string }[];
    suggestions: { type: 'warning' | 'success'; text: string }[];
  };
  wordCount: number;
  pageCount: number;
  format: string;
  universalRoleProfile?: UniversalRoleProfile;
}

/* ─── Mock parsed data ───────────────────────────────────── */
const MOCK_RESULT: ParsedResume = {
  name: 'Priya Ramesh',
  email: 'priya.ramesh@email.com',
  phone: '+91 98765 43210',
  location: 'Bangalore, Karnataka',
  linkedin: 'linkedin.com/in/priyaramesh',
  summary:
    'Frontend-focused full-stack developer with 4+ years building scalable web apps. Passionate about clean code, performance, and great user experiences.',
  atsScore: 78,
  skills: [
    { name: 'React.js', level: 'expert' },
    { name: 'TypeScript', level: 'expert' },
    { name: 'Node.js', level: 'intermediate' },
    { name: 'GraphQL', level: 'intermediate' },
    { name: 'PostgreSQL', level: 'intermediate' },
    { name: 'Docker', level: 'beginner' },
    { name: 'AWS', level: 'beginner' },
    { name: 'Tailwind CSS', level: 'expert' },
    { name: 'Git', level: 'expert' },
    { name: 'Jest / Testing', level: 'intermediate' },
  ],
  experience: [
    {
      title: 'Senior Frontend Developer',
      company: 'Infosys Technologies',
      duration: 'Jan 2022 – Present (2.5 yrs)',
      points: [
        'Led migration of legacy Angular app to React, cutting load time by 40%.',
        'Mentored team of 4 junior devs, conducting weekly code reviews.',
        'Implemented CI/CD pipeline using GitHub Actions + Docker.',
      ],
    },
    {
      title: 'Frontend Developer',
      company: 'Wipro Digital',
      duration: 'Jun 2020 – Dec 2021 (1.5 yrs)',
      points: [
        'Built reusable component library with 50+ components.',
        'Integrated REST APIs and managed state with Redux Toolkit.',
      ],
    },
  ],
  education: [
    { degree: 'B.E. Computer Science', institution: 'RV College of Engineering, Bangalore', year: '2020', gpa: '8.4/10' },
  ],
  certifications: ['AWS Certified Cloud Practitioner', 'Meta Front-End Developer Certificate', 'Google UX Design Certificate'],
  keywords: {
    found: ['React', 'TypeScript', 'Node.js', 'REST API', 'CI/CD', 'Agile', 'Git', 'Docker', 'PostgreSQL', 'Testing'],
    missing: ['Kubernetes', 'Microservices', 'Redis', 'System Design', 'gRPC'],
  },
  suggestions: [
    { type: 'error', text: 'No quantified impact in education section — add GPA or projects.' },
    { type: 'warning', text: 'Summary is under 50 words — expand to 80–100 for better ATS scoring.' },
    { type: 'warning', text: 'Missing keywords: Kubernetes, Microservices, Redis — add if applicable.' },
    { type: 'warning', text: 'No GitHub/portfolio link found — recruiters look for it.' },
    { type: 'success', text: 'Contact details are complete and properly formatted.' },
    { type: 'success', text: 'Work experience has strong action verbs and quantified results.' },
    { type: 'success', text: 'Skills section is well-structured and relevant.' },
  ],
  wordCount: 612,
  pageCount: 2,
  format: 'PDF',
  universalRoleProfile: {
    bestFitRole: 'Frontend / Web Developer',
    primaryDomain: 'IT & Software Development',
    confidenceScore: 88,
    seniority: {
      level: 'Mid-Senior',
      years: 4,
      label: 'Mid-Senior Professional (4+ Years)'
    },
    topRecommendations: [
      {
        roleName: 'Frontend / Web Developer',
        domain: 'IT & Software Development',
        matchScore: 88,
        tier: 'Top Match',
        matchedSkills: ['React.js', 'TypeScript', 'Tailwind CSS', 'Git'],
        missingSkills: [],
        recommendationReason: 'Extensive front-end experience with React, TypeScript & responsive styling'
      },
      {
        roleName: 'Full Stack Developer',
        domain: 'IT & Software Development',
        matchScore: 76,
        tier: 'Good Fit',
        matchedSkills: ['React.js', 'TypeScript', 'Node.js', 'Git'],
        missingSkills: ['MongoDB', 'SQL'],
        recommendationReason: 'Solid full stack foundation with React and Node.js REST services'
      },
      {
        roleName: 'QA & Software Test Engineer (Manual / Automation)',
        domain: 'IT & Software Development',
        matchScore: 56,
        tier: 'Good Fit',
        matchedSkills: ['Jest / Testing', 'Git'],
        missingSkills: ['Selenium', 'Postman'],
        recommendationReason: 'Demonstrated experience in unit testing and code review leadership'
      }
    ],
    matchedActiveJobs: [
      {
        jrNumber: 'JR-2024-001',
        jobTitle: 'React / Frontend Engineer',
        companyName: 'TechCorp Global',
        location: 'Bangalore, Hybrid',
        experience: '3-5 Years',
        positions: 3,
        matchScore: 85,
        tier: 'Top Match',
        matchedSkills: ['React.js', 'TypeScript', 'Git'],
        missingSkills: []
      }
    ]
  }
};

const PARSE_STEPS: ParseStep[] = [
  { label: 'Reading file structure', status: 'pending' },
  { label: 'Phrase-aware skill extraction', status: 'pending' },
  { label: 'Detecting contact & location', status: 'pending' },
  { label: 'AI section classifier running', status: 'pending' },
  { label: 'Universal Role & Domain Profiling', status: 'pending' },
  { label: 'Parsing work experience & seniority', status: 'pending' },
  { label: 'Matching White Horse Open JRs', status: 'pending' },
  { label: 'Syncing to ATS Records & Pipeline', status: 'pending' },
];

/* ─── Fit Tier Badge ─────────────────────────────────────── */
function FitTierBadge({ tier }: { tier: 'Top Match' | 'Good Fit' | 'Low Fit' }) {
  const cfg = {
    'Top Match': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', icon: Trophy },
    'Good Fit':  { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', icon: ThumbsUp },
    'Low Fit':   { bg: 'bg-red-100',    text: 'text-red-800',    border: 'border-red-300',    icon: TrendingDown },
  }[tier];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs ${cfg.bg} ${cfg.text} ${cfg.border}`} style={{ fontWeight: 700 }}>
      <Icon className="w-3.5 h-3.5" />
      {tier}
    </span>
  );
}

/* ─── Score Ring ─────────────────────────────────────────── */
function ScoreRing({ score, tier }: { score: number; tier?: string }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 78 ? '#f59e0b' : score >= 52 ? '#22c55e' : '#ef4444';
  const label = score >= 78 ? 'Top Match' : score >= 52 ? 'Good Fit' : 'Low Fit';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
          <circle
            cx="64" cy="64" r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={`${filled} ${circ}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1.2s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span style={{ fontSize: '1.8rem', fontWeight: 800, color }} className="leading-none">{score}</span>
          <span className="text-slate-400 text-xs mt-0.5">/ 100</span>
        </div>
      </div>
      <span style={{ fontWeight: 700, fontSize: '0.78rem', color }}>{label}</span>
      <span className="text-slate-400 text-xs">AI ATS Score</span>
    </div>
  );
}

/* ─── Skill Badge ────────────────────────────────────────── */
function SkillBadge({ name, level }: { name: string; level: string }) {
  const colors = {
    expert: 'bg-green-100 text-green-700 border border-green-200',
    intermediate: 'bg-violet-100 text-violet-700 border border-violet-200',
    beginner: 'bg-slate-100 text-slate-600 border border-slate-200',
  };
  const dots = { expert: 3, intermediate: 2, beginner: 1 };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${colors[level as keyof typeof colors]}`} style={{ fontWeight: 500 }}>
      <span className="flex gap-0.5">
        {[1, 2, 3].map(d => (
          <span key={d} className={`w-1 h-1 rounded-full ${d <= dots[level as keyof typeof dots] ? 'bg-current' : 'bg-current opacity-20'}`} />
        ))}
      </span>
      {name}
    </span>
  );
}

/* ─── Universal Role & JR Matching Hero Card ────────────── */
function UniversalRoleHeroCard({
  profile,
  candidate,
  onNavigateAdd,
  onViewUniversalTab,
}: {
  profile: UniversalRoleProfile;
  candidate: ParsedResume;
  onNavigateAdd: (params: { role?: string; department?: string; jrNumber?: string }) => void;
  onViewUniversalTab: () => void;
}) {
  const [showAllRoles, setShowAllRoles] = useState(false);
  const [jrSearchTerm, setJrSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'TOP' | 'GOOD' | 'POTENTIAL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE'>('ACTIVE');
  const [visibleJrsCount, setVisibleJrsCount] = useState(8);

  const allActiveJobs = profile.matchedActiveJobs || [];

  const uniqueCompanies = useMemo(() => {
    const set = new Set<string>();
    allActiveJobs.forEach(j => {
      if (j.companyName && j.companyName.trim()) set.add(j.companyName.trim());
    });
    return Array.from(set).sort();
  }, [allActiveJobs]);

  const filteredMatchedJobs = useMemo(() => {
    return allActiveJobs.filter(job => {
      // Status filter
      if (statusFilter === 'ACTIVE' && (job.status || '').toLowerCase() === 'closed') {
        return false;
      }
      // Company filter
      if (companyFilter !== 'ALL' && job.companyName !== companyFilter) {
        return false;
      }
      // Tier filter
      if (tierFilter === 'TOP' && job.matchScore < 75) return false;
      if (tierFilter === 'GOOD' && (job.matchScore < 55 || job.matchScore >= 75)) return false;
      if (tierFilter === 'POTENTIAL' && (job.matchScore < 40 || job.matchScore >= 55)) return false;
      // Search term
      if (jrSearchTerm.trim()) {
        const q = jrSearchTerm.toLowerCase();
        const matchesJr = (job.jrNumber || '').toLowerCase().includes(q);
        const matchesTitle = (job.jobTitle || '').toLowerCase().includes(q);
        const matchesCompany = (job.companyName || '').toLowerCase().includes(q);
        const matchesLoc = (job.location || '').toLowerCase().includes(q);
        const matchesSkill = (job.matchedSkills || []).some(s => s.toLowerCase().includes(q));
        if (!matchesJr && !matchesTitle && !matchesCompany && !matchesLoc && !matchesSkill) {
          return false;
        }
      }
      return true;
    });
  }, [allActiveJobs, statusFilter, companyFilter, tierFilter, jrSearchTerm]);

  const topFitJob = useMemo(() => {
    const active = allActiveJobs.filter(j => (j.status || '').toLowerCase() !== 'closed');
    return active.length > 0 && active[0].matchScore >= 70 ? active[0] : null;
  }, [allActiveJobs]);

  const topMatchesCount = useMemo(() => {
    return allActiveJobs.filter(j => j.matchScore >= 75 && (j.status || '').toLowerCase() !== 'closed').length;
  }, [allActiveJobs]);

  const goodFitsCount = useMemo(() => {
    return allActiveJobs.filter(j => j.matchScore >= 55 && j.matchScore < 75 && (j.status || '').toLowerCase() !== 'closed').length;
  }, [allActiveJobs]);

  const domainColors: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    'Procurement & Supply Chain':      { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/30',   glow: 'from-amber-500/20' },
    'Enterprise Systems & ERP':        { bg: 'bg-violet-500/10',  text: 'text-violet-400',  border: 'border-violet-500/30',  glow: 'from-violet-500/20' },
    'BPO / Customer Operations':       { bg: 'bg-cyan-500/10',    text: 'text-cyan-400',    border: 'border-cyan-500/30',    glow: 'from-cyan-500/20' },
    'IT & Software Development':        { bg: 'bg-indigo-500/10',  text: 'text-indigo-400',  border: 'border-indigo-500/30',  glow: 'from-indigo-500/20' },
    'Sales & Business Development':    { bg: 'bg-orange-500/10',  text: 'text-orange-400',  border: 'border-orange-500/30',  glow: 'from-orange-500/20' },
    'Human Resources':                 { bg: 'bg-purple-500/10',  text: 'text-purple-400',  border: 'border-purple-500/30',  glow: 'from-purple-500/20' },
    'Finance & Accounts':              { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'from-emerald-500/20' },
    'Banking & Financial Services':    { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'from-emerald-500/20' },
    'Healthcare & Medical BPO':        { bg: 'bg-rose-500/10',    text: 'text-rose-400',    border: 'border-rose-500/30',    glow: 'from-rose-500/20' },
    'Healthcare BPO & Medical Coding': { bg: 'bg-rose-500/10',    text: 'text-rose-400',    border: 'border-rose-500/30',    glow: 'from-rose-500/20' },
    'Engineering & Manufacturing':     { bg: 'bg-teal-500/10',    text: 'text-teal-400',    border: 'border-teal-500/30',    glow: 'from-teal-500/20' },
    'Engineering & Construction':      { bg: 'bg-yellow-500/10',  text: 'text-yellow-400',  border: 'border-yellow-500/30',  glow: 'from-yellow-500/20' },
    'Design & Creative':               { bg: 'bg-pink-500/10',    text: 'text-pink-400',    border: 'border-pink-500/30',    glow: 'from-pink-500/20' },
    'Content & Communications':        { bg: 'bg-sky-500/10',     text: 'text-sky-400',     border: 'border-sky-500/30',     glow: 'from-sky-500/20' },
    'Digital Marketing':               { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', border: 'border-fuchsia-500/30', glow: 'from-fuchsia-500/20' },
    'General Operations & Admin':      { bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/30',    glow: 'from-blue-500/20' },
  };

  const currentTheme = domainColors[profile.primaryDomain] || {
    bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', glow: 'from-blue-500/20'
  };

  return (
    <div className="space-y-4">
      {/* ── Main Persona Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 sm:p-7 text-white shadow-xl border border-slate-800">
        <div className={`absolute -right-16 -top-16 w-72 h-72 rounded-full bg-gradient-to-br ${currentTheme.glow} to-transparent blur-3xl opacity-40 pointer-events-none`} />

        <div className="relative z-10 space-y-5">
          {/* Top metadata row */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm">
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
                AI Universal Job Role Profiler
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Auto-Synced to ATS Records
              </span>
            </div>

            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              Universal Domain Taxonomy (8 Sectors)
            </span>
          </div>

          {/* Core Profile Card Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left: Role title, Domain & Seniority */}
            <div className="lg:col-span-8 space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                <span>BEST-FIT UNIVERSAL ROLE</span>
                <span className="text-slate-600">•</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${currentTheme.bg} ${currentTheme.text} ${currentTheme.border}`}>
                  {profile.primaryDomain}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                {profile.bestFitRole}
              </h2>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800/90 text-slate-300 border border-slate-700">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                  {profile.seniority?.label || 'Experienced Professional'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800/90 text-slate-300 border border-slate-700">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  {profile.seniority?.years ? `${profile.seniority.years}+ Years Experience` : 'Entry / Fresher'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800/90 text-slate-300 border border-slate-700">
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  Tier: {profile.seniority?.level || 'Mid'}
                </span>
              </div>
            </div>

            {/* Right: Confidence Gauge & Primary Action */}
            <div className="lg:col-span-4 flex flex-col items-center sm:items-end justify-center gap-3 bg-slate-800/50 p-4 rounded-xl border border-slate-700/60">
              <div className="w-full flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-400 font-medium">Fit Confidence</p>
                  <p className="text-2xl font-black text-emerald-400">{profile.confidenceScore}%</p>
                </div>
                <div className="w-14 h-14 relative flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#334155"
                      strokeWidth="3.8"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3.8"
                      strokeDasharray={`${profile.confidenceScore}, 100`}
                    />
                  </svg>
                  <Sparkles className="w-4 h-4 text-emerald-400 absolute" />
                </div>
              </div>

              {/* Tag Candidate to Role */}
              <button
                onClick={() => onNavigateAdd({
                  role: profile.bestFitRole,
                  department: profile.primaryDomain,
                  jrNumber: profile.matchedActiveJobs?.[0]?.jrNumber
                })}
                className="w-full mt-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                Tag Candidate to Pipeline
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Active Open JRs Matching (All 106 JRs in ATS Database) ── */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-slate-800 text-sm font-bold">
                  Matched Across ATS Job Requisitions
                </h3>
                <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {allActiveJobs.length} JRs Evaluated
                </span>
                {topMatchesCount > 0 && (
                  <span className="bg-amber-100 text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    🔥 {topMatchesCount} Top Matches
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                Real-time compatibility ranking of candidate across all open requisitions in White Horse database
              </p>
            </div>
          </div>

          <button
            onClick={onViewUniversalTab}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
          >
            View Universal Breakdown <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Top Recommendation Highlight Banner */}
        {topFitJob && (
          <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
                {topFitJob.matchScore}%
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] uppercase tracking-wide font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    ★ Best Fit Requisition
                  </span>
                  <span className="text-xs font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    {topFitJob.jrNumber}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    {topFitJob.companyName}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-1">
                  {topFitJob.jobTitle}
                </h4>
                <p className="text-xs text-slate-500">
                  📍 {topFitJob.location || 'Bangalore'} • 💼 {topFitJob.experience || 'Exp Req'} • 👥 {topFitJob.positions || 1} Openings
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateAdd({
                jrNumber: topFitJob.jrNumber,
                role: topFitJob.jobTitle,
                department: profile.primaryDomain
              })}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-end sm:self-center"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Tag to {topFitJob.jrNumber} & Proceed
            </button>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={jrSearchTerm}
              onChange={e => setJrSearchTerm(e.target.value)}
              placeholder="Search by JR#, title, client, skill..."
              className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500"
            />
            {jrSearchTerm && (
              <button
                type="button"
                onClick={() => setJrSearchTerm('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
            {/* Company Filter */}
            <select
              value={companyFilter}
              onChange={e => setCompanyFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Clients ({uniqueCompanies.length})</option>
              {uniqueCompanies.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Tier Filter */}
            <select
              value={tierFilter}
              onChange={e => setTierFilter(e.target.value as any)}
              className="text-xs bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Fit Tiers</option>
              <option value="TOP">Top Match (75%+)</option>
              <option value="GOOD">Good Fit (55–74%)</option>
              <option value="POTENTIAL">Potential Fit (40–54%)</option>
            </select>

            {/* Status Filter */}
            <button
              type="button"
              onClick={() => setStatusFilter(prev => prev === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium border transition-colors cursor-pointer ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              {statusFilter === 'ACTIVE' ? 'Active Only' : 'Show All Statuses'}
            </button>
          </div>
        </div>

        {/* Results stats */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>
            Showing <strong className="text-slate-800">{Math.min(visibleJrsCount, filteredMatchedJobs.length)}</strong> of <strong className="text-slate-800">{filteredMatchedJobs.length}</strong> matching JRs
            {filteredMatchedJobs.length !== allActiveJobs.length && ` (filtered from ${allActiveJobs.length} total)`}
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Ranked by multi-vector AI match algorithm
          </span>
        </div>

        {/* JRs Grid */}
        {filteredMatchedJobs.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredMatchedJobs.slice(0, visibleJrsCount).map((job, idx) => {
                const isTop = job.matchScore >= 75;
                const isGood = job.matchScore >= 55 && job.matchScore < 75;
                const isClosed = (job.status || '').toLowerCase() === 'closed';

                return (
                  <div
                    key={job.jrNumber || idx}
                    className={`group border rounded-xl p-4 transition-all flex flex-col justify-between gap-3 shadow-xs ${
                      isTop
                        ? 'border-emerald-200 bg-emerald-50/20 hover:border-emerald-400 hover:bg-emerald-50/40'
                        : isGood
                        ? 'border-blue-200 bg-blue-50/10 hover:border-blue-400 hover:bg-blue-50/30'
                        : 'border-slate-200 bg-slate-50/40 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
                              {job.jrNumber}
                            </span>
                            <span className="text-xs text-slate-600 font-medium">
                              {job.companyName}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                              isClosed
                                ? 'bg-slate-200 text-slate-700'
                                : (job.status === 'On Hold' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')
                            }`}>
                              {job.status || 'Open'}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-800 mt-1 group-hover:text-emerald-700 transition-colors">
                            {job.jobTitle}
                          </h4>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${
                            isTop
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : isGood
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {job.matchScore}% Match
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {job.location || 'Any Location'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3 text-slate-400" />
                          {job.experience || 'Exp Required'}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {job.positions || 1} Position{(job.positions || 1) > 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Matched Skills */}
                      {job.matchedSkills && job.matchedSkills.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <p className="text-[10px] font-bold uppercase text-emerald-700">Matched Skills ({job.matchedSkills.length}):</p>
                          <div className="flex flex-wrap gap-1">
                            {job.matchedSkills.slice(0, 5).map(skill => (
                              <span key={skill} className="px-1.5 py-0.5 rounded bg-emerald-100/70 text-emerald-800 text-[10px] font-semibold">
                                ✓ {skill}
                              </span>
                            ))}
                            {job.matchedSkills.length > 5 && (
                              <span className="text-[10px] text-slate-400 font-medium self-center">
                                +{job.matchedSkills.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Missing Skills */}
                      {job.missingSkills && job.missingSkills.length > 0 && (
                        <div className="space-y-1 pt-0.5">
                          <p className="text-[10px] font-bold uppercase text-amber-700">Gaps to Evaluate ({job.missingSkills.length}):</p>
                          <div className="flex flex-wrap gap-1">
                            {job.missingSkills.slice(0, 4).map(skill => (
                              <span key={skill} className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-medium border border-amber-200/60">
                                + {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400">
                        {isClosed ? 'Mandate Closed' : (job.status === 'On Hold' ? 'Mandate On Hold' : 'Open Active JR')}
                      </span>
                      <button
                        onClick={() => onNavigateAdd({
                          jrNumber: job.jrNumber,
                          role: job.jobTitle,
                          department: profile.primaryDomain
                        })}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Tag to {job.jrNumber} & Proceed
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination / Expand controls */}
            <div className="flex items-center justify-center gap-3 pt-2">
              {visibleJrsCount < filteredMatchedJobs.length && (
                <>
                  <button
                    type="button"
                    onClick={() => setVisibleJrsCount(prev => Math.min(prev + 8, filteredMatchedJobs.length))}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Show Next 8 JRs ({filteredMatchedJobs.length - visibleJrsCount} remaining)
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibleJrsCount(filteredMatchedJobs.length)}
                    className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Show All {filteredMatchedJobs.length} JRs
                  </button>
                </>
              )}
              {visibleJrsCount > 8 && (
                <button
                  type="button"
                  onClick={() => setVisibleJrsCount(8)}
                  className="px-3 py-2 text-slate-500 hover:text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Collapse to Top 8
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
            No JRs match your current filter query "{jrSearchTerm}". Try clearing filters.
          </div>
        )}
      </div>

      {/* ── Top Alternative Universal Roles ── */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-slate-800 text-sm font-bold flex items-center gap-2">
                Top Recommended Universal Job Roles
              </h3>
              <p className="text-slate-400 text-xs">Alternative positions candidate is qualified for across universal recruitment domains</p>
            </div>
          </div>
          {profile.topRecommendations?.length > 3 && (
            <button
              onClick={() => setShowAllRoles(!showAllRoles)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
            >
              {showAllRoles ? 'Show Less' : `View All (${profile.topRecommendations.length})`}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(showAllRoles ? profile.topRecommendations : profile.topRecommendations?.slice(0, 3))?.map((rec, i) => (
            <div
              key={rec.roleName || i}
              className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3 bg-white hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {rec.domain}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    rec.matchScore >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {rec.matchScore}% Match
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-800 leading-snug">
                  {rec.roleName}
                </h4>

                {rec.recommendationReason && (
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {rec.recommendationReason}
                  </p>
                )}

                {rec.matchedSkills && rec.matchedSkills.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Core Strengths</p>
                    <div className="flex flex-wrap gap-1">
                      {rec.matchedSkills.slice(0, 3).map(skill => (
                        <span key={skill} className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold">
                          ✓ {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => onNavigateAdd({
                  role: rec.roleName,
                  department: rec.domain
                })}
                className="w-full py-1.5 px-3 border border-slate-200 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/40 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                Target for this Role <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Universal Role Persona Detailed Tab ────────────────── */
function UniversalRoleDetailsTab({
  profile,
  candidate,
  onNavigateAdd,
}: {
  profile: UniversalRoleProfile;
  candidate: ParsedResume;
  onNavigateAdd: (params: { role?: string; department?: string; jrNumber?: string }) => void;
}) {
  const DOMAINS_LIST = [
    { name: 'Procurement & Supply Chain', desc: 'Procurement, Sourcing, Purchase Orders (PO), Vendor Management & SCM', icon: Briefcase },
    { name: 'Enterprise Systems & ERP', desc: 'SAP S/4 HANA, SAP MM, FICO, SD, ABAP & ERP Implementation', icon: Cpu },
    { name: 'IT & Software Development', desc: 'Frontend, Backend, Full Stack, QA, DevOps, Cloud & Data Analysis', icon: Cpu },
    { name: 'BPO / Customer Operations', desc: 'Voice, Non-Voice Chat, Technical Support & Telesales', icon: Phone },
    { name: 'Sales & Business Development', desc: 'Inside Sales, B2B Lead Gen & Field Sales Executives', icon: TrendingUp },
    { name: 'Human Resources', desc: 'IT/Non-IT Recruitment, Talent Acquisition & HR Operations', icon: UserCheck },
    { name: 'Finance & Accounts', desc: 'Tally Accounting, Bookkeeping & Financial Analysis', icon: Briefcase },
    { name: 'Engineering & Manufacturing', desc: 'Mechanical, Electrical, Civil & Industrial Engineering', icon: Layers },
    { name: 'Healthcare & Medical BPO', desc: 'US Healthcare AR Callers, Billing & Medical Coding', icon: ShieldCheck },
    { name: 'General Operations & Admin', desc: 'Back Office, MIS Reporting & Office Coordination', icon: Layers },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-3">
        <Compass className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="text-indigo-950 font-bold">Universal Talent Classification Engine</p>
          <p className="text-indigo-800 text-xs mt-0.5">
            This candidate has been mapped across White Horse's universal cross-industry job taxonomy. Classified role: <strong className="font-bold">{profile.bestFitRole}</strong> in <strong className="font-bold">{profile.primaryDomain}</strong>.
          </p>
        </div>
      </div>

      {/* Seniority & Experience Breakdown */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
        <h3 className="text-slate-800 text-sm font-bold mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" /> Seniority & Experience Assessment
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white p-3.5 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-400 font-medium">Classified Seniority</p>
            <p className="text-base font-bold text-slate-800 mt-0.5">{profile.seniority?.level || 'Mid'}</p>
            <p className="text-[11px] text-slate-500 mt-1">{profile.seniority?.label}</p>
          </div>
          <div className="bg-white p-3.5 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-400 font-medium">Relevant Experience</p>
            <p className="text-base font-bold text-slate-800 mt-0.5">
              {profile.seniority?.years ? `${profile.seniority.years} Years` : 'Fresher / Entry'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Calculated from chronological milestones</p>
          </div>
          <div className="bg-white p-3.5 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-400 font-medium">Confidence Rating</p>
            <p className="text-base font-bold text-emerald-600 mt-0.5">{profile.confidenceScore}%</p>
            <p className="text-[11px] text-slate-500 mt-1">Multi-vector keyword & tenure match</p>
          </div>
        </div>
      </div>

      {/* Universal Domain Compatibility Grid */}
      <div>
        <h3 className="text-slate-800 text-sm font-bold mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-500" /> Universal Domain Compatibility Matrix
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {DOMAINS_LIST.map(d => {
            const isPrimary = profile.primaryDomain.toLowerCase().includes(d.name.toLowerCase()) ||
                              d.name.toLowerCase().includes(profile.primaryDomain.toLowerCase());
            const Icon = d.icon;
            return (
              <div
                key={d.name}
                className={`p-4 rounded-xl border transition-all ${
                  isPrimary
                    ? 'bg-indigo-50/60 border-indigo-200 shadow-xs'
                    : 'bg-white border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isPrimary ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${isPrimary ? 'text-indigo-900' : 'text-slate-800'}`}>
                        {d.name}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{d.desc}</p>
                    </div>
                  </div>
                  {isPrimary && (
                    <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full">
                      Primary Fit
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Skill Gap Roadmap */}
      <div>
        <h3 className="text-slate-800 text-sm font-bold mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-slate-500" /> Skill Capability & Gap Overview
        </h3>
        <div className="space-y-3">
          {profile.topRecommendations?.map(rec => (
            <div key={rec.roleName} className="p-4 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm font-bold text-slate-800">{rec.roleName}</p>
                <span className="text-xs font-bold text-indigo-600">{rec.matchScore}% Compatibility</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <p className="text-[11px] font-semibold text-emerald-700 mb-1">Demonstrated Skills ({rec.matchedSkills?.length || 0}):</p>
                  <div className="flex flex-wrap gap-1">
                    {rec.matchedSkills && rec.matchedSkills.length > 0 ? (
                      rec.matchedSkills.map(s => (
                        <span key={s} className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-xs font-medium">
                          ✓ {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">No direct overlap</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-amber-700 mb-1">Growth Gaps ({rec.missingSkills?.length || 0}):</p>
                  <div className="flex flex-wrap gap-1">
                    {rec.missingSkills && rec.missingSkills.length > 0 ? (
                      rec.missingSkills.map(s => (
                        <span key={s} className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-xs font-medium">
                          + {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-emerald-600 font-medium">Full skill requirement satisfied</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Helper to enrich/score profile against all 106 ATS JRs ─── */
function enrichProfileWithAllJrs(
  profile: UniversalRoleProfile,
  allJrs: any[],
  resume: ParsedResume
): UniversalRoleProfile {
  if (!allJrs || allJrs.length === 0) return profile;

  const candText = [
    resume.name,
    resume.summary,
    resume.skills?.map(s => s.name).join(' '),
    resume.experience?.map(e => `${e.title} ${e.company} ${e.points?.join(' ')}`).join(' '),
    resume.education?.map(e => `${e.degree} ${e.institution}`).join(' ')
  ].join(' ').toLowerCase();

  const candSkills = (resume.skills || []).map(s => s.name.toLowerCase());
  const backendJobMap = new Map((profile.matchedActiveJobs || []).map(j => [j.jrNumber, j]));

  const allScored: MatchedActiveJob[] = allJrs.map(job => {
    if (backendJobMap.has(job.jrNumber)) {
      const existing = backendJobMap.get(job.jrNumber)!;
      return {
        ...existing,
        status: job.status || existing.status || 'Open'
      };
    }

    // Client-side score fallback
    const titleLower = (job.jobTitle || '').toLowerCase();
    const rawSkills: string[] = Array.isArray(job.skills) && job.skills.length > 0
      ? job.skills
      : (job.jobTitle || '').split(/[\/\\,\-\|]+/).map((t: string) => t.trim()).filter((t: string) => t.length > 2 && !['and', 'the', 'for', 'with', 'from'].includes(t.toLowerCase()));

    let score = 20;
    const titleWords = titleLower.split(/[\s,–\-\/()]+/).filter((w: string) => w.length > 2 && !['and', 'the', 'for', 'with', 'from'].includes(w));
    const matchedWords = titleWords.filter((w: string) => candText.includes(w) || profile.bestFitRole.toLowerCase().includes(w));

    if (candText.includes(titleLower) || titleLower.includes(profile.bestFitRole.toLowerCase())) {
      score += 35;
    } else if (titleWords.length > 0 && matchedWords.length > 0) {
      score += Math.round((matchedWords.length / titleWords.length) * 32);
    }

    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];
    rawSkills.forEach((s: string) => {
      const sl = s.toLowerCase();
      if (candSkills.some(cs => cs.includes(sl) || sl.includes(cs)) || candText.includes(sl)) {
        matchedSkills.push(s);
      } else {
        missingSkills.push(s);
      }
    });

    if (rawSkills.length > 0) {
      score += Math.round((matchedSkills.length / rawSkills.length) * 28);
    }

    const finalScore = Math.min(98, Math.max(20, score));
    return {
      _id: job._id,
      jrNumber: job.jrNumber || 'JR-N/A',
      jobTitle: job.jobTitle || 'Job Title',
      companyName: job.companyName || 'White Horse Client',
      location: job.location || 'Bangalore',
      experience: job.experience || 'Any',
      positions: job.positions || 1,
      status: job.status || 'Open',
      matchScore: finalScore,
      tier: finalScore >= 75 ? 'Top Match' : (finalScore >= 55 ? 'Good Fit' : (finalScore >= 40 ? 'Potential Fit' : 'Low Fit')),
      matchedSkills: matchedSkills.slice(0, 10),
      missingSkills: missingSkills.slice(0, 8)
    };
  });

  allScored.sort((a, b) => {
    if (a.status === 'Closed' && b.status !== 'Closed') return 1;
    if (b.status === 'Closed' && a.status !== 'Closed') return -1;
    return b.matchScore - a.matchScore;
  });

  return {
    ...profile,
    matchedActiveJobs: allScored
  };
}

/* ─── Main Page ──────────────────────────────────────────── */
export function ResumeScanPage() {
  const navigate = useNavigate();
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [steps, setSteps] = useState<ParseStep[]>(PARSE_STEPS.map(s => ({ ...s })));
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ParsedResume | null>(null);
  const [jobDesc, setJobDesc] = useState('');
  const [showJD, setShowJD] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'keywords' | 'suggestions' | 'skills' | 'universal'>('overview');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timeoutsRef = useRef<number[]>([]);

  // 106 ATS JRs State
  const [existingJrs, setExistingJrs] = useState<any[]>([]);
  const [loadingJrs, setLoadingJrs] = useState(false);
  const [targetMode, setTargetMode] = useState<'all' | 'specific' | 'preset'>('all');
  const [selectedJr, setSelectedJr] = useState<any | null>(null);
  const [jrSearchQuery, setJrSearchQuery] = useState('');

  // Fetch all 106 JRs on mount
  useEffect(() => {
    let isMounted = true;
    const fetchAllJobs = async () => {
      try {
        setLoadingJrs(true);
        const res = await api.getJobs({ limit: '300' });
        if (!isMounted) return;
        const jobs = res?.jobs || [];
        setExistingJrs(jobs);
      } catch (err) {
        console.warn('Failed to load ATS jobs for scanner:', err);
      } finally {
        if (isMounted) setLoadingJrs(false);
      }
    };
    fetchAllJobs();
    return () => { isMounted = false; };
  }, []);

  const filteredJrsForSelect = useMemo(() => {
    if (!jrSearchQuery.trim()) return existingJrs.slice(0, 30);
    const q = jrSearchQuery.toLowerCase();
    return existingJrs.filter(j =>
      (j.jrNumber || '').toLowerCase().includes(q) ||
      (j.jobTitle || '').toLowerCase().includes(q) ||
      (j.companyName || '').toLowerCase().includes(q) ||
      (j.location || '').toLowerCase().includes(q)
    );
  }, [existingJrs, jrSearchQuery]);

  const handleSelectSpecificJr = (jr: any) => {
    setSelectedJr(jr);
    const jdText = [
      `Job Title: ${jr.jobTitle}`,
      `Company: ${jr.companyName}`,
      `Location: ${jr.location || ''}`,
      `Experience: ${jr.experience || ''}`,
      jr.description ? `Description: ${jr.description}` : '',
      jr.requirements ? `Requirements: ${jr.requirements}` : '',
      jr.skills?.length ? `Skills Required: ${jr.skills.join(', ')}` : '',
    ].filter(Boolean).join('\n\n');
    setJobDesc(jdText);
    if (jr.skills?.length) {
      setRequiredSkillsInput(jr.skills.join(', '));
    } else {
      setRequiredSkillsInput('');
    }
  };

  // Skills matching state
  const [requiredSkillsInput, setRequiredSkillsInput] = useState('');
  const [skillsMatchResult, setSkillsMatchResult] = useState<any>(null);

  // Email modal state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleNavigateAdd = ({ role, department, jrNumber }: { role?: string; department?: string; jrNumber?: string }) => {
    if (!result) return;
    const params = new URLSearchParams();
    if (result.name) params.set('name', result.name);
    if (result.email) params.set('email', result.email);
    if (result.phone) params.set('phone', result.phone);
    if (role) params.set('role', role);
    if (department) params.set('department', department);
    if (jrNumber) params.set('jrNumber', jrNumber);
    if (result.universalRoleProfile?.seniority?.years) {
      params.set('experience', String(result.universalRoleProfile.seniority.years));
    }
    navigate(`/recruiter/add?${params.toString()}`);
  };


  /* parse via API */
  const startParsing = useCallback(async (f: File) => {
    // Clear any existing timeouts
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    setFile(f);
    setParsing(true);
    setResult(null);
    const fresh = PARSE_STEPS.map(s => ({ ...s, status: 'pending' as const }));
    setSteps(fresh);

    // Animate steps while API processes
    fresh.forEach((_, i) => {
      const t = window.setTimeout(() => {
        setSteps(prev => prev.map((s, idx) =>
          idx === i ? { ...s, status: 'running' } :
          idx < i ? { ...s, status: 'done' } : s
        ));
      }, i * 400);
      timeoutsRef.current.push(t);
    });

    try {
      const formData = new FormData();
      formData.append('resume', f);
      if (jobDesc) formData.append('jobDescription', jobDesc);
      
      // Add a safety timeout for the API call
      const scanPromise = api.scanResume(formData);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Scanning process timed out. Please try a smaller file.')), 45000)
      );

      let data = await Promise.race([scanPromise, timeoutPromise]) as any;
      const parsedResult: ParsedResume = data.result || data || MOCK_RESULT;

      // Stop all animations
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];

      // Client-side enhancement if needed
      if (jobDesc && parsedResult.name && !parsedResult.structuredFeedback) {
        try {
          const resumeText = [
            parsedResult.name,
            parsedResult.summary,
            parsedResult.skills?.map(s => s.name).join(' ') || '',
            parsedResult.experience?.map(e => `${e.title} ${e.company} ${e.points?.join(' ') || ''}`).join(' ') || '',
            parsedResult.education?.map(e => `${e.degree} ${e.institution}`).join(' ') || '',
            parsedResult.certifications?.join(' ') || '',
          ].join(' ');

          const enhancedKeywords = matchKeywords(resumeText, jobDesc);
          parsedResult.keywords = {
            found:   enhancedKeywords.found.map(kw => kw.original),
            missing: enhancedKeywords.missing.map(kw => kw.original),
          };

          const total = enhancedKeywords.found.length + enhancedKeywords.missing.length;
          const skillPct = total > 0 ? Math.round((enhancedKeywords.found.length / total) * 100) : 40;
          const expScore = Math.min(100, (parsedResult.experience?.length || 0) * 22);
          const eduScore = (parsedResult.education?.length || 0) > 0 ? 75 : 30;
          const quality = [parsedResult.email, parsedResult.phone, parsedResult.location].filter(Boolean).length >= 2 ? 80 : 50;
          
          const bd: ScoreBreakdown = {
            skillMatch: skillPct,
            experienceRelevance: expScore,
            roleAlignment: 50,
            educationRelevance: eduScore,
            resumeQuality: quality,
          };
          parsedResult.scoreBreakdown = bd;
          parsedResult.atsScore = weightedScore(bd);
          parsedResult.fitTier = getFitTier(parsedResult.atsScore);
          parsedResult.suggestions = generateSuggestions(enhancedKeywords, resumeText, jobDesc);
        } catch (e) {
          console.warn('Frontend enhancement failed, using raw backend result', e);
        }
      }

      if (!parsedResult.fitTier) {
        parsedResult.fitTier = getFitTier(parsedResult.atsScore || 0);
      }

      // Ensure universalRoleProfile is present
      if (!parsedResult.universalRoleProfile && parsedResult.skills) {
        const firstTitle = parsedResult.experience?.[0]?.title || 'Universal Candidate';
        parsedResult.universalRoleProfile = {
          bestFitRole: firstTitle,
          primaryDomain: 'Operations & Administration',
          confidenceScore: Math.min(95, Math.max(65, parsedResult.atsScore || 75)),
          seniority: {
            level: (parsedResult.experience?.length || 0) > 3 ? 'Mid-Senior' : 'Junior',
            years: Math.max(1, (parsedResult.experience?.length || 1) * 2),
            label: `${(parsedResult.experience?.length || 0) > 3 ? 'Mid-Senior' : 'Junior'} Professional`
          },
          topRecommendations: [
            {
              roleName: firstTitle,
              domain: 'Operations & Administration',
              matchScore: parsedResult.atsScore || 75,
              tier: 'Top Match',
              matchedSkills: parsedResult.skills.slice(0, 4).map(s => s.name),
              missingSkills: [],
              recommendationReason: 'Identified from experience history and detected core skills'
            }
          ],
          matchedActiveJobs: []
        };
      }

      // Enrich with all 106 ATS JRs
      if (parsedResult.universalRoleProfile && existingJrs.length > 0) {
        parsedResult.universalRoleProfile = enrichProfileWithAllJrs(
          parsedResult.universalRoleProfile,
          existingJrs,
          parsedResult
        );
      }

      setSteps(prev => prev.map(s => ({ ...s, status: 'done' as const })));
      setResult(parsedResult);
    } catch (err: any) {
      console.error('Resume scan failed:', err);
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      
      setSteps(prev => {
        const next = [...prev];
        const runningIdx = next.findIndex(s => s.status === 'running');
        if (runningIdx !== -1) {
          next[runningIdx] = { ...next[runningIdx], status: 'error' };
        } else {
          // If none are running, mark the last one or the first pending one
          const pendingIdx = next.findIndex(s => s.status === 'pending');
          if (pendingIdx !== -1) next[pendingIdx] = { ...next[pendingIdx], status: 'error' };
        }
        return next;
      });
      
      // Optionally show an error alert or feedback
    } finally {
      setParsing(false);
    }
  }, [jobDesc, existingJrs]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) startParsing(f);
  }, [startParsing]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) startParsing(f);
  };

  const reset = () => {
    setFile(null); setParsing(false); setResult(null);
    setSteps(PARSE_STEPS.map(s => ({ ...s, status: 'pending' })));
    setActiveTab('overview');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendEmail = async () => {
    if (!result || !emailTemplate || !emailSubject || !emailBody) return;
    setEmailSending(true);
    try {
      // Send email with resume data
      const res = await api.sendCandidateEmail({
        candidateName: result.name,
        templateType: emailTemplate,
        customSubject: emailSubject,
        customBody: emailBody,
      });
      setEmailResult({ ok: true, msg: `Email sent to ${result.email}` });
      setTimeout(() => {
        setShowEmailModal(false);
        setEmailTemplate('');
        setEmailSubject('');
        setEmailBody('');
        setEmailResult(null);
      }, 1500);
    } catch (err: any) {
      setEmailResult({ ok: false, msg: err.message || 'Failed to send email' });
    } finally {
      setEmailSending(false);
    }
  };

  // Handle skills matching
  const handleEvaluateSkills = () => {
    if (!result || !requiredSkillsInput.trim()) {
      return;
    }

    try {
      // Parse required skills from textarea input (supports "React (expert)", "Node - intermediate", etc.)
      const parsedRequired = parseSkillRequirements(requiredSkillsInput);

      // Convert result.skills to the format expected by matchSkills
      const candidateSkills = result.skills.map(s => ({
        name: s.name,
        level: s.level
      }));

      // Calculate match result
      const matchResult = matchSkills(parsedRequired, candidateSkills);

      setSkillsMatchResult(matchResult);
      setActiveTab('skills');
    } catch (err) {
      console.error('Skills matching error:', err);
      setSkillsMatchResult(null);
    }
  };

  const completedSteps = steps.filter(s => s.status === 'done').length;
  const progress = Math.round((completedSteps / steps.length) * 100);

  const suggestionIcon = (type: string) =>
    type === 'error' ? <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" /> :
    type === 'warning' ? <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" /> :
    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />;

  const suggestionBg = (type: string) =>
    type === 'error' ? 'bg-red-50 border-red-100' :
    type === 'warning' ? 'bg-amber-50 border-amber-100' :
    'bg-emerald-50 border-emerald-100';

  /* ── Render ── */
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-slate-800" style={{ fontWeight: 700, fontSize: '1.4rem' }}>
            Resume ATS Scanner
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Upload a resume to extract information and calculate ATS compatibility score
          </p>
        </div>
        {(file || result) && (
          <div className="flex items-center gap-2.5">
            {result && (
              <Link
                to="/recruiter/ats-database"
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 transition-all shadow-sm"
              >
                <Database className="w-4 h-4" />
                View in ATS Database
              </Link>
            )}
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Scan Another
            </button>
          </div>
        )}
      </div>

      {/* ── Upload Zone (idle) ── */}
      {!file && !parsing && !result && (
        <div className="space-y-4">
          {/* ── ATS 106 JRs Scanner Target Mode Selector ── */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold text-slate-900">ATS Job Matching Mode</h2>
                    <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] px-2 py-0.5 rounded-full font-bold">
                      {loadingJrs ? 'Loading JRs...' : `${existingJrs.length || 106} Active JRs Connected`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Choose how this candidate will be matched against White Horse requisitions</p>
                </div>
              </div>

              {/* Mode Tabs */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setTargetMode('all');
                    setSelectedJr(null);
                    setJobDesc('');
                    setRequiredSkillsInput('');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    targetMode === 'all'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ⚡ Auto-Match All ({existingJrs.length || 106} JRs)
                </button>

                <button
                  type="button"
                  onClick={() => setTargetMode('specific')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    targetMode === 'specific'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🎯 Pick Specific JR {selectedJr ? `(${selectedJr.jrNumber})` : ''}
                </button>

                <button
                  type="button"
                  onClick={() => setTargetMode('preset')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    targetMode === 'preset'
                      ? 'bg-white text-violet-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📋 Custom JD / Presets
                </button>
              </div>
            </div>

            {/* Mode 1: Auto-Match All Banner */}
            {targetMode === 'all' && (
              <div className="bg-gradient-to-r from-indigo-50/80 to-blue-50/80 border border-indigo-100 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <Compass className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <span className="text-slate-700">
                    <strong className="text-indigo-900 font-bold">Multi-JR Intelligence Active:</strong> When you upload a resume, the scanner will automatically evaluate and rank candidate compatibility across all <strong className="text-indigo-900">{existingJrs.length || 106} open JRs</strong> (Infosys, UnionSys, White Horse clients & more) and highlight the best fits.
                  </span>
                </div>
                <span className="hidden md:inline-block px-2.5 py-1 bg-indigo-100 text-indigo-800 text-[11px] font-bold rounded-md whitespace-nowrap">
                  106 Mandates Synced
                </span>
              </div>
            )}

            {/* Mode 2: Specific JR Selector */}
            {targetMode === 'specific' && (
              <div className="space-y-3">
                {/* Selected JR Preview if chosen */}
                {selectedJr ? (
                  <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold bg-white text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded shadow-2xs">
                          {selectedJr.jrNumber}
                        </span>
                        <span className="text-xs font-semibold text-emerald-800">
                          {selectedJr.companyName}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          selectedJr.status === 'Open' ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {selectedJr.status || 'Active'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">
                        {selectedJr.jobTitle}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        <span>📍 {selectedJr.location || 'Bangalore'}</span>
                        <span>💼 {selectedJr.experience || 'Exp Req'}</span>
                        <span>👥 {selectedJr.positions || 1} Positions</span>
                        {selectedJr.skills?.length > 0 && (
                          <span>⚡ Skills: {selectedJr.skills.slice(0, 4).join(', ')}{selectedJr.skills.length > 4 ? '...' : ''}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => setSelectedJr(null)}
                        className="text-xs px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Change JR
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedJr(null);
                          setJobDesc('');
                          setRequiredSkillsInput('');
                          setTargetMode('all');
                        }}
                        className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Reset to All JRs
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5 text-slate-400" />
                        Select Target Job Requisition (Search from {existingJrs.length || 106} JRs):
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Click any JR below to benchmark candidate directly
                      </span>
                    </div>

                    {/* Search Box */}
                    <div className="relative">
                      <input
                        type="text"
                        value={jrSearchQuery}
                        onChange={e => setJrSearchQuery(e.target.value)}
                        placeholder="Search e.g. 247706, JRWH0013, SAP, Credit Risk, Infosys, Bangalore..."
                        className="w-full pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white transition-all"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      {jrSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setJrSearchQuery('')}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Filtered JR List in a scrollable container */}
                    <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white shadow-2xs">
                      {filteredJrsForSelect.length > 0 ? (
                        filteredJrsForSelect.map(jr => (
                          <div
                            key={jr._id || jr.jrNumber}
                            onClick={() => handleSelectSpecificJr(jr)}
                            className="p-2.5 hover:bg-emerald-50/50 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-bold text-slate-800 bg-slate-100 px-1.5 py-0.2 rounded group-hover:bg-emerald-100 group-hover:text-emerald-900 transition-colors">
                                  {jr.jrNumber}
                                </span>
                                <span className="text-xs font-semibold text-slate-600 truncate">
                                  {jr.companyName}
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                                  jr.status === 'Open' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                }`}>
                                  {jr.status || 'Active'}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-700">
                                {jr.jobTitle}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                📍 {jr.location || 'Bangalore'} • 💼 {jr.experience || 'Exp Req'} • 👥 {jr.positions || 1} Openings
                              </p>
                            </div>

                            <button
                              type="button"
                              className="flex-shrink-0 px-2.5 py-1 bg-emerald-50 group-hover:bg-emerald-600 text-emerald-700 group-hover:text-white rounded-lg text-xs font-bold transition-all"
                            >
                              Select JR
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-400">
                          No matching JRs found for "{jrSearchQuery}"
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mode 3: Preset / Custom JD */}
            {targetMode === 'preset' && (
              <div className="space-y-3 pt-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Target Client Job Description (Custom or Mandate Preset)
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-500 font-medium">Quick Presets:</span>
                    <select
                      onChange={e => {
                        const selected = CLIENT_JD_PRESETS.find(p => p.id === e.target.value);
                        if (selected) {
                          setJobDesc(selected.text);
                          setRequiredSkillsInput(selected.skills.join(', '));
                        }
                      }}
                      defaultValue=""
                      className="text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-green-500 max-w-xs cursor-pointer"
                    >
                      <option value="" disabled>Select Client Mandate Preset...</option>
                      <optgroup label="Finance & Procurement Operations">
                        <option value="p2p">P2P – Invoice & Payment Processing (5–14 Yrs)</option>
                        <option value="o2c">O2C – Billing & Revenue Management (5–14 Yrs)</option>
                        <option value="procurement_l1">Procurement Operations & L1 Support (2-4 Yrs)</option>
                      </optgroup>
                      <optgroup label="Human Resources & Talent Acquisition">
                        <option value="hr_recruiter">HR Recruiter (Bangalore & Hyderabad)</option>
                      </optgroup>
                      <optgroup label="SAP & Enterprise ERP">
                        <option value="sap_abap">SAP ABAP Consultant with S/4HANA (2+ Yrs)</option>
                        <option value="sap_fico">SAP FICO Consultant (2+ Yrs)</option>
                        <option value="sap_sd">SAP SD Consultant – OTC (2+ Yrs)</option>
                        <option value="sap_ewm">SAP EWM Consultant (4+ Yrs)</option>
                        <option value="sap_ehs">SAP EHS Consultant (4+ Yrs)</option>
                        <option value="sap_bpc">SAP BPC Consultant (4+ Yrs)</option>
                        <option value="sap_pp_qm">SAP PP / QM Consultant (4+ Yrs)</option>
                        <option value="oracle_ebs">Oracle EBS Finance / SCM Consultant (4+ Yrs)</option>
                      </optgroup>
                      <optgroup label="IT, Cloud & Operations">
                        <option value="servicenow">ServiceNow Developer with Testing (2+ Yrs)</option>
                        <option value="monitoring">Monitoring Operations Specialist (24x7 NOC)</option>
                        <option value="dotnet">.NET / C# Full Stack Developer (2-4 Yrs)</option>
                      </optgroup>
                    </select>
                    {jobDesc && (
                      <button
                        type="button"
                        onClick={() => { setJobDesc(''); }}
                        className="text-xs text-red-500 hover:text-red-700 underline font-medium cursor-pointer"
                      >
                        Clear JD
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  value={jobDesc}
                  onChange={e => setJobDesc(e.target.value)}
                  rows={4}
                  placeholder="Paste the job description here or select a quick client mandate preset above..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-indigo-400 transition-colors resize-none font-mono leading-relaxed"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{jobDesc ? `${jobDesc.split(/\s+/).filter(Boolean).length} words loaded` : 'No JD loaded'}</span>
                  <span className="text-slate-500">Auto-identifies candidate match & missing skills against mandate</span>
                </div>
              </div>
            )}
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative cursor-pointer border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4 transition-all ${
              dragOver
                ? 'border-green-400 bg-green-50'
                : 'border-slate-200 bg-white hover:border-green-300 hover:bg-slate-50'
            }`}
          >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${dragOver ? 'bg-green-100' : 'bg-slate-100'}`}>
              <Upload className={`w-8 h-8 transition-colors ${dragOver ? 'text-green-600' : 'text-slate-400'}`} />
            </div>
            <div className="text-center">
              <p className="text-slate-700" style={{ fontWeight: 600, fontSize: '1rem' }}>
                {dragOver ? 'Drop the resume here' : 'Drag & drop resume to scan'}
              </p>
              <p className="text-slate-400 text-sm mt-1">
                or <span className="text-green-600 underline">browse files</span> from your computer
              </p>
            </div>
            <p className="text-slate-400 text-xs">PDF, DOCX (Max 10MB)</p>
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFile} className="hidden" />
          </div>

          {/* Feature Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: User, label: 'Contact Extraction', color: 'text-green-600 bg-green-50' },
              { icon: Zap, label: 'Skills Detection', color: 'text-violet-600 bg-violet-50' },
              { icon: Target, label: 'ATS Score', color: 'text-amber-600 bg-amber-50' },
              { icon: Lightbulb, label: 'Improvement Tips', color: 'text-emerald-600 bg-emerald-50' },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-2.5 shadow-sm">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color.split(' ')[1]}`}>
                  <Icon className={`w-4 h-4 ${color.split(' ')[0]}`} />
                </div>
                <span className="text-slate-700 text-xs" style={{ fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Parsing Progress ── */}
      {(parsing || (file && !result)) && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
          {/* File info bar */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-700 text-sm truncate" style={{ fontWeight: 500 }}>{file?.name}</p>
              <p className="text-slate-400 text-xs">{file ? (file.size / 1024).toFixed(1) + ' KB' : ''}</p>
            </div>
            {parsing && <Loader2 className="w-4 h-4 text-green-500 animate-spin flex-shrink-0" />}
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm" style={{ fontWeight: 500 }}>Parsing resume...</span>
              <span className="text-green-600 text-sm" style={{ fontWeight: 600 }}>{progress}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  step.status === 'running' ? 'bg-green-50 border border-green-100' :
                  step.status === 'done' ? 'bg-emerald-50 border border-emerald-100' :
                  'bg-slate-50 border border-slate-100'
                }`}
              >
                {step.status === 'running' ? (
                  <Loader2 className="w-4 h-4 text-green-500 animate-spin flex-shrink-0" />
                ) : step.status === 'done' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-200 flex-shrink-0" />
                )}
                <span className={`text-xs ${
                  step.status === 'running' ? 'text-green-700' :
                  step.status === 'done' ? 'text-emerald-700' : 'text-slate-400'
                }`} style={{ fontWeight: step.status !== 'pending' ? 500 : 400 }}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {result && (
        <div className="space-y-5">
          {/* Score + Meta Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Score Card */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 flex flex-col items-center justify-center gap-3">
              <ScoreRing score={result.atsScore} tier={result.fitTier} />
              {result.fitTier && <FitTierBadge tier={result.fitTier} />}
              <div className="flex gap-3 mt-1">
                <div className="text-center">
                  <p className="text-slate-800 text-sm" style={{ fontWeight: 700 }}>{result.keywords.found.length}</p>
                  <p className="text-slate-400 text-xs">Skills Found</p>
                </div>
                <div className="w-px bg-slate-100" />
                <div className="text-center">
                  <p className="text-slate-800 text-sm" style={{ fontWeight: 700 }}>{result.keywords.missing.length}</p>
                  <p className="text-slate-400 text-xs">Missing</p>
                </div>
              </div>
            </div>

            {/* Candidate Card */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 space-y-3 md:col-span-2">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white" style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                    {result.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <p className="text-slate-800" style={{ fontWeight: 700, fontSize: '1rem' }}>{result.name}</p>
                  <p className="text-slate-500 text-xs">{result.summary.slice(0, 80)}…</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { icon: Mail, value: result.email },
                  { icon: Phone, value: result.phone },
                  { icon: MapPin, value: result.location },
                  { icon: LinkIcon, value: result.linkedin },
                ].map(({ icon: Icon, value }) => (
                  <div key={value} className="flex items-center gap-2 text-xs text-slate-600">
                    <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{value}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 pt-1 border-t border-slate-50">
                {[
                  { icon: FileText, label: `${result.pageCount} page${result.pageCount > 1 ? 's' : ''}` },
                  { icon: BookOpen, label: `${result.wordCount} words` },
                  { icon: Clock, label: result.format },
                ].map(({ icon: Icon, label }) => (
                  <span key={label} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Icon className="w-3.5 h-3.5 text-slate-400" />{label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Skills Detected', value: result.skills.length, color: 'text-green-600', bg: 'bg-green-50', icon: Zap },
              { label: 'Work Experiences', value: result.experience.length, color: 'text-violet-600', bg: 'bg-violet-50', icon: Briefcase },
              { label: 'Certifications', value: result.certifications.length, color: 'text-amber-600', bg: 'bg-amber-50', icon: Award },
              { label: 'Improvements', value: result.suggestions.filter(s => s.type !== 'success').length, color: 'text-red-500', bg: 'bg-red-50', icon: AlertCircle },
            ].map(({ label, value, color, bg, icon: Icon }) => (
              <div key={label} className="bg-white border border-slate-100 rounded-xl shadow-sm p-4 flex items-center gap-3">
                <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div>
                  <p className={`${color}`} style={{ fontWeight: 700, fontSize: '1.25rem', lineHeight: 1 }}>{value}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Universal Job Role & Matching Profiler Hero Card ── */}
          {result.universalRoleProfile && (
            <UniversalRoleHeroCard
              profile={result.universalRoleProfile}
              candidate={result}
              onNavigateAdd={handleNavigateAdd}
              onViewUniversalTab={() => setActiveTab('universal')}
            />
          )}

          {/* Tabs */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-100 overflow-x-auto">
              {([
                { id: 'overview', label: 'Overview', icon: BarChart2 },
                { id: 'universal', label: 'Universal Role Fit', icon: Compass },
                { id: 'details', label: 'Details', icon: FileSearch },
                { id: 'keywords', label: 'Keywords', icon: Target },
                { id: 'suggestions', label: 'Suggestions', icon: Lightbulb },
                { id: 'skills', label: 'Skills Match', icon: Sparkles },
              ] as const).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm transition-colors whitespace-nowrap border-b-2 ${
                    activeTab === id
                      ? 'border-green-600 text-green-600 bg-green-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                  style={{ fontWeight: activeTab === id ? 600 : 400 }}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {id === 'suggestions' && (
                    <span className="ml-1 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full" style={{ fontWeight: 600 }}>
                      {result.suggestions.filter(s => s.type !== 'success').length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="p-5 sm:p-6">
              {/* ── Overview Tab ── */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Summary */}
                  <div>
                    <h3 className="text-slate-700 text-sm mb-2 flex items-center gap-2" style={{ fontWeight: 600 }}>
                      <User className="w-4 h-4 text-slate-400" /> Professional Summary
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 rounded-xl px-4 py-3">
                      {result.summary}
                    </p>
                  </div>

                  {/* Skills */}
                  <div>
                    <h3 className="text-slate-700 text-sm mb-3 flex items-center gap-2" style={{ fontWeight: 600 }}>
                      <Zap className="w-4 h-4 text-slate-400" /> Skills Detected
                      <span className="ml-auto text-xs text-slate-400 flex items-center gap-2">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Expert</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500 inline-block" /> Intermediate</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block" /> Beginner</span>
                      </span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {result.skills.map(s => <SkillBadge key={s.name} {...s} />)}
                    </div>
                  </div>

                  {/* AI Weighted Score Breakdown */}
                  <div>
                    <h3 className="text-slate-700 text-sm mb-1 flex items-center gap-2" style={{ fontWeight: 600 }}>
                      <Cpu className="w-4 h-4 text-slate-400" /> AI Score Breakdown
                      <span className="ml-auto text-xs text-slate-400 font-normal">Weighted Model</span>
                    </h3>
                    <p className="text-xs text-slate-400 mb-3">Skill Match 50% · Experience 15% · Role Fit 15% · Education 10% · Quality 10%</p>
                    <div className="space-y-2.5">
                      {(() => {
                        const bd = result.scoreBreakdown;
                        const totalKw = result.keywords.found.length + result.keywords.missing.length;
                        const skillPct = bd?.skillMatch ?? (totalKw > 0 ? Math.round((result.keywords.found.length / totalKw) * 100) : 50);
                        const rows = [
                          { label: 'Skill Match (50%)',      score: skillPct,                                   color: 'bg-green-500',   weight: 0.50 },
                          { label: 'Experience (15%)',       score: bd?.experienceRelevance ?? Math.min(100, result.experience.length * 30), color: 'bg-violet-500',  weight: 0.15 },
                          { label: 'Role Alignment (15%)',   score: bd?.roleAlignment       ?? 50,              color: 'bg-blue-500',    weight: 0.15 },
                          { label: 'Education (10%)',        score: bd?.educationRelevance  ?? Math.min(100, result.education.length * 50), color: 'bg-amber-500',   weight: 0.10 },
                          { label: 'Resume Quality (10%)',   score: bd?.resumeQuality       ?? Math.min(100, result.suggestions.filter(s => s.type === 'success').length * 25), color: 'bg-slate-400',   weight: 0.10 },
                        ];
                        return rows;
                      })().map(({ label, score, color }) => (
                        <div key={label} className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 w-44 flex-shrink-0">{label}</span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
                          </div>
                          <span className="text-xs text-slate-600 w-8 text-right" style={{ fontWeight: 600 }}>{score}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Details Tab ── */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Experience */}
                  <div>
                    <h3 className="text-slate-700 text-sm mb-3 flex items-center gap-2" style={{ fontWeight: 600 }}>
                      <Briefcase className="w-4 h-4 text-slate-400" /> Work Experience
                    </h3>
                    <div className="space-y-4">
                      {result.experience.map((exp, i) => (
                        <div key={i} className="relative pl-5 border-l-2 border-green-100">
                          <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />
                          <div className="bg-slate-50 rounded-xl p-4">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div>
                                <p className="text-slate-800 text-sm" style={{ fontWeight: 600 }}>{exp.title}</p>
                                <p className="text-green-600 text-xs mt-0.5" style={{ fontWeight: 500 }}>{exp.company}</p>
                              </div>
                              <span className="text-slate-400 text-xs bg-white border border-slate-200 px-2 py-0.5 rounded-md whitespace-nowrap">
                                {exp.duration}
                              </span>
                            </div>
                            <ul className="mt-3 space-y-1.5">
                              {exp.points.map((pt, j) => (
                                <li key={j} className="flex items-start gap-2 text-xs text-slate-600">
                                  <ChevronRight className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                                  {pt}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Education */}
                  <div>
                    <h3 className="text-slate-700 text-sm mb-3 flex items-center gap-2" style={{ fontWeight: 600 }}>
                      <GraduationCap className="w-4 h-4 text-slate-400" /> Education
                    </h3>
                    {result.education.map((edu, i) => (
                      <div key={i} className="bg-slate-50 rounded-xl p-4 flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className="text-slate-800 text-sm" style={{ fontWeight: 600 }}>{edu.degree}</p>
                          <p className="text-slate-500 text-xs mt-0.5">{edu.institution}</p>
                          {edu.gpa && <p className="text-emerald-600 text-xs mt-1" style={{ fontWeight: 500 }}>GPA: {edu.gpa}</p>}
                        </div>
                        <span className="text-slate-400 text-xs bg-white border border-slate-200 px-2 py-0.5 rounded-md">{edu.year}</span>
                      </div>
                    ))}
                  </div>

                  {/* Certifications */}
                  <div>
                    <h3 className="text-slate-700 text-sm mb-3 flex items-center gap-2" style={{ fontWeight: 600 }}>
                      <Award className="w-4 h-4 text-slate-400" /> Certifications
                    </h3>
                    <div className="space-y-2">
                      {result.certifications.map((cert, i) => (
                        <div key={i} className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-lg">
                          <Star className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          <span className="text-slate-700 text-sm">{cert}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Keywords Tab ── */}
              {activeTab === 'keywords' && (
                <div className="space-y-5">
                  {/* Match rate with quality indicator */}
                  <div className="bg-white border border-slate-100 rounded-xl p-4">
                    <p className="text-slate-600 text-sm mb-3" style={{ fontWeight: 500 }}>
                      Keyword Match Quality
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700"
                          style={{ width: `${Math.round((result.keywords.found.length / (result.keywords.found.length + result.keywords.missing.length)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-emerald-600 text-sm" style={{ fontWeight: 700 }}>
                        {Math.round((result.keywords.found.length / (result.keywords.found.length + result.keywords.missing.length)) * 100)}%
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mt-2">
                      {result.keywords.found.length} of {result.keywords.found.length + result.keywords.missing.length} target keywords matched
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Found Keywords */}
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                      <h3 className="text-emerald-700 text-sm mb-3 flex items-center gap-2" style={{ fontWeight: 600 }}>
                        <CheckCircle2 className="w-4 h-4" />
                        Matched ({result.keywords.found.length})
                      </h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {result.keywords.found.length > 0 ? (
                          result.keywords.found.map(kw => (
                            <div key={kw} className="flex items-center justify-between p-2 bg-white border border-emerald-200 rounded-lg">
                              <span className="text-xs text-emerald-700" style={{ fontWeight: 500 }}>{kw}</span>
                              <span className="text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded-full" style={{ fontWeight: 500 }}>Match</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-emerald-600 italic">No keywords matched</p>
                        )}
                      </div>
                    </div>

                    {/* Missing Keywords */}
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                      <h3 className="text-red-600 text-sm mb-3 flex items-center gap-2" style={{ fontWeight: 600 }}>
                        <AlertCircle className="w-4 h-4" />
                        Missing ({result.keywords.missing.length})
                      </h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {result.keywords.missing.length > 0 ? (
                          result.keywords.missing.slice(0, 8).map(kw => (
                            <div key={kw} className="flex items-center justify-between p-2 bg-white border border-red-200 rounded-lg">
                              <span className="text-xs text-red-700" style={{ fontWeight: 500 }}>{kw}</span>
                              <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full" style={{ fontWeight: 500 }}>Missing</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-red-600 italic">All keywords matched!</p>
                        )}
                        {result.keywords.missing.length > 8 && (
                          <p className="text-xs text-slate-500 italic">+{result.keywords.missing.length - 8} more keywords</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Keyword Insights */}
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <h3 className="text-blue-700 text-sm mb-3 flex items-center gap-2" style={{ fontWeight: 600 }}>
                      <Lightbulb className="w-4 h-4" />
                      Insights
                    </h3>
                    <ul className="space-y-2 text-xs text-blue-700">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">•</span>
                        <span>This resume has <strong>{result.keywords.found.length}</strong> matching keywords from the job description</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">•</span>
                        <span>Missing <strong>{result.keywords.missing.length}</strong> keywords — consider adding these skills if applicable</span>
                      </li>
                      {result.keywords.found.length > 0 && (
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 mt-0.5">•</span>
                          <span>Keywords are matched using advanced synonym detection and fuzzy matching</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  {jobDesc && (
                    <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                      <p className="text-green-700 text-sm" style={{ fontWeight: 500 }}>
                        ✓ Smart analysis enabled — using advanced keyword detection with synonym matching and fuzzy matching
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Suggestions Tab — Tri-Panel ── */}
              {activeTab === 'suggestions' && (
                <div className="space-y-5">
                  {/* Strengths */}
                  <div>
                    <h3 className="text-emerald-700 text-sm mb-3 flex items-center gap-2" style={{ fontWeight: 600 }}>
                      <ThumbsUp className="w-4 h-4" /> Strengths
                    </h3>
                    {(result.structuredFeedback?.strengths ?? result.suggestions.filter(s => s.type === 'success')).length > 0 ? (
                      <div className="space-y-2">
                        {(result.structuredFeedback?.strengths ?? result.suggestions.filter(s => s.type === 'success')).map((s, i) => (
                          <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl border bg-emerald-50 border-emerald-100">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-emerald-700">{s.text}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No specific strengths identified — add a JD for richer analysis</p>
                    )}
                  </div>

                  {/* Weaknesses */}
                  <div>
                    <h3 className="text-red-600 text-sm mb-3 flex items-center gap-2" style={{ fontWeight: 600 }}>
                      <ThumbsDown className="w-4 h-4" /> Weaknesses
                    </h3>
                    {(result.structuredFeedback?.weaknesses ?? result.suggestions.filter(s => s.type === 'error')).length > 0 ? (
                      <div className="space-y-2">
                        {(result.structuredFeedback?.weaknesses ?? result.suggestions.filter(s => s.type === 'error')).map((s, i) => (
                          <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl border ${suggestionBg(s.type)}`}>
                            {suggestionIcon(s.type)}
                            <p className={`text-sm ${s.type === 'error' ? 'text-red-700' : 'text-amber-700'}`}>{s.text}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No critical weaknesses detected</p>
                    )}
                  </div>

                  {/* Suggestions */}
                  <div>
                    <h3 className="text-amber-700 text-sm mb-3 flex items-center gap-2" style={{ fontWeight: 600 }}>
                      <Lightbulb className="w-4 h-4" /> Suggestions
                    </h3>
                    {(result.structuredFeedback?.suggestions ?? result.suggestions.filter(s => s.type === 'warning')).length > 0 ? (
                      <div className="space-y-2">
                        {(result.structuredFeedback?.suggestions ?? result.suggestions.filter(s => s.type === 'warning')).map((s, i) => (
                          <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl border bg-amber-50 border-amber-100">
                            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-700">{s.text}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No additional suggestions</p>
                    )}
                  </div>
                </div>
              )}

              {/* ── Skills Match Tab ── */}
              {activeTab === 'skills' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <h3 className="text-blue-700 text-sm mb-3 flex items-center gap-2" style={{ fontWeight: 600 }}>
                      <Sparkles className="w-4 h-4" />
                      Skill Requirement Matcher
                    </h3>
                    <p className="text-blue-700 text-xs mb-4">
                      Enter required skills in any of these formats: "React (expert)", "Node.js - intermediate", "Python*" (asterisk = required)
                    </p>
                    <textarea
                      value={requiredSkillsInput}
                      onChange={(e) => setRequiredSkillsInput(e.target.value)}
                      placeholder={`React (expert)
Node.js (intermediate)
Python (beginner)
Docker*
AWS
TypeScript (expert)`}
                      rows={6}
                      className="w-full px-3 py-2.5 border border-blue-200 rounded-lg text-sm text-slate-700 outline-none focus:border-blue-400 transition-colors resize-none font-mono bg-white"
                    />
                    <button
                      onClick={handleEvaluateSkills}
                      disabled={!requiredSkillsInput.trim()}
                      className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
                    >
                      <Sparkles className="w-4 h-4" />
                      Evaluate Skills Match
                    </button>
                  </div>

                  {skillsMatchResult ? (
                    <div className="bg-white border border-slate-100 rounded-xl p-6">
                      <SkillsMatchDisplay result={skillsMatchResult} showDetails={true} />
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-8 text-center">
                      <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 text-sm">
                        Enter required skills above and click "Evaluate Skills Match" to see detailed matching analysis
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Universal Role Persona Tab ── */}
              {activeTab === 'universal' && result.universalRoleProfile && (
                <UniversalRoleDetailsTab
                  profile={result.universalRoleProfile}
                  candidate={result}
                  onNavigateAdd={handleNavigateAdd}
                />
              )}
            </div>
          </div>

          {/* Action bar */}
          <div className="flex flex-wrap gap-3 justify-end">
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              style={{ fontWeight: 500 }}
            >
              <RotateCcw className="w-4 h-4" /> Scan Another
            </button>
            <button
              onClick={() => {
                if (!result) return;
                const text = `ATS Resume Report\n\nName: ${result.name}\nEmail: ${result.email}\nPhone: ${result.phone}\nATS Score: ${result.atsScore}%\n\nSkills: ${result.skills.map(s => s.name).join(', ')}\n\nSuggestions:\n${result.suggestions.map(s => `- [${s.type}] ${s.text}`).join('\n')}`;
                const blob = new Blob([text], { type: 'text/plain' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${result.name.replace(/\s+/g, '_')}_ATS_Report.txt`; a.click();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
              style={{ fontWeight: 500 }}
            >
              <Download className="w-4 h-4" /> Export Report
            </button>
            <button
              onClick={() => setShowEmailModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 transition-colors"
              style={{ fontWeight: 500 }}
            >
              <Send className="w-4 h-4" /> Send Mail
            </button>
          </div>

          {/* Email Modal */}
          {showEmailModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                  <h3 className="text-lg text-slate-800" style={{ fontWeight: 700 }}>Send Email to {result?.name}</h3>
                  <button onClick={() => setShowEmailModal(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  {/* Email to display */}
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-700 truncate">{result?.email}</span>
                  </div>

                  {/* Template selection */}
                  <div>
                    <label className="block text-sm text-slate-700 mb-2" style={{ fontWeight: 500 }}>Email Template</label>
                    <select
                      value={emailTemplate}
                      onChange={(e) => {
                        setEmailTemplate(e.target.value);
                        setEmailSubject('');
                        setEmailBody('');
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-violet-400"
                    >
                      <option value="">Select a template...</option>
                      <option value="interview_call_letter">Interview Call Letter (1st Round)</option>
                      <option value="second_round_call_letter">Second Round Call Letter</option>
                      <option value="final_round_call_letter">Final Round Call Letter</option>
                      <option value="selection_mail">Selection / Offer Mail</option>
                      <option value="offer_letter">Initial Job Offer Letter</option>
                    </select>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-sm text-slate-700 mb-2" style={{ fontWeight: 500 }}>Subject</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Email subject..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-violet-400"
                    />
                  </div>

                  {/* Body */}
                  <div>
                    <label className="block text-sm text-slate-700 mb-2" style={{ fontWeight: 500 }}>Message Body</label>
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      placeholder="Email message body..."
                      rows={6}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-violet-400 resize-none"
                    />
                  </div>

                  {/* Result message */}
                  {emailResult && (
                    <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${emailResult.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {emailResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      {emailResult.msg}
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowEmailModal(false)}
                      disabled={emailSending}
                      className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                      style={{ fontWeight: 500 }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendEmail}
                      disabled={!emailTemplate || !emailSubject || !emailBody || emailSending}
                      className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                      style={{ fontWeight: 500 }}
                    >
                      {emailSending && <Loader2 className="w-4 h-4 animate-spin" />}
                      Send Email
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
