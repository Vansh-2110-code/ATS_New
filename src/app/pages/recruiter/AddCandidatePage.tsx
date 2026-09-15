import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  ArrowLeft, CheckCircle2, Upload, User, Phone, Mail, Briefcase,
  Loader2, AlertCircle, MapPin, Calendar, Award, Send, Info, Sparkles,
  AlertTriangle, ExternalLink, Lock, Shield, Zap,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { calculateAge } from '../../utils/ageCalculator';
import { ExtractionPreviewModal } from '../../components/ExtractionPreviewModal';
import { DepartmentDropdown } from '../../components/DepartmentDropdown';
import { CANDIDATE_STATUS_OPTIONS } from '../../utils/candidateStatusUtils';

const API_BASE = window.location.origin;

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

const NOTICE_PERIODS = [
  'Serving Notice period', '15 days or Less', '1 Month', '2 Months', '3 Months', 'N/A',
];

const JOB_SOURCES = [
  'Direct/Walk-in', 'Naukri', 'LinkedIn', 'Shine', 'Internet', 'Friend', 'College',
  'Jobfair', 'Instagram', 'Referral', 'Campus', 'Other',
];

const INTERVIEW_TYPES = ['Virtual', 'Walk-in Company', 'Walk-in WHM', 'Video Call', 'Phone Call', 'Face2Face'];

const GENDERS = ['Male', 'Female', 'Non-Binary', 'Prefer not to say'];

const FIRST_CALL_STATUSES = [...CANDIDATE_STATUS_OPTIONS];

const COMMUNICATION_RATINGS = ['Excellent', 'Good', 'Average', 'Poor', 'None'];

const INTERVIEW_STATUSES = [
  'Interview Scheduled', 'Interview Rescheduled', 'Interview Completed',
  'Interview Feedback Pending', 'Shortlisted', 'Rejected – Interview Round',
  'On Hold', 'HR Round Scheduled',
];

const POST_OFFER_STATUSES = [
  'Offer in Progress', 'Offer Approval Pending', 'Offer Released',
  'Offer Accepted', 'Offer Declined', 'Salary Negotiation in Progress',
  'Documents Pending', 'Background Verification Initiated',
  'Background Verification Cleared', 'Background Verification Failed',
  'Joining Date Confirmed', 'Joining Postponed',
];

const GRAD_YEARS = Array.from({ length: 2026 - 1975 + 1 }, (_, i) => 1975 + i);

const EXPERIENCE_OPTIONS = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '30+',
];

// ─── Location Picker Component ───────────────────────────────
function LocationPicker({
  prefix, state, city, disabled,
  onStateChange, onCityChange,
}: {
  prefix: string;
  state: string; city: string;
  disabled?: boolean;
  onStateChange: (v: string) => void;
  onCityChange: (v: string) => void;
}) {
  const cities = state ? (CITIES_BY_STATE[state] || []) : [];
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <div>
        <label className="block text-xs text-slate-600 mb-1" style={{ fontWeight: 500 }}>{prefix} State</label>
        <select value={state} onChange={e => { onStateChange(e.target.value); onCityChange(''); }} disabled={disabled}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed">
          <option value="">Select State</option>
          {STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-600 mb-1" style={{ fontWeight: 500 }}>{prefix} City</label>
        <select value={city} onChange={e => onCityChange(e.target.value)} disabled={disabled}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed">
          <option value="">Select City</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
          {state && <option value="Other">Other</option>}
        </select>
      </div>
    </div>
  );
}

// ─── Form State ───────────────────────────────────────────────
const EMPTY_FORM = {
  // JR auto-fill
  jrNumber: '',
  clientName: '',
  positionApplied: '',
  recruiterName: '',
  recruiterEmail: '',
  sourcedBy: '',
  sourceStatus: 'Active' as string,

  candidateName: '',
  candidatePhone: '',
  jobOpeningSource: '',
  interviewType: '',
  candidateEmail: '',
  alternatePhone: '',

  currentState: '',
  currentCity: '',
  currentSubLocation: '',

  preferredState: '',
  preferredCity: '',

  qualification: '',
  university: '',
  yearOfGraduation: '',
  experienceYears: '',
  currentCompany: '',
  gender: '',

  currentCTC: '',
  expectedCTC: '',

  noticePeriod: '',
  dateOfBirth: '',
  joiningAvailability: '',
  clientCandidateId: '',
  candidateEmployeeId: '',
  resume: null as File | null,

  // Job Details
  department: '',
  client: '',
  projectedRole: '',
  recruiterApplyEmail: '',
  sourceDetails: '',

  // Eligible Tracker Details
  jobLevel: '',
  vendorSPOC: '',
  companySPOC: '',
  relevantExperience: '',
  cibilScore: '',
  panCardNumber: '',

  // First Call Status
  candidateContacted: true,
  firstCallStatus: '',
  firstCallOtherReason: '',
  communicationRating: 'Good',
  firstCallInterviewType: '',
  eligibleRole: '',
  callBack: '',
  firstCallDate: '',
  firstCallTime: '',
  firstCallEmail: '',
  comments: '',

  // Candidate Final Details
  candidateAge: '',
  recruiterStatus: '',
  walkInSchedule: '',
  tentativeDOJ: '',

  // Interview Status
  interviewStatus: '',
  finalInterviewSlotStatus: '',
  scheduledDate: '',
  finalSelectDate: '',
  candidateStatusPostOffer: '',
  offeredDate: '',
  designationOffered: '',
  joiningSalary: '',
    placementPercentage: '',
  dateOfJoining: '',
  finalInterviewStatus: '',
  finalInterviewLocked: false,

  // Candidate Flags
  isBlacklisted: false,
  rehireEligible: true,
  candidateActiveStatus: 'Active',
  isPriority: false,
  isDuplicate: false,
};

export function AddCandidatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const candidateId = searchParams.get('id') || '';
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isRecruiter = user?.role === 'recruiter';
  const isTLOrAdmin = user?.role === 'tl' || user?.role === 'admin' || user?.role === 'manager';
  const canEditInterviewStatus = ['admin', 'tl', 'manager'].includes(user?.role ?? '');
  // TL and Manager have full edit permissions now
  const isTLReadOnly = false;
  // Recruiter viewing an existing candidate → allow editing candidate profile
  const isLockedCoreFields = false;

  const [form, setForm] = useState({ ...EMPTY_FORM, recruiterName: user?.name || '', recruiterEmail: user?.email || '', recruiterApplyEmail: user?.email || '', sourcedBy: user?.name || '' });
  const isLockedByFinalInterview = form.finalInterviewLocked && !isAdmin && user?.role !== 'tl' && user?.role !== 'manager';
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pageLoading, setPageLoading] = useState(!!candidateId);
  const [extracting, setExtracting] = useState(false);
  const [extractMsg, setExtractMsg] = useState('');
  const [parsedSkills, setParsedSkills] = useState<string[]>([]);

  // Extraction preview modal
  const [showExtractionPreview, setShowExtractionPreview] = useState(false);
  const [extractionData, setExtractionData] = useState<any>(null);
  const [resumeFileName, setResumeFileName] = useState('');
  const [resumeFileUrl, setResumeFileUrl] = useState('');

  // Duplicate detection
  const [dupChecking, setDupChecking] = useState(false);
  const [dupResult, setDupResult] = useState<any>(null);
  const dupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // JR list for auto-fill
  const [jobs, setJobs] = useState<any[]>([]);
  const [jrSearch, setJrSearch] = useState('');
  useEffect(() => {
    api.getJobs({ limit: '1000' }).then((d: any) => setJobs(d.jobs || [])).catch(() => { });
  }, []);

  const filteredJobs = jobs.filter(j => 
    (j.jrNumber || '').toLowerCase().includes(jrSearch.toLowerCase()) ||
    (j.jobTitle || '').toLowerCase().includes(jrSearch.toLowerCase()) ||
    (j.client || j.companyName || '').toLowerCase().includes(jrSearch.toLowerCase())
  );

  // ── Load existing candidate (edit / TL view mode) ────────────
  useEffect(() => {
    if (!candidateId) return;
    setPageLoading(true);
    api.getCandidate(candidateId)
      .then((raw: any) => {
        const c = raw.candidate || raw;
        // Map backend fields → form fields
        const expRaw = c.experience || '';
        const expYears = expRaw.replace(/[^\d]/g, '') || '';
        setForm(prev => ({
          ...prev,
          clientCandidateId:     c.clientCandidateId || '',
          candidateEmployeeId:   c.candidateEmployeeId || '',
          candidateName:         c.name || '',
          candidatePhone:        c.phone || '',
          candidateEmail:        c.email || '',
          alternatePhone:        c.altPhone || '',
          jobOpeningSource:      c.source || '',
          interviewType:         c.interviewType || '',
          jrNumber:              c.jrNumber || '',
          clientName:            c.clientName || '',
          positionApplied:       c.positionApplied || '',
          recruiterName:         c.assignedRecruiterName || c.recruiterName || '',
          recruiterEmail:        c.recruiterEmail || '',
          sourcedBy:             c.sourcedBy || '',
          sourceStatus:          c.sourceStatus || 'Active',
          experienceYears:       expYears,
          currentCompany:        c.currentCompany || '',
          qualification:         c.qualification || '',
          university:            c.university || '',
          yearOfGraduation:      c.yearOfGraduation || '',
          gender:                c.gender || '',
          currentCTC:            c.currentCTC || '',
          expectedCTC:           c.expectedCTC || '',
          noticePeriod:          c.noticePeriod || '',
          dateOfBirth:           c.dateOfBirth ? c.dateOfBirth.split('T')[0] : '',
          joiningAvailability:   c.joiningAvailability || '',
          currentState:          c.currentState || '',
          currentCity:           c.currentCity || '',
          currentSubLocation:    c.localArea || c.currentSubLocation || '',
          preferredState:        c.preferredState || '',
          preferredCity:         c.preferredCity || '',
          // Eligible Tracker Details
          jobLevel:              c.jobLevel || '',
          vendorSPOC:            c.vendorSPOC || '',
          companySPOC:           c.companySPOC || '',
          relevantExperience:    c.relevantExperience || '',
          cibilScore:            c.cibilScore || '',
          panCardNumber:         c.panCardNumber || '',
          // Job Details
          department:            c.department || '',
          client:                c.client || '',
          projectedRole:         c.projectedRole || '',
          recruiterApplyEmail:   c.recruiterApplyEmail || '',
          sourceDetails:         c.sourceDetails || '',
          // First Call
          candidateContacted:    !!c.candidateContacted,
          firstCallStatus:       c.firstCallStatus || '',
          firstCallOtherReason:  c.firstCallOtherReason || '',
          communicationRating:   c.communicationRating || '',
          firstCallInterviewType:c.firstCallInterviewType || '',
          eligibleRole:          c.eligibleRole || '',
          callBack:              c.callBack || '',
          firstCallDate:         c.firstCallDate ? c.firstCallDate.split('T')[0] : '',
          firstCallTime:         c.firstCallTime || '',
          firstCallEmail:        c.firstCallEmail || '',
          comments:              c.comments || '',
          firstCallSubmitted:    !!c.firstCallSubmitted,
          // Final Details
          candidateAge:          c.candidateAge || '',
          recruiterStatus:       c.recruiterStatus || '',
          walkInSchedule:        c.walkInSchedule ? c.walkInSchedule.replace('Z', '').slice(0, 16) : '',
          tentativeDOJ:          c.tentativeDOJ ? c.tentativeDOJ.split('T')[0] : '',
          finalDetailsSubmitted: !!c.finalDetailsSubmitted,
          // Interview Status
          interviewStatus:       c.interviewStatus || '',
          finalInterviewSlotStatus: c.finalInterviewSlotStatus || '',
          scheduledDate:         c.scheduledDate ? c.scheduledDate.split('T')[0] : '',
          finalSelectDate:       c.finalSelectDate ? c.finalSelectDate.split('T')[0] : '',
          finalRoundStatus:      c.finalRoundStatus || '',
          candidateStatusPostOffer: c.candidateStatusPostOffer || '',
          offeredDate:           c.offeredDate ? c.offeredDate.split('T')[0] : '',
          designationOffered:    c.designationOffered || '',
          joiningSalary:         c.joiningSalary || '',
          placementPercentage:   c.placementPercentage || '',
          dateOfJoining:         c.dateOfJoining ? c.dateOfJoining.split('T')[0] : '',
          finalInterviewStatus:  c.finalInterviewStatus || '',
          finalInterviewLocked:  !!c.finalInterviewLocked,
          // Flags
          isBlacklisted:         !!c.isBlacklisted,
          rehireEligible:        c.rehireEligible !== false,
          candidateActiveStatus: c.candidateActiveStatus || 'Active',
          isPriority:            !!c.isPriority,
          isDuplicate:           !!c.isDuplicate,
        }));
        if (c.skills?.length) setParsedSkills(c.skills);
        if (c.resumeOriginalName) setResumeFileName(c.resumeOriginalName);
        if (c.resumePath) setResumeFileUrl(`${API_BASE}${c.resumePath}`);
      })
      .catch(() => setErrors({ form: 'Failed to load candidate data.' }))
      .finally(() => setPageLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId]);

  // ── Auto-fill from query params (e.g. redirected from ATS Scanner Universal Role Tag) ──
  useEffect(() => {
    if (candidateId) return;
    const jrNum = searchParams.get('jrNumber');
    const name = searchParams.get('name');
    const email = searchParams.get('email');
    const phone = searchParams.get('phone');
    const role = searchParams.get('role');
    const dept = searchParams.get('department');
    const exp = searchParams.get('experience');

    if (jrNum || name || email || phone || role || dept || exp) {
      setForm(prev => ({
        ...prev,
        ...(name ? { candidateName: name } : {}),
        ...(email ? { candidateEmail: email } : {}),
        ...(phone ? { candidatePhone: phone } : {}),
        ...(role ? { positionApplied: role, projectedRole: role, eligibleRole: role } : {}),
        ...(dept ? { department: dept } : {}),
        ...(exp ? { experienceYears: exp.replace(/[^\d]/g, '') } : {}),
        ...(jrNum ? { jrNumber: jrNum } : {})
      }));

      if (jrNum && jobs.length > 0) {
        const foundJob = jobs.find((j: any) => j.jrNumber === jrNum);
        if (foundJob) {
          setForm(prev => ({
            ...prev,
            clientName: foundJob.client || foundJob.companyName || '',
            positionApplied: role || foundJob.jobTitle || '',
            projectedRole: role || foundJob.jobTitle || '',
            department: dept || foundJob.department || foundJob.division || '',
            client: foundJob.companyName || foundJob.client || '',
          }));
        }
      }
    }
  }, [candidateId, searchParams, jobs]);


  // Real-time duplicate detection with 600ms debounce
  const triggerDupCheck = useCallback((phone: string, email: string) => {
    if (dupTimerRef.current) clearTimeout(dupTimerRef.current);
    const cleaned = (phone || '').replace(/\D/g, '');
    const isPhoneValid = cleaned.length >= 10;
    const isEmailValid = !!(email || '').match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

    if (!isPhoneValid && !isEmailValid) {
      setDupResult(null);
      return;
    }

    dupTimerRef.current = setTimeout(async () => {
      setDupChecking(true);
      try {
        const params: any = {};
        if (isPhoneValid) params.phone = cleaned.slice(-10);
        if (isEmailValid) params.email = email;
        const res: any = await api.checkDuplicate(params);
        setDupResult(res.duplicate ? res.candidate : null);
      } catch {
        setDupResult(null);
      } finally {
        setDupChecking(false);
      }
    }, 600);
  }, []);

  // JR auto-fill
  const handleJrSelect = (jrNum: string) => {
    if (errors.jrNumber) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy.jrNumber;
        return copy;
      });
    }
    const job = jobs.find((j: any) => j.jrNumber === jrNum);
    if (job) {
      setForm(f => ({
        ...f,
        jrNumber: jrNum,
        clientName: job.client || job.companyName || '',
        positionApplied: job.jobTitle || '',
        recruiterName: user?.name || job.recruiterName || '',
        recruiterEmail: user?.email || job.recruiterEmail || '',
        sourcedBy: user?.name || '',
        sourceStatus: 'Active',
        // Auto-fill for Job Details section
        department: job.department || '',
        client: job.companyName || job.client || '',
        projectedRole: job.jobTitle || '',
      }));
    } else {
      setForm(f => ({ ...f, jrNumber: jrNum }));
    }
  };

  // ── Resume auto-extraction with preview modal ──────────────
  const handleResumeUpload = async (file: File | null) => {
    if (!file) { setForm(f => ({ ...f, resume: null })); return; }
    setForm(f => ({ ...f, resume: file }));
    setExtracting(true);
    setExtractMsg('');
    try {
      const fd = new FormData();
      fd.append('resume', file);
      // Use authenticated API endpoint (same as Resume Scanning)
      const data = await api.scanResume(fd);
      console.log('Resume extraction response:', data); // DEBUG

      // Handle wrapped response (same logic as ResumeScanPage)
      const parsedResult = data.result || data;
      console.log('Parsed result:', parsedResult); // DEBUG

      // Ensure we have the expected structure
      const extractedData = {
        name: parsedResult?.name || '',
        email: parsedResult?.email || '',
        phone: parsedResult?.phone || '',
        location: parsedResult?.location || '',
        skills: parsedResult?.skills || [],
        experience: parsedResult?.experience || [],
        education: parsedResult?.education || [],
        summary: parsedResult?.summary || '',
        atsScore: parsedResult?.atsScore || 0,
        linkedin: parsedResult?.linkedin || '',
        certifications: parsedResult?.certifications || [],
        keywords: parsedResult?.keywords || { found: [], missing: [] },
        suggestions: parsedResult?.suggestions || [],
      };

      // Store extracted data and show preview modal
      setExtractionData(extractedData);
      setResumeFileName(file.name);
      setShowExtractionPreview(true);

      // Set message based on whether data was extracted
      const hasData = extractedData.name || extractedData.email || extractedData.phone || extractedData.skills.length > 0 || extractedData.education.length > 0;
      if (!hasData) {
        setExtractMsg('Resume uploaded but no data could be automatically extracted. You can manually fill in the details or try a different resume file.');
      }
    } catch (err: any) {
      console.error('Resume extraction error:', err);
      setExtractMsg(`Error: ${err.message || 'Failed to process resume'}. Please try another file or fill in manually.`);
      setExtracting(false);
    } finally {
      setExtracting(false);
    }
  };

  // Confirm auto-fill after user reviews extraction preview
  const confirmAutoFill = (editedData: Record<string, any>) => {
    setForm(f => {
      const updated = { ...f };
      // Basic contact info
      if (editedData.name) updated.candidateName = editedData.name;
      if (editedData.email) updated.candidateEmail = editedData.email;
      if (editedData.phone) {
        const digits = editedData.phone.replace(/\D/g, '').slice(-10);
        if (digits.length === 10) updated.candidatePhone = digits;
      }
      if (editedData.linkedin) updated.resumeLink = editedData.linkedin;
      if (editedData.summary) updated.comments = editedData.summary;

      // Experience info
      if (editedData.experience && editedData.experience.trim()) {
        const yr = editedData.experience.match(/(\d+)/);
        if (yr) updated.experienceYears = yr[1];
      }
      if (editedData.experienceCompany) updated.currentCompany = editedData.experienceCompany;
      if (editedData.experienceTitle) updated.currentDesignation = editedData.experienceTitle;

      // Education info
      if (editedData.education && editedData.education.trim()) {
        const deg: string = editedData.education || '';
        const degLower = deg.toLowerCase();
        const matched = QUALIFICATION_GROUPS.flatMap(g => g.options).find(
          opt => degLower.includes(opt.toLowerCase().split(' – ')[0].toLowerCase())
            || opt.toLowerCase().split(' – ')[0].toLowerCase().split('/').some(p => degLower.includes(p.trim()))
        );
        if (matched) updated.qualification = matched;
      }
      if (editedData.university && editedData.university.trim()) {
        updated.university = editedData.university;
      }
      if (editedData.educationYear && editedData.educationYear.trim()) {
        const year = parseInt(editedData.educationYear);
        if (!isNaN(year) && year > 1970 && year < 2100) {
          const gradYearIndex = GRAD_YEARS.indexOf(year);
          if (gradYearIndex !== -1) updated.graduationYear = year;
        }
      }

      // Location
      if (editedData.location && editedData.location.trim()) {
        const locLower = editedData.location.toLowerCase();
        let matchedState = '';
        let matchedCity = '';
        for (const [state, cities] of Object.entries(CITIES_BY_STATE)) {
          const cityMatch = cities.find(c => locLower.includes(c.toLowerCase()));
          if (cityMatch) { matchedState = state; matchedCity = cityMatch; break; }
        }
        if (matchedCity) { updated.currentCity = matchedCity; updated.currentState = matchedState; }
      }
      return updated;
    });

    // Auto-fill skills from parsed data
    if (editedData.skills && typeof editedData.skills === 'string' && editedData.skills.trim()) {
      setParsedSkills(editedData.skills.split(',').map((s: string) => s.trim()).filter(Boolean));
    }

    // Auto-fill certifications if available
    if (editedData.certifications && typeof editedData.certifications === 'string' && editedData.certifications.trim()) {
      const certs = editedData.certifications.split(',').map((c: string) => c.trim()).filter(Boolean);
      if (certs.length > 0) {
        setForm(f => ({ ...f, comments: (f.comments || '') + (f.comments ? ' | Certs: ' : 'Certs: ') + certs.join(', ') }));
      }
    }

    const filledCount = [
      editedData.name,
      editedData.email,
      editedData.phone,
      editedData.location,
      editedData.skills?.trim?.() ? 'skills' : '',
      editedData.experienceCompany ? 'company' : '',
      editedData.education ? 'education' : '',
      editedData.linkedin ? 'linkedin' : '',
    ].filter(Boolean).length;

    setExtractMsg(filledCount > 0
      ? `Auto-filled ${filledCount} field${filledCount > 1 ? 's' : ''} from resume. Please verify and complete the rest.`
      : 'Resume uploaded. Could not extract details automatically — please fill in manually.');

    setShowExtractionPreview(false);
    setExtractionData(null);
  };

  const set = (key: string, value: any) => {
    setForm(f => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(e => { const c = { ...e }; delete c[key]; return c; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.candidateName.trim()) e.candidateName = 'Candidate name is required';
    if (!form.candidatePhone.match(/^\d{10}$/)) e.candidatePhone = 'Enter a valid 10-digit phone number';
    if (!form.jrNumber || !form.jrNumber.trim()) e.jrNumber = 'Please select a Job Requirement (JR). JR selection is mandatory.';
    if (form.candidateContacted && !form.firstCallStatus) e.firstCallStatus = 'First call status is required';
    setErrors(e);

    if (Object.keys(e).length > 0) {
      if (e.jrNumber) {
        const jrEl = document.getElementById('jr-selection-card');
        if (jrEl) {
          jrEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return false;
    }
    return true;
  };

  const handleSubmit = async (ev?: React.FormEvent | React.MouseEvent) => {
    ev?.preventDefault();

    // TL in read-only mode → only update Interview Status fields
    if (isTLReadOnly && candidateId) {
      setSubmitting(true);
      try {
        await api.updateCandidate(candidateId, {
          interviewStatus:          form.interviewStatus,
          finalInterviewSlotStatus: form.finalInterviewSlotStatus,
          scheduledDate:            form.scheduledDate,
          finalSelectDate:          form.finalSelectDate,
          finalRoundStatus:         form.finalRoundStatus,
          candidateStatusPostOffer: form.candidateStatusPostOffer,
          offeredDate:              form.offeredDate,
          designationOffered:       form.designationOffered,
          joiningSalary:            form.joiningSalary,
          placementPercentage:      form.placementPercentage,
          dateOfJoining:            form.dateOfJoining,
          candidateEmployeeId:      form.candidateEmployeeId,
          finalInterviewStatus:     form.finalInterviewStatus,
        });
        setSubmitted(true);
      } catch (err: any) {
        setErrors({ form: err.message || 'Failed to save Interview Status.' });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!validate()) {
      if (!form.jrNumber || !form.jrNumber.trim()) {
        alert('⚠️ Mandatory Field Missing: Please select a Job Requirement (JR) before submitting.');
      }
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('name', form.candidateName);
      fd.append('phone', form.candidatePhone);
      if (form.clientCandidateId) fd.append('clientCandidateId', form.clientCandidateId);
      if (form.candidateEmployeeId) fd.append('candidateEmployeeId', form.candidateEmployeeId);
      if (form.candidateEmail) fd.append('email', form.candidateEmail);
      if (form.alternatePhone) fd.append('altPhone', form.alternatePhone);
      if (form.jobOpeningSource) fd.append('source', form.jobOpeningSource);
      if (form.interviewType) fd.append('interviewType', form.interviewType);
      if (form.jrNumber) fd.append('jrNumber', form.jrNumber);
      if (form.clientName) fd.append('clientName', form.clientName);
      if (form.positionApplied) fd.append('positionApplied', form.positionApplied);
      if (form.recruiterName) fd.append('recruiterName', form.recruiterName);
      if (form.recruiterEmail) fd.append('recruiterEmail', form.recruiterEmail);
      if (form.sourcedBy) fd.append('sourcedBy', form.sourcedBy);
      if (form.sourceStatus) fd.append('sourceStatus', form.sourceStatus);
      if (form.experienceYears) fd.append('experience', form.experienceYears === '30+' ? '30+ Years' : `${form.experienceYears} Year${form.experienceYears === '1' ? '' : 's'}`);
      if (form.currentCompany) fd.append('currentCompany', form.currentCompany);
      if (form.qualification) fd.append('qualification', form.qualification);
      if (form.university) fd.append('university', form.university);
      if (form.yearOfGraduation) fd.append('yearOfGraduation', form.yearOfGraduation);
      if (form.gender) fd.append('gender', form.gender);
      if (form.currentCTC) fd.append('currentCTC', form.currentCTC);
      if (form.expectedCTC) fd.append('expectedCTC', form.expectedCTC);
      if (form.noticePeriod) fd.append('noticePeriod', form.noticePeriod);
      if (form.dateOfBirth) fd.append('dateOfBirth', form.dateOfBirth);
      if (form.joiningAvailability) fd.append('joiningAvailability', form.joiningAvailability);
      if (form.currentSubLocation) fd.append('localArea', form.currentSubLocation);
      if (form.currentSubLocation) fd.append('currentSubLocation', form.currentSubLocation);
      if (form.currentCity || form.currentState) fd.append('currentLocation', form.currentCity || form.currentState);
      if (form.currentState) fd.append('currentState', form.currentState);
      if (form.currentCity) fd.append('currentCity', form.currentCity);
      if (form.preferredCity || form.preferredState) fd.append('location', form.preferredCity || form.preferredState);
      if (form.preferredState) fd.append('preferredState', form.preferredState);
      if (form.preferredCity) fd.append('preferredCity', form.preferredCity);
      if (form.resume) fd.append('resume', form.resume);
      if (parsedSkills.length) fd.append('skills', parsedSkills.join(','));

      // Job Details
      if (form.department) fd.append('department', form.department);
      if (form.client) fd.append('client', form.client);
      if (form.projectedRole) fd.append('projectedRole', form.projectedRole);
      if (form.recruiterApplyEmail) fd.append('recruiterApplyEmail', form.recruiterApplyEmail);
      if (form.sourceDetails) fd.append('sourceDetails', form.sourceDetails);

      // Eligible Tracker Details
      if (form.jobLevel) fd.append('jobLevel', form.jobLevel);
      if (form.vendorSPOC) fd.append('vendorSPOC', form.vendorSPOC);
      if (form.companySPOC) fd.append('companySPOC', form.companySPOC);
      if (form.relevantExperience) fd.append('relevantExperience', form.relevantExperience);
      if (form.cibilScore) fd.append('cibilScore', form.cibilScore);
      if (form.panCardNumber) fd.append('panCardNumber', form.panCardNumber);

      // First Call Status
      fd.append('candidateContacted', String(form.candidateContacted));
      if (form.candidateContacted) {
        fd.append('firstCallSubmitted', 'true');
        if (form.firstCallStatus) fd.append('firstCallStatus', form.firstCallStatus);
        if (form.firstCallOtherReason) fd.append('firstCallOtherReason', form.firstCallOtherReason);
        if (form.communicationRating) fd.append('communicationRating', form.communicationRating);
        if (form.firstCallInterviewType) fd.append('firstCallInterviewType', form.firstCallInterviewType);
        if (form.eligibleRole) fd.append('eligibleRole', form.eligibleRole);
        if (form.callBack) fd.append('callBack', form.callBack);
        if (form.firstCallDate) fd.append('firstCallDate', form.firstCallDate);
        if (form.firstCallTime) fd.append('firstCallTime', form.firstCallTime);
        if (form.firstCallEmail) fd.append('firstCallEmail', form.firstCallEmail);
        if (form.comments) fd.append('comments', form.comments);

        // Final Details are only available to fill if candidateContacted is true
        const finalDetailsFilled = form.recruiterStatus || form.walkInSchedule || form.tentativeDOJ;
        if (finalDetailsFilled) {
          fd.append('finalDetailsSubmitted', 'true');
        }
        if (form.candidateAge) fd.append('candidateAge', form.candidateAge);
        
        const chosenStatus = form.firstCallStatus || form.recruiterStatus || 'Eligible';
        fd.append('status', chosenStatus);
      } else {
        const chosenStatus = form.firstCallStatus || form.recruiterStatus || 'Eligible';
        fd.append('status', chosenStatus);
      }

      // Interview Status
      if (form.interviewStatus) fd.append('interviewStatus', form.interviewStatus);
      if (form.finalInterviewSlotStatus) fd.append('finalInterviewSlotStatus', form.finalInterviewSlotStatus);
      if (form.scheduledDate) fd.append('scheduledDate', form.scheduledDate);
      if (form.finalSelectDate) fd.append('finalSelectDate', form.finalSelectDate);
      if (form.candidateStatusPostOffer) fd.append('candidateStatusPostOffer', form.candidateStatusPostOffer);
      if (form.offeredDate) fd.append('offeredDate', form.offeredDate);
      if (form.designationOffered) fd.append('designationOffered', form.designationOffered);
      if (form.joiningSalary) fd.append('joiningSalary', form.joiningSalary);
      if (form.placementPercentage) fd.append('placementPercentage', form.placementPercentage);
      if (form.dateOfJoining) fd.append('dateOfJoining', form.dateOfJoining);
      if (form.finalInterviewStatus) fd.append('finalInterviewStatus', form.finalInterviewStatus);

      // Candidate Flags
      fd.append('isBlacklisted', String(form.isBlacklisted));
      fd.append('rehireEligible', String(form.rehireEligible));
      fd.append('candidateActiveStatus', form.candidateActiveStatus);
      fd.append('isPriority', String(form.isPriority));
      fd.append('isDuplicate', String(form.isDuplicate));

      if (candidateId) {
        await api.updateCandidate(candidateId, fd);
      } else {
        await api.createCandidate(fd);
      }
      setSubmitted(true);
    } catch (err: any) {
      setErrors({ form: err.message || (candidateId ? 'Failed to update candidate. Please try again.' : 'Failed to add candidate. Please try again.') });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Page loading guard (fetching existing candidate) ────────
  if (pageLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading candidate data...</p>
        </div>
      </div>
    );
  }

  // ── Success Screen ──────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-9 h-9 text-emerald-500" />
          </div>
          {isTLReadOnly ? (
            <>
              <h2 className="text-slate-800 mb-2" style={{ fontWeight: 700, fontSize: '1.5rem' }}>Interview Status Saved!</h2>
              <p className="text-slate-500 mb-6 text-sm leading-relaxed">
                Interview status for <strong className="text-slate-700">{form.candidateName}</strong> has been updated successfully.
              </p>
              <button
                onClick={() => navigate(-1)}
                className="w-full py-2.5 bg-violet-600 text-white text-sm rounded-xl hover:bg-violet-700"
                style={{ fontWeight: 600 }}
              >
                Back to My Team
              </button>
            </>
          ) : (
            <>
              <h2 className="text-slate-800 mb-2" style={{ fontWeight: 700, fontSize: '1.5rem' }}>
                {candidateId ? 'Candidate Updated!' : 'Candidate Added!'}
              </h2>
              <p className="text-slate-500 mb-6 text-sm leading-relaxed">
                <strong className="text-slate-700">{form.candidateName}</strong> has been {candidateId ? 'updated successfully.' : 'added to the resume pool and is ready for outreach.'}
              </p>
              <div className="flex gap-2">
                {candidateId ? (
                  <button
                    onClick={() => navigate(`/recruiter/candidate/${candidateId}`)}
                    className="w-full py-2.5 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700"
                    style={{ fontWeight: 600 }}
                  >
                    Back to Profile
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => { setForm({ ...EMPTY_FORM, recruiterName: user?.name || '', recruiterEmail: user?.email || '', recruiterApplyEmail: user?.email || '', sourcedBy: user?.name || '', firstCallDate: new Date().toISOString().split('T')[0], firstCallTime: new Date().toTimeString().slice(0, 5) }); setSubmitted(false); setExtractMsg(''); }}
                      className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50"
                      style={{ fontWeight: 500 }}
                    >
                      Add Another
                    </button>
                    <button
                      onClick={() => navigate('/recruiter/resumes')}
                      className="flex-1 py-2.5 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700"
                      style={{ fontWeight: 600 }}
                    >
                      View Resumes
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Extraction Preview Modal */}
      <ExtractionPreviewModal
        isOpen={showExtractionPreview}
        extractedData={extractionData || {}}
        onConfirm={confirmAutoFill}
        onCancel={() => {
          setShowExtractionPreview(false);
          setExtractionData(null);
          setExtractMsg('Resume uploaded but data review was cancelled.');
        }}
        fileName={resumeFileName}
      />

      {/* Header Bar */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              {isTLReadOnly ? (
                <>
                  <h1 className="text-slate-800 leading-tight" style={{ fontWeight: 700, fontSize: '1rem' }}>
                    <Shield className="inline w-4 h-4 mr-1.5 text-violet-600" />
                    Candidate Profile
                  </h1>
                  <p className="text-slate-500 text-xs">{form.candidateName || 'Loading...'} · Read-only view (Interview Status editable)</p>
                </>
              ) : (
                <>
                  <h1 className="text-slate-800 leading-tight" style={{ fontWeight: 700, fontSize: '1rem' }}>Add New Candidate</h1>
                  <p className="text-slate-500 text-xs">Manually add a candidate to the resume pool</p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isTLReadOnly && (
              <button
                onClick={() => { setForm({ ...EMPTY_FORM, recruiterName: user?.name || '', recruiterEmail: user?.email || '', recruiterApplyEmail: user?.email || '', sourcedBy: user?.name || '', firstCallDate: new Date().toISOString().split('T')[0], firstCallTime: new Date().toTimeString().slice(0, 5) }); setErrors({}); setExtractMsg(''); }}
                className="px-5 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm transition-colors"
                style={{ fontWeight: 600 }}
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || (!isTLReadOnly && dupResult && !dupResult.isUnlockedStatus && (dupResult.is30DayLocked || dupResult.daysRemaining > 0)) || isLockedByFinalInterview}
              className={`px-5 py-2 text-white rounded-lg disabled:opacity-50 text-sm transition-colors flex items-center gap-2 ${isTLReadOnly ? 'bg-violet-600 hover:bg-violet-700' : 'bg-green-600 hover:bg-green-700'}`}
              style={{ fontWeight: 600 }}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? 'Saving...' : isTLReadOnly ? 'Save Interview Status' : (dupResult && dupResult.isUnlockedStatus ? 'Save & Tag Candidate to My Name' : 'Save Candidate')}
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <form onSubmit={handleSubmit} className="space-y-10">
          {errors.form && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{errors.form}</p>
            </div>
          )}

          {/* TL Read-Only Banner */}
          {isTLReadOnly && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-start gap-3">
              <Shield className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-violet-800 text-sm font-semibold">Team Leader View — Read Only</p>
                <p className="text-violet-600 text-xs mt-0.5">
                  All recruiter-entered sections below are view-only. Only the <strong>Interview Status</strong> section at the bottom is editable.
                </p>
              </div>
            </div>
          )}

          {/* ══════════ Duplicate Candidate Notification & Tagging ══════════ */}
          {dupResult && (
            <div className={`rounded-xl p-4 border ${
              dupResult.isUnlockedStatus
                ? 'bg-amber-50/90 border-amber-300 shadow-sm'
                : 'bg-red-50 border-red-300 shadow-sm'
            }`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${dupResult.isUnlockedStatus ? 'text-amber-600' : 'text-red-600'}`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className={`text-sm font-bold ${dupResult.isUnlockedStatus ? 'text-amber-900' : 'text-red-900'}`}>
                      {dupResult.isUnlockedStatus
                        ? '⚠️ Duplicate Candidate Notice — 30-Day Lock Removed'
                        : '🚫 Candidate Already Exists'}
                    </p>
                    {dupResult.isUnlockedStatus ? (
                      <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-300">
                        ✓ Tagging Allowed
                      </span>
                    ) : (
                      <span className="text-xs bg-red-100 text-red-800 font-semibold px-2.5 py-0.5 rounded-full border border-red-300">
                        🔒 Cannot Add Duplicate
                      </span>
                    )}
                  </div>
                  
                  <p className={`text-xs mt-1 ${dupResult.isUnlockedStatus ? 'text-amber-800' : 'text-red-800'}`}>
                    {dupResult.isUnlockedStatus
                      ? `A candidate with this phone/email already exists in the system under previous recruiter "${dupResult.recruiterName}". Because their previous status is "${dupResult.status}", the 30-day lock is waived and you can tag this profile to your name.`
                      : `A candidate with this phone/email (${dupResult.phone || dupResult.email}) already exists in the system. Duplicate candidates cannot be added again.`}
                  </p>

                  <div className="mt-3 bg-white border border-slate-200 rounded-lg p-3 grid sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 uppercase tracking-wide block" style={{ fontWeight: 600 }}>Name</span>
                      <span className="text-slate-800 font-bold">{dupResult.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase tracking-wide block" style={{ fontWeight: 600 }}>Assigned Recruiter</span>
                      <span className="text-slate-700 font-medium">{dupResult.recruiterName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase tracking-wide block" style={{ fontWeight: 600 }}>Current Status</span>
                      <span className={`font-bold ${dupResult.isUnlockedStatus ? 'text-amber-800' : 'text-slate-700'}`}>{dupResult.status}</span>
                    </div>
                    {dupResult.isUnlockedStatus ? (
                      <div className="sm:col-span-3 mt-1 pt-2 border-t border-amber-100 text-emerald-700 font-medium flex items-center gap-1.5">
                        <span>✅ 30-Day Lock removed for status <strong>"{dupResult.status}"</strong>. You can proceed with saving to tag this candidate to your name.</span>
                      </div>
                    ) : (
                      <div className="sm:col-span-3 mt-1 pt-2 border-t border-red-200">
                        <span className="text-red-800 font-bold">
                          {dupResult.daysRemaining > 0
                            ? `⛔ Candidate already exists and is under 30-day validity (${dupResult.daysRemaining} days remaining). Cannot add again.`
                            : `⛔ Candidate already exists in the system.`
                          }
                        </span>
                      </div>
                    )}
                  </div>

                  {!dupResult.isUnlockedStatus && (
                    <div className="mt-3 p-3 bg-red-100/80 border border-red-300 rounded-lg text-red-800 text-xs font-semibold">
                      Candidate is already assigned to {dupResult.recruiterName || 'another recruiter'} (Status: "{dupResult.status}"). Duplicate candidates cannot be created.
                    </div>
                  )}

                  <div className="flex gap-2 mt-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => navigate(`/recruiter/candidate/${dupResult.id}`)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-lg transition-colors font-medium"
                    >
                      View Existing Profile
                    </button>
                    {isTLOrAdmin && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await api.markCandidateDuplicate(dupResult.id, '');
                            alert('Candidate marked as duplicate. Admin will review.');
                            setDupResult(null);
                          } catch {
                            alert('Failed to mark as duplicate');
                          }
                        }}
                        className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors font-medium"
                      >
                        Mark as Duplicate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ────────── RECRUITER SECTIONS (read-only for TL) ────────── */}
          {/* fieldset[disabled] grays out & blocks all child inputs/selects */}
          <fieldset
            disabled={isTLReadOnly}
            className="space-y-10 border-none p-0 m-0"
            style={isTLReadOnly ? { opacity: 0.9 } : undefined}
          >

          {/* ══════════ JR Selection & Auto-fill ══════════ */}
          <div id="jr-selection-card" className={`bg-white rounded-xl border ${errors.jrNumber ? 'border-red-400 ring-2 ring-red-100 shadow-red-50' : 'border-slate-200'} shadow-sm overflow-hidden transition-all`}>
            <div className={`px-6 py-4 ${errors.jrNumber ? 'bg-red-50 border-b border-red-100' : 'bg-blue-50 border-b border-blue-100'}`}>
              <h2 className={`${errors.jrNumber ? 'text-red-800' : 'text-blue-800'}`} style={{ fontWeight: 700, fontSize: '1rem' }}>
                <Briefcase className="inline w-4 h-4 mr-1.5" />
                Job Requirement (JR) – Auto Fill <span className="text-red-500 font-extrabold">* (Compulsory)</span>
              </h2>
              <p className={`${errors.jrNumber ? 'text-red-600 font-semibold' : 'text-blue-600'} text-xs mt-0.5`}>
                {errors.jrNumber ? '⚠️ You must select a JR before adding this candidate to the system.' : 'Select a JR to auto-fill client, position, recruiter details, and job specifics (Portfolio Department, Client, Projecting for Role)'}
              </p>
            </div>
            <div className="px-6 py-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm text-slate-700" style={{ fontWeight: 600 }}>
                      Select JR Number <span className="text-red-500 font-bold">*</span>
                    </label>
                    {errors.jrNumber && (
                      <span className="text-red-600 text-xs font-bold animate-pulse">
                        * Selection Required
                      </span>
                    )}
                  </div>
                  <div className="mb-2">
                    <input
                      type="text"
                      placeholder="Search JRs by JR #, Job Title, Client/Company..."
                      value={jrSearch}
                      onChange={e => setJrSearch(e.target.value)}
                      disabled={isLockedByFinalInterview}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 bg-slate-50 disabled:opacity-50"
                    />
                  </div>
                  <div className="flex gap-2 items-end">
                    <select
                      value={form.jrNumber}
                      onChange={e => handleJrSelect(e.target.value)}
                      disabled={isLockedByFinalInterview}
                      className={`flex-1 px-3 py-2.5 rounded-lg border ${errors.jrNumber ? 'border-red-400 bg-red-50/30 ring-1 ring-red-300' : 'border-slate-200 bg-white'} text-sm outline-none focus:border-green-400 disabled:bg-slate-50 disabled:text-slate-400`}
                    >
                      <option value="">-- Select JR ({filteredJobs.length} found) * --</option>
                      {filteredJobs.map((j: any) => (
                        <option key={j._id} value={j.jrNumber}>
                          {j.jrNumber} – {j.jobTitle} ({j.client || j.companyName}) | Owner: {j.recruiterName || 'N/A'} | Loc: {j.location || 'N/A'} | Posted: {j.createdAt ? new Date(j.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A'}
                        </option>
                      ))}
                    </select>
                    {form.jrNumber && isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          const selectedJob = jobs.find((j: any) => j.jrNumber === form.jrNumber);
                          if (selectedJob) navigate(`/recruiter/jobs/${selectedJob._id}/summary`);
                        }}
                        className="px-3 py-2.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-semibold transition-colors whitespace-nowrap"
                        title="View JR Summary"
                      >
                        View JR
                      </button>
                    )}
                  </div>
                  {errors.jrNumber && (
                    <p className="text-red-500 text-xs font-semibold mt-2 flex items-center gap-1.5 bg-red-50 p-2 rounded-lg border border-red-200">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {errors.jrNumber}
                    </p>
                  )}
                </div>
                
                <fieldset disabled={isLockedCoreFields} className="grid sm:grid-cols-2 gap-4 sm:col-span-2 border-none p-0 m-0 contents">
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" style={{ fontWeight: 600 }}>Client Name</label>
                  <input type="text" value={form.clientName} readOnly={isRecruiter} onChange={isRecruiter ? undefined : e => set('clientName', e.target.value)} className={`w-full px-3 py-2.5 rounded-lg border text-sm ${isRecruiter ? 'bg-slate-50 text-slate-600 border-slate-100' : 'border-slate-200 outline-none focus:border-green-400'}`} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" style={{ fontWeight: 600 }}>Position Applied</label>
                  <input type="text" value={form.positionApplied} onChange={e => set('positionApplied', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" style={{ fontWeight: 600 }}>Recruiter Name</label>
                  <input type="text" value={form.recruiterName} readOnly={isRecruiter} onChange={isRecruiter ? undefined : e => set('recruiterName', e.target.value)} className={`w-full px-3 py-2.5 rounded-lg border text-sm ${isRecruiter ? 'bg-slate-50 text-slate-600 border-slate-100' : 'border-slate-200 outline-none focus:border-green-400'}`} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" style={{ fontWeight: 600 }}>Recruiter Email</label>
                  <input type="text" value={form.recruiterEmail} readOnly={isRecruiter} onChange={isRecruiter ? undefined : e => set('recruiterEmail', e.target.value)} className={`w-full px-3 py-2.5 rounded-lg border text-sm ${isRecruiter ? 'bg-slate-50 text-slate-600 border-slate-100' : 'border-slate-200 outline-none focus:border-green-400'}`} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" style={{ fontWeight: 600 }}>Sourced By</label>
                  <input type="text" value={form.sourcedBy} readOnly={isRecruiter} onChange={isRecruiter ? undefined : e => set('sourcedBy', e.target.value)} className={`w-full px-3 py-2.5 rounded-lg border text-sm ${isRecruiter ? 'bg-slate-50 text-slate-600 border-slate-100' : 'border-slate-200 outline-none focus:border-green-400'}`} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" style={{ fontWeight: 600 }}>Source Status</label>
                  <select
                    value={form.sourceStatus}
                    onChange={e => set('sourceStatus', e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:border-green-400 ${form.sourceStatus === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                    style={{ fontWeight: 600 }}
                  >
                    <option value="Active">Active</option>
                    <option value="Non-Active">Non-Active</option>
                  </select>
                </div>
              </fieldset>
              </div>
            </div>
          </div>
          </fieldset>

          {/* ══════════ Resume Attachment (Positioned directly below JR) ══════════ */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-green-50 border-b border-green-100">
              <h2 className="text-green-800" style={{ fontWeight: 700, fontSize: '1rem' }}>Resume Attachment</h2>
            </div>
            <div className="px-6 py-5">
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-blue-700 text-sm">
                  <strong>Tip:</strong> Upload the resume first — the system will auto-fill candidate details from it.
                </p>
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-green-300 transition-colors">
                <Upload className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500 mb-3">
                  {form.resume
                    ? <span className="text-green-600 font-medium">{form.resume.name}</span>
                    : resumeFileName
                      ? <span className="text-green-600 font-medium">{resumeFileName}</span>
                      : <span>No file selected.</span>
                  }
                </p>
                {/* 
                   Logic: 
                   - If resume exists: TL sees View link (read-only).
                   - If resume MISSING: TL can upload it (editable).
                   - Otherwise (recruiter mode): Always editable.
                */}
                {isTLReadOnly && resumeFileUrl ? (
                  <a
                    href={resumeFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-100 hover:bg-green-200 transition-colors text-sm font-semibold text-green-700"
                    style={{ pointerEvents: 'auto' }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    View / Download Resume
                  </a>
                ) : (
                  <>
                    <label className={`cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-lg transition-colors text-sm font-semibold text-white ${extracting ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}>
                      {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {extracting ? 'Extracting...' : 'Upload Resume'}
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        disabled={extracting}
                        onChange={e => handleResumeUpload(e.target.files?.[0] || null)}
                      />
                    </label>
                    <p className="text-xs text-slate-400 mt-2">Accepted: PDF, DOCX (max 10MB)</p>
                  </>
                )}
              </div>

              {extractMsg && (
                <div className={`mt-3 rounded-lg p-3 flex items-start gap-2 text-sm ${extractMsg.includes('Could not')
                  ? 'bg-amber-50 border border-amber-200 text-amber-700'
                  : 'bg-green-50 border border-green-200 text-green-700'
                  }`}>
                  <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {extractMsg}
                </div>
              )}
            </div>
          </div>

          <fieldset disabled={isLockedCoreFields} className="space-y-10 border-none p-0 m-0">
          {/* ══════════ Candidate Details ══════════ */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-green-50 border-b border-green-100">
              <h2 className="text-green-800" style={{ fontWeight: 700, fontSize: '1rem' }}>Candidate Details</h2>
            </div>
            <div className="px-6 py-5 space-y-8">

              {/* Row 1: Name + Phone + Department */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>
                    <User className="inline w-3.5 h-3.5 mr-1" />
                    Candidate Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.candidateName}
                    onChange={e => set('candidateName', e.target.value)}
                    placeholder="Full name"
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${errors.candidateName ? 'border-red-300 bg-red-50' : 'border-slate-200 focus:border-green-400'
                      }`}
                  />
                  {errors.candidateName && <p className="mt-1 text-xs text-red-500">{errors.candidateName}</p>}
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>
                    <Phone className="inline w-3.5 h-3.5 mr-1" />
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={form.candidatePhone}
                      onChange={e => {
                        set('candidatePhone', e.target.value);
                        triggerDupCheck(e.target.value, form.candidateEmail);
                      }}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${dupResult ? 'border-orange-300 bg-orange-50' : errors.candidatePhone ? 'border-red-300 bg-red-50' : 'border-slate-200 focus:border-green-400'
                        }`}
                    />
                    {dupChecking && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-slate-400" />}
                  </div>
                  {errors.candidatePhone && <p className="mt-1 text-xs text-red-500">{errors.candidatePhone}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm text-slate-700" style={{ fontWeight: 500 }}>Department</label>
                    {form.department && form.jrNumber && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full" style={{ fontWeight: 500 }}>
                        <Zap className="w-3 h-3" /> From JR
                      </span>
                    )}
                  </div>
                  <DepartmentDropdown
                    value={form.department}
                    onChange={val => set('department', val)}
                    placeholder="Select department"
                    disabled={isTLReadOnly}
                  />
                </div>
              </div>

              {/* Row 2: How did you know + Email + Alternate Phone */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>
                    How did you know about Job Openings
                  </label>
                  <select
                    value={form.jobOpeningSource}
                    onChange={e => set('jobOpeningSource', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    <option value="">Select source</option>
                    {JOB_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>
                    <Mail className="inline w-3.5 h-3.5 mr-1" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={form.candidateEmail}
                    onChange={e => {
                      set('candidateEmail', e.target.value);
                      triggerDupCheck(form.candidatePhone, e.target.value);
                    }}
                    placeholder="candidate@email.com"
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors ${dupResult ? 'border-orange-300 bg-orange-50' : 'border-slate-200 focus:border-green-400'
                      }`}
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>
                    <Phone className="inline w-3.5 h-3.5 mr-1" />
                    Alternate Contact Number
                  </label>
                  <input
                    type="tel"
                    value={form.alternatePhone}
                    onChange={e => set('alternatePhone', e.target.value)}
                    placeholder="Alternate mobile number"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400"
                  />
                </div>
              </div>

              {/* Current Location */}
              <div>
                <label className="block text-sm text-slate-700 mb-2" style={{ fontWeight: 600 }}>
                  <MapPin className="inline w-3.5 h-3.5 mr-1" />
                  Current Location
                </label>
                <LocationPicker
                  prefix="Current"
                  state={form.currentState}
                  city={form.currentCity}
                  disabled={isTLReadOnly}
                  onStateChange={v => set('currentState', v)}
                  onCityChange={v => set('currentCity', v)}
                />
                <div className="mt-4">
                  <input
                    type="text"
                    value={form.currentSubLocation}
                    onChange={e => set('currentSubLocation', e.target.value)}
                    placeholder="Current Sub-Location / Area (e.g. Koramangala)"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-slate-400">Current Sub-Location</p>
                </div>
              </div>

              {/* Preferred Location */}
              <div>
                <label className="block text-sm text-slate-700 mb-2" style={{ fontWeight: 600 }}>
                  <MapPin className="inline w-3.5 h-3.5 mr-1" />
                  Preferred Location
                </label>
                <LocationPicker
                  prefix="Preferred"
                  state={form.preferredState}
                  city={form.preferredCity}
                  disabled={isTLReadOnly}
                  onStateChange={v => set('preferredState', v)}
                  onCityChange={v => set('preferredCity', v)}
                />
              </div>

              {/* Row: Qualification + University + Year */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>
                    <Award className="inline w-3.5 h-3.5 mr-1" />
                    Qualification
                  </label>
                  <select
                    value={form.qualification}
                    onChange={e => set('qualification', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    <option value="">Select qualification</option>
                    {QUALIFICATION_GROUPS.map(grp => (
                      <optgroup key={grp.group} label={grp.group}>
                        {grp.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>
                    University / College
                  </label>
                  <input
                    type="text"
                    value={form.university}
                    onChange={e => set('university', e.target.value)}
                    placeholder="e.g. Anna University"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>
                    <Calendar className="inline w-3.5 h-3.5 mr-1" />
                    Year of Graduation
                  </label>
                  <select
                    value={form.yearOfGraduation}
                    onChange={e => set('yearOfGraduation', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400"
                  >
                    <option value="">Select year</option>
                    {GRAD_YEARS.slice().reverse().map(y => (
                      <option key={y} value={String(y)}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row: Experience + Company + Gender */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>
                    Total Experience
                  </label>
                  <input
                    type="text"
                    value={form.experienceYears}
                    onChange={e => set('experienceYears', e.target.value)}
                    placeholder="e.g. 2 Years, 6 Months, Fresher"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>
                    <Briefcase className="inline w-3.5 h-3.5 mr-1" />
                    Current Company
                  </label>
                  <input
                    type="text"
                    value={form.currentCompany}
                    onChange={e => set('currentCompany', e.target.value)}
                    placeholder="Company name"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>Gender</label>
                  <select
                    value={form.gender}
                    onChange={e => set('gender', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400"
                  >
                    <option value="">Select gender</option>
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              {/* CTC — text inputs */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>
                    Current CTC
                  </label>
                  <input
                    type="text"
                    value={form.currentCTC}
                    onChange={e => set('currentCTC', e.target.value)}
                    placeholder="e.g. 4.5 LPA or 45000/month"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>
                    Expected CTC
                  </label>
                  <input
                    type="text"
                    value={form.expectedCTC}
                    onChange={e => set('expectedCTC', e.target.value)}
                    placeholder="e.g. 6 LPA or 55000/month"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400"
                  />
                </div>
              </div>

              {/* Row: Notice Period + DOB + Joining Availability */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>Notice Period</label>
                  <select
                    value={form.noticePeriod}
                    onChange={e => set('noticePeriod', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400"
                  >
                    <option value="">Select notice period</option>
                    {NOTICE_PERIODS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>
                    <Calendar className="inline w-3.5 h-3.5 mr-1" />
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={e => {
                      set('dateOfBirth', e.target.value);
                      const age = calculateAge(e.target.value);
                      if (age !== null) {
                        set('candidateAge', String(age));
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>
                    <Calendar className="inline w-3.5 h-3.5 mr-1" />
                    Joining Availability
                  </label>
                  <input
                    type="date"
                    value={form.joiningAvailability}
                    onChange={e => set('joiningAvailability', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400"
                  />
                </div>
              </div>

              {/* Parsed Skills */}
              {parsedSkills.length > 0 && (
                <div>
                  <label className="block text-sm text-slate-700 mb-2" style={{ fontWeight: 500 }}>
                    <Sparkles className="inline w-3.5 h-3.5 mr-1 text-green-500" />
                    Skills (auto-detected from resume)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {parsedSkills.map(skill => (
                      <span key={skill} className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs border border-green-200" style={{ fontWeight: 500 }}>
                        {skill}
                        <button type="button" onClick={() => setParsedSkills(ps => ps.filter(s => s !== skill))} className="text-green-400 hover:text-green-700 ml-0.5">×</button>
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Click × to remove any incorrect skills</p>
                </div>
              )}

            </div>
          </div>


          {/* ══════════ Candidate Status ══════════ */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between gap-4">
              <h2 className="text-amber-800" style={{ fontWeight: 700, fontSize: '1rem' }}>
                <Phone className="inline w-4 h-4 mr-1.5" />Candidate Status
              </h2>
            </div>
            <fieldset disabled={false} className="px-6 py-5 space-y-8">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>Candidate Status *</label>
                  <select value={form.firstCallStatus} onChange={e => set('firstCallStatus', e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors ${errors.firstCallStatus ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-slate-200 focus:border-green-400'
                      }`}>
                    <option value="">Select status</option>
                    {FIRST_CALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errors.firstCallStatus && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.firstCallStatus}</p>}
                  {form.firstCallStatus === 'Other' && (
                    <input type="text" value={form.firstCallOtherReason} onChange={e => set('firstCallOtherReason', e.target.value)}
                      placeholder="Specify reason..." className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400" />
                  )}
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>Communication Rating</label>
                  <select value={form.communicationRating} onChange={e => set('communicationRating', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed">
                    {COMMUNICATION_RATINGS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>
                    <Calendar className="inline w-3.5 h-3.5 mr-1" />First Call Date
                  </label>
                  <input type="date" value={form.firstCallDate} onChange={e => set('firstCallDate', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>First Call Time</label>
                  <input type="time" value={form.firstCallTime} onChange={e => set('firstCallTime', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>Call Back</label>
                  <input type="datetime-local" value={form.callBack} onChange={e => set('callBack', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>CID Number</label>
                  <input type="text" value={form.clientCandidateId || ''} onChange={e => set('clientCandidateId', e.target.value)}
                    placeholder="e.g. C1010786727"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>Comments</label>
                <textarea value={form.comments} onChange={e => set('comments', e.target.value)} rows={3}
                  placeholder="Additional comments..."
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 resize-none disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed" />
              </div>
            </fieldset>
          </div>

          </fieldset>

          {/* Bottom Submit */}
          <div className="flex justify-end gap-3 pb-6">
            <button
              type="button"
              onClick={() => { setForm({ ...EMPTY_FORM, recruiterName: user?.name || '', recruiterEmail: user?.email || '', recruiterApplyEmail: user?.email || '', sourcedBy: user?.name || '', firstCallDate: new Date().toISOString().split('T')[0], firstCallTime: new Date().toTimeString().slice(0, 5) }); setErrors({}); setExtractMsg(''); }}
              className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors text-sm"
              style={{ fontWeight: 600 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2 text-sm"
              style={{ fontWeight: 600 }}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? 'Saving...' : 'Save Candidate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
