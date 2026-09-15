import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  CheckCircle2, Clock, Phone, Mail, User, Briefcase,
  MapPin, Calendar, Award, Send, Info, Search, RotateCcw,
  AlertCircle, LogOut, Upload, Loader2, FileText, PlusCircle,
  Users, Check, ArrowRight, Sparkles, Building2, GraduationCap,
  Copy, CheckCheck, Compass, Map, UserCheck, PhoneCall,
  TrendingUp, HelpCircle, Layers, Globe
} from 'lucide-react';
import logoImg from '../../../assets/Logo.png';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const API_BASE = window.location.origin;

// ─── Sourcing Recruiters ─────────────────────────────────────
const STATIC_RECRUITERS = [
  'Ahmed', 'Babul', 'Bibifathima', 'Bolwin', 'Darshan', 'Fathima', 'Fawaz',
  'Gowthami', 'Javed', 'John', 'Khushi', 'Lakshmi', 'Mariam', 'Navya',
  'Nisha', 'Noor', 'Rahman', 'Rine', 'Ruby', 'Samir', 'Saniya', 'Suhail', 'Wasiq',
];

const getRecruiterEmail = (name: string) =>
  name ? `${name.toLowerCase()}@whitehorsemanpower.in` : '';

// ─── Location Data ────────────────────────────────────────────
const REGIONS = [
  'All India', 'All North India', 'All West India', 'All East India', 'All South India',
];

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Delhi-NCR', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu-Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim',
  'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

const CITIES_BY_STATE: Record<string, string[]> = {
  'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum', 'Gulbarga'],
  'Maharashtra': ['Mumbai City', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Thane'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli', 'Tirunelveli'],
  'Telangana': ['Hyderabad', 'Warangal', 'Karimnagar', 'Nizamabad', 'Khammam'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri'],
  'Delhi-NCR': ['Delhi', 'Noida', 'Gurgaon', 'Faridabad', 'Ghaziabad', 'Greater Noida'],
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati', 'Kurnool'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Prayagraj', 'Meerut'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur'],
  'Punjab': ['Chandigarh', 'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala'],
  'Haryana': ['Gurgaon', 'Faridabad', 'Rohtak', 'Hisar', 'Panipat'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur'],
  'Assam': ['Guwahati', 'Dibrugarh', 'Silchar', 'Jorhat'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani'],
  'Himachal Pradesh': ['Shimla', 'Manali', 'Dharamsala', 'Solan'],
  'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa'],
  'Jammu-Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Sopore'],
  'Sikkim': ['Gangtok', 'Namchi', 'Gyalshing'],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung'],
  'Manipur': ['Imphal', 'Thoubal', 'Bishnupur'],
  'Meghalaya': ['Shillong', 'Tura', 'Nongstoin'],
  'Mizoram': ['Aizawl', 'Lunglei', 'Champhai'],
  'Tripura': ['Agartala', 'Udaipur', 'Dharmanagar'],
};

// ─── Qualification Data ───────────────────────────────────────
const QUALIFICATION_GROUPS = [
  {
    group: 'Undergraduate (UG)',
    options: [
      'B.E/B.Tech – Computer Science', 'B.E/B.Tech – IT', 'B.E/B.Tech – Electronics & Communication',
      'B.E/B.Tech – Mechanical', 'B.E/B.Tech – Electrical', 'B.E/B.Tech – Civil',
      'BCA', 'B.Sc – Computer Science', 'B.Sc – IT', 'B.Sc – General',
      'B.Com', 'BBA', 'BBM', 'BA', 'B.Ed', 'B.Pharm', 'B.Arch', 'LLB',
    ],
  },
  {
    group: 'Postgraduate (PG)',
    options: [
      'MCA', 'M.Tech – Computer Science', 'M.Tech – IT', 'M.E/M.Tech',
      'M.Sc – Computer Science', 'M.Sc – IT', 'MBA – HR', 'MBA – Finance',
      'MBA – Marketing', 'MBA – Operations', 'MBA – General', 'M.Com', 'MA',
      'M.Sc – General', 'LLM', 'M.Pharm',
    ],
  },
  {
    group: 'Diploma & Certifications',
    options: [
      'Diploma – Computer Science', 'Diploma – Electronics', 'Diploma – Mechanical',
      'Diploma – Electrical', 'Diploma – Civil', 'Polytechnic', 'ITI',
      'CA', 'CMA', 'CS', 'AWS Certified', 'Azure Certified', 'CCNA',
    ],
  },
];

const NOTICE_PERIODS = [
  'Immediate / Serving Notice', '15 Days or Less', '1 Month', '2 Months', '3 Months', 'N/A',
];

const JOB_SOURCES = [
  'Direct/Walk-in', 'Naukri', 'Shine', 'Internet', 'Friend', 'College', 'Jobfair',
];

const INTERVIEW_TYPES = ['Face2Face', 'Virtual'];

const GENDERS = ['Male', 'Female', 'Non-Binary', 'Prefer not to say'];

const GRAD_YEARS = Array.from({ length: 2026 - 1980 + 1 }, (_, i) => 1980 + i);

const EXPERIENCE_OPTIONS = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '30+',
];

const STATUS_BADGE: Record<string, string> = {
  Waiting: 'bg-amber-50 text-amber-700 border-amber-300 ring-1 ring-amber-500/15',
  'In Review': 'bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-500/15',
  Interviewed: 'bg-purple-50 text-purple-700 border-purple-300 ring-1 ring-purple-500/15',
  Selected: 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-500/15',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-300 ring-1 ring-rose-500/15',
};

const EMPTY_FORM = {
  interviewCaller: '',
  recruiterEmail: '',

  candidateName: '',
  candidatePhone: '',
  alternatePhone: '',
  candidateEmail: '',
  dateOfBirth: '',
  gender: '',
  jobOpeningSource: 'Direct/Walk-in',
  interviewType: 'Face2Face',

  currentRegion: 'All South India',
  currentState: 'Karnataka',
  currentCity: 'Bangalore',
  currentSubLocation: '',

  preferredRegion: '',
  preferredState: '',
  preferredCity: '',

  qualification: '',
  university: '',
  yearOfGraduation: '',
  experienceYears: '0',
  currentCompany: '',
  currentCTC: '',
  expectedCTC: '',
  noticePeriod: 'Immediate / Serving Notice',
  joiningAvailability: 'Immediate / Serving Notice',

  resume: null as File | null,
};

export function WalkInDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<'add' | 'queue'>('add');
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ticketNo, setTicketNo] = useState('');
  const [registeredCandidate, setRegisteredCandidate] = useState<any>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Resume auto extraction states
  const [extracting, setExtracting] = useState(false);
  const [extractMsg, setExtractMsg] = useState<{ type: 'info' | 'success' | 'warn'; text: string } | null>(null);

  // Recruiter options
  const [recruiters, setRecruiters] = useState<string[]>(STATIC_RECRUITERS);

  // Queue state
  const [queue, setQueue] = useState<any[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [queueSearch, setQueueSearch] = useState('');

  useEffect(() => {
    if (!user || (user.role !== 'walkin' && user.role !== 'admin' && user.role !== 'tl')) {
      navigate('/login');
      return;
    }

    // Attempt to load dynamic recruiter list
    if ((api as any).getRecruiters) {
      (api as any).getRecruiters()
        .then((data: any) => {
          const list = Array.isArray(data) ? data : (data.users || data.recruiters || []);
          const names = list.map((r: any) => r.name || r).filter(Boolean);
          if (names.length > 0) {
            setRecruiters(Array.from(new Set([...names, ...STATIC_RECRUITERS])));
          }
        })
        .catch(() => {});
    }

    loadTodayQueue();
  }, [user, navigate]);

  const loadTodayQueue = async () => {
    setLoadingQueue(true);
    try {
      const res = await api.getWalkInQueue();
      const list = Array.isArray(res) ? res : (res?.queue || []);
      setQueue(list);
    } catch (err) {
      console.error('Failed to load queue:', err);
    } finally {
      setLoadingQueue(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const setField = (key: string, value: any) => {
    setForm(prev => {
      const updated = { ...prev, [key]: value };
      if (key === 'interviewCaller') {
        updated.recruiterEmail = getRecruiterEmail(value);
      }
      return updated;
    });
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleResumeFile = async (file: File | null) => {
    if (!file) {
      setForm(f => ({ ...f, resume: null }));
      setExtractMsg(null);
      return;
    }

    setForm(f => ({ ...f, resume: file }));
    setExtracting(true);
    setExtractMsg({ type: 'info', text: 'Analyzing resume with smart extraction...' });

    try {
      const fd = new FormData();
      fd.append('resume', file);
      const res = await fetch(`${API_BASE}/api/public/resume-extract`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Auto-extraction service unavailable');
      const data = await res.json();

      setForm(f => {
        const updated = { ...f };
        if (data.name && !updated.candidateName) updated.candidateName = data.name;
        if (data.email && !updated.candidateEmail) updated.candidateEmail = data.email;
        if (data.phone) {
          const digits = data.phone.replace(/\D/g, '').slice(-10);
          if (digits.length === 10 && !updated.candidatePhone) updated.candidatePhone = digits;
        }
        if (data.experience?.length && updated.experienceYears === '0') {
          const durStr: string = data.experience[0]?.duration || '';
          const yr = durStr.match(/(\d+)/);
          if (yr) updated.experienceYears = yr[1];
        }
        if (data.education?.length && !updated.qualification) {
          const deg: string = data.education[0]?.degree || '';
          const degLower = deg.toLowerCase();
          const matched = QUALIFICATION_GROUPS.flatMap(g => g.options).find(
            opt => degLower.includes(opt.toLowerCase().split(' – ')[0].toLowerCase())
              || opt.toLowerCase().split(' – ')[0].toLowerCase().split('/').some(p => degLower.includes(p.trim()))
          );
          if (matched) updated.qualification = matched;
        }
        return updated;
      });

      const filledCount = [data.name, data.email, data.phone].filter(Boolean).length;
      if (filledCount > 0) {
        setExtractMsg({
          type: 'success',
          text: `Auto-populated ${filledCount} field${filledCount > 1 ? 's' : ''} from resume. Please review and complete remaining details.`,
        });
      } else {
        setExtractMsg({
          type: 'info',
          text: 'Resume attached successfully. Please fill in candidate details manually below.',
        });
      }
    } catch {
      setExtractMsg({
        type: 'info',
        text: 'Resume uploaded successfully. Please enter candidate details below.',
      });
    } finally {
      setExtracting(false);
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.candidateName.trim()) {
      errs.candidateName = 'Candidate Full Name is required';
    }
    const cleanPhone = form.candidatePhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      errs.candidatePhone = 'Valid 10-digit mobile number is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value instanceof File) {
          fd.append(key, value);
        } else if (value !== null && value !== '') {
          fd.append(key, String(value));
        }
      });

      const res = await api.registerWalkIn(fd);
      const assignedToken = res.tokenNumber || res.token || res.ticketNo || ('WH-WI-' + Math.floor(100000 + Math.random() * 900000));
      
      setTicketNo(assignedToken);
      setRegisteredCandidate({
        name: form.candidateName,
        phone: form.candidatePhone,
        email: form.candidateEmail,
        qualification: form.qualification,
        experience: form.experienceYears,
        caller: form.interviewCaller,
        token: assignedToken,
      });
      setSuccess(true);
      loadTodayQueue();
    } catch (err: any) {
      console.error('Registration failed:', err);
      setErrors({ form: err.message || 'Failed to register candidate. Please check details and retry.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setExtractMsg(null);
    setSuccess(false);
    setTicketNo('');
    setRegisteredCandidate(null);
    setCopiedToken(false);
  };

  const copyTokenToClipboard = () => {
    if (!ticketNo) return;
    navigator.clipboard.writeText(ticketNo);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const filteredQueue = queue.filter(item => {
    if (!queueSearch.trim()) return true;
    const q = queueSearch.toLowerCase();
    const name = (item.name || item.candidate?.name || '').toLowerCase();
    const phone = (item.phone || item.candidate?.phone || '').toLowerCase();
    const token = (item.token || '').toLowerCase();
    return name.includes(q) || phone.includes(q) || token.includes(q);
  });

  const waitingCount = queue.filter(i => (i.status || 'Waiting') === 'Waiting').length;
  const processedCount = queue.filter(i => ['In Review', 'Interviewed', 'Selected', 'Rejected'].includes(i.status)).length;

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col font-sans text-slate-800 selection:bg-emerald-500 selection:text-white relative">
      {/* ── Top Navbar ────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-4">
            <div className="p-1 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
              <img src={logoImg} alt="White Horse Manpower" className="h-8 w-auto object-contain" />
            </div>
            <div className="h-7 w-px bg-slate-200 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Walk-In Reception Desk
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Front Office
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Add candidates to queue — JR assigned by Team Leader
              </p>
            </div>
          </div>

          {/* Right Navigation & Profile */}
          <div className="flex items-center gap-3">
            {/* Segmented Tab Controls */}
            <div className="flex items-center bg-slate-200/70 p-1 rounded-xl border border-slate-300/80 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('add')}
                className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  activeTab === 'add'
                    ? 'bg-white text-emerald-800 shadow-sm font-bold ring-1 ring-slate-300'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <span>Add Candidate</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('queue'); loadTodayQueue(); }}
                className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  activeTab === 'queue'
                    ? 'bg-white text-emerald-800 shadow-sm font-bold ring-1 ring-slate-300'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Users className="w-4 h-4 text-teal-600" />
                <span>Today's Queue</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900">
                  {queue.length}
                </span>
              </button>
            </div>

            <div className="h-7 w-px bg-slate-200 hidden sm:block" />

            {/* Reception Profile Chip */}
            <div className="flex items-center gap-2.5 pl-1">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-xs ring-2 ring-emerald-500/20">
                WI
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-tight">Reception Desk</p>
                <p className="text-[10px] text-slate-500 font-mono leading-tight">{user?.email || 'walkin@whitehorse'}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-200"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ──────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 z-10">
        {activeTab === 'queue' ? (
          /* ── Today's Queue Tab ── */
          <div className="space-y-5">
            {/* 3 KPI Summary Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Today */}
              <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Walk-Ins Today</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">{queue.length}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              {/* Waiting in Queue */}
              <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Waiting in Queue</p>
                  <p className="text-3xl font-black text-amber-600 mt-1">{waitingCount}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-2xs">
                  <Clock className="w-6 h-6" />
                </div>
              </div>

              {/* Processed / Evaluated */}
              <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Interviews Processed</p>
                  <p className="text-3xl font-black text-indigo-600 mt-1">{processedCount}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shadow-2xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Filter & Action Header */}
            <div className="bg-white rounded-2xl shadow-xs border-2 border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Today's Walk-In Queue</h2>
                <p className="text-xs text-slate-500 mt-0.5">Live candidate queue for front desk & interview evaluators</p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="relative flex-1 sm:w-72">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={queueSearch}
                    onChange={e => setQueueSearch(e.target.value)}
                    placeholder="Search candidate, phone, token..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border-2 border-slate-300 rounded-xl outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/15 font-medium transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={loadTodayQueue}
                  disabled={loadingQueue}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
                >
                  <RotateCcw className={`w-3.5 h-3.5 text-slate-600 ${loadingQueue ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('add')}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs hover:shadow active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Register Candidate</span>
                </button>
              </div>
            </div>

            {/* Queue Table */}
            <div className="bg-white rounded-2xl shadow-xs border-2 border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b-2 border-slate-200 text-slate-700 font-extrabold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-5 py-3.5">Token #</th>
                      <th className="px-5 py-3.5">Candidate Name</th>
                      <th className="px-5 py-3.5">Contact</th>
                      <th className="px-5 py-3.5">Experience</th>
                      <th className="px-5 py-3.5">Caller / Recruiter</th>
                      <th className="px-5 py-3.5">Registered At</th>
                      <th className="px-5 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {loadingQueue && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                          <Loader2 className="w-7 h-7 animate-spin mx-auto text-emerald-600 mb-2" />
                          <p className="font-bold text-slate-700">Loading today's queue...</p>
                        </td>
                      </tr>
                    )}
                    {!loadingQueue && filteredQueue.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-16 text-center text-slate-500">
                          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400 border border-slate-200">
                            <Users className="w-7 h-7" />
                          </div>
                          <p className="font-bold text-slate-800 text-sm">No walk-in candidates found</p>
                          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                            {queueSearch ? 'No registrations match your search query.' : 'Register new candidates using the Add Candidate form to populate today\'s queue.'}
                          </p>
                          <button
                            type="button"
                            onClick={() => setActiveTab('add')}
                            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-sm"
                          >
                            <PlusCircle className="w-4 h-4" />
                            Register First Candidate
                          </button>
                        </td>
                      </tr>
                    )}
                    {!loadingQueue && filteredQueue.map((item, idx) => {
                      const name = item.name || item.candidate?.name || '—';
                      const phone = item.phone || item.candidate?.phone || '—';
                      const exp = item.experience || item.candidate?.experience || 'Fresh';
                      const token = item.token || '—';
                      const caller = item.interviewCaller || item.assignedToName || '—';
                      const time = item.registeredAt
                        ? new Date(item.registeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : (item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');
                      const status = item.status || 'Waiting';

                      return (
                        <tr key={item._id || idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3.5 font-mono font-bold text-emerald-800">
                            <span className="bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-300 font-extrabold">
                              {token}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-bold text-slate-900">{name}</td>
                          <td className="px-5 py-3.5 text-slate-700 font-medium">{phone}</td>
                          <td className="px-5 py-3.5 text-slate-700 font-medium">{exp}</td>
                          <td className="px-5 py-3.5 text-slate-700 font-medium">
                            <span className="inline-flex items-center gap-1">
                              {caller}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600 font-mono text-[11px]">{time}</td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${STATUS_BADGE[status] || 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : success ? (
          /* ── Registration Success Screen (VIP Token Card) ── */
          <div className="max-w-xl mx-auto py-6">
            <div className="bg-white rounded-3xl shadow-md border-2 border-slate-200 p-6 sm:p-8 text-center relative overflow-hidden">
              {/* Success Badge */}
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-300 shadow-xs">
                <Check className="w-8 h-8 text-emerald-700 stroke-[2.5]" />
              </div>

              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border border-emerald-300 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Candidate Registered Successfully
              </span>

              <h2 className="text-2xl font-black text-slate-900 mb-1">
                Added to Walk-In Queue
              </h2>
              <p className="text-xs text-slate-600 max-w-sm mx-auto mb-6">
                Hand the token slip or token number to candidate. The Team Leader will assign the Job Requirement (JR) and interviewer directly.
              </p>

              {/* Boarding-Pass Styled Token Card */}
              <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white rounded-3xl p-6 shadow-xl mb-6 max-w-sm mx-auto text-center relative overflow-hidden border-2 border-emerald-400/40">
                <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 rounded-full bg-emerald-400/10 blur-xl pointer-events-none" />
                <p className="text-emerald-200 text-[11px] uppercase tracking-widest font-black mb-1">
                  Walk-In Queue Token
                </p>
                <div className="font-mono font-black text-3xl sm:text-4xl tracking-wider my-2 text-white drop-shadow-xs">
                  {ticketNo}
                </div>
                <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-white/20 text-emerald-100 text-xs font-semibold">
                  <Clock className="w-4 h-4 text-emerald-300" />
                  <span>Status: <strong>Waiting for Interviewer</strong></span>
                </div>
              </div>

              {/* Candidate Info Pill */}
              {registeredCandidate && (
                <div className="bg-slate-50 rounded-2xl border-2 border-slate-200 p-4 max-w-sm mx-auto mb-6 text-left grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px] font-semibold">Candidate Name:</span>
                    <span className="font-bold text-slate-900">{registeredCandidate.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] font-semibold">Contact Mobile:</span>
                    <span className="font-bold text-slate-900">{registeredCandidate.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] font-semibold">Experience:</span>
                    <span className="font-bold text-slate-900">{registeredCandidate.experience} Year(s)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] font-semibold">Sourced By:</span>
                    <span className="font-bold text-slate-900">{registeredCandidate.caller || 'Front Desk'}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm mx-auto">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="w-full sm:w-auto flex-1 py-3 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  Register Next Candidate
                </button>
                <button
                  type="button"
                  onClick={copyTokenToClipboard}
                  className="w-full sm:w-auto py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors border-2 border-slate-300 flex items-center justify-center gap-1.5"
                  title="Copy Token"
                >
                  {copiedToken ? <CheckCheck className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                  <span>{copiedToken ? 'Copied!' : 'Copy Token'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('queue')}
                  className="w-full sm:w-auto py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors border-2 border-slate-300 flex items-center justify-center gap-1.5"
                >
                  <Users className="w-4 h-4 text-slate-600" />
                  <span>Queue</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── Add Candidate Form ── */
          <div className="space-y-6">
            {/* Informational Guidance Banner (Clear Hero Card) */}
            <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/90 p-4 sm:p-5 shadow-xs">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-xs flex-shrink-0 mt-0.5">
                  <Info className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 bg-emerald-200/90 px-2 py-0.5 rounded-full border border-emerald-300">
                      Fast-Track Mode
                    </span>
                    <h3 className="text-sm font-extrabold text-emerald-950">
                      Walk-In Reception Desk — No Job Requirement (JR) Needed Here
                    </h3>
                  </div>
                  <p className="text-xs text-emerald-900 mt-1 leading-relaxed font-medium">
                    Please fill candidate personal, contact, location & education details below. <strong>Job Requirement (JR) mapping is omitted here</strong> — the Team Leader will assign the target JR directly during candidate evaluation in the queue.
                  </p>
                </div>
              </div>
            </div>

            {/* Smart Resume Auto-Extraction Box */}
            <div className="rounded-2xl border-2 border-slate-300 bg-white p-5 shadow-xs hover:border-emerald-400 transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-slate-900">
                        Quick Resume Upload & Auto-Fill
                      </h3>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                        1-Click Auto Extraction
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">
                      Upload resume (.pdf, .doc, .docx) to auto-fill candidate name, mobile, email, qualification & experience into the boxes below.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all">
                    {extracting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Extracting Details...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>{form.resume ? form.resume.name : 'Select Resume File'}</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={e => handleResumeFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  {form.resume && (
                    <button
                      type="button"
                      onClick={() => handleResumeFile(null)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-2 rounded-lg transition-colors border border-rose-200"
                    >
                      Clear File
                    </button>
                  )}
                </div>
              </div>

              {extractMsg && (
                <div className={`mt-3.5 p-3 rounded-xl text-xs flex items-center gap-2.5 ${
                  extractMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-300'
                    : 'bg-blue-50 text-blue-800 border-2 border-blue-300'
                }`}>
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                  <span className="font-bold">{extractMsg.text}</span>
                </div>
              )}
            </div>

            {/* Error Display */}
            {errors.form && (
              <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-rose-800 font-bold">{errors.form}</p>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ── SECTION 1: Sourcing & Recruiter Information (Indigo Theme) ── */}
              <div className="rounded-2xl border-2 border-slate-300 bg-white shadow-xs overflow-hidden transition-all hover:border-indigo-300">
                <div className="px-5 py-3.5 bg-gradient-to-r from-indigo-100/90 via-purple-50 to-white border-b-2 border-indigo-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-900">
                        1. Recruiter Sourcing & Interview Type
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium">Record which recruiter called the candidate and how they were sourced</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-800 bg-indigo-100 border border-indigo-300 px-3 py-0.5 rounded-full">
                    Sourcing Channel
                  </span>
                </div>

                <div className="p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {/* Who Called */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-900 tracking-tight">
                      Who Called you for Interview?
                    </label>
                    <p className="text-[11px] text-slate-500 leading-tight">Select recruiter who invited candidate</p>
                    <div className="relative">
                      <Users className="w-4 h-4 text-indigo-500 absolute left-3.5 top-3 pointer-events-none" />
                      <select
                        value={form.interviewCaller}
                        onChange={e => setField('interviewCaller', e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:border-slate-400 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/15 transition-all shadow-xs"
                      >
                        <option value="">Select Recruiter Name</option>
                        {recruiters.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Recruiter Email */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-900 tracking-tight">
                      Recruiter Email ID
                    </label>
                    <p className="text-[11px] text-slate-500 leading-tight">Official email (auto-filled on selection)</p>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                      <input
                        type="email"
                        value={form.recruiterEmail}
                        readOnly
                        placeholder="Auto-filled from recruiter selection"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border-2 border-slate-300 text-xs font-mono font-semibold bg-slate-100/90 text-slate-600 outline-none cursor-not-allowed shadow-xs"
                      />
                    </div>
                  </div>

                  {/* Job Opening Source */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-900 tracking-tight">
                      Job Opening Source
                    </label>
                    <p className="text-[11px] text-slate-500 leading-tight">Where did candidate find job opening?</p>
                    <div className="relative">
                      <Search className="w-4 h-4 text-indigo-500 absolute left-3.5 top-3 pointer-events-none" />
                      <select
                        value={form.jobOpeningSource}
                        onChange={e => setField('jobOpeningSource', e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:border-slate-400 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/15 transition-all shadow-xs"
                      >
                        {JOB_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Interview Type */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-900 tracking-tight">
                      Interview Type
                    </label>
                    <p className="text-[11px] text-slate-500 leading-tight">Mode of interview evaluation</p>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 text-indigo-500 absolute left-3.5 top-3 pointer-events-none" />
                      <select
                        value={form.interviewType}
                        onChange={e => setField('interviewType', e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:border-slate-400 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/15 transition-all shadow-xs"
                      >
                        {INTERVIEW_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── SECTION 2: Candidate Personal & Contact (Emerald Theme) ── */}
              <div className="rounded-2xl border-2 border-slate-300 bg-white shadow-xs overflow-hidden transition-all hover:border-emerald-300">
                <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-100/90 via-teal-50 to-white border-b-2 border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-900">
                        2. Candidate Personal & Contact Information
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium">Accurate details required for candidate profile and call letter</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-300 px-3 py-0.5 rounded-full">
                    * Required fields
                  </span>
                </div>

                <div className="p-5 space-y-5">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-900 tracking-tight">
                        Candidate Full Name <span className="text-rose-500 font-black">*</span>
                      </label>
                      <p className="text-[11px] text-slate-500 leading-tight">Legal name as per Aadhaar / Resume</p>
                      <div className="relative">
                        <User className="w-4 h-4 text-emerald-600 absolute left-3.5 top-3 pointer-events-none" />
                        <input
                          type="text"
                          value={form.candidateName}
                          onChange={e => setField('candidateName', e.target.value)}
                          placeholder="e.g. Ramesh Kumar"
                          className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border-2 text-xs font-semibold text-slate-900 outline-none transition-all shadow-xs ${
                            errors.candidateName
                              ? 'border-rose-500 bg-rose-50/50 focus:ring-4 focus:ring-rose-500/15'
                              : 'border-slate-300 bg-white hover:border-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/15'
                          }`}
                        />
                      </div>
                      {errors.candidateName && <p className="text-[11px] text-rose-600 mt-1 font-bold">{errors.candidateName}</p>}
                    </div>

                    {/* Mobile Number */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-900 tracking-tight">
                        10-Digit Mobile Number <span className="text-rose-500 font-black">*</span>
                      </label>
                      <p className="text-[11px] text-slate-500 leading-tight">Primary calling & WhatsApp number</p>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-emerald-600 absolute left-3.5 top-3 pointer-events-none" />
                        <input
                          type="tel"
                          value={form.candidatePhone}
                          onChange={e => setField('candidatePhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                          maxLength={10}
                          placeholder="e.g. 9876543210 (10 digits)"
                          className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border-2 text-xs font-mono font-bold text-slate-900 outline-none transition-all shadow-xs ${
                            errors.candidatePhone
                              ? 'border-rose-500 bg-rose-50/50 focus:ring-4 focus:ring-rose-500/15'
                              : 'border-slate-300 bg-white hover:border-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/15'
                          }`}
                        />
                      </div>
                      {errors.candidatePhone && <p className="text-[11px] text-rose-600 mt-1 font-bold">{errors.candidatePhone}</p>}
                    </div>

                    {/* Alternate Phone */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-900 tracking-tight">
                        Alternate Contact Number
                      </label>
                      <p className="text-[11px] text-slate-500 leading-tight">Secondary mobile or family contact (optional)</p>
                      <div className="relative">
                        <PhoneCall className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                        <input
                          type="tel"
                          value={form.alternatePhone}
                          onChange={e => setField('alternatePhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                          maxLength={10}
                          placeholder="Secondary contact number"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:border-slate-400 text-xs font-mono font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/15 transition-all shadow-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-5">
                    {/* Candidate Email */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-900 tracking-tight">
                        Email Address
                      </label>
                      <p className="text-[11px] text-slate-500 leading-tight">Personal email for interview updates</p>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-emerald-600 absolute left-3.5 top-3 pointer-events-none" />
                        <input
                          type="email"
                          value={form.candidateEmail}
                          onChange={e => setField('candidateEmail', e.target.value)}
                          placeholder="e.g. candidate@email.com"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:border-slate-400 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/15 transition-all shadow-xs"
                        />
                      </div>
                    </div>

                    {/* Date of Birth */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-900 tracking-tight">
                        Date of Birth
                      </label>
                      <p className="text-[11px] text-slate-500 leading-tight">Date of birth (DD/MM/YYYY)</p>
                      <div className="relative">
                        <Calendar className="w-4 h-4 text-emerald-600 absolute left-3.5 top-3 pointer-events-none" />
                        <input
                          type="date"
                          value={form.dateOfBirth}
                          onChange={e => setField('dateOfBirth', e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:border-slate-400 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/15 transition-all shadow-xs"
                        />
                      </div>
                    </div>

                    {/* Gender */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-900 tracking-tight">
                        Gender Identity
                      </label>
                      <p className="text-[11px] text-slate-500 leading-tight">Select candidate gender</p>
                      <div className="relative">
                        <User className="w-4 h-4 text-emerald-600 absolute left-3.5 top-3 pointer-events-none" />
                        <select
                          value={form.gender}
                          onChange={e => setField('gender', e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:border-slate-400 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/15 transition-all shadow-xs"
                        >
                          <option value="">Select Gender</option>
                          {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── SECTION 3: Location Details (Sky / Blue Theme) ── */}
              <div className="rounded-2xl border-2 border-slate-300 bg-white shadow-xs overflow-hidden transition-all hover:border-sky-300">
                <div className="px-5 py-3.5 bg-gradient-to-r from-sky-100/90 via-blue-50 to-white border-b-2 border-sky-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-xs">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-900">
                        3. Location Details
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium">Current residence area and candidate job relocation preference</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-sky-800 bg-sky-100 border border-sky-300 px-3 py-0.5 rounded-full">
                    Residence & Work City
                  </span>
                </div>

                <div className="p-5 space-y-6">
                  {/* Current Location */}
                  <div className="bg-sky-50/50 rounded-2xl border border-sky-200 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-sky-600 text-white shadow-2xs">
                        Current Residence Location
                      </span>
                      <span className="text-xs font-bold text-slate-700">Where is the candidate currently living?</span>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-800">Geographic Region</label>
                        <div className="relative">
                          <Globe className="w-4 h-4 text-sky-600 absolute left-3 top-3 pointer-events-none" />
                          <select
                            value={form.currentRegion}
                            onChange={e => setField('currentRegion', e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:border-slate-400 text-xs font-semibold text-slate-900 outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-500/15 transition-all shadow-xs"
                          >
                            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-800">Current State</label>
                        <div className="relative">
                          <Map className="w-4 h-4 text-sky-600 absolute left-3 top-3 pointer-events-none" />
                          <select
                            value={form.currentState}
                            onChange={e => {
                              setField('currentState', e.target.value);
                              const cities = CITIES_BY_STATE[e.target.value] || [];
                              setField('currentCity', cities[0] || '');
                            }}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:border-slate-400 text-xs font-semibold text-slate-900 outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-500/15 transition-all shadow-xs"
                          >
                            <option value="">Select State</option>
                            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-800">Current City</label>
                        <div className="relative">
                          <Building2 className="w-4 h-4 text-sky-600 absolute left-3 top-3 pointer-events-none" />
                          <select
                            value={form.currentCity}
                            onChange={e => setField('currentCity', e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:border-slate-400 text-xs font-semibold text-slate-900 outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-500/15 transition-all shadow-xs"
                          >
                            <option value="">Select City</option>
                            {(CITIES_BY_STATE[form.currentState] || []).map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                            {form.currentState && <option value="Other">Other</option>}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 pt-1">
                      <label className="block text-[11px] font-bold text-slate-800">Current Area / Sub-Location / Locality</label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-sky-600 absolute left-3.5 top-3 pointer-events-none" />
                        <input
                          type="text"
                          value={form.currentSubLocation}
                          onChange={e => setField('currentSubLocation', e.target.value)}
                          placeholder="e.g. Koramangala 4th Block, Indiranagar, BTM 2nd Stage, HSR Layout"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:border-slate-400 text-xs font-semibold text-slate-900 outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-500/15 transition-all shadow-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preferred Location */}
                  <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-slate-700 text-white shadow-2xs">
                        Preferred Work Location (Optional)
                      </span>
                      <span className="text-xs font-bold text-slate-600">Which city does the candidate prefer for employment?</span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-800">Preferred Work State</label>
                        <div className="relative">
                          <Map className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                          <select
                            value={form.preferredState}
                            onChange={e => {
                              setField('preferredState', e.target.value);
                              setField('preferredCity', '');
                            }}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:border-slate-400 text-xs font-semibold text-slate-900 outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-500/15 transition-all shadow-xs"
                          >
                            <option value="">Any State / Open to Relocation</option>
                            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-800">Preferred Work City</label>
                        <div className="relative">
                          <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                          <select
                            value={form.preferredCity}
                            onChange={e => setField('preferredCity', e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:border-slate-400 text-xs font-semibold text-slate-900 outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-500/15 transition-all shadow-xs"
                          >
                            <option value="">Any City / Open</option>
                            {(CITIES_BY_STATE[form.preferredState] || []).map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── SECTION 4: Education, Experience & Compensation (Amber Theme) ── */}
              <div className="rounded-2xl border-2 border-slate-300 bg-white shadow-xs overflow-hidden transition-all hover:border-amber-300">
                <div className="px-5 py-3.5 bg-gradient-to-r from-amber-100/90 via-orange-50 to-white border-b-2 border-amber-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-900">
                        4. Education, Experience & Compensation
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium">Qualification, salary details, work experience and notice duration</p>
                    </div>
                  </div>
                  <span className="text-[11px] bg-amber-100 text-amber-900 font-extrabold px-3 py-0.5 rounded-full border border-amber-300">
                    JR assigned later by TL
                  </span>
                </div>

                <div className="p-5 space-y-5">
                  {/* Qualification Row */}
                  <div className="grid sm:grid-cols-3 gap-5">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-900 tracking-tight">
                        Highest Qualification
                      </label>
                      <p className="text-[11px] text-slate-500 leading-tight">Degree / Diploma completed</p>
                      <div className="relative">
                        <GraduationCap className="w-4 h-4 text-amber-600 absolute left-3.5 top-3 pointer-events-none" />
                        <select
                          value={form.qualification}
                          onChange={e => setField('qualification', e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:border-slate-400 text-xs font-semibold text-slate-900 outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-500/15 transition-all shadow-xs"
                        >
                          <option value="">Select Qualification</option>
                          {QUALIFICATION_GROUPS.map(grp => (
                            <optgroup key={grp.group} label={grp.group}>
                              {grp.options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-900 tracking-tight">
                        University / College Name
                      </label>
                      <p className="text-[11px] text-slate-500 leading-tight">Institute or college studied from</p>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-amber-600 absolute left-3.5 top-3 pointer-events-none" />
                        <input
                          type="text"
                          value={form.university}
                          onChange={e => setField('university', e.target.value)}
                          placeholder="e.g. Bangalore University, VTU"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:border-slate-400 text-xs font-semibold text-slate-900 outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-500/15 transition-all shadow-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-900 tracking-tight">
                        Year of Graduation
                      </label>
                      <p className="text-[11px] text-slate-500 leading-tight">Passing out year</p>
                      <div className="relative">
                        <Calendar className="w-4 h-4 text-amber-600 absolute left-3.5 top-3 pointer-events-none" />
                        <select
                          value={form.yearOfGraduation}
                          onChange={e => setField('yearOfGraduation', e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:border-slate-400 text-xs font-semibold text-slate-900 outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-500/15 transition-all shadow-xs"
                        >
                          <option value="">Select Passing Year</option>
                          {GRAD_YEARS.slice().reverse().map(y => (
                            <option key={y} value={String(y)}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Experience & Company */}
                  <div className="grid sm:grid-cols-3 gap-5">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-900 tracking-tight">
                        Total Work Experience
                      </label>
                      <p className="text-[11px] text-slate-500 leading-tight">Select completed years of experience</p>
                      <div className="relative">
                        <Award className="w-4 h-4 text-amber-600 absolute left-3.5 top-3 pointer-events-none" />
                        <select
                          value={form.experienceYears}
                          onChange={e => setField('experienceYears', e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:border-slate-400 text-xs font-semibold text-slate-900 outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-500/15 transition-all shadow-xs"
                        >
                          {EXPERIENCE_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>
                              {opt === '0' ? 'Fresher (0 Years)' : opt === '30+' ? '30+ Years' : `${opt} Year${opt === '1' ? '' : 's'}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="block text-xs font-bold text-slate-900 tracking-tight">
                        Current or Previous Company Name
                      </label>
                      <p className="text-[11px] text-slate-500 leading-tight">Last employer organization name or write 'Fresher'</p>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-amber-600 absolute left-3.5 top-3 pointer-events-none" />
                        <input
                          type="text"
                          value={form.currentCompany}
                          onChange={e => setField('currentCompany', e.target.value)}
                          placeholder="e.g. Infosys Ltd, TCS, Wipro (or 'Fresher' if no experience)"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:border-slate-400 text-xs font-semibold text-slate-900 outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-500/15 transition-all shadow-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Compensation & Notice */}
                  <div className="grid sm:grid-cols-4 gap-5">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-900 tracking-tight">
                        Current CTC
                      </label>
                      <p className="text-[11px] text-slate-500 leading-tight">Current annual salary</p>
                      <div className="relative">
                        <span className="text-amber-700 font-bold text-xs absolute left-3.5 top-2.5 pointer-events-none">₹</span>
                        <input
                          type="text"
                          value={form.currentCTC}
                          onChange={e => setField('currentCTC', e.target.value)}
                          placeholder="e.g. 4.5 LPA (or 0)"
                          className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:border-slate-400 text-xs font-semibold text-slate-900 outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-500/15 transition-all shadow-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-900 tracking-tight">
                        Expected CTC
                      </label>
                      <p className="text-[11px] text-slate-500 leading-tight">Target expected package</p>
                      <div className="relative">
                        <TrendingUp className="w-4 h-4 text-amber-600 absolute left-3.5 top-3 pointer-events-none" />
                        <input
                          type="text"
                          value={form.expectedCTC}
                          onChange={e => setField('expectedCTC', e.target.value)}
                          placeholder="e.g. 6.0 LPA"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:border-slate-400 text-xs font-semibold text-slate-900 outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-500/15 transition-all shadow-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-900 tracking-tight">
                        Notice Period
                      </label>
                      <p className="text-[11px] text-slate-500 leading-tight">Current notice duration</p>
                      <div className="relative">
                        <Clock className="w-4 h-4 text-amber-600 absolute left-3.5 top-3 pointer-events-none" />
                        <select
                          value={form.noticePeriod}
                          onChange={e => setField('noticePeriod', e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:border-slate-400 text-xs font-semibold text-slate-900 outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-500/15 transition-all shadow-xs"
                        >
                          {NOTICE_PERIODS.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-900 tracking-tight">
                        Joining Availability
                      </label>
                      <p className="text-[11px] text-slate-500 leading-tight">Earliest joining date</p>
                      <div className="relative">
                        <CheckCircle2 className="w-4 h-4 text-amber-600 absolute left-3.5 top-3 pointer-events-none" />
                        <select
                          value={form.joiningAvailability}
                          onChange={e => setField('joiningAvailability', e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:border-slate-400 text-xs font-semibold text-slate-900 outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-500/15 transition-all shadow-xs"
                        >
                          {NOTICE_PERIODS.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Form Actions Bottom Bar ── */}
              <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-xs p-4 sm:p-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-5 py-2.5 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all border border-slate-300 shadow-2xs"
                >
                  Reset Form
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-7 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 tracking-wide active:scale-98"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating Token & Registering...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Register Candidate & Issue Token</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
