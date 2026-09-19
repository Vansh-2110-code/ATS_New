import { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router';
import {
  ArrowLeft, Phone, Mail, Briefcase, MapPin, Clock, CheckCircle, CheckCircle2, XCircle,
  Calendar, FileText, ScanLine, Loader2, Send, ChevronDown, ChevronUp,
  Lock, Shield, AlertTriangle, Upload, Trash2, Eye, Download,
  UserCheck, RefreshCw, FileCheck, Tag, ClipboardList, Zap, Save, X, Edit3, FileSignature,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { calculateAge } from '../../utils/ageCalculator';
import { dedupeCompanies } from '../../utils/companyUtils';
import { CANDIDATE_STATUS_OPTIONS, CANDIDATE_STATUS_COLORS, canUserUpdateCandidateStatus, isTLOnlyStatus } from '../../utils/candidateStatusUtils';
import { CopyableContact } from '../../components/CopyableContact';


const API_BASE = window.location.origin;

// ─── Constants ──────────────────────────────────────────────────
const EMAIL_TEMPLATES = [
  { value: 'interview_call_letter',   label: 'Interview Call Letter (1st Round)' },
  { value: 'second_round_call_letter', label: 'Before 2nd Round F2F Call Letter' },
  { value: 'final_round_call_letter', label: 'Final Round Call Letter' },
  { value: 'selection_mail',          label: 'Selection / Offer Mail' },
  { value: 'offer_letter',            label: 'Letter for Initial Job Offer' },
];

const STATUS_OPTIONS = [...CANDIDATE_STATUS_OPTIONS];
const STATUS_COLORS: Record<string, string> = {
  ...CANDIDATE_STATUS_COLORS,
};

const OWNERSHIP_STATUS_COLORS: Record<string, string> = {
  'Assigned': 'bg-green-50 text-green-700 border-green-200',
  'Expired': 'bg-orange-50 text-orange-700 border-orange-200',
  'Unassigned': 'bg-slate-50 text-slate-600 border-slate-200',
  'General Data': 'bg-purple-50 text-purple-700 border-purple-200',
};

const OUTCOME_COLORS: Record<string, string> = {
  Interested: 'text-emerald-700 bg-emerald-50',
  'No Answer': 'text-amber-700 bg-amber-50',
  'Not Reached': 'text-red-600 bg-red-50',
  'Call Back': 'text-green-700 bg-green-50',
};

const SECOND_CALL_STATUSES = [...CANDIDATE_STATUS_OPTIONS];

const DOCUMENT_TYPES = [
  'Resume', 'Aadhar Card', 'PAN Card', 'Passport',
  'Educational Certificate', 'Experience Letter',
  'Salary Slip', 'Offer Letter', 'Bank Details / Cancelled Cheque',
  'Photograph', 'Other',
];

const DOC_STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700',
  Submitted: 'bg-blue-100 text-blue-700',
  Verified: 'bg-emerald-100 text-emerald-700',
};

// ─── Component ──────────────────────────────────────────────────
export function CandidateProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const isTL = user?.role === 'tl';
  const isRecruiter = user?.role === 'recruiter';
  const isManager = user?.role === 'manager';
  const isTLOrAdmin = isTL || isAdmin;

  const [candidate, setCandidate] = useState<any>(null);
  const [status, setStatus] = useState('Eligible');
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState<any[]>([]);
  const [followUpDate, setFollowUpDate] = useState('');
  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recruiters, setRecruiters] = useState<any[]>([]);

  // ── Email state ──────────────────────────────────────────────
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailRole, setEmailRole] = useState('');
  const [emailCompany, setEmailCompany] = useState('');
  const [emailIntDate, setEmailIntDate] = useState('');
  const [emailIntTime, setEmailIntTime] = useState('');
  const [emailIntMode, setEmailIntMode] = useState('Face-to-Face');
  const [emailJoinDate, setEmailJoinDate] = useState('');
  const [emailSalary, setEmailSalary] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // ── Second Call (TL) state ───────────────────────────────────
  const [secondCallOpen, setSecondCallOpen] = useState(false);
  const [secondCallStatus, setSecondCallStatus] = useState('');
  const [secondCallNotes, setSecondCallNotes] = useState('');
  const [secondCallDate, setSecondCallDate] = useState('');
  const [secondCallTime, setSecondCallTime] = useState('');
  const [secondCallEmail, setSecondCallEmail] = useState('');
  const [submittingSecondCall, setSubmittingSecondCall] = useState(false);
  const [secondCallError, setSecondCallError] = useState('');

  // ── First Call state ─────────────────────────────────────────
  const [firstCallOpen, setFirstCallOpen] = useState(false);
  const [fcStatus, setFcStatus] = useState('');
  const [fcOtherReason, setFcOtherReason] = useState('');
  const [fcRating, setFcRating] = useState('');
  const [fcDate, setFcDate] = useState('');
  const [fcTime, setFcTime] = useState('');
  const [fcEmail, setFcEmail] = useState('');
  const [fcInterviewType, setFcInterviewType] = useState('');
  const [fcEligibleRole, setFcEligibleRole] = useState('');
  const [fcCallBack, setFcCallBack] = useState('');
  const [fcComments, setFcComments] = useState('');
  const [fcCandidateAge, setFcCandidateAge] = useState('');
  const [fcRecruiterStatus, setFcRecruiterStatus] = useState('');
  const [fcWalkInSchedule, setFcWalkInSchedule] = useState('');
  const [fcTentativeDOJ, setFcTentativeDOJ] = useState('');
  const [fcContacted, setFcContacted] = useState(false);
  const [savingFirstCall, setSavingFirstCall] = useState(false);
  const [firstCallError, setFirstCallError] = useState('');

  // ── Candidate Final Details state ────────────────────────────
  const [finalDetailsOpen, setFinalDetailsOpen] = useState(false);
  const [savingFinalDetails, setSavingFinalDetails] = useState(false);
  const [finalDetailsError, setFinalDetailsError] = useState('');

  // ── Reassign state ───────────────────────────────────────────
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignRecruiterId, setReassignRecruiterId] = useState('');
  const [reassignRecruiterName, setReassignRecruiterName] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [reassignError, setReassignError] = useState('');

  // ── Tag Recruiter state (TL/Admin) ───────────────────────────
  const [tagOpen, setTagOpen] = useState(false);
  const [tagRecruiterId, setTagRecruiterId] = useState('');
  const [tagMessage, setTagMessage] = useState('');
  const [tagPriority, setTagPriority] = useState('High');
  const [tagging, setTagging] = useState(false);
  const [tagError, setTagError] = useState('');
  const [isAssignMode, setIsAssignMode] = useState(false);
  const [candidateTasks, setCandidateTasks] = useState<any[]>([]);

  // ── Documents state ──────────────────────────────────────────
  const [docsOpen, setDocsOpen] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [docType, setDocType] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docError, setDocError] = useState('');

  // ── Lock state ───────────────────────────────────────────────
  const isBlockedAsDuplicate = candidate?.isDuplicate && !isAdmin;
  const isLockedForTL = false; // TL can edit now
  const isLockedForAll = false; // TL and Recruiters can edit now
  const isLockedForManager = false; // Managers can edit now
  const isInactive = candidate?.candidateActiveStatus === 'Inactive';
  const isFinalInterviewLocked = candidate?.finalInterviewLocked && !isAdmin;

  // Recruiter Ownership Lock: If candidate is assigned to another recruiter within 30 days & NOT in an unlocked status
  const UNLOCKED_REASSIGN_STATUSES = [
    'Not Eligible', 'No Response', 'Call Back', 'Hold', 'No Show',
    'VNA Reject', 'Test Reject', 'Candidate Drop Post L1 Select',
    'Candidate Drop Post L2 Select', 'Candidate Drop During Final Stage',
    'L1 Reject', 'L2 Reject', 'Final Reject', 'Offer Reject'
  ];
  const isUnlockedStatus = UNLOCKED_REASSIGN_STATUSES.some(
    s => s.toLowerCase() === (candidate?.status || '').trim().toLowerCase()
  );
  const assignedId = String(candidate?.assignedRecruiter?._id || candidate?.assignedRecruiter || '');
  const currentUserId = String(user?._id || user?.id || '');
  const assignedName = String(candidate?.assignedRecruiterName || candidate?.assignedRecruiter?.name || '').trim().toLowerCase();
  const currentUserName = String(user?.name || '').trim().toLowerCase();

  const isOwner = (assignedId && currentUserId && assignedId === currentUserId) ||
                  (assignedName && currentUserName && assignedName === currentUserName);

  const isMisSourcer = ['suhail', 'sohail', 'wasiq', 'babul'].some(n => 
    assignedName.includes(n) || String(candidate?.sourcedBy || '').toLowerCase().includes(n)
  );

  const isCandidateGeneralPool = Boolean(
    candidate?.ownershipStatus === 'General Data' || 
    candidate?.ownershipStatus === 'Unassigned' ||
    !assignedId ||
    assignedName === 'unassigned' || 
    assignedName === 'general pool' ||
    isMisSourcer
  );

  const hasAssignedRecruiter = Boolean(
    !isCandidateGeneralPool &&
    (assignedId || (assignedName && assignedName !== 'unassigned' && assignedName !== 'general pool'))
  );

  const isAssignedToOther = isRecruiter && hasAssignedRecruiter && !isOwner && !isCandidateGeneralPool;
  const isLockedForOtherRecruiter = isAssignedToOther && !isUnlockedStatus && !isAdmin && !isTL && !isManager && !isCandidateGeneralPool;
  const isLockedForRecruiter = isLockedForOtherRecruiter;

  // ── Interview Status state ────────────────────────────────────
  const [interviewStatusOpen, setInterviewStatusOpen] = useState(false);
  const [intStatus, setIntStatus] = useState('');
  const [finalRoundStatus, setFinalRoundStatus] = useState('');
  const [finalIntStatus, setFinalIntStatus] = useState('');
  const [savingIntStatus, setSavingIntStatus] = useState(false);
  const [intStatusMsg, setIntStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showJoiningModal, setShowJoiningModal] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [joiningClientName, setJoiningClientName] = useState('');

  // ── Exit Candidate state ────────────────────────────────────
  const [exitOpen, setExitOpen] = useState(false);
  const [exitDate, setExitDate] = useState('');
  const [exiting, setExiting] = useState(false);
  const [exitError, setExitError] = useState('');

  // ── Joining Details state ──────────────────────────────────
  const [joiningDate, setJoiningDate] = useState('');
  const [joiningSalary, setJoiningSalary] = useState('');
  const [joiningDesignation, setJoiningDesignation] = useState('');
  const [offeredCTC, setOfferedCTC] = useState<number>(0);
  const [placementPercentage, setPlacementPercentage] = useState<number>(8.33);
  const [revenueGenerated, setRevenueGenerated] = useState<number>(0);
  const [savingJoining, setSavingJoining] = useState(false);

  // ── Tag to New JR Modal State ──
  const [tagJrModalOpen, setTagJrModalOpen] = useState(false);
  const [openJobsList, setOpenJobsList] = useState<any[]>([]);
  const [selectedJrNumber, setSelectedJrNumber] = useState('');
  const [tagJrNotes, setTagJrNotes] = useState('');
  const [taggingJr, setTaggingJr] = useState(false);
  const [tagJrError, setTagJrError] = useState('');

  // ── Claim Candidate Modal State ──
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimJrNumber, setClaimJrNumber] = useState('');
  const [claimNotes, setClaimNotes] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');

  const handleOpenClaimModal = async () => {
    setClaimJrNumber(candidate?.jrNumber || '');
    setClaimNotes('');
    setClaimError('');
    setClaimModalOpen(true);
    try {
      const res = await api.getJobs({ status: 'Open', limit: '500' });
      const jobs = res.jobs || (Array.isArray(res) ? res : []);
      setOpenJobsList(jobs);
    } catch (err) {
      console.error('Failed to load open jobs:', err);
    }
  };

  const handleClaimSubmit = async () => {
    if (!candidate) return;
    try {
      setClaiming(true);
      setClaimError('');
      const res = await api.claimCandidate(candidate._id, {
        newJrNumber: claimJrNumber || undefined,
        notes: claimNotes,
      });
      setClaimModalOpen(false);
      if (res.candidate) {
        setCandidate(res.candidate);
        setStatus(res.candidate.status || 'Eligible');
      }
    } catch (err: any) {
      setClaimError(err.message || 'Failed to claim candidate');
    } finally {
      setClaiming(false);
    }
  };

  const handleOpenTagJrModal = async () => {
    setSelectedJrNumber('');
    setTagJrNotes('');
    setTagJrError('');
    setTagJrModalOpen(true);
    try {
      const res = await api.getJobs({ status: 'Open', limit: '500' });
      const jobs = res.jobs || (Array.isArray(res) ? res : []);
      setOpenJobsList(jobs);
    } catch (err) {
      console.error('Failed to load open jobs:', err);
    }
  };

  const handleTagJrSubmit = async () => {
    if (!selectedJrNumber || !candidate) return;
    try {
      setTaggingJr(true);
      setTagJrError('');
      const res = await api.tagCandidateToNewJr(candidate._id, {
        newJrNumber: selectedJrNumber,
        notes: tagJrNotes,
      });
      setTagJrModalOpen(false);
      if (res.candidate) {
        setCandidate(res.candidate);
        setStatus(res.candidate.status || 'Eligible');
      }
    } catch (err: any) {
      setTagJrError(err.message || 'Failed to tag candidate to new JR');
    } finally {
      setTaggingJr(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [cand, calls] = await Promise.all([
          api.getCandidate(id),
          api.getCandidateCalls(id).catch(() => []),
        ]);
        const c = cand.candidate || cand;
        setCandidate(c);
        setStatus(c.status || 'Eligible');
        setNotes(c.notes || []);
        setCallHistory(calls.calls || calls || []);
        setDocuments(c.documents || []);
        // Pre-fill second call if exists
        if (c.secondCallStatus) setSecondCallStatus(c.secondCallStatus);
        if (c.secondCallNotes) setSecondCallNotes(c.secondCallNotes);
        if (c.secondCallDate) setSecondCallDate(new Date(c.secondCallDate).toISOString().split('T')[0]);
        if (c.secondCallTime) setSecondCallTime(c.secondCallTime);
        if (c.secondCallEmail) setSecondCallEmail(c.secondCallEmail);
        // Pre-fill first call if exists
        if (c.firstCallStatus) setFcStatus(c.firstCallStatus);
        if (c.firstCallOtherReason) setFcOtherReason(c.firstCallOtherReason);
        if (c.communicationRating) setFcRating(c.communicationRating);
        if (c.firstCallDate) setFcDate(new Date(c.firstCallDate).toISOString().split('T')[0]);
        if (c.firstCallTime) setFcTime(c.firstCallTime);
        if (c.firstCallEmail) setFcEmail(c.firstCallEmail);
        if (c.firstCallInterviewType) setFcInterviewType(c.firstCallInterviewType);
        if (c.eligibleRole) setFcEligibleRole(c.eligibleRole);
        if (c.callBack) setFcCallBack(c.callBack);
        if (c.comments) setFcComments(c.comments);
        if (c.candidateAge) setFcCandidateAge(c.candidateAge);
        if (c.recruiterStatus) setFcRecruiterStatus(c.recruiterStatus);
        if (c.walkInSchedule) setFcWalkInSchedule(new Date(c.walkInSchedule).toISOString().split('T')[0]);
        if (c.tentativeDOJ) setFcTentativeDOJ(new Date(c.tentativeDOJ).toISOString().split('T')[0]);
        if (c.candidateContacted) setFcContacted(c.candidateContacted);

        // Pre-fill interview status
        setIntStatus(c.interviewStatus || '');
        setFinalRoundStatus(c.finalRoundStatus || '');
        setFinalIntStatus(c.finalInterviewStatus || '');

        // Pre-fill joining details
        if (c.offerDetails?.dateOfJoining) setJoiningDate(new Date(c.offerDetails.dateOfJoining).toISOString().split('T')[0]);
        if (c.offerDetails?.joiningSalary) setJoiningSalary(c.offerDetails.joiningSalary);
        if (c.offerDetails?.designationOffered) setJoiningDesignation(c.offerDetails.designationOffered);
        if (c.offerDetails?.offeredCTC) setOfferedCTC(c.offerDetails.offeredCTC);
        if (c.offerDetails?.placementPercentage) setPlacementPercentage(c.offerDetails.placementPercentage);
        if (c.offerDetails?.revenueGenerated) setRevenueGenerated(c.offerDetails.revenueGenerated);
        if (c.clientName) setJoiningClientName(c.clientName);
      } catch (err) {
        console.error('Failed to load candidate:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    const shouldFetchUsers = ((isAdmin || isTL || isManager) && reassignOpen) || (isTLOrAdmin && tagOpen);
    if (shouldFetchUsers || showJoiningModal || isAdmin) {
      api.getCompanies().then(d => {
        setCompanies(d.companies || []);
        if (shouldFetchUsers) {
          api.getUsers({ limit: '1000' }).then(du => {
            const users = du.users || (Array.isArray(du) ? du : []);
            const valid = users
              .filter((u: any) => 
                ['recruiter', 'tl', 'admin', 'manager', 'spoc'].includes(u.role) ||
                (u.roles && u.roles.some((r: string) => ['recruiter', 'tl', 'admin', 'manager', 'spoc'].includes(r)))
              )
              .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
            setRecruiters(valid);
          }).catch(() => {});
        }
      }).catch(() => {});
    }
  }, [isAdmin, isTL, isManager, reassignOpen, isTLOrAdmin, tagOpen, showJoiningModal]);

  // Sync tagRecruiterId when panel opens
  useEffect(() => {
    if (tagOpen && candidate) {
      const assignedId = candidate.assignedRecruiter?._id || candidate.assignedRecruiter || '';
      setTagRecruiterId(assignedId);
      setIsAssignMode(false); // reset assign mode when opening
    }
  }, [tagOpen, candidate]);

  // Load candidate-linked tasks for all roles to see
  useEffect(() => {
    if (!id) return;
    api.getTasksForCandidate(id).then(d => setCandidateTasks(d.tasks || [])).catch(() => {});
  }, [id]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (isBlockedAsDuplicate || isLockedForOtherRecruiter) return;
    
    if (newStatus === 'Joined') {
      setShowJoiningModal(true);
      return;
    }

    if (newStatus === 'Exited') {
      setExitOpen(true);
      return;
    }

    try {
      await api.updateCandidateStatus(id!, newStatus);
      setStatus(newStatus);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    try {
      const data = await api.addCandidateNote(id!, note, followUpDate || undefined);
      setNotes(data.notes || [{ text: note, date: 'Today' }, ...notes]);
      setNote('');
      setFollowUpDate('');
      // Update local inactive state
      if (candidate) setCandidate({ ...candidate, candidateActiveStatus: 'Active', lastContactDate: new Date() });
    } catch (err) {
      console.error('Failed to add note:', err);
    }
  };

  const loadTemplate = async (type: string) => {
    setEmailTemplate(type);
    setEmailResult(null);
    if (!type) { setEmailSubject(''); setEmailBody(''); return; }
    try {
      const params: Record<string, string> = {
        candidateName: candidate?.name || '',
        role: emailRole, company: emailCompany,
        interviewDate: emailIntDate, interviewTime: emailIntTime,
        interviewMode: emailIntMode, joiningDate: emailJoinDate, offeredSalary: emailSalary,
      };
      const res = await api.getEmailTemplate(type, params);
      setEmailSubject(res.subject || '');
      setEmailBody(res.body || '');
    } catch { /* fallback */ }
  };

  const sendEmail = async () => {
    if (!emailTemplate || !emailSubject || !emailBody) return;
    setEmailSending(true);
    setEmailResult(null);
    try {
      const res = await api.sendCandidateEmail({
        candidateId: id!, templateType: emailTemplate,
        customSubject: emailSubject, customBody: emailBody,
        role: emailRole, company: emailCompany,
        interviewDate: emailIntDate, interviewTime: emailIntTime,
        interviewMode: emailIntMode, joiningDate: emailJoinDate, offeredSalary: emailSalary,
      });
      setEmailResult({ ok: true, msg: `Email sent to ${res.sentTo}` });
    } catch (err: any) {
      setEmailResult({ ok: false, msg: err.message || 'Failed to send email' });
    } finally {
      setEmailSending(false);
    }
  };

  const handleSecondCallSubmit = async () => {
    if (!secondCallStatus) { setSecondCallError('Second call status is required'); return; }
    setSecondCallError('');
    setSubmittingSecondCall(true);
    try {
      const updated = await api.submitSecondCall(id!, {
        secondCallStatus, secondCallNotes, secondCallDate, secondCallTime, secondCallEmail,
      });
      setCandidate(updated);
      setSecondCallOpen(false);
    } catch (err: any) {
      setSecondCallError(err.message || 'Failed to submit second call');
    } finally {
      setSubmittingSecondCall(false);
    }
  };

  const handleSaveFirstCall = async () => {
    if (!fcStatus) { setFirstCallError('Candidate status is required'); return; }
    setFirstCallError('');
    setSavingFirstCall(true);
    try {
      const tsDate = fcDate || new Date().toISOString().split('T')[0];
      const tsTime = fcTime || new Date().toTimeString().slice(0, 5);

      const payload: any = {
        candidateContacted: true,
        firstCallSubmitted: true,
        firstCallStatus: fcStatus,
        status: fcStatus,
        firstCallOtherReason: fcOtherReason,
        communicationRating: fcRating,
        firstCallDate: tsDate,
        firstCallTime: tsTime,
        firstCallEmail: fcEmail,
        firstCallInterviewType: fcInterviewType,
        eligibleRole: fcEligibleRole,
        callBack: fcCallBack,
        comments: fcComments,
      };
      
      const updated = await api.updateCandidate(id!, payload);
      const cData = updated.candidate || updated;
      setCandidate(cData);
      if (cData.status) setStatus(cData.status);
      setFcDate(tsDate);
      setFcTime(tsTime);
      setFirstCallOpen(false);
      alert('Candidate Status details saved.');
    } catch (err: any) {
      setFirstCallError(err.message || 'Failed to save status');
    } finally {
      setSavingFirstCall(false);
    }
  };

  const handleSaveFinalDetails = async () => {
    setFinalDetailsError('');
    setSavingFinalDetails(true);
    try {
      const payload: any = {
        finalDetailsSubmitted: true,
        candidateAge: fcCandidateAge,
        recruiterStatus: fcRecruiterStatus,
        walkInSchedule: fcWalkInSchedule,
        tentativeDOJ: fcTentativeDOJ,
      };
      
      const updated = await api.updateCandidate(id!, payload);
      setCandidate(updated.candidate || updated);
      setFinalDetailsOpen(false);
      alert('Candidate Final Details saved.');
    } catch (err: any) {
      setFinalDetailsError(err.message || 'Failed to save final details');
    } finally {
      setSavingFinalDetails(false);
    }
  };

  const handleRequestReassign = async () => {
    const note = window.prompt('Optional note for Admin (reason for reassignment request):') ?? '';
    if (note === null) return; // cancelled
    try {
      const updated = await api.requestCandidateReassign(id!, note || undefined);
      setCandidate(updated);
    } catch (err: any) {
      console.error('Failed to request reassignment:', err);
    }
  };

  const handleMarkDuplicate = async () => {
    if (!window.confirm('Mark this candidate as a duplicate? They will be blocked from further recruiter actions until Admin reassigns.')) return;
    try {
      const updated = await api.markCandidateDuplicate(id!);
      setCandidate(updated);
    } catch (err: any) {
      console.error('Failed to mark duplicate:', err);
    }
  };

  const handleReassign = async () => {
    if (!reassignRecruiterId) { setReassignError('Select a recruiter'); return; }
    if (!reassignReason.trim()) { setReassignError('Reason is required'); return; }
    setReassignError('');
    setReassigning(true);
    try {
      const updated = await api.reassignCandidate(id!, {
        newRecruiterId: reassignRecruiterId,
        newRecruiterName: reassignRecruiterName,
        reason: reassignReason,
      });
      setCandidate(updated);
      setStatus(updated.status || 'Eligible');
      setReassignOpen(false);
      setReassignReason('');
      setReassignRecruiterId('');
    } catch (err: any) {
      setReassignError(err.message || 'Failed to reassign');
    } finally {
      setReassigning(false);
    }
  };

  const handleTagRecruiter = async () => {
    if (!tagRecruiterId) { setTagError('Select a team member'); return; }
    if (!tagMessage.trim()) { setTagError('Task message is required'); return; }
    setTagError('');
    setTagging(true);
    try {
      await api.createTask({
        title: tagMessage,
        assignedTo: tagRecruiterId,
        priority: tagPriority,
        candidateId: id,
        candidateName: candidate.name,
        entityType: 'candidate',
        entityId: id,
      });
      const d = await api.getTasksForCandidate(id!);
      setCandidateTasks(d.tasks || []);
      setTagOpen(false);
      setTagMessage('');
      setTagRecruiterId('');
      setTagPriority('High');
    } catch (err: any) {
      setTagError(err.message || 'Failed to assign task');
    } finally {
      setTagging(false);
    }
  };

  const handleSaveInterviewStatus = async () => {
    setSavingIntStatus(true);
    setIntStatusMsg(null);
    try {
      const payload: any = { interviewStatus: intStatus };
      if (isTLOrAdmin) {
        payload.finalRoundStatus = finalRoundStatus;
        payload.finalInterviewStatus = finalIntStatus;
      }
      const updated = await api.updateCandidate(id!, payload);
      setCandidate(updated);
      setIntStatusMsg({ ok: true, text: 'Interview status saved.' });
    } catch (err: any) {
      setIntStatusMsg({ ok: false, text: err.message || 'Failed to save.' });
    } finally {
      setSavingIntStatus(false);
    }
  };

  const handleDocUpload = async () => {
    if (!docFile || !docType) { setDocError('File and document type are required'); return; }
    setDocError('');
    setUploadingDoc(true);
    try {
      const fd = new FormData();
      fd.append('file', docFile);
      fd.append('docType', docType);
      const docs = await api.uploadCandidateDocument(id!, fd);
      setDocuments(docs);
      setDocFile(null);
      setDocType('');
    } catch (err: any) {
      setDocError(err.message || 'Upload failed');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDocStatusChange = async (docId: string, newStatus: string) => {
    try {
      const docs = await api.updateDocumentStatus(id!, docId, newStatus);
      setDocuments(docs);
    } catch (err) { console.error(err); }
  };

  const handleDocDelete = async (docId: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      const docs = await api.deleteCandidateDocument(id!, docId);
      setDocuments(docs);
    } catch (err) { console.error(err); }
  };

  const handleRecordExit = async () => {
    if (!candidate?._id) return;

    // Use existing exitDate from DB if already recorded and form is empty
    const effectiveExitDate = exitDate || (safeExit ? safeExit.toISOString().split('T')[0] : '');
    if (!effectiveExitDate) {
      setExitError('Please provide an Exit Date.');
      return;
    }

    // Validate DOJ if missing from both DB and form
    if (!candidate.offerDetails?.dateOfJoining && !joiningDate) {
      setExitError('Please provide Date of Joining before recording exit.');
      return;
    }

    setExiting(true);
    setExitError('');
    try {
      const updated = await api.recordCandidateExit(candidate._id, effectiveExitDate, joiningDate || undefined);
      setCandidate(updated.candidate || updated);
      setStatus('Exited');
      setExitOpen(false);
      alert('Exit details saved successfully.');
    } catch (err: any) {
      setExitError(err.message || 'Failed to record exit');
    } finally {
      setExiting(false);
    }
  };

  const handleSaveJoiningDetails = async () => {
    if (!candidate?._id) return;
    const salaryNum = parseInt(String(joiningSalary).replace(/[^0-9]/g, ''), 10);
    const ctcNum = (offeredCTC && offeredCTC >= 10000) ? offeredCTC : salaryNum;
    if (isNaN(salaryNum) || salaryNum < 10000) {
      alert('Please enter the full annual CTC figure in rupees (e.g. 550000 and not 5.5).');
      return;
    }
    setSavingJoining(true);
    try {
      const calcRev = Math.round(ctcNum * (placementPercentage / 100));
      const updated = await api.updateCandidate(candidate._id, {
        clientName: joiningClientName,
        status: 'Joined',
        joiningSalary: String(ctcNum),
        offeredCTC: ctcNum,
        placementPercentage,
        revenueGenerated: calcRev,
        dateOfJoining: joiningDate,
        offerDetails: {
          ...(candidate.offerDetails || {}),
          dateOfJoining: joiningDate,
          joiningSalary: String(ctcNum),
          designationOffered: joiningDesignation,
          offeredCTC: ctcNum,
          placementPercentage,
          revenueGenerated: calcRev
        }
      });
      setCandidate(updated.candidate || updated);
      setStatus('Joined');
      setShowJoiningModal(false);
      alert('Joining details updated successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to update joining details.');
    } finally {
      setSavingJoining(false);
    }
  };

  const doj = candidate?.offerDetails?.dateOfJoining || candidate?.joiningDate;
  const candExitDate = candidate?.exitDate;
  
  // Safe date parsing with better format handling
  const parseDate = (d: any) => {
    if (!d) return null;
    
    // If it's already a date object and valid
    if (d instanceof Date && !isNaN(d.getTime())) return d;
    
    // Try standard parsing
    let date = new Date(d);
    
    // If invalid, try DD/MM/YYYY format which is common in the UI
    if (isNaN(date.getTime()) && typeof d === 'string' && d.includes('/')) {
      const parts = d.split('/');
      if (parts.length === 3) {
        // Assume DD/MM/YYYY
        date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    }
    
    return isNaN(date.getTime()) ? null : date;
  };

  const safeDoj = parseDate(doj);
  const safeExit = parseDate(candExitDate);
  const effectiveExit = parseDate(exitDate) || safeExit;

  // Use absolute difference and floor for more intuitive "days" counting
  const diffDays = (safeDoj && effectiveExit) 
    ? Math.floor(Math.abs(effectiveExit.getTime() - safeDoj.getTime()) / (1000 * 60 * 60 * 24)) 
    : 0;
  const isEligibleForCN = diffDays > 0 && diffDays <= 180;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  if (!candidate) {
    return <div className="p-6 text-center text-slate-500">Candidate not found</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Back and Edit */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Resumes
        </button>
        {(isAdmin || isTL || isManager || isCandidateGeneralPool || (isRecruiter && !isLockedForOtherRecruiter)) && (
          <div className="flex items-center gap-2">
            {isCandidateGeneralPool && !isOwner && (
              <button
                onClick={handleOpenClaimModal}
                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-xl transition-all shadow-sm font-semibold cursor-pointer"
                title="Claim ownership of candidate from General Pool"
              >
                <CheckCircle className="w-4 h-4" /> Claim Candidate
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => navigate('/admin/offer-letters')}
                className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-xl transition-all shadow-sm font-semibold"
                title="Generate and issue official offer letter"
              >
                <FileSignature className="w-4 h-4" /> Issue Offer Letter
              </button>
            )}
            <button
              onClick={() => navigate(`/recruiter/add?id=${id}`)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-xl transition-all shadow-sm font-semibold"
            >
              <Edit3 className="w-4 h-4" /> Edit Profile
            </button>
          </div>
        )}
      </div>

      {/* ── Lock & Availability Banners ────────────────────────── */}
      {isCandidateGeneralPool && !hasAssignedRecruiter && (
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-xl text-emerald-950 text-sm shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xl">🌟</span>
            <div>
              <p className="font-bold text-emerald-900">Available in General Pool</p>
              <p className="text-xs text-emerald-800 mt-0.5">
                This unassigned candidate is in the General Pool and can be claimed by any recruiter for open Job Requisitions (JRs).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenClaimModal}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors shadow-sm cursor-pointer flex items-center gap-1.5 flex-shrink-0"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Claim Candidate
          </button>
        </div>
      )}
      {isLockedForOtherRecruiter && (
        <div className="flex items-center gap-3 px-4 py-3.5 bg-amber-50 border-2 border-amber-300 rounded-xl text-amber-900 text-sm shadow-sm">
          <Lock className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <div>
            <p className="font-bold">Candidate Assigned to {candidate.assignedRecruiterName || 'another recruiter'}</p>
            <p className="text-xs text-amber-800 mt-0.5">
              This candidate is under active 30-day validity with status <strong>"{candidate.status}"</strong>. This profile is view-only for other recruiters. Only the assigned recruiter, Team Leader, or Admin can edit or update status.
            </p>
          </div>
        </div>
      )}
      {candidate.tlCallSubmitted && !isAdmin && !isCandidateGeneralPool && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <Shield className="w-4 h-4 flex-shrink-0" />
          <span><strong>Fully Locked</strong> — TL second call submitted. Only Admin can edit this profile.</span>
        </div>
      )}
      {candidate.firstCallSubmitted && isRecruiter && !candidate.tlCallSubmitted && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
          <Lock className="w-4 h-4 flex-shrink-0" />
          <span><strong>Submitted – Locked</strong> — First call has been submitted. Contact Admin to make changes.</span>
        </div>
      )}
      {isTL && !candidate.tlCallSubmitted && (
        <div className="flex items-center gap-3 px-4 py-3 bg-violet-50 border border-violet-200 rounded-xl text-violet-700 text-sm">
          <UserCheck className="w-4 h-4 flex-shrink-0" />
          <span><strong>TL Follow-Up Mode</strong> — Only the Second Call Status section is editable. All other fields are read-only.</span>
        </div>
      )}
      {isInactive && (
        <div className="flex items-start gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-700 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold mb-0.5">
              Inactive — No contact for 30+ days
              {candidate.inactiveSince && ` (since ${new Date(candidate.inactiveSince).toLocaleDateString()})`}
            </p>
            {isAdmin ? (
              <p className="text-orange-600">
                <button onClick={() => setReassignOpen(true)} className="underline font-semibold">Reassign to another recruiter</button>
                {candidate.reassignRequested && (
                  <span className="ml-3 bg-orange-100 border border-orange-300 text-orange-800 text-xs px-2 py-0.5 rounded-full" style={{ fontWeight: 500 }}>
                    ⚠ Reassignment requested by {candidate.reassignRequestedByName}
                    {candidate.reassignRequestNote && ` — "${candidate.reassignRequestNote}"`}
                  </span>
                )}
              </p>
            ) : candidate.reassignRequested ? (
              <p className="text-orange-600">
                <span className="inline-flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Reassignment requested — awaiting Admin action.
                </span>
              </p>
            ) : (isRecruiter || isTL) ? (
              <p className="text-orange-600">
                No further actions until reassigned.{' '}
                <button onClick={handleRequestReassign} className="underline font-semibold">Request Reassignment from Admin</button>
              </p>
            ) : null}
          </div>
        </div>
      )}
      {candidate.isDuplicate && (
        <div className="flex items-start gap-3 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold mb-0.5">Duplicate Candidate — Profile Locked</p>
            {isAdmin ? (
              <p className="text-yellow-700">
                This candidate is flagged as a duplicate.{' '}
                <button onClick={() => setReassignOpen(true)} className="underline font-semibold">Reassign as Fresh Candidate</button>
                {' '}to reset workflow and assign to a recruiter.
              </p>
            ) : (
              <p className="text-yellow-700">
                This profile is locked — no further actions allowed. Please contact Admin to reassign or resolve.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left: Profile */}
        <div className="lg:col-span-2 space-y-5">

          {/* Header Card */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white" style={{ fontWeight: 700, fontSize: '1.5rem' }}>
                  {candidate.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <h1 className="text-slate-800 flex items-center gap-2" style={{ fontWeight: 700, fontSize: '1.3rem' }}>
                      {candidate.name}
                      {candidate.candidateId && (
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded text-xs font-semibold">
                          {candidate.candidateId}
                        </span>
                      )}
                    </h1>
                    <p className="text-slate-500 text-sm">{candidate.experience || ''}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-3 py-1.5 rounded-full border ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`} style={{ fontWeight: 600 }}>
                      {status}
                    </span>
                    {candidate.firstCallSubmitted && (
                      <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full flex items-center gap-1" style={{ fontWeight: 500 }}>
                        <Lock className="w-3 h-3" /> First Call Done
                      </span>
                    )}
                    {candidate.tlCallSubmitted && (
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full flex items-center gap-1" style={{ fontWeight: 500 }}>
                        <Shield className="w-3 h-3" /> TL Submitted
                      </span>
                    )}
                    {isInactive && (
                      <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full" style={{ fontWeight: 500 }}>
                        Inactive
                      </span>
                    )}
                    {candidate.ownershipStatus && (
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-3 py-1.5 rounded-full border ${hasAssignedRecruiter ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold' : (OWNERSHIP_STATUS_COLORS[candidate.ownershipStatus] || 'bg-slate-100 text-slate-600 border-slate-200 font-semibold')}`}>
                          {hasAssignedRecruiter ? 'Assigned' : candidate.ownershipStatus}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
                  {candidate.email && <CopyableContact type="email" value={candidate.email} />}
                  {candidate.phone && <CopyableContact type="phone" value={candidate.phone} />}
                  {candidate.experience && <div className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-slate-400" />{candidate.experience}</div>}
                  {(candidate.city || candidate.location) && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {candidate.city || candidate.location}
                      {candidate.localArea && <span className="text-slate-400">· {candidate.localArea}</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Permanent Original JR Heritage Banner ── */}
            {candidate.originalJrNumber && (
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-amber-50/90 border border-amber-200/90 text-xs text-amber-900 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🏷️</span>
                    <div>
                      <span className="font-bold text-sm text-slate-800">Original Job Requisition: {candidate.originalJrNumber}</span>
                      {candidate.originalJobTitle && <span className="text-slate-600 font-medium ml-1.5">({candidate.originalJobTitle})</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded bg-green-100 text-green-800 font-bold text-[11px] border border-green-200">
                      Screened: Eligible
                    </span>
                    <button
                      type="button"
                      onClick={handleOpenTagJrModal}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      Assign to New JR
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 border-t border-amber-200/60 text-slate-700">
                  <div>
                    <span className="text-slate-400">Original Client:</span>{' '}
                    <strong>{candidate.originalClientName || candidate.clientName || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Screened On:</span>{' '}
                    <strong>{candidate.originalScreenedAt ? new Date(candidate.originalScreenedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Screened'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Assignment Status:</span>{' '}
                    <strong className={hasAssignedRecruiter ? 'text-emerald-700 font-bold' : 'text-amber-800 font-bold'}>
                      {hasAssignedRecruiter
                        ? `Active with ${candidate.assignedRecruiterName || 'Assigned Recruiter'} (Protected)`
                        : 'General Pool (Available for Re-assignment)'}
                    </strong>
                  </div>
                </div>
                {candidate.tlRejectionReason && (
                  <div className="mt-2 text-slate-600 bg-white/70 p-2 rounded border border-amber-200/40 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-700">Team Leader Review:</span> {candidate.tlRejectionReason}
                      {candidate.tlRejectedAt && <span className="text-slate-400 ml-1">({new Date(candidate.tlRejectedAt).toLocaleDateString('en-IN')})</span>}
                    </div>
                    <span className="text-[10px] text-amber-700 font-medium">30-Day Auto Release to General Pool</span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4 text-sm">
              <div><p className="text-slate-400 text-xs mb-1">Client / Company</p><p className="text-blue-600 font-semibold">{candidate.clientName || candidate.company || candidate.companyName || candidate.client || 'N/A'}</p></div>
              <div><p className="text-slate-400 text-xs mb-1">JR Number</p><p className="text-slate-700 font-mono" style={{ fontWeight: 500 }}>{candidate.jrNumber || 'N/A'}</p></div>
              <div><p className="text-slate-400 text-xs mb-1">Division</p><p className="text-slate-700 font-semibold">{candidate.division || 'BPO'}</p></div>
              <div><p className="text-slate-400 text-xs mb-1">Source</p><p className="text-slate-700" style={{ fontWeight: 500 }}>{candidate.source || 'N/A'}</p></div>
              <div>
                <p className="text-slate-400 text-xs mb-1 flex items-center justify-between">
                  <span>Assigned To</span>
                  {(isAdmin || isTL || isManager) ? (
                    <button
                      type="button"
                      onClick={() => setReassignOpen(true)}
                      className="text-[11px] text-orange-600 hover:text-orange-700 font-semibold underline cursor-pointer"
                    >
                      {candidate.assignedRecruiterName && candidate.assignedRecruiterName !== 'General Pool' ? 'Change' : 'Assign'}
                    </button>
                  ) : isCandidateGeneralPool && !isOwner ? (
                    <button
                      type="button"
                      onClick={handleOpenClaimModal}
                      className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold underline cursor-pointer"
                    >
                      Claim Ownership
                    </button>
                  ) : null}
                </p>
                <p className="text-slate-700" style={{ fontWeight: 500 }}>
                  {candidate.assignedRecruiterName && candidate.assignedRecruiterName !== 'General Pool' ? candidate.assignedRecruiterName : (candidate.assignedRecruiter?.name || 'Unassigned')}
                </p>
              </div>
              {candidate.candidateAge && (
                <div>
                  <p className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-green-500" /> Age
                  </p>
                  <p className="text-slate-700" style={{ fontWeight: 500 }}>
                    {candidate.candidateAge} years {candidate.dateOfBirth && <span className="text-slate-400 text-xs ml-1">({new Date(candidate.dateOfBirth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})</span>}
                  </p>
                </div>
              )}
              {candidate.dateOfBirth && !candidate.candidateAge && (
                <div>
                  <p className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-green-500" /> Age
                  </p>
                  <p className="text-slate-700" style={{ fontWeight: 500 }}>
                    {calculateAge(candidate.dateOfBirth) || 'N/A'} years
                  </p>
                </div>
              )}
              {candidate.department && <div><p className="text-slate-400 text-xs mb-1">Department</p><p className="text-slate-700" style={{ fontWeight: 500 }}>{candidate.department}</p></div>}
              {candidate.firstCallStatus && <div><p className="text-slate-400 text-xs mb-1">First Call Status</p><p className="text-slate-700" style={{ fontWeight: 500 }}>{candidate.firstCallStatus}</p></div>}
              {candidate.secondCallStatus && <div><p className="text-slate-400 text-xs mb-1">Second Call Status</p><p className="text-slate-700" style={{ fontWeight: 500 }}>{candidate.secondCallStatus}</p></div>}
              {candidate.lastContactDate && <div><p className="text-slate-400 text-xs mb-1">Last Contact</p><p className="text-slate-700" style={{ fontWeight: 500 }}>{new Date(candidate.lastContactDate).toLocaleDateString()}</p></div>}
            </div>
          </div>

          {/* Skills & Resume */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-slate-800 text-sm mb-4" style={{ fontWeight: 600 }}>Skills & Profile</h2>
            <div className="flex flex-wrap gap-2 mb-5">
              {(Array.isArray(candidate.skills) ? candidate.skills : []).map((skill: string, i: number) => (
                <span key={i} className="px-3 py-1.5 bg-green-50 text-green-700 text-xs rounded-lg border border-green-100" style={{ fontWeight: 500 }}>{skill}</span>
              ))}
              {(!candidate.skills || candidate.skills.length === 0) && <p className="text-slate-400 text-sm">No skills listed</p>}
            </div>
            {(candidate.resumePath || candidate.resumeOriginalName) && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="w-9 h-9 bg-slate-200 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-slate-500" />
                </div>
                <div className="flex-1">
                  <p className="text-slate-700 text-sm" style={{ fontWeight: 500 }}>{candidate.resumeOriginalName || 'Resume'}</p>
                  <p className="text-slate-400 text-xs">Uploaded {candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString() : ''}</p>
                </div>
                {candidate.resumePath && (
                  <a href={`${API_BASE}${candidate.resumePath}`} target="_blank" rel="noreferrer"
                    className="text-green-600 text-sm hover:text-green-700 px-3 py-1.5 bg-green-50 rounded-lg" style={{ fontWeight: 500 }}>
                    Preview
                  </a>
                )}
              </div>
            )}
          </div>

          {/* ── Candidate Status & Revenue Tracking ─────────── */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-slate-800 text-sm mb-4" style={{ fontWeight: 600 }}>Candidate Status & Placement</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-slate-400 text-xs mb-1">Current Pipeline Stage</p>
                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full font-medium border border-indigo-100">{candidate.currentStage || 'Applied'}</span>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">Current Status</p>
                <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs rounded-full font-medium border border-green-100">{candidate.status || 'Eligible'}</span>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">Joining Status</p>
                <p className="text-slate-700 text-sm font-semibold">{candidate.offerDetails?.dateOfJoining ? 'Joining Confirmed' : 'Pending Joining'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">Offered CTC</p>
                <p className="text-slate-700 text-sm font-semibold">{candidate.offerDetails?.offeredCTC ? `₹${candidate.offerDetails.offeredCTC.toLocaleString()}` : '--'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">Placement %</p>
                <p className="text-slate-700 text-sm font-semibold">{candidate.offerDetails?.placementPercentage ? `${candidate.offerDetails.placementPercentage}%` : '--'}</p>
              </div>
              {isAdmin && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-100 md:col-span-2">
                  <p className="text-green-600 text-xs mb-1 font-bold">Revenue Generated</p>
                  <p className="text-green-700 text-lg font-bold">{candidate.offerDetails?.revenueGenerated ? `₹${candidate.offerDetails.revenueGenerated.toLocaleString()}` : '₹0'}</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Candidate Status Section (Recruiter Editable) ─────────── */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
            <button onClick={() => setFirstCallOpen(o => !o)} className="w-full flex items-center justify-between px-6 py-4 text-left">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-600" />
                <span className="text-slate-800 text-sm" style={{ fontWeight: 600 }}>Candidate Status</span>
                {candidate.firstCallSubmitted && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Saved
                  </span>
                )}
              </div>
              {firstCallOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {firstCallOpen && (
              <div className="px-6 pb-6 border-t border-slate-100 pt-4 space-y-4">
                <fieldset disabled={isLockedForOtherRecruiter} className={`space-y-4 ${isLockedForOtherRecruiter ? 'opacity-70 cursor-not-allowed select-none' : ''}`}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>Candidate Status *</label>
                      <select value={fcStatus} onChange={e => setFcStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-amber-400 disabled:bg-slate-50">
                        <option value="">— Select Status —</option>
                        {CANDIDATE_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    {fcStatus === 'Other' && (
                      <div>
                        <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>Specify Reason</label>
                        <input type="text" value={fcOtherReason} onChange={e => setFcOtherReason(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-amber-400 disabled:bg-slate-50" />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>Communication Rating</label>
                      <select value={fcRating} onChange={e => setFcRating(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-amber-400 disabled:bg-slate-50">
                        <option value="">— Select —</option>
                        {['Excellent', 'Good', 'Average', 'Poor', 'None'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>Call Back</label>
                      <input type="datetime-local" value={fcCallBack} onChange={e => setFcCallBack(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-amber-400 disabled:bg-slate-50" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>First Call Date</label>
                      <input type="date" value={fcDate} onChange={e => setFcDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-amber-400 disabled:bg-slate-50" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>First Call Time</label>
                      <input type="time" value={fcTime} onChange={e => setFcTime(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-amber-400 disabled:bg-slate-50" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>Comments</label>
                      <textarea value={fcComments} onChange={e => setFcComments(e.target.value)} rows={2}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-amber-400 disabled:bg-slate-50 resize-none" />
                    </div>
                  </div>
                  {firstCallError && <p className="text-red-600 text-xs mt-2">{firstCallError}</p>}
                  {(!candidate.firstCallSubmitted || isAdmin) && (
                    <div className="flex justify-end mt-4">
                      <button onClick={handleSaveFirstCall} disabled={savingFirstCall}
                        className="flex items-center gap-2 px-5 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
                        style={{ fontWeight: 600 }}>
                        {savingFirstCall ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {candidate.firstCallSubmitted ? 'Update (Admin)' : 'Submit First Call'}
                      </button>
                    </div>
                  )}
                </fieldset>
              </div>
            )}
          </div>

          {/* ── Candidate Final Details Section (Recruiter Editable) ─────────── */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
            <button onClick={() => setFinalDetailsOpen(o => !o)} className="w-full flex items-center justify-between px-6 py-4 text-left">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span className="text-slate-800 text-sm" style={{ fontWeight: 600 }}>Candidate Final Details</span>
                {candidate.finalDetailsSubmitted && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Submitted
                  </span>
                )}
              </div>
              {finalDetailsOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {finalDetailsOpen && (
              <div className="px-6 pb-6 border-t border-slate-100 pt-4 space-y-4">
                <fieldset disabled={(candidate.finalDetailsSubmitted && !isAdmin) || !fcContacted || isLockedForOtherRecruiter} className={`space-y-4 ${((candidate.finalDetailsSubmitted && !isAdmin) || !fcContacted || isLockedForOtherRecruiter) ? 'opacity-70 cursor-not-allowed select-none' : ''}`}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>Age</label>
                      <input type="text" value={fcCandidateAge} onChange={e => setFcCandidateAge(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400 disabled:bg-slate-50" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>Recruiter Status</label>
                      <select value={fcRecruiterStatus} onChange={e => setFcRecruiterStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400 disabled:bg-slate-50">
                        <option value="">— Select —</option>
                        {['Eligible', 'Not Eligible', 'Hold'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>Walk-In Schedule</label>
                      <input type="date" value={fcWalkInSchedule} onChange={e => setFcWalkInSchedule(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400 disabled:bg-slate-50" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>Tentative DOJ</label>
                      <input type="date" value={fcTentativeDOJ} onChange={e => setFcTentativeDOJ(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400 disabled:bg-slate-50" />
                    </div>
                  </div>
                  {finalDetailsError && <p className="text-red-600 text-xs mt-2">{finalDetailsError}</p>}
                  {(!candidate.finalDetailsSubmitted || isAdmin) && (
                    <div className="flex justify-end mt-4">
                      <button onClick={handleSaveFinalDetails} disabled={savingFinalDetails}
                        className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        style={{ fontWeight: 600 }}>
                        {savingFinalDetails ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {candidate.finalDetailsSubmitted ? 'Update (Admin)' : 'Submit Final Details'}
                      </button>
                    </div>
                  )}
                </fieldset>
              </div>
            )}
          </div>

          {/* ── TL: Second Call Section ──────────────────────────── */}
          {isTLOrAdmin && (
            <div className={`bg-white rounded-xl border shadow-sm ${candidate.tlCallSubmitted && !isAdmin ? 'border-slate-200 opacity-75' : 'border-violet-200'}`}>
              <button
                onClick={() => setSecondCallOpen(o => !o)}
                disabled={candidate.tlCallSubmitted && !isAdmin}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-violet-600" />
                  <span className="text-slate-800 text-sm" style={{ fontWeight: 600 }}>
                    Second Call Status {isTL ? '(Team Leader)' : ''}
                  </span>
                  {candidate.tlCallSubmitted && (
                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full ml-1" style={{ fontWeight: 500 }}>
                      <Lock className="w-3 h-3 inline mr-0.5" />Submitted & Locked
                    </span>
                  )}
                  {!candidate.tlCallSubmitted && candidate.firstCallSubmitted && (
                    <span className="text-xs px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full ml-1" style={{ fontWeight: 500 }}>Ready for TL</span>
                  )}
                </div>
                {secondCallOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {secondCallOpen && (
                <div className="px-6 pb-6 space-y-4 border-t border-slate-100 pt-4">
                  {(!candidate.firstCallSubmitted && !isAdmin) && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      First call must be submitted before TL can fill second call.
                    </div>
                  )}

                  {/* Read-only view of all other fields for TL */}
                  {isTL && (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500 space-y-1">
                      <p className="font-semibold text-slate-600 mb-2">Candidate Info (Read-Only)</p>
                      <p>Name: <span className="text-slate-700">{candidate.name}</span></p>
                      <p>Phone: <span className="text-slate-700">{candidate.phone}</span></p>
                      <p>First Call Status: <span className="text-slate-700">{candidate.firstCallStatus || 'N/A'}</span></p>
                      <p>First Call Date: <span className="text-slate-700">{candidate.firstCallDate ? new Date(candidate.firstCallDate).toLocaleDateString() : 'N/A'}</span></p>
                      <p>Current Status: <span className="text-slate-700">{candidate.status}</span></p>
                    </div>
                  )}

                  <div className={candidate.tlCallSubmitted && !isAdmin ? 'pointer-events-none opacity-60' : ''}>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>Second Call Status *</label>
                        <select
                          value={secondCallStatus}
                          onChange={e => setSecondCallStatus(e.target.value)}
                          disabled={candidate.tlCallSubmitted && !isAdmin}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-violet-400 disabled:bg-slate-50 disabled:cursor-not-allowed"
                        >
                          <option value="">— Select Status —</option>
                          {SECOND_CALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>Call Date</label>
                        <input type="date" value={secondCallDate} onChange={e => setSecondCallDate(e.target.value)}
                          disabled={candidate.tlCallSubmitted && !isAdmin}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-violet-400 disabled:bg-slate-50 disabled:cursor-not-allowed" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>Call Time</label>
                        <input type="time" value={secondCallTime} onChange={e => setSecondCallTime(e.target.value)}
                          disabled={candidate.tlCallSubmitted && !isAdmin}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-violet-400 disabled:bg-slate-50 disabled:cursor-not-allowed" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>Candidate Email</label>
                        <input type="email" value={secondCallEmail} onChange={e => setSecondCallEmail(e.target.value)}
                          placeholder="Confirm candidate email"
                          disabled={candidate.tlCallSubmitted && !isAdmin}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-violet-400 disabled:bg-slate-50 disabled:cursor-not-allowed" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>Notes / Observations</label>
                        <textarea value={secondCallNotes} onChange={e => setSecondCallNotes(e.target.value)} rows={3}
                          placeholder="TL notes after second call..."
                          disabled={candidate.tlCallSubmitted && !isAdmin}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-violet-400 resize-none disabled:bg-slate-50 disabled:cursor-not-allowed" />
                      </div>
                    </div>

                    {secondCallError && (
                      <p className="text-red-600 text-xs mt-2">{secondCallError}</p>
                    )}

                    {!(candidate.tlCallSubmitted && !isAdmin) && (
                      <div className="flex justify-end mt-4">
                        <button onClick={handleSecondCallSubmit} disabled={submittingSecondCall}
                          className="flex items-center gap-2 px-5 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
                          style={{ fontWeight: 600 }}>
                          {submittingSecondCall ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                          {candidate.tlCallSubmitted ? 'Update Second Call (Admin)' : 'Submit & Lock Second Call'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-slate-800 text-sm mb-4" style={{ fontWeight: 600 }}>Notes & Follow-Up</h2>
            <div className="space-y-3 mb-4">
              {notes.map((n: any, i: number) => (
                <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-slate-600 text-sm">{n.text}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-slate-400 text-xs">{n.addedByName || ''} · {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : n.date || ''}</p>
                    {n.followUpDate && <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded">Follow-up: {new Date(n.followUpDate).toLocaleDateString()}</span>}
                  </div>
                </div>
              ))}
            </div>
            {/* Only allow notes if not locked */}
            {!isLockedForAll && !isLockedForRecruiter && !isLockedForTL && !isBlockedAsDuplicate && !isLockedForManager && (
              <div className="space-y-3">
                <textarea value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Add a note..." rows={2}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 resize-none" />
                <div className="flex gap-2">
                  <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                  <button onClick={addNote} disabled={!note.trim()}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-40" style={{ fontWeight: 500 }}>
                    Save Note
                  </button>
                </div>
              </div>
            )}
            {isLockedForTL && !isLockedForAll && (
              <p className="text-slate-400 text-xs text-center py-2 flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" /> Notes are view-only — use Second Call section for observations.
              </p>
            )}
            {isLockedForRecruiter && !isLockedForAll && (
              <p className="text-slate-400 text-xs text-center py-2 flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" /> Notes are view-only — profile locked after first call submission.
              </p>
            )}
            {isLockedForAll && (
              <p className="text-slate-400 text-xs text-center py-2">Notes are view-only. Profile is fully locked.</p>
            )}
          </div>

          {/* Call History */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-slate-800 text-sm mb-4" style={{ fontWeight: 600 }}>Call History</h2>
            <div className="space-y-3">
              {callHistory.map((call: any, i: number) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${call.outcome === 'Interested' ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                      {call.outcome === 'Interested' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-slate-400" />}
                    </div>
                    {i < callHistory.length - 1 && <div className="w-px flex-1 bg-slate-100 my-1" />}
                  </div>
                  <div className="pb-4">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-slate-700 text-sm" style={{ fontWeight: 500 }}>{call.date}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${OUTCOME_COLORS[call.outcome] || 'bg-slate-100 text-slate-600'}`} style={{ fontWeight: 500 }}>{call.outcome}</span>
                      <span className="text-slate-400 text-xs flex items-center gap-1"><Clock className="w-3 h-3" />{call.duration}</span>
                    </div>
                    <p className="text-slate-500 text-sm">{call.notes}</p>
                  </div>
                </div>
              ))}
              {callHistory.length === 0 && <p className="text-slate-400 text-sm text-center py-4">No call history</p>}
            </div>
          </div>

          {/* ── Interview Status Section ──────────────────────────── */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
            <button onClick={() => setInterviewStatusOpen(o => !o)} className="w-full flex items-center justify-between px-6 py-4 text-left">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-violet-600" />
                <span className="text-slate-800 text-sm" style={{ fontWeight: 600 }}>Interview Status</span>
                {candidate.interviewStatus && (
                  <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">{candidate.interviewStatus}</span>
                )}
                {candidate.finalInterviewLocked && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Final Locked
                  </span>
                )}
              </div>
              {interviewStatusOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {interviewStatusOpen && (
              <div className="px-6 pb-6 border-t border-slate-100 pt-4 space-y-4">
                {/* Lock banner */}
                {isFinalInterviewLocked && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                    <Lock className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-red-700 text-sm">Final Interview Status is locked. Only Admin can change it.</p>
                  </div>
                )}

                {/* Interview Status — Recruiter / TL / Admin */}
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>
                    Interview Status <span className="text-slate-400">(Recruiter / TL / Admin)</span>
                  </label>
                  <select value={intStatus} onChange={e => setIntStatus(e.target.value)}
                    disabled={isLockedForAll || isLockedForRecruiter || isFinalInterviewLocked}
                    className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${isLockedForAll || isLockedForRecruiter || isFinalInterviewLocked ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-200 focus:border-violet-400'}`}>
                    <option value="">— Select status —</option>
                    {['Interview Scheduled','Interview Rescheduled','Interview Completed','Interview Feedback Pending','Shortlisted','Rejected – Interview Round','On Hold','HR Round Scheduled'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Final Round Status — TL / Admin only */}
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5 flex items-center gap-1" style={{ fontWeight: 500 }}>
                    <Shield className="w-3 h-3 text-violet-500" />
                    Final Round Status <span className="text-violet-500">(TL / Admin only)</span>
                  </label>
                  <select value={finalRoundStatus} onChange={e => setFinalRoundStatus(e.target.value)}
                    disabled={!isTLOrAdmin || isLockedForAll || isFinalInterviewLocked}
                    className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${!isTLOrAdmin || isLockedForAll || isFinalInterviewLocked ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed' : 'border-violet-200 focus:border-violet-400'}`}>
                    <option value="">— Select —</option>
                    <option value="Final Round Scheduled">Final Round Scheduled</option>
                  </select>
                  {!isTLOrAdmin && <p className="mt-1 text-xs text-slate-400 flex items-center gap-1"><Lock className="w-3 h-3" /> TL or Admin only</p>}
                </div>

                {/* Final Interview Status — TL (initial) / Admin (after lock) */}
                <div className={`rounded-xl border p-4 ${isFinalInterviewLocked && isAdmin ? 'border-green-200 bg-green-50/40' : isFinalInterviewLocked ? 'border-red-200 bg-red-50/40' : isTLOrAdmin ? 'border-violet-200 bg-violet-50/40' : 'border-slate-200 bg-slate-50'}`}>
                  <p className="text-sm mb-1 flex items-center gap-1.5" style={{ fontWeight: 600, color: isTLOrAdmin ? '#4c1d95' : '#475569' }}>
                    <Lock className="w-4 h-4" />Final Interview Status
                    {isFinalInterviewLocked
                      ? isAdmin
                        ? <span className="text-xs text-green-600 font-normal ml-1">(Locked — Admin override)</span>
                        : <span className="text-xs text-red-500 font-normal ml-1">(Locked — Admin only)</span>
                      : isTLOrAdmin
                        ? <span className="text-xs text-violet-600 font-normal ml-1">(TL / Admin — will lock on save)</span>
                        : <span className="text-xs text-slate-400 font-normal ml-1">(TL / Admin only)</span>
                    }
                  </p>
                  <p className="text-xs text-slate-400 mb-3">
                    {isFinalInterviewLocked ? 'This status is locked after submission.' : 'Setting this will lock it — only Admin can change it afterward.'}
                  </p>
                  <select value={finalIntStatus} onChange={e => setFinalIntStatus(e.target.value)}
                    disabled={!isTLOrAdmin || (isFinalInterviewLocked && !isAdmin)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${
                      (!isTLOrAdmin || (isFinalInterviewLocked && !isAdmin))
                        ? 'bg-white border-slate-200 text-slate-400 cursor-not-allowed'
                        : 'border-violet-300 focus:border-violet-500 bg-white'
                    }`}>
                    <option value="">Select final status</option>
                    {['Selected', 'Rejected', 'On Hold'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Save button */}
                {intStatusMsg && (
                  <p className={`text-xs ${intStatusMsg.ok ? 'text-green-600' : 'text-red-600'}`}>{intStatusMsg.text}</p>
                )}
                <button onClick={handleSaveInterviewStatus} disabled={savingIntStatus || isLockedForAll || isLockedForRecruiter || isFinalInterviewLocked}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
                  style={{ fontWeight: 500 }}>
                  {savingIntStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Save Interview Status
                </button>
              </div>
            )}
          </div>

          {/* ── Documentation Section (Admin only) ──────────────── */}
          {isAdmin && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
              <button onClick={() => setDocsOpen(o => !o)} className="w-full flex items-center justify-between px-6 py-4 text-left">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-green-600" />
                  <span className="text-slate-800 text-sm" style={{ fontWeight: 600 }}>Documentation</span>
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{documents.filter((d: any) => !d.isDeleted).length} files</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Admin Only</span>
                </div>
                {docsOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {docsOpen && (
                <div className="px-6 pb-6 border-t border-slate-100 pt-4 space-y-5">
                  {/* Upload Form */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <p className="text-sm text-slate-700" style={{ fontWeight: 600 }}>Upload Document</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>Document Type *</label>
                        <select value={docType} onChange={e => setDocType(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400">
                          <option value="">— Select Type —</option>
                          {DOCUMENT_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>File *</label>
                        <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={e => setDocFile(e.target.files?.[0] || null)}
                          className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
                      </div>
                    </div>
                    {docError && <p className="text-red-600 text-xs">{docError}</p>}
                    <button onClick={handleDocUpload} disabled={uploadingDoc || !docFile || !docType}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                      style={{ fontWeight: 500 }}>
                      {uploadingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Upload
                    </button>
                  </div>

                  {/* Document List */}
                  <div className="space-y-2">
                    {documents.filter((d: any) => !d.isDeleted).length === 0 && <p className="text-slate-400 text-sm text-center py-4">No documents uploaded</p>}
                    {documents.map((doc: any) => (
                      <div key={doc._id} className={`flex items-center gap-3 p-3 border rounded-lg ${doc.isDeleted ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${doc.isDeleted ? 'bg-slate-100' : 'bg-blue-50'}`}>
                          <FileText className={`w-4 h-4 ${doc.isDeleted ? 'text-slate-400' : 'text-blue-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${doc.isDeleted ? 'text-slate-400 line-through' : 'text-slate-700'}`} style={{ fontWeight: 500 }}>{doc.docType}</p>
                          <p className="text-slate-400 text-xs truncate">
                            {doc.fileName} · {doc.uploadedByName} · {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : ''}
                            {doc.isDeleted && ` · Deleted by ${doc.deletedByName || 'Admin'}`}
                          </p>
                        </div>
                        {doc.isDeleted ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-500" style={{ fontWeight: 500 }}>Deleted</span>
                        ) : (
                          <>
                            <select value={doc.status} onChange={e => handleDocStatusChange(doc._id, e.target.value)}
                              className={`text-xs px-2 py-1 rounded-full border-0 outline-none cursor-pointer ${DOC_STATUS_COLORS[doc.status] || 'bg-slate-100 text-slate-600'}`}
                              style={{ fontWeight: 500 }}>
                              <option value="Pending">Pending</option>
                              <option value="Submitted">Submitted</option>
                              <option value="Verified">Verified</option>
                            </select>
                            <div className="flex items-center gap-1">
                              {doc.filePath && (
                                <a href={doc.filePath} target="_blank" rel="noreferrer"
                                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded" title="View">
                                  <Eye className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {doc.filePath && (
                                <a href={doc.filePath} download
                                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded" title="Download">
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button onClick={() => handleDocDelete(doc._id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 rounded" title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Permanent Job Requisition History & Audit Trail ── */}
          {candidate.jrHistory && candidate.jrHistory.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-600" />
                  <h2 className="text-slate-800 text-sm" style={{ fontWeight: 600 }}>Job Requisition History (Audit Trail)</h2>
                </div>
                <span className="text-[11px] text-slate-400 italic">
                  Permanent record — retained even if JR is closed or deleted
                </span>
              </div>
              <div className="space-y-3">
                {[...candidate.jrHistory].reverse().map((jh: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {jh.jrNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
                        {jh.screeningStatus || 'Screened'}
                      </span>
                      {jh.tlDecision && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${jh.tlDecision === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          TL: {jh.tlDecision}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-1 text-slate-600">
                      <div><span className="text-slate-400">Role:</span> {jh.jobTitle || 'N/A'}</div>
                      <div><span className="text-slate-400">Client:</span> {jh.clientName || 'N/A'}</div>
                      <div><span className="text-slate-400">Recruiter:</span> {jh.assignedRecruiterName || 'Unassigned'}</div>
                    </div>
                    {jh.tlNotes && (
                      <p className="text-slate-500 pt-0.5"><span className="text-slate-400">TL Notes:</span> {jh.tlNotes}</p>
                    )}
                    {jh.notes && (
                      <p className="text-slate-400 text-[11px] pt-0.5 italic">{jh.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stage History (Admin / TL) */}
          {isTLOrAdmin && candidate.stageHistory && candidate.stageHistory.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-slate-800 text-sm mb-4" style={{ fontWeight: 600 }}>Audit Trail</h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {[...candidate.stageHistory].reverse().map((h: any, i: number) => (
                  <div key={i} className="flex gap-3 py-2 border-b border-slate-50 last:border-0">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-slate-600 text-xs">{h.subStatus}</p>
                      {h.notes && <p className="text-slate-400 text-xs mt-0.5">{h.notes}</p>}
                      <p className="text-slate-400 text-xs mt-0.5">{h.changedAt ? new Date(h.changedAt).toLocaleString() : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Team Actions / Assigned Tasks ───────────────────── */}
          {candidateTasks.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-slate-800 text-sm mb-4 flex items-center gap-2" style={{ fontWeight: 600 }}>
                <ClipboardList className="w-4 h-4 text-violet-500" />
                Team Tasks for this Candidate
                <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full ml-1">{candidateTasks.length}</span>
              </h2>
              <div className="space-y-2">
                {candidateTasks.map((task: any) => (
                  <div key={task._id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      task.status === 'Completed' ? 'bg-emerald-400' :
                      task.status === 'In Progress' ? 'bg-blue-400' :
                      task.priority === 'Urgent' ? 'bg-red-400' :
                      task.priority === 'High' ? 'bg-orange-400' : 'bg-slate-300'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-700 text-sm" style={{ fontWeight: 500 }}>{task.title}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-slate-400 text-xs">→ {task.assignedToName}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          task.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                          task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-500'
                        }`} style={{ fontWeight: 500 }}>{task.status}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          task.priority === 'Urgent' ? 'bg-red-100 text-red-600' :
                          task.priority === 'High' ? 'bg-orange-100 text-orange-600' :
                          task.priority === 'Medium' ? 'bg-amber-100 text-amber-600' :
                          'bg-slate-100 text-slate-500'
                        }`} style={{ fontWeight: 500 }}>{task.priority}</span>
                        {task.dueDate && (
                          <span className="text-slate-400 text-xs">Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs mt-0.5">By {task.assignedByName} · {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Email Composer */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
            <button onClick={() => setEmailOpen(o => !o)} className="w-full flex items-center justify-between px-6 py-4 text-left">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-green-600" />
                <span className="text-slate-800 text-sm" style={{ fontWeight: 600 }}>Send Email to Candidate</span>
                {candidate.email && <span className="text-slate-400 text-xs">· {candidate.email}</span>}
              </div>
              {emailOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {emailOpen && (
              <div className="px-6 pb-6 space-y-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>Email Template</label>
                  <select value={emailTemplate} onChange={e => loadTemplate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400">
                    <option value="">— Select a template —</option>
                    {EMAIL_TEMPLATES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>Role / Position</label>
                    <input type="text" value={emailRole} onChange={e => setEmailRole(e.target.value)} placeholder="e.g. Sales Executive"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>Company</label>
                    <input type="text" value={emailCompany} onChange={e => setEmailCompany(e.target.value)} placeholder="e.g. Acme Corp"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                  </div>
                </div>
                {['interview_call_letter', 'second_round_call_letter', 'final_round_call_letter'].includes(emailTemplate) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>Interview Date</label>
                      <input type="date" value={emailIntDate} onChange={e => setEmailIntDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" /></div>
                    <div><label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>Interview Time</label>
                      <input type="time" value={emailIntTime} onChange={e => setEmailIntTime(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" /></div>
                    <div className="col-span-2"><label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>Interview Mode</label>
                      <select value={emailIntMode} onChange={e => setEmailIntMode(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400">
                        <option>Face-to-Face</option><option>Video Call</option><option>Telephonic</option>
                      </select></div>
                  </div>
                )}
                {['offer_letter', 'selection_mail'].includes(emailTemplate) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>Joining Date</label>
                      <input type="date" value={emailJoinDate} onChange={e => setEmailJoinDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" /></div>
                    <div><label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>Offered Salary</label>
                      <input type="text" value={emailSalary} onChange={e => setEmailSalary(e.target.value)} placeholder="e.g. 4.5 LPA" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" /></div>
                  </div>
                )}
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>Subject</label>
                  <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Email subject"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>Email Body</label>
                  <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={10}
                    placeholder="Email content will appear here after selecting a template…"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 resize-y font-mono" />
                </div>
                {emailResult && (
                  <div className={`text-sm px-3 py-2 rounded-lg ${emailResult.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                    {emailResult.msg}
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  <button onClick={() => { setEmailOpen(false); setEmailResult(null); }}
                    className="px-4 py-2 text-slate-600 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors" style={{ fontWeight: 500 }}>
                    Cancel
                  </button>
                  <button onClick={sendEmail} disabled={emailSending || !emailTemplate || !emailSubject || !emailBody}
                    className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-40" style={{ fontWeight: 600 }}>
                    {emailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {emailSending ? 'Sending…' : 'Send Email'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="space-y-4">
          {/* Call Button */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-slate-700 text-sm mb-4" style={{ fontWeight: 600 }}>Call Candidate</h3>
            <Link to={`/recruiter/call/${id}`}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700 transition-colors" style={{ fontWeight: 600 }}>
              <Phone className="w-4 h-4" /> Call Now
            </Link>
            <p className="text-slate-400 text-xs text-center mt-2">{candidate.phone}</p>
          </div>

          {/* ATS Scan */}
          <Link to="/recruiter/scan"
            className="flex items-center gap-3 bg-violet-50 border border-violet-100 rounded-xl p-4 hover:bg-violet-100 transition-colors group">
            <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-violet-200">
              <ScanLine className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <p className="text-violet-800 text-sm" style={{ fontWeight: 600 }}>Scan Resume</p>
              <p className="text-violet-600 text-xs">ATS score & analysis</p>
            </div>
          </Link>

          {/* Status Update */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-slate-700 text-sm mb-2" style={{ fontWeight: 600 }}>Update Status</h3>
            {isBlockedAsDuplicate && (
              <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Locked — duplicate profile
              </p>
            )}
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {STATUS_OPTIONS.map(s => {
                const canUpdate = canUserUpdateCandidateStatus(s, user?.role);
                const isLocked = isBlockedAsDuplicate || !canUpdate;
                return (
                  <button key={s} onClick={() => handleStatusUpdate(s)}
                    disabled={isLocked}
                    title={!canUpdate ? 'Requires Team Leader / Admin permission' : undefined}
                    className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm border transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      status === s
                        ? (STATUS_COLORS[s] || 'bg-slate-100 text-slate-600 border-slate-200') + ' border font-semibold'
                        : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                    }`} style={{ fontWeight: status === s ? 600 : 400 }}>
                    <span className="flex items-center gap-1.5 truncate">
                      {!canUpdate && <Lock className="w-3 h-3 text-slate-400 flex-shrink-0" />}
                      {s}
                    </span>
                    {status === s && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schedule Interview */}
          <div className="bg-green-50 rounded-xl border border-green-100 p-5">
            <h3 className="text-green-800 text-sm mb-3" style={{ fontWeight: 600 }}>
              <Calendar className="inline w-4 h-4 mr-1.5" />
              Schedule Interview
            </h3>
            <p className="text-green-700 text-xs mb-3">
              Interview Status: <strong>{
                candidate.interviewStatus || 
                (['Interview Scheduled', 'Interview Rescheduled', 'Interview Completed', 'Shortlisted', 'HR Round Scheduled', 'Final Round Scheduled', 'Selected', 'Rejected', 'On Hold'].includes(candidate.status) ? candidate.status : 
                ['Interview Scheduled', 'Interview Rescheduled', 'Interview Completed', 'Shortlisted', 'HR Round Scheduled', 'Final Round Scheduled', 'Selected', 'Rejected', 'On Hold'].includes(candidate.firstCallStatus) ? candidate.firstCallStatus : 
                'Not yet scheduled')
              }</strong>
              {candidate.scheduledDate && (
                <span className="ml-2 text-green-600">· Scheduled: {new Date(candidate.scheduledDate).toLocaleDateString()}</span>
              )}
            </p>
          </div>

          {/* ── Admin / TL: Joining & Offer Details ─────────────────────── */}
          {isTLOrAdmin && (status === 'Joined' || status === 'Offered' || status === 'Shortlisted') && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/50">
                <h3 className="text-slate-700 text-sm font-bold flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  Joining & Offer Details
                </h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Company / Client Name *</label>
                    <select
                      value={joiningClientName}
                      onChange={e => setJoiningClientName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400 bg-white"
                    >
                      <option value="">— Select Company —</option>
                      {companies.map(c => (
                        <option key={c.companyName} value={c.companyName}>{c.companyName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Date of Joining</label>
                    <input
                      type="date"
                      value={joiningDate}
                      onChange={e => setJoiningDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Joining Salary</label>
                      <input
                        type="text"
                        value={joiningSalary}
                        onChange={e => setJoiningSalary(e.target.value)}
                        placeholder="₹45k / month"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Designation</label>
                      <input
                        type="text"
                        value={joiningDesignation}
                        onChange={e => setJoiningDesignation(e.target.value)}
                        placeholder="Recruiter"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Offered CTC (₹)</label>
                      <input
                        type="number"
                        value={offeredCTC}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 0;
                          setOfferedCTC(val);
                          setRevenueGenerated(Math.round(val * (placementPercentage / 100)));
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Placement %</label>
                      <input
                        type="number"
                        step="0.01"
                        value={placementPercentage}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          setPlacementPercentage(val);
                          setRevenueGenerated(Math.round(offeredCTC * (val / 100)));
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveJoiningDetails}
                  disabled={savingJoining}
                  className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Details
                </button>
              </div>
            </div>
          )}


          {/* ── Admin: Duplicate Flag ────────────────────────── */}
          {isAdmin && !candidate.isDuplicate && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <p className="text-slate-600 text-xs mb-3" style={{ fontWeight: 600 }}>
                <AlertTriangle className="inline w-3.5 h-3.5 text-yellow-500 mr-1" />
                Mark as Duplicate
              </p>
              <p className="text-slate-400 text-xs mb-3">Blocks recruiter from proceeding. Profile must be reassigned to continue.</p>
              <button onClick={handleMarkDuplicate}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-yellow-50 text-yellow-700 border border-yellow-200 text-sm rounded-lg hover:bg-yellow-100 transition-colors"
                style={{ fontWeight: 500 }}>
                <AlertTriangle className="w-3.5 h-3.5" />
                Flag as Duplicate
              </button>
            </div>
          )}

          {/* ── TL/Admin: Tag Recruiter Panel ─────────────────── */}
          {isTLOrAdmin && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <button onClick={() => setTagOpen(o => !o)}
                className="w-full flex items-center justify-between text-left">
                <h3 className="text-slate-700 text-sm flex items-center gap-2" style={{ fontWeight: 600 }}>
                  <Tag className="w-4 h-4 text-violet-500" /> Tag Recruiter / Assign Task
                </h3>
                {tagOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {tagOpen && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-slate-500 bg-violet-50 border border-violet-100 rounded-lg p-2.5">
                    Assign a task to a recruiter or team member for this candidate (e.g. "Call this candidate today").
                  </p>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1" style={{ fontWeight: 500 }}>Assign To *</label>
                    <select value={tagRecruiterId}
                      onChange={async (e) => {
                        const val = e.target.value;
                        if (val === 'SHOW_RECRUITERS') {
                          setIsAssignMode(true);
                          return;
                        }
                        
                        // If assigning for the first time
                        if (val && !candidate.assignedRecruiter) {
                          try {
                            const selectedUser = recruiters.find(r => r._id === val);
                            const updated = await api.updateCandidate(id!, {
                              assignedRecruiter: val,
                              assignedRecruiterName: selectedUser?.name || ''
                            });
                            setCandidate(updated.candidate || updated);
                          } catch (err: any) {
                            setTagError(err.message || 'Failed to assign recruiter');
                          }
                        }
                        setTagRecruiterId(val);
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-violet-400">
                      {!candidate.assignedRecruiter && !isAssignMode ? (
                        <>
                          <option value="">N/A (No Recruiter Assigned)</option>
                          <option value="SHOW_RECRUITERS" className="text-violet-600 font-semibold">+ Assign Recruiter</option>
                        </>
                      ) : (
                        <>
                          <option value="">— Select Team Member —</option>
                          {recruiters.map((r: any) => (
                            <option key={r._id} value={r._id}>
                              {r.name} ({r.role}) {candidate.assignedRecruiter === r._id || candidate.assignedRecruiter?._id === r._id ? '✓' : ''}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1" style={{ fontWeight: 500 }}>Task / Message *</label>
                    <textarea value={tagMessage} onChange={e => setTagMessage(e.target.value)} rows={2}
                      placeholder="e.g. Call this candidate and update status..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-violet-400 resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1" style={{ fontWeight: 500 }}>Priority</label>
                    <select value={tagPriority} onChange={e => setTagPriority(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-violet-400">
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                  {tagError && <p className="text-red-600 text-xs">{tagError}</p>}
                  <button onClick={handleTagRecruiter} disabled={tagging}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
                    style={{ fontWeight: 600 }}>
                    {tagging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
                    Assign Task
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Admin / TL: Reassign Panel ─────────────────────────── */}
          {(isAdmin || isTL || isManager) && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <button onClick={() => setReassignOpen(o => !o)}
                className="w-full flex items-center justify-between text-left">
                <h3 className="text-slate-700 text-sm flex items-center gap-2" style={{ fontWeight: 600 }}>
                  <RefreshCw className="w-4 h-4 text-orange-500" /> Reassign Candidate
                </h3>
                {reassignOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {reassignOpen && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-slate-500 bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                    {candidate.status === 'Joined' 
                      ? 'Candidate status is "Joined". Assigning will update the mapped Recruiter and Team Leader while preserving Joined status and revenue details.' 
                      : 'Assigning / Reassigning will map this candidate to the chosen recruiter and update team reports.'}
                  </p>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1" style={{ fontWeight: 500 }}>Assign To *</label>
                    <select value={reassignRecruiterId}
                      onChange={e => { setReassignRecruiterId(e.target.value); setReassignRecruiterName(e.target.options[e.target.selectedIndex].text); }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-orange-400">
                      <option value="">— Select Recruiter —</option>
                      {recruiters.map((r: any) => <option key={r._id} value={r._id}>{r.name} ({r.role})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1" style={{ fontWeight: 500 }}>Reason *</label>
                    <textarea value={reassignReason} onChange={e => setReassignReason(e.target.value)} rows={2}
                      placeholder="e.g. Duplicate, inactivity, recruiter left..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-orange-400 resize-none" />
                  </div>
                  {reassignError && <p className="text-red-600 text-xs">{reassignError}</p>}
                  <button onClick={handleReassign} disabled={reassigning}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
                    style={{ fontWeight: 600 }}>
                    {reassigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Confirm Reassignment
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* ══════════ Joining Details Popup ══════════ */}
      {showJoiningModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
              <h3 className="text-slate-800 font-bold flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                Mark as Joined
              </h3>
              <button onClick={() => setShowJoiningModal(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500">Please provide the joining details for <span className="font-bold text-slate-700">{candidate.name}</span> to complete the process.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Company Name *</label>
                  <select
                    value={joiningClientName}
                    onChange={e => setJoiningClientName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 bg-white shadow-sm"
                  >
                    <option value="">— Select Company —</option>
                    {companies.map(c => (
                      <option key={c.companyName} value={c.companyName}>{c.companyName}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Joining Date *</label>
                    <input
                      type="date"
                      value={joiningDate}
                      onChange={e => setJoiningDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Monthly In-Hand / Salary (₹) *</label>
                    <input
                      type="text"
                      value={joiningSalary}
                      onChange={e => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        setJoiningSalary(raw);
                      }}
                      placeholder="e.g. 45000"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Designation</label>
                  <input
                    type="text"
                    value={joiningDesignation}
                    onChange={e => setJoiningDesignation(e.target.value)}
                    placeholder="e.g. Sales Manager"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 shadow-sm mb-4"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Offered Annual CTC (₹) *</label>
                    <input
                      type="text"
                      value={offeredCTC ? String(offeredCTC) : ''}
                      onChange={e => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        const val = parseInt(raw, 10) || 0;
                        setOfferedCTC(val);
                        setRevenueGenerated(Math.round(val * (placementPercentage / 100)));
                      }}
                      placeholder="e.g. 550000"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 shadow-sm"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Enter full figure (e.g. <strong>550000</strong>, not 5.5).
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Placement % *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={placementPercentage}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setPlacementPercentage(val);
                        setRevenueGenerated(Math.round(offeredCTC * (val / 100)));
                      }}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowJoiningModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveJoiningDetails}
                  disabled={savingJoining || !joiningClientName || !joiningDate || !joiningSalary}
                  className="flex-[2] px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                >
                  {savingJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Confirm Joining
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── Tag Candidate to New JR Modal ── */}
      {tagJrModalOpen && candidate && (
        <div className="fixed inset-0 bg-slate-950/45 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-slate-800" style={{ fontWeight: 700 }}>Tag to New Job Requisition</h3>
                  <p className="text-slate-500 text-xs mt-0.5">Assign candidate to new JR while permanently retaining original screening</p>
                </div>
              </div>
              <button onClick={() => setTagJrModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm text-slate-800">{candidate.name}</p>
                  <span className="text-[11px] px-2 py-0.5 bg-green-100 text-green-800 font-semibold rounded">
                    Screened: Eligible
                  </span>
                </div>
                {candidate.originalJrNumber && (
                  <p className="text-amber-800 font-medium">
                    🏷️ Original JR: <strong>{candidate.originalJrNumber}</strong> {candidate.originalJobTitle ? `(${candidate.originalJobTitle})` : ''}
                  </p>
                )}
                <p className="text-slate-600">
                  Current JR: <strong className="text-slate-700">{candidate.jrNumber || 'None'}</strong> · Client: <strong className="text-slate-700">{candidate.clientName || 'N/A'}</strong>
                </p>
                <div className="mt-2 pt-2 border-t border-amber-200/60 text-[11px] text-amber-800">
                  ✨ <strong>Audit Guarantee:</strong> The candidate will retain original JR reference and complete screening history permanently even if previous JRs are deleted or closed.
                </div>
              </div>

              {tagJrError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
                  {tagJrError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Select Active Job Requisition (JR) *</label>
                <select
                  value={selectedJrNumber}
                  onChange={e => setSelectedJrNumber(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 outline-none focus:border-amber-500 font-medium text-slate-800"
                >
                  <option value="">— Choose Open Job Requirement —</option>
                  {openJobsList.map((j: any) => (
                    <option key={j._id || j.jrNumber} value={j.jrNumber}>
                      {j.jrNumber} — {j.jobTitle} ({j.companyName || j.client || 'Client'}) [{j.division || 'BPO'}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Notes / Re-tagging Justification (Optional)</label>
                <textarea
                  rows={2}
                  value={tagJrNotes}
                  onChange={e => setTagJrNotes(e.target.value)}
                  placeholder="e.g., Fast-tracking from general pool for new client requirement..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 bg-slate-50 resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-2 justify-end flex-shrink-0">
              <button
                disabled={taggingJr}
                onClick={() => setTagJrModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={taggingJr || !selectedJrNumber}
                onClick={handleTagJrSubmit}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {taggingJr ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Tagging...
                  </>
                ) : (
                  <>
                    <Tag className="w-4 h-4" />
                    Tag to JR & Fast-Track
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Claim Candidate Modal ── */}
      {claimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600 font-bold">🌟</span>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Claim Candidate Ownership</h3>
                  <p className="text-xs text-slate-500">Take ownership from General Pool &amp; optionally attach to an active JR</p>
                </div>
              </div>
              <button
                onClick={() => setClaimModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm text-slate-800">{candidate.name}</p>
                  <span className="text-[11px] px-2 py-0.5 bg-emerald-100 text-emerald-800 font-semibold rounded">
                    General Pool Available
                  </span>
                </div>
                {candidate.originalJrNumber && (
                  <p className="text-emerald-900 font-medium">
                    🏷️ Original JR: <strong>{candidate.originalJrNumber}</strong> {candidate.originalJobTitle ? `(${candidate.originalJobTitle})` : ''}
                  </p>
                )}
                <p className="text-slate-600">
                  Phone: <strong>{candidate.phone || 'N/A'}</strong> · Current Status: <strong>{candidate.status || 'Eligible'}</strong>
                </p>
                <div className="mt-2 pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-800">
                  ✨ <strong>Fast-Track Guarantee:</strong> Previously screened eligible candidates will remain marked <strong>Eligible</strong> under your ownership without repeating preliminary screening.
                </div>
              </div>

              {claimError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
                  {claimError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Assign to Job Requisition (JR) (Optional)</label>
                <select
                  value={claimJrNumber}
                  onChange={e => setClaimJrNumber(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 outline-none focus:border-emerald-500 font-medium text-slate-800"
                >
                  <option value="">— Keep Current / Assign Later —</option>
                  {openJobsList.map((j: any) => (
                    <option key={j._id || j.jrNumber} value={j.jrNumber}>
                      {j.jrNumber} — {j.jobTitle} ({j.companyName || j.client || 'Client'}) [{j.division || 'BPO'}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Notes / Justification (Optional)</label>
                <textarea
                  rows={2}
                  value={claimNotes}
                  onChange={e => setClaimNotes(e.target.value)}
                  placeholder="e.g., Claiming profile for immediate client interview..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 bg-slate-50 resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-2 justify-end flex-shrink-0">
              <button
                disabled={claiming}
                onClick={() => setClaimModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={claiming}
                onClick={handleClaimSubmit}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {claiming ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Claiming...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Confirm &amp; Claim Ownership
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
