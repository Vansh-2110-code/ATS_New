import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import {
  User, Phone, Mail, Briefcase, Calendar, CheckCircle2,
  Hash, MapPin, CreditCard, Save, ArrowLeft, Loader2,
  ChevronDown, Upload, X, Plus, AlertCircle, FileText, Trash2, Eye, Clock
} from 'lucide-react';
import api from '../../services/api';
import { LetterOfUndertaking } from '../../components/LetterOfUndertaking';


const ROLES = [
  'Recruiter', 'Senior Recruiter', 'Team Lead', 'Assistant Manager',
  'Manager', 'Senior Manager', 'SPOC', 'Admin', 'HR Executive',
  'Operations Manager', 'Business Development', 'Accounts',
];

const DEPARTMENTS = ['Recruitment', 'Operations', 'Finance', 'HR', 'IT', 'Admin', 'Sales'];

const SOURCES_OF_INTERVIEW = ['Job Portal', 'Walk-in', 'Reference', 'Other'];

// Joining Form Data Interface
interface EducationQualification {
  institution: string;
  yearOfPassing: number | '';
  gradePercentage: string;
}

interface HighestQualification {
  collegeName: string;
  collegeAddress: string;
  universityName: string;
  universityAddress: string;
  fromYear: number | '';
  toYear: number | '';
  program: 'Full-time' | 'Part-time' | 'Day' | 'Evening' | '';
  studentId: string;
  degreeType: string;
  graduationDate: string;
  majorSubject: string;
  marksheetFile: File | null;
  degreeCertificateFile: File | null;
  marksheetPath?: string;
  degreeCertificatePath?: string;
}

interface EmploymentEntry {
  companyName: string;
  positionDepartment: string;
  mainOfficeAddress: string;
  branchAddress: string;
  telephone: string;
  employeeCode: string;
  fromDate: string;
  toDate: string;
  agencyName: string;
  responsibilities: string;
  remuneration: string;
  reasonForLeaving: string;
  reportingManagerName: string;
  reportingManagerPosition: string;
  reportingManagerContact: string;
  relievingLetterFile: File | null;
  relievingLetterPath?: string;
}

interface ReferenceEntry {
  name: string;
  relationship: string;
  contactNumber: string;
}

interface JoiningFormData {
  _id?: string;
  employeeId?: string;

  // Section 0: Resume Upload
  resume: File | null;
  isFresher: boolean;

  // Section 1: Personal Details
  photo: File | null;
  photoPath?: string;
  fullName: string;
  gender: 'Male' | 'Female' | 'Other' | '';
  dateOfBirth: string;
  email: string;
  positionApplied: string;
  sourceOfInterview: '' | 'Job Portal' | 'Walk-in' | 'Reference' | 'Other';
  referralName: string;
  joiningDate: string;

  // Section 2: Address & Contact
  permanentAddress: string;
  localAddress: string;
  phone: string;
  mothersPhone: string;
  fathersHusbandMobile: string;

  // Section 3: Education
  educationQualifications: {
    sslc?: EducationQualification;
    hsc?: EducationQualification;
    diploma?: EducationQualification;
    ug?: EducationQualification;
    pg?: EducationQualification;
  };
  additionalCourses: boolean;
  highestQualification: HighestQualification;

  // Section 4: Employment History (multiple entries)
  employmentHistory: EmploymentEntry[];

  // Section 5: Letter of Undertaking
  guardianName: string;
  salaryOffered: string;
  targetAssignment: string;
  trainingDurationDays: number | '';
  undertakingAccepted: boolean;

  // Section 6: References
  references: ReferenceEntry[];
  isApproved?: boolean;
  approvalStatus?: 'draft' | 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionRemarks?: string;
  rejectedDocuments?: string[];
  submittedAt?: string;

  // KYC & Documents
  bloodGroup: string;
  panNumber: string;
  aadhaarNumber: string;
  panCardFile: File | null;
  panCardPath?: string;
  aadhaarCardFile: File | null;
  aadhaarCardPath?: string;
  highestDocumentFile: File | null;
  highestDocumentPath?: string;

  // Bank & Account Details
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  confirmAccountNumber?: string;
  ifscCode: string;
  branchName: string;
  accountType: 'Savings' | 'Salary' | 'Current' | '';
  bankProofFile: File | null;
  bankProofPath?: string;
}

// Helper function to calculate age from DOB
const calculateAge = (dob: string): number => {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export function JoiningFormPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { employeeId: paramEmployeeId } = useParams<{ employeeId?: string }>();

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverEmployeeId, setServerEmployeeId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [age, setAge] = useState(0);
  const [parsingResume, setParsingResume] = useState(false);
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  // Access control: Admins can view/edit any submitted joining form.
  // Recruiters and TLs can view their own submitted joining form, but not others.
  useEffect(() => {
    if (user) {
      const isAdmin = user.role === 'admin';
      const isSelf = paramEmployeeId && (paramEmployeeId === user.employeeId);
      
      if (paramEmployeeId && !isAdmin && !isSelf) {
        navigate('/recruiter', { replace: true });
      } else if (!isAdmin && !['recruiter', 'tl'].includes(user.role)) {
        navigate('/recruiter', { replace: true });
      }
    }
  }, [user, navigate, paramEmployeeId]);

  // Default initial state
  const getInitialForm = (): JoiningFormData => ({
    resume: null,
    isFresher: false,
    photo: null,
    fullName: '',
    gender: '',
    dateOfBirth: '',
    email: '',
    positionApplied: '',
    sourceOfInterview: '',
    referralName: '',
    joiningDate: '',
    permanentAddress: '',
    localAddress: '',
    phone: '',
    mothersPhone: '',
    fathersHusbandMobile: '',
    bloodGroup: '',
    panNumber: '',
    aadhaarNumber: '',
    panCardFile: null,
    aadhaarCardFile: null,
    highestDocumentFile: null,
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    branchName: '',
    accountType: 'Savings',
    bankProofFile: null,
    bankProofPath: '',
    educationQualifications: {
      sslc: { institution: '', yearOfPassing: '', gradePercentage: '' },
      hsc: { institution: '', yearOfPassing: '', gradePercentage: '' },
      diploma: { institution: '', yearOfPassing: '', gradePercentage: '' },
      ug: { institution: '', yearOfPassing: '', gradePercentage: '' },
      pg: { institution: '', yearOfPassing: '', gradePercentage: '' },
    },
    additionalCourses: false,
    highestQualification: {
      collegeName: '',
      collegeAddress: '',
      universityName: '',
      universityAddress: '',
      fromYear: '',
      toYear: '',
      program: '',
      studentId: '',
      degreeType: '',
      graduationDate: '',
      majorSubject: '',
      marksheetFile: null,
      degreeCertificateFile: null,
    },
    employmentHistory: [
      {
        companyName: '',
        positionDepartment: '',
        mainOfficeAddress: '',
        branchAddress: '',
        telephone: '',
        employeeCode: '',
        fromDate: '',
        toDate: '',
        agencyName: '',
        responsibilities: '',
        remuneration: '',
        reasonForLeaving: '',
        reportingManagerName: '',
        reportingManagerPosition: '',
        reportingManagerContact: '',
        relievingLetterFile: null,
      },
    ],
    guardianName: '',
    salaryOffered: '',
    targetAssignment: '',
    trainingDurationDays: '',
    undertakingAccepted: false,
    references: [
      { name: '', relationship: '', contactNumber: '' },
      { name: '', relationship: '', contactNumber: '' },
    ],
  });

  const [form, setForm] = useState<JoiningFormData>(getInitialForm());
  const isApproved = (!!form.isApproved || form.approvalStatus === 'approved') && form.approvalStatus !== 'rejected';
  const isRejected = form.approvalStatus === 'rejected';
  const isPending = !isApproved && !isRejected && (form.approvalStatus === 'pending' || !!form._id || !!form.employeeId);
  const isLocked = isApproved && user?.role !== 'admin';
  const [expandedSections, setExpandedSections] = useState({
    personal: true,
    address: false,
    kyc: false,
    bank: false,
    education: false,
    employment: false,
    undertaking: false,
    references: false,
  });

  // Load existing form or auto-populate on mount
  useEffect(() => {
    if (paramEmployeeId) {
      loadJoiningForm(paramEmployeeId);
    } else if (user?.employeeId) {
      loadJoiningForm(user.employeeId);
    } else {
      autoPopulate();
    }
    // Load recruiters for Source of Interview dropdown
    loadRecruiters();
  }, [paramEmployeeId, user]);

  const loadRecruiters = async () => {
    try {
      const data = await api.getUsers({ role: 'recruiter', limit: '200' });
      setRecruiters(data.users || []);
    } catch {
      setRecruiters([]);
    }
  };

  const isDocRejected = (docKey: string) => {
    if (form.approvalStatus !== 'rejected') return false;
    if (form.rejectedDocuments && form.rejectedDocuments.includes(docKey)) return true;
    const remarks = (form.rejectionRemarks || '').toLowerCase();
    if (docKey === 'aadhaarCard' && (remarks.includes('aadhaar') || remarks.includes('aadhar'))) return true;
    if (docKey === 'panCard' && remarks.includes('pan')) return true;
    if (docKey === 'bankProof' && (remarks.includes('bank') || remarks.includes('cheque') || remarks.includes('passbook'))) return true;
    if (docKey === 'highestDocument' && (remarks.includes('marksheet') || remarks.includes('degree') || remarks.includes('qualification'))) return true;
    if (docKey === 'photo' && remarks.includes('photo')) return true;
    if (docKey === 'resume' && remarks.includes('resume')) return true;
    return false;
  };

  const applyRejectionExpansion = (data: any) => {
    if (data.approvalStatus === 'rejected') {
      const docs: string[] = data.rejectedDocuments || [];
      const remarks = (data.rejectionRemarks || '').toLowerCase();
      const hasKyc = docs.includes('aadhaarCard') || docs.includes('panCard') || remarks.includes('aadhaar') || remarks.includes('aadhar') || remarks.includes('pan');
      const hasBank = docs.includes('bankProof') || remarks.includes('bank') || remarks.includes('cheque') || remarks.includes('passbook');
      const hasEdu = docs.includes('highestDocument') || remarks.includes('marksheet') || remarks.includes('degree');
      const hasPersonal = docs.includes('photo') || remarks.includes('photo');
      setExpandedSections(prev => ({
        ...prev,
        kyc: hasKyc ? true : prev.kyc,
        bank: hasBank ? true : prev.bank,
        education: hasEdu ? true : prev.education,
        personal: hasPersonal ? true : prev.personal,
      }));
    }
  };

  const loadJoiningForm = async (empId: string) => {
    try {
      setLoading(true);
      const data = await api.getJoiningForm?.(empId);
      if (data) {
        setForm(data);
        applyRejectionExpansion(data);
      }
    } catch (err) {
      console.error('Failed to load joining form:', err);
    } finally {
      setLoading(false);
    }
  };

  const autoPopulate = async () => {
    try {
      const data = await api.getJoiningFormAutoFillData?.();
      if (data) {
        if (data.employeeId || data._id) {
          // If it is an existing submitted form, load the whole document
          setForm(data);
          applyRejectionExpansion(data);
        } else {
          // Fallback data for new submission
          setForm(prev => ({
            ...prev,
            fullName: data.fullName || data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            permanentAddress: data.permanentAddress || data.address || '',
            positionApplied: data.positionApplied || data.position || '',
            salaryOffered: data.salaryOffered || data.salary || '',
          }));
        }
      }
    } catch (err) {
      console.log('Auto-populate not available:', err);
    }
  };

  const set = (key: string, value: any) => {
    setForm(f => {
      const updated = { ...f, [key]: value };
      if (key === 'dateOfBirth' && value) {
        setAge(calculateAge(value));
      }
      return updated;
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        setErrors(prev => ({ ...prev, photo: 'Only JPG and PNG images allowed' }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, photo: 'File size should be less than 5MB' }));
        return;
      }
      set('photo', file);
      setErrors(prev => ({ ...prev, photo: '' }));
    }
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/jpg'
      ];
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({ ...prev, [field]: 'Only PDF, DOCX, JPG, and PNG files allowed' }));
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, [field]: 'File size should be less than 10MB' }));
        return;
      } else if (field === 'panCard') {
        set('panCardFile', file);
      } else if (field === 'aadhaarCard') {
        set('aadhaarCardFile', file);
      } else if (field === 'bankProof') {
        set('bankProofFile', file);
      } else if (field === 'highestDocument') {
        set('highestDocumentFile', file);
      } else if (field === 'marksheet') {
        set('highestQualification', { ...form.highestQualification, marksheetFile: file });
      } else if (field === 'degreeCertificate') {
        set('highestQualification', { ...form.highestQualification, degreeCertificateFile: file });
      }
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleEmploymentDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
        setErrors(prev => ({ ...prev, [`empDoc${index}`]: 'Only PDF and DOC files allowed' }));
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, [`empDoc${index}`]: 'File size should be less than 10MB' }));
        return;
      }
      const updated = [...form.employmentHistory];
      updated[index].relievingLetterFile = file;
      set('employmentHistory', updated);
      setErrors(prev => ({ ...prev, [`empDoc${index}`]: '' }));
    }
  };

  const addEmploymentEntry = () => {
    const newEntry: EmploymentEntry = {
      companyName: '', positionDepartment: '', mainOfficeAddress: '', branchAddress: '',
      telephone: '', employeeCode: '', fromDate: '', toDate: '', agencyName: '',
      responsibilities: '', remuneration: '', reasonForLeaving: '', reportingManagerName: '',
      reportingManagerPosition: '', reportingManagerContact: '', relievingLetterFile: null,
    };
    set('employmentHistory', [...form.employmentHistory, newEntry]);
  };

  const removeEmploymentEntry = (index: number) => {
    set('employmentHistory', form.employmentHistory.filter((_, i) => i !== index));
  };

  const updateEmploymentEntry = (index: number, key: string, value: any) => {
    const updated = [...form.employmentHistory];
    updated[index] = { ...updated[index], [key]: value };
    set('employmentHistory', updated);
  };

  // Resume upload and auto-fill handler
  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, resume: 'Only PDF and DOC files allowed' }));
      return;
    }

    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, resume: 'File size should be less than 10MB' }));
      return;
    }

    setParsingResume(true);
    try {
      // Store resume file
      set('resume', file);
      setErrors(prev => ({ ...prev, resume: '' }));

      // Parse resume using existing API
      const formData = new FormData();
      formData.append('resume', file);
      const scanResult = await api.scanResume(formData);
      console.log('Resume parse result:', scanResult); // DEBUG

      // Handle both wrapped and direct response
      const result = scanResult.result || scanResult;

      if (result && (result.name || result.email || result.phone || result.experience || result.education)) {
        const isFresher = !result.experience || result.experience.length === 0;

        // Auto-fill personal details
        setForm(prev => ({
          ...prev,
          fullName: result.name || prev.fullName,
          email: result.email || prev.email,
          phone: result.phone || prev.phone,
          isFresher,
          // Education section - auto-fill highest qualification
          highestQualification: {
            ...prev.highestQualification,
            degreeType: result.education?.[0]?.degree || prev.highestQualification.degreeType,
            collegeName: result.education?.[0]?.institution || prev.highestQualification.collegeName,
            majorSubject: result.education?.[0]?.degree || prev.highestQualification.majorSubject,
          },
          // Employment history - auto-fill if not fresher
          employmentHistory: !isFresher && result.experience && result.experience.length > 0
            ? result.experience.map((exp: any) => ({
              companyName: exp.company || '',
              positionDepartment: exp.title || '',
              mainOfficeAddress: exp.company || '',
              branchAddress: '',
              telephone: '',
              employeeCode: '',
              fromDate: exp.duration?.split('-')?.[0]?.trim() || '',
              toDate: exp.duration?.split('-')?.[1]?.trim() || '',
              agencyName: '',
              responsibilities: exp.points?.join('; ') || '',
              remuneration: '',
              reasonForLeaving: '',
              reportingManagerName: '',
              reportingManagerPosition: '',
              reportingManagerContact: '',
              relievingLetterFile: null,
            }))
            : prev.employmentHistory,
        }));

        setErrors(prev => ({
          ...prev,
          resume: isFresher ? 'Fresher detected - Employment section skipped' : 'Resume parsed successfully',
        }));
      }
    } catch (error) {
      console.error('Resume parsing error:', error);
      setErrors(prev => ({ ...prev, resume: 'Failed to parse resume. Please fill details manually.' }));
    } finally {
      setParsingResume(false);
    }
  };

  const updateReference = (index: number, key: string, value: string) => {
    const updated = [...form.references];
    updated[index] = { ...updated[index], [key]: value };
    set('references', updated);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required personal & contact fields
    if (!form.fullName) newErrors.fullName = 'Name required';
    if (!form.dateOfBirth) newErrors.dateOfBirth = 'DOB required';
    if (!form.phone || form.phone.replace(/\D/g, '').length < 10) newErrors.phone = 'Valid 10-digit phone required';
    if (!form.permanentAddress) newErrors.permanentAddress = 'Permanent address required';

    // ── Mandatory KYC & Document Validations ──
    // 1. PAN Card & Number
    if (!form.panNumber || form.panNumber.trim().length !== 10) {
      newErrors.panNumber = 'Valid 10-character PAN number required (e.g. ABCDE1234F)';
    }
    if (isDocRejected('panCard')) {
      if (!form.panCardFile) {
        newErrors.panCard = 'Please re-upload a clear replacement PAN card file';
      }
    } else if (!form.panCardFile && !form.panCardPath) {
      newErrors.panCard = 'PAN card document upload is mandatory';
    }

    // 2. Aadhaar Card & Number
    if (!form.aadhaarNumber || form.aadhaarNumber.replace(/\D/g, '').length !== 12) {
      newErrors.aadhaarNumber = 'Valid 12-digit Aadhaar number required';
    }
    if (isDocRejected('aadhaarCard')) {
      if (!form.aadhaarCardFile) {
        newErrors.aadhaarCard = 'Please re-upload a clear replacement Aadhaar card file';
      }
    } else if (!form.aadhaarCardFile && !form.aadhaarCardPath) {
      newErrors.aadhaarCard = 'Aadhaar card document upload is mandatory';
    }

    // 3. Highest Qualification Document (Marksheet or Degree or Highest Doc)
    const hasHighestDoc = form.highestDocumentFile || form.highestDocumentPath ||
      form.highestQualification?.marksheetFile || form.highestQualification?.marksheetPath || (form as any).marksheetPath ||
      form.highestQualification?.degreeCertificateFile || form.highestQualification?.degreeCertificatePath || (form as any).degreeCertificatePath;

    if (isDocRejected('highestDocument')) {
      if (!form.highestDocumentFile && !form.highestQualification?.marksheetFile && !form.highestQualification?.degreeCertificateFile) {
        newErrors.highestDocument = 'Please re-upload corrected qualification document (Marksheet / Degree)';
      }
    } else if (!hasHighestDoc) {
      newErrors.highestDocument = 'Highest qualification document (Marksheet / Degree Certificate) is mandatory';
    }

    // 4. Bank Proof
    if (isDocRejected('bankProof') && !form.bankProofFile) {
      newErrors.bankProof = 'Please re-upload corrected Bank Proof (Cancelled Cheque / Passbook)';
    }

    // 5. Photo
    if (isDocRejected('photo') && !form.photo) {
      newErrors.photo = 'Please re-upload passport photograph';
    }

    // Employment history (only required for non-freshers)
    if (!form.isFresher) {
      if (form.employmentHistory.length > 0) {
        form.employmentHistory.forEach((emp, idx) => {
          if (!emp.companyName) newErrors[`emp${idx}Company`] = 'Company name required';
        });
      }
    }

    // References
    if (form.references.length < 2) {
      newErrors.references = 'At least 2 references required';
    } else {
      form.references.forEach((ref, idx) => {
        if (!ref.name) newErrors[`ref${idx}Name`] = 'Name required';
        if (!ref.relationship) newErrors[`ref${idx}Rel`] = 'Relationship required';
        if (!ref.contactNumber || ref.contactNumber.replace(/\D/g, '').length < 10) newErrors[`ref${idx}Phone`] = 'Valid 10-digit phone required';
      });
    }

    // Letter of Undertaking
    if (!form.undertakingAccepted) newErrors.undertaking = 'Must accept Letter of Undertaking';

    // Automatically expand sections with validation errors
    if (form.accountNumber && form.confirmAccountNumber && form.accountNumber !== form.confirmAccountNumber) {
      newErrors.confirmAccountNumber = 'Account numbers do not match';
    }
    if (form.ifscCode && form.ifscCode.length > 0 && form.ifscCode.length !== 11) {
      newErrors.ifscCode = 'IFSC must be an 11-character code (e.g. HDFC0001234)';
    }

    if (newErrors.bankName || newErrors.accountHolderName || newErrors.accountNumber || newErrors.confirmAccountNumber || newErrors.ifscCode || newErrors.bankProof) {
      setExpandedSections(s => ({ ...s, bank: true }));
    }
    if (newErrors.panNumber || newErrors.panCard || newErrors.aadhaarNumber || newErrors.aadhaarCard) {
      setExpandedSections(s => ({ ...s, kyc: true }));
    }
    if (newErrors.highestDocument || newErrors.marksheet || newErrors.degreeCertificate) {
      setExpandedSections(s => ({ ...s, education: true }));
    }
    if (newErrors.permanentAddress || newErrors.phone) {
      setExpandedSections(s => ({ ...s, address: true }));
    }
    if (newErrors.fullName || newErrors.dateOfBirth) {
      setExpandedSections(s => ({ ...s, personal: true }));
    }
    if (newErrors.references) {
      setExpandedSections(s => ({ ...s, references: true }));
    }
    if (newErrors.undertaking) {
      setExpandedSections(s => ({ ...s, undertaking: true }));
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setSubmitting(true);
      const fd = new FormData();

      // Append form data
      Object.entries(form).forEach(([key, value]) => {
        if (key === 'photo' && form.photo) {
          fd.append('photo', form.photo);
        } else if (key === 'resume' && form.resume) {
          fd.append('resume', form.resume);
        } else if (key === 'panCardFile' && form.panCardFile) {
          fd.append('panCard', form.panCardFile);
        } else if (key === 'aadhaarCardFile' && form.aadhaarCardFile) {
          fd.append('aadhaarCard', form.aadhaarCardFile);
        } else if (key === 'bankProofFile' && form.bankProofFile) {
          fd.append('bankProof', form.bankProofFile);
        } else if (key === 'highestDocumentFile' && form.highestDocumentFile) {
          fd.append('highestDocument', form.highestDocumentFile);
        } else if (key === 'educationQualifications') {
          fd.append(key, JSON.stringify(value));
        } else if (key === 'highestQualification') {
          const { marksheetFile, degreeCertificateFile, highestDocumentFile, ...rest } = value;
          fd.append(key, JSON.stringify(rest));
          if (marksheetFile) fd.append('marksheet', marksheetFile);
          if (degreeCertificateFile) fd.append('degreeCertificate', degreeCertificateFile);
        } else if (key === 'employmentHistory') {
          const dataOnly = value.map(({ relievingLetterFile, ...rest }: any) => rest);
          fd.append(key, JSON.stringify(dataOnly));
          value.forEach((emp: any, idx: number) => {
            if (emp.relievingLetterFile) fd.append(`relievingLetter${idx}`, emp.relievingLetterFile);
          });
        } else if (key === 'references') {
          fd.append(key, JSON.stringify(value));
        } else if (
          !['_id', '__v', 'createdAt', 'updatedAt', 'photo', 'resume', 'panCardFile', 'aadhaarCardFile', 'highestDocumentFile', 'bankProofFile', 'confirmAccountNumber'].includes(key) &&
          (typeof value !== 'object' || value === null)
        ) {
          fd.append(key, String(value ?? ''));
        }
      });

      const res = await api.createOrUpdateJoiningForm?.(paramEmployeeId || '', fd) || { employeeId: 'NEW-EID' };
      setServerEmployeeId(res?.employeeId || '');
      setSubmitted(true);
    } catch (err: any) {
      alert(err.message || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-slate-800 mb-2" style={{ fontWeight: 700, fontSize: '1.25rem' }}>
          Joining Form Submitted!
        </h2>
        {serverEmployeeId && (
          <p className="text-slate-500 text-sm mb-1">
            Employee ID: <span className="text-green-600" style={{ fontWeight: 700 }}>{serverEmployeeId}</span>
          </p>
        )}
        <p className="text-slate-400 text-xs mb-6">Record saved and onboarding email triggered.</p>
        <button
          onClick={() => { setSubmitted(false); setForm(getInitialForm()); }}
          className="px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm"
          style={{ fontWeight: 600 }}
        >
          New Joining
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-slate-800" style={{ fontWeight: 700, fontSize: '1.4rem' }}>Comprehensive Joining Form</h1>
          <p className="text-slate-500 text-sm mt-0.5">Complete all sections to submit</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Status Alert Banners */}
        {isApproved ? (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start gap-3 mb-4 shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-emerald-900 text-sm font-bold">Joining Form & Documents Approved & Verified</p>
              <p className="text-emerald-700 text-xs mt-0.5">
                Your onboarding submission and uploaded KYC documents have been reviewed and verified by <strong>{form.approvedByName || 'Authorized Approver'}</strong> {form.approvedAt ? `on ${new Date(form.approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}. All details are locked. Please contact Admin if you need to modify anything.
              </p>
            </div>
          </div>
        ) : isRejected ? (
          <div className="bg-red-50 border border-red-200 p-5 rounded-2xl flex items-start gap-3.5 mb-4 shadow-xs">
            <AlertCircle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-900 text-sm font-bold">Action Required: Document Revision Requested by Team Lead</p>
              <p className="text-red-700 text-xs mt-0.5">
                Reviewed by <strong>{form.approvedByName || 'Team Lead'}</strong> {form.approvedAt ? `on ${new Date(form.approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}:
              </p>
              {form.rejectionRemarks && (
                <div className="mt-2 p-3 bg-white/95 border border-red-200 rounded-xl text-xs text-red-800 font-semibold shadow-2xs">
                  "{form.rejectionRemarks}"
                </div>
              )}
              {form.rejectedDocuments && form.rejectedDocuments.length > 0 && (
                <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-red-800 font-bold">Document(s) needing re-upload:</span>
                  {form.rejectedDocuments.map(d => (
                    <span key={d} className="px-2.5 py-0.5 bg-red-100 border border-red-300 text-red-800 text-[11px] rounded-full font-bold">
                      {d === 'aadhaarCard' ? 'Aadhaar Card' : d === 'panCard' ? 'PAN Card' : d === 'bankProof' ? 'Bank Proof' : d === 'highestDocument' ? 'Qualification Marksheet' : d === 'photo' ? 'Photo' : d === 'resume' ? 'Resume' : d}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium leading-relaxed">
                💡 <strong>Good news:</strong> You do <strong>not</strong> need to re-fill your entire joining form! All your personal details, bank accounts, and previously approved documents have been saved. Please re-upload <strong>only</strong> the highlighted document(s) below and click <strong>"Re-Submit Corrected Form for Approval"</strong>.
              </div>
            </div>
          </div>
        ) : isPending ? (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 mb-4 shadow-xs">
            <Clock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-amber-900 text-sm font-bold">Submitted — Pending Team Lead Verification</p>
              <p className="text-amber-700 text-xs mt-0.5">
                Your joining form and uploaded KYC documents have been submitted and are awaiting review and approval by your Team Lead. Once verified, your profile will be locked.
              </p>
            </div>
          </div>
        ) : null}
        
        <fieldset disabled={isLocked} className="space-y-4 contents">

        {/* ── RESUME UPLOAD ── */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <Upload className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">Upload Resume (Optional)</h3>
              <p className="text-xs text-blue-700">Upload your resume to auto-fill personal and education details. Fresher candidates will have employment section automatically skipped.</p>
            </div>
          </div>

          <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => !parsingResume && resumeInputRef.current?.click()}>
            {form.resume ? (
              <div className="space-y-1">
                <FileText className="w-6 h-6 text-blue-600 mx-auto" />
                <p className="text-xs text-blue-700 font-semibold">{form.resume.name}</p>
                <p className="text-xs text-blue-600">{(form.resume.size / 1024).toFixed(1)} KB</p>
                {form.isFresher && <p className="text-xs text-green-600 mt-1.5 font-medium">✓ Fresher detected - Employment section will be skipped</p>}
              </div>
            ) : (
              <div className="space-y-1">
                <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-600">{parsingResume ? 'Parsing resume...' : 'Click to upload or drag and drop'}</p>
                <p className="text-xs text-slate-400">PDF, DOCX (Max 10MB)</p>
              </div>
            )}
          </div>

          <input
            ref={resumeInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleResumeUpload}
            disabled={parsingResume}
            className="hidden"
          />

          {form.resume && !form.isFresher && (
            <button
              type="button"
              onClick={() => set('resume', null)}
              className="flex items-center gap-1 px-3 py-1.5 text-red-600 text-xs hover:bg-red-50 rounded"
            >
              <X className="w-3 h-3" /> Remove Resume
            </button>
          )}

          {errors.resume && (
            <p className={`text-xs mt-1 ${errors.resume.includes('successfully') || errors.resume.includes('skipped') ? 'text-green-600' : 'text-red-600'}`}>
              {errors.resume}
            </p>
          )}

          {parsingResume && (
            <div className="flex items-center gap-2 text-blue-600 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Parsing resume and auto-filling details...
            </div>
          )}
        </div>

        {/* ── SECTION 1: Personal Details ── */}
        <CollapsibleSection
          title="Personal Details"
          isOpen={expandedSections.personal}
          onToggle={() => setExpandedSections(s => ({ ...s, personal: !s.personal }))}
        >
          <div className="space-y-4">
            {/* Photo Upload */}
            <div>
              <label className="block text-xs text-slate-500 mb-2" style={{ fontWeight: 600 }}>
                Passport Size Photo *
              </label>
              <div className="flex items-center gap-4">
                <div className="flex-1 border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-green-400 transition-colors"
                  onClick={() => photoInputRef.current?.click()}>
                  {form.photo ? (
                    <div className="space-y-2">
                      <FileText className="w-8 h-8 text-green-600 mx-auto" />
                      <p className="text-sm text-slate-600" style={{ fontWeight: 600 }}>{form.photo.name}</p>
                      <p className="text-xs text-slate-400">{(form.photo.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-sm text-slate-600">Click to upload or drag and drop</p>
                      <p className="text-xs text-slate-400">JPG, PNG up to 5MB</p>
                    </div>
                  )}
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
              {form.photo && (
                <button
                  type="button"
                  onClick={() => set('photo', null)}
                  className="mt-2 flex items-center gap-1 px-3 py-1.5 text-red-600 text-xs hover:bg-red-50 rounded"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              )}
              {errors.photo && <p className="text-xs text-red-600 mt-1">{errors.photo}</p>}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>Full Name *</label>
                <input type="text" value={form.fullName} onChange={e => set('fullName', e.target.value)}
                  placeholder="Full name" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                {errors.fullName && <p className="text-xs text-red-600">{errors.fullName}</p>}
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>Gender *</label>
                <select value={form.gender} onChange={e => set('gender', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white">
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>Date of Birth *</label>
                <input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                {age > 0 && <p className="text-xs text-green-600 mt-1">Age: {age} years</p>}
                {errors.dateOfBirth && <p className="text-xs text-red-600">{errors.dateOfBirth}</p>}
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>Email *</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="email@example.com" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>Date of Joining *</label>
                <input type="date" value={form.joiningDate} onChange={e => set('joiningDate', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white" />
                {errors.joiningDate && <p className="text-xs text-red-600">{errors.joiningDate}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>Position Applied *</label>
                <input type="text" value={form.positionApplied} onChange={e => set('positionApplied', e.target.value)}
                  placeholder="Position applied for" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                {errors.positionApplied && <p className="text-xs text-red-600">{errors.positionApplied}</p>}
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>Source of Interview</label>
                <select value={form.sourceOfInterview} onChange={e => set('sourceOfInterview', e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white">
                  <option value="">Select Recruiter</option>
                  {recruiters.length > 0 ? (
                    recruiters.map(r => <option key={r._id} value={r.name}>{r.name}</option>)
                  ) : (
                    <option disabled>Loading recruiters...</option>
                  )}
                </select>
              </div>
              {form.sourceOfInterview && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>Referral Name (if applicable)</label>
                  <input type="text" value={form.referralName} onChange={e => set('referralName', e.target.value)}
                    placeholder="Name of referrer (optional)" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                  {errors.referralName && <p className="text-xs text-red-600">{errors.referralName}</p>}
                </div>
              )}
            </div>
          </div>
        </CollapsibleSection>

        {/* ── SECTION 2: Address & Contact ── */}
        <CollapsibleSection
          title="Address & Contact Details"
          isOpen={expandedSections.address}
          onToggle={() => setExpandedSections(s => ({ ...s, address: !s.address }))}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>Permanent Address *</label>
              <textarea value={form.permanentAddress} onChange={e => set('permanentAddress', e.target.value)}
                placeholder="Full permanent address" rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 resize-none" />
              {errors.permanentAddress && <p className="text-xs text-red-600">{errors.permanentAddress}</p>}
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>Local Address</label>
              <textarea value={form.localAddress} onChange={e => set('localAddress', e.target.value)}
                placeholder="Current residential address" rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 resize-none" />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>Phone *</label>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit number" maxLength={10} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>Mother's Phone</label>
                <input type="tel" value={form.mothersPhone} onChange={e => set('mothersPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit number" maxLength={10} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>Father/Spouse Mobile</label>
                <input type="tel" value={form.fathersHusbandMobile} onChange={e => set('fathersHusbandMobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit number" maxLength={10} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* ── SECTION 2.5: KYC & Documents ── */}
        <CollapsibleSection
          title="KYC & Document Details (Mandatory)"
          isOpen={expandedSections.kyc}
          onToggle={() => setExpandedSections(s => ({ ...s, kyc: !s.kyc }))}
        >
          <fieldset disabled={isLocked} className="space-y-4 border-none p-0 m-0">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>Blood Group</label>
                <input type="text" value={form.bloodGroup || ''} onChange={e => set('bloodGroup', e.target.value)}
                  placeholder="e.g. O+, A+" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>PAN Number *</label>
                <input type="text" value={form.panNumber || ''} onChange={e => set('panNumber', e.target.value.toUpperCase())}
                  placeholder="10-character PAN (e.g. ABCDE1234F)" maxLength={10} className={`w-full px-3 py-2 border rounded-lg text-sm outline-none bg-white ${errors.panNumber ? 'border-red-400' : 'border-slate-200 focus:border-green-400'}`} />
                {errors.panNumber && <p className="text-xs text-red-600 mt-1">{errors.panNumber}</p>}
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>Aadhaar Number *</label>
                <input type="tel" value={form.aadhaarNumber || ''} onChange={e => set('aadhaarNumber', e.target.value.replace(/\D/g, '').slice(0, 12))}
                  placeholder="12-digit Aadhaar" maxLength={12} className={`w-full px-3 py-2 border rounded-lg text-sm outline-none bg-white ${errors.aadhaarNumber ? 'border-red-400' : 'border-slate-200 focus:border-green-400'}`} />
                {errors.aadhaarNumber && <p className="text-xs text-red-600 mt-1">{errors.aadhaarNumber}</p>}
              </div>
            </div>

            {/* Mandatory KYC Document Uploads */}
            <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
              <FileUploadField
                label="PAN Card Document / Image *"
                file={form.panCardFile}
                existingPath={form.panCardPath}
                onUpload={(e: any) => handleDocumentUpload(e, 'panCard')}
                error={errors.panCard}
                onRemove={() => set('panCardFile', null)}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                isRejected={isDocRejected('panCard')}
              />
              <FileUploadField
                label="Aadhaar Card Document / Image *"
                file={form.aadhaarCardFile}
                existingPath={form.aadhaarCardPath}
                onUpload={(e: any) => handleDocumentUpload(e, 'aadhaarCard')}
                error={errors.aadhaarCard}
                onRemove={() => set('aadhaarCardFile', null)}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                isRejected={isDocRejected('aadhaarCard')}
              />
            </div>
          </fieldset>
        </CollapsibleSection>

        {/* ── SECTION 2.6: Bank & Account Details ── */}
        <CollapsibleSection
          title="Bank & Account Details"
          isOpen={expandedSections.bank}
          onToggle={() => setExpandedSections(s => ({ ...s, bank: !s.bank }))}
        >
          <fieldset disabled={isLocked} className="space-y-4 border-none p-0 m-0">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>Bank Name *</label>
                <input
                  type="text"
                  value={form.bankName || ''}
                  onChange={e => set('bankName', e.target.value)}
                  placeholder="e.g. HDFC Bank, SBI, ICICI"
                  className={`w-full px-3 py-2 border rounded-lg text-sm outline-none bg-white ${errors.bankName ? 'border-red-400' : 'border-slate-200 focus:border-green-400'}`}
                />
                {errors.bankName && <p className="text-xs text-red-600 mt-1">{errors.bankName}</p>}
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>Account Holder Name *</label>
                <input
                  type="text"
                  value={form.accountHolderName || ''}
                  onChange={e => set('accountHolderName', e.target.value)}
                  placeholder="As per bank records"
                  className={`w-full px-3 py-2 border rounded-lg text-sm outline-none bg-white ${errors.accountHolderName ? 'border-red-400' : 'border-slate-200 focus:border-green-400'}`}
                />
                {errors.accountHolderName && <p className="text-xs text-red-600 mt-1">{errors.accountHolderName}</p>}
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>Account Type</label>
                <select
                  value={form.accountType || 'Savings'}
                  onChange={e => set('accountType', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white"
                >
                  <option value="Savings">Savings Account</option>
                  <option value="Salary">Salary Account</option>
                  <option value="Current">Current Account</option>
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>Account Number *</label>
                <input
                  type="text"
                  value={form.accountNumber || ''}
                  onChange={e => set('accountNumber', e.target.value.replace(/\D/g, ''))}
                  placeholder="Bank account number"
                  className={`w-full px-3 py-2 border rounded-lg text-sm outline-none bg-white ${errors.accountNumber ? 'border-red-400' : 'border-slate-200 focus:border-green-400'}`}
                />
                {errors.accountNumber && <p className="text-xs text-red-600 mt-1">{errors.accountNumber}</p>}
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>Confirm Account Number *</label>
                <input
                  type="text"
                  value={form.confirmAccountNumber || ''}
                  onChange={e => set('confirmAccountNumber', e.target.value.replace(/\D/g, ''))}
                  placeholder="Re-enter account number"
                  className={`w-full px-3 py-2 border rounded-lg text-sm outline-none bg-white ${errors.confirmAccountNumber ? 'border-red-400' : 'border-slate-200 focus:border-green-400'}`}
                />
                {errors.confirmAccountNumber && <p className="text-xs text-red-600 mt-1">{errors.confirmAccountNumber}</p>}
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>IFSC Code *</label>
                <input
                  type="text"
                  value={form.ifscCode || ''}
                  onChange={e => set('ifscCode', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))}
                  placeholder="11-character IFSC (e.g. HDFC0001234)"
                  maxLength={11}
                  className={`w-full px-3 py-2 border rounded-lg text-sm outline-none bg-white ${errors.ifscCode ? 'border-red-400' : 'border-slate-200 focus:border-green-400'}`}
                />
                {errors.ifscCode && <p className="text-xs text-red-600 mt-1">{errors.ifscCode}</p>}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>Branch Name / City</label>
                <input
                  type="text"
                  value={form.branchName || ''}
                  onChange={e => set('branchName', e.target.value)}
                  placeholder="e.g. Indiranagar Branch, Bangalore"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white"
                />
              </div>
            </div>

            {/* Bank Proof / Cancelled Cheque Upload */}
            <div className="pt-4 border-t border-slate-200">
              <FileUploadField
                label="Bank Proof Document / Cancelled Cheque / Passbook Image *"
                file={form.bankProofFile}
                existingPath={form.bankProofPath}
                onUpload={(e: any) => handleDocumentUpload(e, 'bankProof')}
                error={errors.bankProof}
                onRemove={() => set('bankProofFile', null)}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                isRejected={isDocRejected('bankProof')}
              />
            </div>
          </fieldset>
        </CollapsibleSection>

        {/* ── SECTION 3: Education ── */}
        <CollapsibleSection
          title="Education & Qualifications"
          isOpen={expandedSections.education}
          onToggle={() => setExpandedSections(s => ({ ...s, education: !s.education }))}
        >
          <div className="space-y-6">
            {/* Education Table */}
            <div>
              <label className="block text-xs text-slate-500 mb-2" style={{ fontWeight: 600 }}>Qualifications</label>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-slate-600">Degree</th>
                      <th className="px-3 py-2 text-left text-slate-600">Institution</th>
                      <th className="px-3 py-2 text-left text-slate-600">Year of Passing</th>
                      <th className="px-3 py-2 text-left text-slate-600">Grade / %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {[
                      { key: 'sslc', label: 'SSLC / SSC' },
                      { key: 'hsc', label: 'HSC / PUC' },
                      { key: 'diploma', label: 'Diploma' },
                      { key: 'ug', label: 'UG (Bachelor)' },
                      { key: 'pg', label: 'PG (Master)' },
                    ].map(({ key, label }) => (
                      <tr key={key} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-600 text-xs" style={{ fontWeight: 500 }}>{label}</td>
                        <td className="px-3 py-2">
                          <input type="text" value={form.educationQualifications[key as keyof typeof form.educationQualifications]?.institution || ''}
                            onChange={e => set('educationQualifications', {
                              ...form.educationQualifications,
                              [key]: { ...form.educationQualifications[key as any], institution: e.target.value }
                            })}
                            placeholder="Institution name" className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs outline-none focus:border-green-400" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" value={form.educationQualifications[key as keyof typeof form.educationQualifications]?.yearOfPassing || ''}
                            onChange={e => set('educationQualifications', {
                              ...form.educationQualifications,
                              [key]: { ...form.educationQualifications[key as any], yearOfPassing: e.target.value ? parseInt(e.target.value) : '' }
                            })}
                            placeholder="YYYY" className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs outline-none focus:border-green-400" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="text" value={form.educationQualifications[key as keyof typeof form.educationQualifications]?.gradePercentage || ''}
                            onChange={e => set('educationQualifications', {
                              ...form.educationQualifications,
                              [key]: { ...form.educationQualifications[key as any], gradePercentage: e.target.value }
                            })}
                            placeholder="%" className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs outline-none focus:border-green-400" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Highest Qualification Section */}
            <div className="border border-slate-200 rounded-lg p-4 space-y-4">
              <h3 className="text-sm" style={{ fontWeight: 600 }}>Highest Qualification Details</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <input type="text" value={form.highestQualification.collegeName} onChange={e => set('highestQualification', { ...form.highestQualification, collegeName: e.target.value })}
                  placeholder="College/Institute name" className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                <input type="text" value={form.highestQualification.collegeAddress} onChange={e => set('highestQualification', { ...form.highestQualification, collegeAddress: e.target.value })}
                  placeholder="College address" className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                <input type="text" value={form.highestQualification.universityName} onChange={e => set('highestQualification', { ...form.highestQualification, universityName: e.target.value })}
                  placeholder="University name" className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                <input type="text" value={form.highestQualification.universityAddress} onChange={e => set('highestQualification', { ...form.highestQualification, universityAddress: e.target.value })}
                  placeholder="University address" className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                <input type="number" value={form.highestQualification.fromYear} onChange={e => set('highestQualification', { ...form.highestQualification, fromYear: e.target.value ? parseInt(e.target.value) : '' })}
                  placeholder="From year" className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                <input type="number" value={form.highestQualification.toYear} onChange={e => set('highestQualification', { ...form.highestQualification, toYear: e.target.value ? parseInt(e.target.value) : '' })}
                  placeholder="To year" className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                <select value={form.highestQualification.program} onChange={e => set('highestQualification', { ...form.highestQualification, program: e.target.value as any })}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white">
                  <option value="">Select program type</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Day">Day</option>
                  <option value="Evening">Evening</option>
                </select>
                <input type="text" value={form.highestQualification.studentId} onChange={e => set('highestQualification', { ...form.highestQualification, studentId: e.target.value })}
                  placeholder="Student ID" className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                <input type="text" value={form.highestQualification.degreeType} onChange={e => set('highestQualification', { ...form.highestQualification, degreeType: e.target.value })}
                  placeholder="Degree type (B.Tech, B.Sc, M.Tech, etc.)" className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                <input type="text" value={form.highestQualification.majorSubject} onChange={e => set('highestQualification', { ...form.highestQualification, majorSubject: e.target.value })}
                  placeholder="Major subject" className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                <input type="date" value={form.highestQualification.graduationDate} onChange={e => set('highestQualification', { ...form.highestQualification, graduationDate: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
              </div>

              {/* Document Uploads for Education / Highest Qualification */}
              <div className="space-y-3 mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Highest Qualification Document *</h4>
                  <span className="text-[11px] text-slate-400">Upload Marksheet, Degree Certificate, or Highest Document</span>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <FileUploadField
                    label="Highest Qualification Document *"
                    file={form.highestDocumentFile}
                    existingPath={form.highestDocumentPath}
                    onUpload={(e: any) => handleDocumentUpload(e, 'highestDocument')}
                    error={errors.highestDocument}
                    onRemove={() => set('highestDocumentFile', null)}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    isRejected={isDocRejected('highestDocument')}
                  />
                  <FileUploadField
                    label="Marksheet (Optional if doc above)"
                    file={form.highestQualification.marksheetFile}
                    existingPath={form.highestQualification.marksheetPath || (form as any).marksheetPath}
                    onUpload={(e: any) => handleDocumentUpload(e, 'marksheet')}
                    error={errors.marksheet}
                    onRemove={() => set('highestQualification', { ...form.highestQualification, marksheetFile: null })}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    isRejected={isDocRejected('highestDocument')}
                  />
                  <FileUploadField
                    label="Degree Certificate (Optional)"
                    file={form.highestQualification.degreeCertificateFile}
                    existingPath={form.highestQualification.degreeCertificatePath || (form as any).degreeCertificatePath}
                    onUpload={(e: any) => handleDocumentUpload(e, 'degreeCertificate')}
                    error={errors.degreeCertificate}
                    onRemove={() => set('highestQualification', { ...form.highestQualification, degreeCertificateFile: null })}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    isRejected={isDocRejected('highestDocument')}
                  />
                </div>
              </div>
            </div>

            {/* Additional Courses */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.additionalCourses} onChange={e => set('additionalCourses', e.target.checked)} className="w-4 h-4" />
              <span className="text-sm text-slate-600">I have completed additional courses/certifications</span>
            </label>
          </div>
        </CollapsibleSection>

        {/* ── SECTION 4: Employment History ── */}
        <CollapsibleSection
          title="Employment History"
          isOpen={expandedSections.employment}
          onToggle={() => setExpandedSections(s => ({ ...s, employment: !s.employment }))}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 mb-2">
              <input 
                type="checkbox" 
                id="isFresherToggle"
                checked={form.isFresher} 
                onChange={e => set('isFresher', e.target.checked)} 
                className="w-4 h-4 text-green-600 rounded focus:ring-green-500 cursor-pointer" 
              />
              <label htmlFor="isFresherToggle" className="text-sm text-slate-700 cursor-pointer select-none" style={{ fontWeight: 600 }}>
                Candidate is a Fresher (Gray out employment history)
              </label>
            </div>

            <div className={`space-y-4 transition-all duration-200 ${form.isFresher ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
              {form.employmentHistory.map((emp, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-4 space-y-4 relative">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm" style={{ fontWeight: 600 }}>Employment #{idx + 1}</h4>
                  {form.employmentHistory.length > 1 && (
                    <button type="button" onClick={() => removeEmploymentEntry(idx)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <input type="text" value={emp.companyName} onChange={e => updateEmploymentEntry(idx, 'companyName', e.target.value)}
                    placeholder="Company name *" className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                  <input type="text" value={emp.positionDepartment} onChange={e => updateEmploymentEntry(idx, 'positionDepartment', e.target.value)}
                    placeholder="Position / Department" className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                  <input type="text" value={emp.mainOfficeAddress} onChange={e => updateEmploymentEntry(idx, 'mainOfficeAddress', e.target.value)}
                    placeholder="Main office address" className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                  <input type="text" value={emp.branchAddress} onChange={e => updateEmploymentEntry(idx, 'branchAddress', e.target.value)}
                    placeholder="Branch address (if any)" className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                  <input type="tel" value={emp.telephone} onChange={e => updateEmploymentEntry(idx, 'telephone', e.target.value)}
                    placeholder="Telephone" className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                  <input type="text" value={emp.employeeCode} onChange={e => updateEmploymentEntry(idx, 'employeeCode', e.target.value)}
                    placeholder="Employee code" className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                  <input type="date" value={emp.fromDate} onChange={e => updateEmploymentEntry(idx, 'fromDate', e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                  <input type="date" value={emp.toDate} onChange={e => updateEmploymentEntry(idx, 'toDate', e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                  <input type="text" value={emp.agencyName} onChange={e => updateEmploymentEntry(idx, 'agencyName', e.target.value)}
                    placeholder="Agency name (if contractual)" className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                  <input type="text" value={emp.remuneration} onChange={e => updateEmploymentEntry(idx, 'remuneration', e.target.value)}
                    placeholder="Remuneration" className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                </div>

                <textarea value={emp.responsibilities} onChange={e => updateEmploymentEntry(idx, 'responsibilities', e.target.value)}
                  placeholder="Key responsibilities" rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 resize-none" />

                <textarea value={emp.reasonForLeaving} onChange={e => updateEmploymentEntry(idx, 'reasonForLeaving', e.target.value)}
                  placeholder="Reason for leaving" rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 resize-none" />

                <div className="grid sm:grid-cols-3 gap-4">
                  <input type="text" value={emp.reportingManagerName} onChange={e => updateEmploymentEntry(idx, 'reportingManagerName', e.target.value)}
                    placeholder="Reporting manager name" className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                  <input type="text" value={emp.reportingManagerPosition} onChange={e => updateEmploymentEntry(idx, 'reportingManagerPosition', e.target.value)}
                    placeholder="Manager position" className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                  <input type="tel" value={emp.reportingManagerContact} onChange={e => updateEmploymentEntry(idx, 'reportingManagerContact', e.target.value)}
                    placeholder="Manager contact" className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                </div>

                <FileUploadField
                  label="Relieving Letter *"
                  file={emp.relievingLetterFile}
                  onUpload={(e) => handleEmploymentDocumentUpload(e, idx)}
                  error={errors[`empDoc${idx}`]}
                  onRemove={() => {
                    const updated = [...form.employmentHistory];
                    updated[idx].relievingLetterFile = null;
                    set('employmentHistory', updated);
                  }}
                />

                {errors[`emp${idx}Company`] && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors[`emp${idx}Company`]}</p>}
                {errors[`emp${idx}FromDate`] && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors[`emp${idx}FromDate`]}</p>}
                {errors[`emp${idx}Relieving`] && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors[`emp${idx}Relieving`]}</p>}
              </div>
            ))}

            <button
              type="button"
              onClick={addEmploymentEntry}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 text-sm transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Employment Entry
            </button>

            {errors.employment && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.employment}</p>}
            </div>
          </div>
        </CollapsibleSection>

        {/* ── SECTION 5: Letter of Undertaking ── */}
        <CollapsibleSection
          title="Letter of Undertaking"
          isOpen={expandedSections.undertaking}
          onToggle={() => setExpandedSections(s => ({ ...s, undertaking: !s.undertaking }))}
        >
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>Guardian Name</label>
                <input type="text" value={form.guardianName} onChange={e => set('guardianName', e.target.value)}
                  placeholder="Parent/Guardian name" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>Salary Offered (₹)</label>
                <input type="text" value={form.salaryOffered} onChange={e => set('salaryOffered', e.target.value)}
                  placeholder="Annual salary" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>Target Assignment</label>
                <input type="text" value={form.targetAssignment} onChange={e => set('targetAssignment', e.target.value)}
                  placeholder="Target assignment" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>Training Duration (Days)</label>
                <input type="number" value={form.trainingDurationDays} onChange={e => set('trainingDurationDays', e.target.value ? parseInt(e.target.value) : '')}
                  placeholder="90" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
              </div>
            </div>

            <LetterOfUndertaking
              candidateName={form.fullName}
              gender={form.gender as any}
              guardianName={form.guardianName}
              permanentAddress={form.permanentAddress}
              positionApplied={form.positionApplied}
              salaryOffered={form.salaryOffered}
              targetAssignment={form.targetAssignment}
              trainingDurationDays={form.trainingDurationDays as number}
              undertakingAccepted={form.undertakingAccepted}
              onAcceptanceChange={(accepted) => set('undertakingAccepted', accepted)}
            />

            {errors.undertaking && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.undertaking}</p>}
          </div>
        </CollapsibleSection>

        {/* ── SECTION 6: References ── */}
        <CollapsibleSection
          title="References"
          isOpen={expandedSections.references}
          onToggle={() => setExpandedSections(s => ({ ...s, references: !s.references }))}
        >
          <div className="space-y-4">
            {form.references.map((ref, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-4 space-y-4">
                <h4 className="text-sm" style={{ fontWeight: 600 }}>Reference #{idx + 1}</h4>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>Name *</label>
                    <input type="text" value={ref.name} onChange={e => updateReference(idx, 'name', e.target.value)}
                      placeholder="Reference name" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                    {errors[`ref${idx}Name`] && <p className="text-xs text-red-600">{errors[`ref${idx}Name`]}</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>Relationship *</label>
                    <input type="text" value={ref.relationship} onChange={e => updateReference(idx, 'relationship', e.target.value)}
                      placeholder="e.g., Friend, Ex-colleague" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                    {errors[`ref${idx}Rel`] && <p className="text-xs text-red-600">{errors[`ref${idx}Rel`]}</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 600 }}>Contact Number *</label>
                    <input type="tel" value={ref.contactNumber} onChange={e => updateReference(idx, 'contactNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10-digit number" maxLength={10} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                    {errors[`ref${idx}Phone`] && <p className="text-xs text-red-600">{errors[`ref${idx}Phone`]}</p>}
                  </div>
                </div>
              </div>
            ))}
            {errors.references && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.references}</p>}
          </div>
        </CollapsibleSection>

        </fieldset>

        {/* Submit Button */}
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-sm" style={{ fontWeight: 600 }}
          >
            Cancel
          </button>
          {isLocked ? (
            <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm font-bold shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Form Approved & Locked
            </div>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-white text-sm font-bold shadow-xs transition-colors disabled:opacity-50 ${
                isRejected ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isRejected ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {submitting
                ? 'Submitting...'
                : isRejected
                ? 'Re-Submit Corrected Form for Approval'
                : 'Submit Comprehensive Form'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// Helper Components
function CollapsibleSection({ title, isOpen, onToggle, children }: any) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
      >
        <h2 className="text-slate-800 text-sm" style={{ fontWeight: 600 }}>{title}</h2>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="border-t border-slate-200 p-5 space-y-4">{children}</div>}
    </div>
  );
}

function FileUploadField({
  label,
  file,
  existingPath,
  onUpload,
  error,
  onRemove,
  accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png',
  isRejected = false,
}: any) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs text-slate-700 font-semibold">{label}</label>
        {isRejected && !file && (
          <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full border border-red-200 animate-pulse">
            ⚠️ Re-upload Required
          </span>
        )}
        {!isRejected && existingPath && !file && (
          <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
            ✓ Preserved on File
          </span>
        )}
      </div>
      <div
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
          error || (isRejected && !file)
            ? 'border-red-400 bg-red-50/50 hover:bg-red-50/80 shadow-xs'
            : existingPath && !file
            ? 'border-emerald-300 bg-emerald-50/20 hover:border-emerald-400'
            : 'border-slate-300 hover:border-green-400 bg-white'
        }`}
        onClick={() => inputRef.current?.click()}
      >
        {file ? (
          <div className="space-y-1">
            <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto" />
            <p className="text-xs text-slate-800 font-bold">{file.name}</p>
            <p className="text-[11px] text-green-700 font-semibold">New file selected (Ready to submit)</p>
          </div>
        ) : isRejected ? (
          <div className="space-y-1">
            <AlertTriangle className="w-6 h-6 text-red-600 mx-auto" />
            <p className="text-xs text-red-700 font-bold">⚠️ Rejected Document: Re-upload Needed</p>
            <p className="text-[11px] text-red-600">Click to select a clear, new file to replace it</p>
          </div>
        ) : existingPath ? (
          <div className="space-y-1">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
            <p className="text-xs text-emerald-800 font-bold">Document on File (Retained)</p>
            <p className="text-[11px] text-slate-400">No action needed · Click if you want to replace</p>
          </div>
        ) : (
          <div className="space-y-1">
            <Upload className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="text-xs text-slate-600 font-medium">Click to upload</p>
            <p className="text-xs text-slate-400">PDF, JPG, PNG, DOCX (Max 10MB)</p>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept={accept} onChange={onUpload} className="hidden" />
      {file && (
        <button
          type="button"
          onClick={onRemove}
          className="mt-2 flex items-center gap-1 px-3 py-1 text-red-600 text-xs hover:bg-red-50 rounded"
        >
          <X className="w-3 h-3" /> Remove new file
        </button>
      )}
      {existingPath && !file && (
        <div className="mt-1.5 flex items-center justify-start">
          <a
            href={existingPath.startsWith('http') ? existingPath : `https://ats.whitehorsemanpower.in${existingPath}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
          >
            <Eye className="w-3.5 h-3.5" /> View Uploaded Document
          </a>
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3 flex-shrink-0" /> {error}</p>}
    </div>
  );
}
