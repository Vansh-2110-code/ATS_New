import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Plus, Search, Filter, X, Loader2, User, Phone, Mail,
  MapPin, Briefcase, Calendar, Edit3, Eye, CheckCircle2,
  ChevronLeft, ChevronRight, UserCheck, Clock, RefreshCw,
  Upload, File,
} from 'lucide-react';
import api from '../../services/api';
import { CANDIDATE_STATUS_OPTIONS, CANDIDATE_STATUS_COLORS } from '../../utils/candidateStatusUtils';

// ─── Constants ────────────────────────────────────────────────
const WALKIN_STATUSES = [...CANDIDATE_STATUS_OPTIONS];

const STATUS_COLORS: Record<string, string> = {
  ...CANDIDATE_STATUS_COLORS,
};

const YEARS_OPTIONS = Array.from({ length: 31 }, (_, i) => i);
const MONTHS_OPTIONS = Array.from({ length: 12 }, (_, i) => i);
const JOB_SOURCES = ['Direct/Walk-in', 'Naukri', 'LinkedIn', 'Shine', 'Internet', 'Friend', 'Referral', 'Other'];
const INTERVIEW_TYPES = ['Virtual', 'Walk-in Company', 'Walk-in WHM', 'Video Call', 'Phone Call', 'Face2Face'];
const GENDERS = ['Male', 'Female', 'Non-Binary', 'Prefer not to say'];
const NOTICE_PERIODS = ['Serving Notice period', '15 days or Less', '1 Month', '2 Months', '3 Months', 'N/A'];

const REGIONS = ['All India', 'All North India', 'All West India', 'All East India', 'All South India'];

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

const QUALIFICATION_GROUPS = [
  {
    group: 'UG',
    options: [
      'B.E/B.Tech – Mechanical', 'B.E/B.Tech – Electrical', 'B.E/B.Tech – Civil',
      'B.E/B.Tech – Computer Science', 'B.E/B.Tech – IT',
      'B.E/B.Tech – Electronics & Communication', 'BCA', 'B.Sc – Computer Science',
      'B.Sc – IT', 'B.Sc – General', 'B.Com', 'BBA', 'BBM', 'BA', 'B.Ed',
      'B.Pharm', 'B.Arch', 'LLB', 'MBBS',
    ],
  },
  {
    group: 'PG',
    options: [
      'M.E/M.Tech', 'M.Tech – Computer Science', 'M.Tech – IT', 'MCA',
      'M.Sc – Computer Science', 'M.Sc – IT', 'MBA – HR', 'MBA – Finance',
      'MBA – Marketing', 'MBA – Operations', 'MBA – General', 'M.Com', 'MA',
      'M.Sc – General', 'LLM', 'M.Pharm',
    ],
  },
  {
    group: 'Diploma',
    options: [
      'Diploma – Mechanical', 'Diploma – Electrical', 'Diploma – Civil',
      'Diploma – Electronics', 'Diploma – Computer Science', 'Polytechnic', 'ITI',
    ],
  },
  {
    group: 'Certification',
    options: [
      'CA', 'CMA', 'CS', 'PMP', 'ITIL', 'SAP Certified',
      'AWS Certified', 'Azure Certified', 'CCNA',
    ],
  },
];

const buildExperience = (years: number, months: number) => {
  if (years === 0 && months === 0) return 'Fresher';
  const y = years > 0 ? `${years} Year${years !== 1 ? 's' : ''}` : '';
  const m = months > 0 ? `${months} Month${months !== 1 ? 's' : ''}` : '';
  return [y, m].filter(Boolean).join(' ');
};

const parseExperience = (exp: string): { years: number; months: number } => {
  if (!exp || exp === 'Fresher') return { years: 0, months: 0 };
  const yearMatch = exp.match(/(\d+)\s*[Yy]ear/);
  const monthMatch = exp.match(/(\d+)\s*[Mm]onth/);
  return {
    years: yearMatch ? parseInt(yearMatch[1]) : 0,
    months: monthMatch ? parseInt(monthMatch[1]) : 0,
  };
};

function LocationPicker({
  prefix, region, state, city,
  onRegionChange, onStateChange, onCityChange,
}: {
  prefix: string;
  region: string; state: string; city: string;
  onRegionChange: (v: string) => void;
  onStateChange: (v: string) => void;
  onCityChange: (v: string) => void;
}) {
  const cities = state ? (CITIES_BY_STATE[state] || []) : [];
  return (
    <div className="grid sm:grid-cols-3 gap-3">
      <div>
        <label className="block text-xs text-slate-600 mb-1" style={{ fontWeight: 500 }}>{prefix} Region</label>
        <select value={region} onChange={e => onRegionChange(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 bg-white">
          <option value="">Select Region</option>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-600 mb-1" style={{ fontWeight: 500 }}>{prefix} State</label>
        <select value={state} onChange={e => { onStateChange(e.target.value); onCityChange(''); }}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 bg-white">
          <option value="">Select State</option>
          {STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-600 mb-1" style={{ fontWeight: 500 }}>{prefix} City</label>
        <select value={city} onChange={e => onCityChange(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 bg-white">
          <option value="">Select City</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
          {state && <option value="Other">Other</option>}
        </select>
      </div>
    </div>
  );
}

// ─── Empty Form ───────────────────────────────────────────────
const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  alternatePhone: '',
  jobOpeningSource: '',
  interviewType: '',
  positionApplied: '',
  experienceYears: 0,
  experienceMonths: 0,
  currentRegion: '',
  currentState: '',
  currentCity: '',
  currentSubLocation: '',
  localArea: '',
  qualification: '',
  university: '',
  yearOfGraduation: '',
  gender: '',
  currentCTC: '',
  expectedCTC: '',
  noticePeriod: '',
  dateOfBirth: '',
  joiningAvailability: '',
  skills: '',
  currentLocation: '',
  interviewDate: '',
  status: 'New' as string,
  notes: '',
  resume: null as File | null,
};

// ─── Add / Edit Modal ─────────────────────────────────────────
function WalkInFormModal({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial: typeof EMPTY_FORM & { _id?: string };
  onSave: (data: typeof EMPTY_FORM & { _id?: string }) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({ ...initial });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resumeFile, setResumeFile] = useState<File | null>(initial.resume || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = !!initial._id;

  const set = (key: string, value: any) =>
    setForm(f => ({ ...f, [key]: value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.phone.match(/^[0-9+\- ]{7,15}$/)) e.phone = 'Enter a valid phone number';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.currentState.trim()) e.currentState = 'Current state is required';
    if (!form.currentCity.trim()) e.currentCity = 'Current city is required';
    if (!form.qualification.trim()) e.qualification = 'Qualification is required';
    if (!isEdit && !resumeFile) e.resume = 'Resume is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    await onSave({ ...form, resume: resumeFile });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-slate-800" style={{ fontWeight: 700, fontSize: '1.1rem' }}>
              {isEdit ? 'Edit Walk-In Candidate' : 'Register Walk-In Candidate'}
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">
              {isEdit ? 'Update candidate information' : 'Add a new walk-in candidate to the system'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Basic info */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="Candidate's full name"
                  className={`w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm outline-none focus:border-green-400 transition-colors ${errors.name ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                />
              </div>
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>
                Phone <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                  className={`w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm outline-none focus:border-green-400 transition-colors ${errors.phone ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                />
              </div>
              {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="candidate@email.com"
                  className={`w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm outline-none focus:border-green-400 transition-colors ${errors.email ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>
                Position Applied
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={form.positionApplied}
                  onChange={e => set('positionApplied', e.target.value)}
                  placeholder="e.g. Customer Support Executive"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400"
                />
              </div>
            </div>
          </div>

          {/* Candidate Source Details */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>
                Alternate Phone
              </label>
              <input
                type="tel"
                value={form.alternatePhone}
                onChange={e => set('alternatePhone', e.target.value)}
                placeholder="Optional alternate number"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>
                Job Opening Source
              </label>
              <select
                value={form.jobOpeningSource}
                onChange={e => set('jobOpeningSource', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white"
              >
                <option value="">Select source</option>
                {JOB_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>
                Interview Type
              </label>
              <select
                value={form.interviewType}
                onChange={e => set('interviewType', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white"
              >
                <option value="">Select type</option>
                {INTERVIEW_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Experience */}
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>
              Experience
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={form.experienceYears}
                onChange={e => set('experienceYears', Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white"
              >
                {YEARS_OPTIONS.map(y => <option key={y} value={y}>{y} yr{y !== 1 ? 's' : ''}</option>)}
              </select>
              <select
                value={form.experienceMonths}
                onChange={e => set('experienceMonths', Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white"
              >
                {MONTHS_OPTIONS.map(m => <option key={m} value={m}>{m} mo</option>)}
              </select>
            </div>
            <p className="mt-1 text-xs text-slate-400">{buildExperience(form.experienceYears, form.experienceMonths)}</p>
          </div>

          {/* Location */}
          <div className="grid gap-4">
            <LocationPicker
              prefix="Current"
              region={form.currentRegion} state={form.currentState} city={form.currentCity}
              onRegionChange={(v) => set('currentRegion', v)}
              onStateChange={(v) => { set('currentState', v); setErrors(e => ({ ...e, currentState: '' })); }}
              onCityChange={(v) => { set('currentCity', v); setErrors(e => ({ ...e, currentCity: '' })); }}
            />
            {(errors.currentState || errors.currentCity) && (
              <p className="mt-1 text-xs text-red-500">{(errors.currentState && 'Current state is required.') || (errors.currentCity && 'Current city is required.')}</p>
            )}
            <div className="sm:w-1/3">
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>
                Sub Location / Local Area
              </label>
              <input
                type="text"
                value={form.currentSubLocation}
                onChange={e => {
                  set('currentSubLocation', e.target.value);
                  set('localArea', e.target.value);
                }}
                placeholder="e.g. Koramangala"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400"
              />
            </div>
          </div>

          {/* Education & Professional Details */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>
                Qualification <span className="text-red-500">*</span>
              </label>
              <select
                value={form.qualification}
                onChange={e => set('qualification', e.target.value)}
                className={`w-full px-3 py-2.5 border rounded-lg text-sm outline-none focus:border-green-400 bg-white ${errors.qualification ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
              >
                <option value="">Select Qualification</option>
                {QUALIFICATION_GROUPS.map((group) => (
                  <optgroup key={group.group} label={group.group}>
                    {group.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {errors.qualification && <p className="mt-1 text-xs text-red-500">{errors.qualification}</p>}
            </div>
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>
                University
              </label>
              <input
                type="text"
                value={form.university}
                onChange={e => set('university', e.target.value)}
                placeholder="College / University"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>
                Year of Graduation
              </label>
              <input
                type="text"
                value={form.yearOfGraduation}
                onChange={e => set('yearOfGraduation', e.target.value)}
                placeholder="e.g. 2022"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>
                Gender
              </label>
              <select
                value={form.gender}
                onChange={e => set('gender', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white"
              >
                <option value="">Select gender</option>
                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>
                Date of Birth
              </label>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={e => set('dateOfBirth', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>
                Joining Availability
              </label>
              <select
                value={form.joiningAvailability}
                onChange={e => set('joiningAvailability', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white"
              >
                <option value="">Select availability</option>
                {NOTICE_PERIODS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>
                Current CTC
              </label>
              <input
                type="text"
                value={form.currentCTC}
                onChange={e => set('currentCTC', e.target.value)}
                placeholder="e.g. 4.5 LPA"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>
                Expected CTC
              </label>
              <input
                type="text"
                value={form.expectedCTC}
                onChange={e => set('expectedCTC', e.target.value)}
                placeholder="e.g. 6 LPA"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>
                Notice Period
              </label>
              <select
                value={form.noticePeriod}
                onChange={e => set('noticePeriod', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white"
              >
                <option value="">Select notice period</option>
                {NOTICE_PERIODS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          {/* Interview Date & Status */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>
                Interview Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={form.interviewDate}
                  onChange={e => set('interviewDate', e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>
                Status
              </label>
              <select
                value={form.status}
                onChange={e => set('status', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white"
              >
                {WALKIN_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              placeholder="Additional notes about the candidate..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>
              Skills (comma separated)
            </label>
            <textarea
              value={form.skills}
              onChange={e => set('skills', e.target.value)}
              rows={2}
              placeholder="e.g. Java, Excel, Customer support"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 resize-none"
            />
          </div>

          {/* Resume Upload */}
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>
              Resume
            </label>
            {resumeFile ? (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <File className="w-4 h-4 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-green-800 truncate" style={{ fontWeight: 500 }}>{resumeFile.name}</p>
                  <p className="text-xs text-green-600">{(resumeFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={() => setResumeFile(null)}
                  className="text-green-600 hover:text-green-700 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-3 border-2 border-dashed border-slate-200 rounded-lg text-center text-sm text-slate-600 hover:border-green-400 hover:bg-green-50 transition-colors"
                style={{ fontWeight: 500 }}
              >
                <div className="flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span>Click to upload resume (PDF/DOC)</span>
                </div>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && file.size <= 10 * 1024 * 1024) {
                  setResumeFile(file);
                } else if (file) {
                  alert('File size must be less than 10 MB');
                }
              }}
              className="hidden"
            />
            <p className="text-xs text-slate-400 mt-1">PDF, DOCX (Max 10MB)</p>
            {errors.resume && <p className="mt-1 text-xs text-red-500">{errors.resume}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50"
            style={{ fontWeight: 500 }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ fontWeight: 600 }}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Register Walk-In'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail View Modal ────────────────────────────────────────
function WalkInDetailModal({
  candidate,
  onClose,
  onEdit,
  onStatusChange,
}: {
  candidate: any;
  onClose: () => void;
  onEdit: () => void;
  onStatusChange: (id: string, status: string) => Promise<void>;
}) {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-slate-800" style={{ fontWeight: 700, fontSize: '1.1rem' }}>Walk-In Candidate</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Profile header */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white" style={{ fontWeight: 700, fontSize: '1.3rem' }}>
                {candidate.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="text-slate-800 mb-0.5" style={{ fontWeight: 700, fontSize: '1.1rem' }}>{candidate.name}</h3>
              {candidate.positionApplied && (
                <p className="text-green-600 text-sm" style={{ fontWeight: 500 }}>{candidate.positionApplied}</p>
              )}
              <span className={`inline-block mt-1.5 text-xs px-2.5 py-0.5 rounded-full ${STATUS_COLORS[candidate.status] || 'bg-slate-100 text-slate-600'}`} style={{ fontWeight: 500 }}>
                {candidate.status || 'New'}
              </span>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {candidate.phone && (
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                {candidate.phone}
              </div>
            )}
            {candidate.email && (
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate">{candidate.email}</span>
              </div>
            )}
            {(candidate.currentLocation || candidate.location) && (
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                {candidate.currentLocation || candidate.location}
                {candidate.localArea && <span className="text-slate-400">· {candidate.localArea}</span>}
              </div>
            )}
            {candidate.experience && (
              <div className="flex items-center gap-2 text-slate-600">
                <Briefcase className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                {candidate.experience}
              </div>
            )}
            {candidate.interviewScheduled && (
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                {new Date(candidate.interviewScheduled).toLocaleDateString()}
              </div>
            )}
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              {new Date(candidate.createdAt).toLocaleDateString()}
            </div>
          </div>

          {/* Notes */}
          {candidate.notes && candidate.notes.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2" style={{ fontWeight: 600 }}>Notes</p>
              <div className="space-y-2">
                {(Array.isArray(candidate.notes) ? candidate.notes : []).slice(0, 3).map((n: any, i: number) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-600">
                    {typeof n === 'string' ? n : n.text}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resume */}
          {candidate.resume && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2" style={{ fontWeight: 600 }}>Resume</p>
              <a
                href={candidate.resume}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-3 bg-violet-50 border border-violet-200 rounded-lg text-sm text-violet-600 hover:bg-violet-100 transition-colors"
              >
                <File className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 truncate font-medium">View Resume</span>
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              </a>
            </div>
          )}

          {/* Status Change */}
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2" style={{ fontWeight: 600 }}>Update Status</p>
            <div className="flex flex-wrap gap-2">
              {WALKIN_STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => onStatusChange(candidate._id, s)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    candidate.status === s
                      ? (STATUS_COLORS[s] || 'bg-slate-100 text-slate-600') + ' border-transparent'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  style={{ fontWeight: candidate.status === s ? 600 : 400 }}
                >
                  {s === candidate.status && <CheckCircle2 className="inline w-3 h-3 mr-1" />}
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50"
            style={{ fontWeight: 500 }}
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit
          </button>
          <button
            onClick={() => navigate(`/recruiter/candidate/${candidate._id}`)}
            className="flex-1 py-2 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5"
            style={{ fontWeight: 600 }}
          >
            <Eye className="w-3.5 h-3.5" /> Full Profile
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export function WalkInManagementPage() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [viewTarget, setViewTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = { source: 'Walk-In', page: String(page), limit: '20' };
      if (search) params.search = search;
      if (statusFilter !== 'All') params.status = statusFilter;
      const res = await api.getCandidates(params);
      setCandidates(res.candidates || []);
      setTotal(res.pagination?.total || 0);
      setTotalPages(res.pagination?.pages || 1);
    } catch (err) {
      console.error('Failed to load walk-in candidates:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const handleAdd = async (form: typeof EMPTY_FORM) => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('phone', form.phone);
      if (form.email) fd.append('email', form.email);
      if (form.alternatePhone) fd.append('altPhone', form.alternatePhone);
      if (form.jobOpeningSource) fd.append('jobOpeningSource', form.jobOpeningSource);
      if (form.interviewType) fd.append('interviewType', form.interviewType);
      if (form.positionApplied) fd.append('positionApplied', form.positionApplied);
      fd.append('experience', buildExperience(form.experienceYears, form.experienceMonths));
      if (form.currentState) fd.append('currentState', form.currentState);
      if (form.currentCity) fd.append('currentCity', form.currentCity);
      if (form.currentSubLocation) fd.append('currentSubLocation', form.currentSubLocation);
      if (form.currentSubLocation || form.localArea) fd.append('localArea', form.currentSubLocation || form.localArea);
      if (form.currentRegion) fd.append('currentRegion', form.currentRegion);
      const currentLocation = [form.currentCity, form.currentState].filter(Boolean).join(', ') || form.currentLocation;
      if (currentLocation) fd.append('currentLocation', currentLocation);
      if (form.qualification) fd.append('qualification', form.qualification);
      if (form.university) fd.append('university', form.university);
      if (form.yearOfGraduation) fd.append('yearOfGraduation', form.yearOfGraduation);
      if (form.gender) fd.append('gender', form.gender);
      if (form.currentCTC) fd.append('currentCTC', form.currentCTC);
      if (form.expectedCTC) fd.append('expectedCTC', form.expectedCTC);
      if (form.noticePeriod) fd.append('noticePeriod', form.noticePeriod);
      if (form.dateOfBirth) fd.append('dateOfBirth', form.dateOfBirth);
      if (form.joiningAvailability) fd.append('joiningAvailability', form.joiningAvailability);
      if (form.skills) fd.append('skills', form.skills);
      if (form.interviewDate) fd.append('interviewScheduled', form.interviewDate);
      fd.append('source', 'Walk-In');
      fd.append('isWalkIn', 'true');
      fd.append('status', form.status);
      if (form.notes) fd.append('notes', form.notes);
      if (form.resume) fd.append('resume', form.resume);
      await api.createCandidate(fd);
      setShowAdd(false);
      load();
    } catch (err: any) {
      console.error('Failed to add walk-in:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (form: typeof EMPTY_FORM & { _id?: string }) => {
    if (!form._id) return;
    setSaving(true);
    try {
      if (form.resume) {
        // If resume is being uploaded, use FormData
        const fd = new FormData();
        fd.append('name', form.name);
        fd.append('phone', form.phone);
        fd.append('email', form.email);
        if (form.alternatePhone) fd.append('altPhone', form.alternatePhone);
        if (form.jobOpeningSource) fd.append('jobOpeningSource', form.jobOpeningSource);
        if (form.interviewType) fd.append('interviewType', form.interviewType);
        fd.append('positionApplied', form.positionApplied);
        fd.append('experience', buildExperience(form.experienceYears, form.experienceMonths));
        if (form.currentState) fd.append('currentState', form.currentState);
        if (form.currentCity) fd.append('currentCity', form.currentCity);
        if (form.currentSubLocation) fd.append('currentSubLocation', form.currentSubLocation);
        if (form.currentSubLocation || form.localArea) fd.append('localArea', form.currentSubLocation || form.localArea);
        const currentLocation = [form.currentCity, form.currentState].filter(Boolean).join(', ') || form.currentLocation;
        if (currentLocation) fd.append('currentLocation', currentLocation);
        if (form.qualification) fd.append('qualification', form.qualification);
        if (form.university) fd.append('university', form.university);
        if (form.yearOfGraduation) fd.append('yearOfGraduation', form.yearOfGraduation);
        if (form.gender) fd.append('gender', form.gender);
        if (form.currentCTC) fd.append('currentCTC', form.currentCTC);
        if (form.expectedCTC) fd.append('expectedCTC', form.expectedCTC);
        if (form.noticePeriod) fd.append('noticePeriod', form.noticePeriod);
        if (form.dateOfBirth) fd.append('dateOfBirth', form.dateOfBirth);
        if (form.joiningAvailability) fd.append('joiningAvailability', form.joiningAvailability);
        if (form.skills) fd.append('skills', form.skills);
        if (form.interviewDate) fd.append('interviewScheduled', form.interviewDate);
        fd.append('status', form.status);
        fd.append('resume', form.resume);
        await api.updateCandidate(form._id, fd);
      } else {
        // Otherwise use regular JSON
        const currentLocation = [form.currentCity, form.currentState].filter(Boolean).join(', ') || form.currentLocation;
        await api.updateCandidate(form._id, {
          name: form.name,
          phone: form.phone,
          email: form.email,
          altPhone: form.alternatePhone,
          jobOpeningSource: form.jobOpeningSource,
          interviewType: form.interviewType,
          positionApplied: form.positionApplied,
          experience: buildExperience(form.experienceYears, form.experienceMonths),
          localArea: form.currentSubLocation || form.localArea,
          currentState: form.currentState,
          currentCity: form.currentCity,
          currentSubLocation: form.currentSubLocation,
          currentLocation,
          qualification: form.qualification,
          university: form.university,
          yearOfGraduation: form.yearOfGraduation,
          gender: form.gender,
          currentCTC: form.currentCTC,
          expectedCTC: form.expectedCTC,
          noticePeriod: form.noticePeriod,
          dateOfBirth: form.dateOfBirth || undefined,
          joiningAvailability: form.joiningAvailability,
          skills: form.skills,
          interviewScheduled: form.interviewDate || undefined,
          status: form.status,
        });
      }
      setEditTarget(null);
      load();
    } catch (err: any) {
      console.error('Failed to update walk-in:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.updateCandidateStatus(id, status);
      setCandidates(prev => prev.map(c => c._id === id ? { ...c, status } : c));
      if (viewTarget?._id === id) setViewTarget((v: any) => ({ ...v, status }));
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const openEdit = (candidate: any) => {
    const { years, months } = parseExperience(candidate.experience || '');
    setEditTarget({
      _id: candidate._id,
      name: candidate.name || '',
      phone: candidate.phone || '',
      email: candidate.email || '',
      alternatePhone: candidate.altPhone || '',
      jobOpeningSource: candidate.jobOpeningSource || '',
      interviewType: candidate.interviewType || '',
      positionApplied: candidate.positionApplied || '',
      experienceYears: years,
      experienceMonths: months,
      currentState: candidate.currentState || '',
      currentCity: candidate.currentCity || '',
      currentSubLocation: candidate.currentSubLocation || candidate.localArea || '',
      localArea: candidate.localArea || candidate.currentSubLocation || '',
      qualification: candidate.qualification || '',
      university: candidate.university || '',
      yearOfGraduation: candidate.yearOfGraduation || '',
      gender: candidate.gender || '',
      currentCTC: candidate.currentCTC || '',
      expectedCTC: candidate.expectedCTC || '',
      noticePeriod: candidate.noticePeriod || '',
      dateOfBirth: candidate.dateOfBirth
        ? new Date(candidate.dateOfBirth).toISOString().split('T')[0]
        : '',
      joiningAvailability: candidate.joiningAvailability || '',
      skills: Array.isArray(candidate.skills) ? candidate.skills.join(', ') : (candidate.skills || ''),
      currentLocation: candidate.currentLocation || '',
      interviewDate: candidate.interviewScheduled
        ? new Date(candidate.interviewScheduled).toISOString().split('T')[0]
        : '',
      status: candidate.status || 'New',
      notes: '',
      resume: null,
    });
    setViewTarget(null);
  };

  const statusCounts = WALKIN_STATUSES.reduce((acc, s) => {
    acc[s] = candidates.filter(c => c.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-slate-800" style={{ fontWeight: 700, fontSize: '1.4rem' }}>Walk-In Candidates</h1>
          <p className="text-slate-500 text-sm mt-0.5">{total} total walk-in candidate{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="p-2.5 border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700 transition-colors"
            style={{ fontWeight: 600 }}
          >
            <Plus className="w-4 h-4" />
            Register Walk-In
          </button>
        </div>
      </div>

      {/* Status Snapshot */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {WALKIN_STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? 'All' : s)}
            className={`rounded-xl p-3 border text-left transition-all ${
              statusFilter === s
                ? 'ring-2 ring-green-400 border-green-200 bg-green-50'
                : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
            }`}
          >
            <div className="text-slate-800" style={{ fontWeight: 700, fontSize: '1.25rem' }}>
              {loading ? '—' : statusCounts[s] || 0}
            </div>
            <div className={`text-xs mt-0.5 ${STATUS_COLORS[s]?.split(' ')[1] || 'text-slate-500'}`} style={{ fontWeight: 500 }}>
              {s}
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white"
            >
              <option value="All">All Statuses</option>
              {WALKIN_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
        </div>
      ) : candidates.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center">
          <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-700 mb-1" style={{ fontWeight: 600 }}>No walk-in candidates found</p>
          <p className="text-slate-400 text-sm mb-4">
            {search || statusFilter !== 'All'
              ? 'Try adjusting your filters.'
              : 'Register the first walk-in candidate to get started.'}
          </p>
          {!search && statusFilter === 'All' && (
            <button
              onClick={() => setShowAdd(true)}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
              style={{ fontWeight: 500 }}
            >
              Register Walk-In
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs text-slate-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>#</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Candidate</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Contact</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Experience</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Local Area</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Status</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Assigned To</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Registered</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {candidates.map((c: any, i: number) => (
                  <tr key={c._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-sm">{(page - 1) * 20 + i + 1}</td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-green-700 text-xs" style={{ fontWeight: 700 }}>
                            {c.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <Link
                            to={`/recruiter/candidate/${c._id}`}
                            className="text-slate-700 text-sm hover:text-green-600 transition-colors"
                            style={{ fontWeight: 500 }}
                          >
                            {c.name}
                          </Link>
                          {c.positionApplied && (
                            <p className="text-slate-400 text-xs">{c.positionApplied}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-slate-600 text-sm">{c.phone}</div>
                      {c.email && <div className="text-slate-400 text-xs truncate max-w-[140px]">{c.email}</div>}
                    </td>

                    <td className="px-4 py-3 text-slate-600 text-sm">{c.experience || '—'}</td>

                    <td className="px-4 py-3 text-slate-500 text-sm">{c.localArea || '—'}</td>

                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full ${STATUS_COLORS[c.status] || 'bg-slate-100 text-slate-600'}`}
                        style={{ fontWeight: 500 }}
                      >
                        {c.status || 'New'}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {c.assignedRecruiterName ? (
                        <span className="text-slate-600 text-xs">{c.assignedRecruiterName}</span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setViewTarget(c)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 text-slate-400 hover:text-green-600 rounded-lg hover:bg-green-50 transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-slate-400 text-xs">Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <WalkInFormModal
          initial={{ ...EMPTY_FORM }}
          onSave={handleAdd}
          onClose={() => setShowAdd(false)}
          saving={saving}
        />
      )}

      {/* Edit Modal */}
      {editTarget && (
        <WalkInFormModal
          initial={editTarget}
          onSave={handleEdit}
          onClose={() => setEditTarget(null)}
          saving={saving}
        />
      )}

      {/* Detail Modal */}
      {viewTarget && (
        <WalkInDetailModal
          candidate={viewTarget}
          onClose={() => setViewTarget(null)}
          onEdit={() => openEdit(viewTarget)}
          onStatusChange={async (id, status) => {
            await handleStatusChange(id, status);
          }}
        />
      )}
    </div>
  );
}
