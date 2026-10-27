import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Loader2, AlertCircle, ArrowLeft, UserPlus, Briefcase, Users,
  FileText, Send, ChevronDown, Phone, Mail, MapPin, User,
  Copy, Check, Clock, Tag, Download, X
} from 'lucide-react';
import api from '../../services/api';

// ─── Email Templates ──────────────────────────────────────────
type TemplateKey =
  | 'interview_call_letter'
  | 'second_round_call_letter'
  | 'final_round_call_letter'
  | 'offer_letter';

const LETTER_OPTIONS: { value: TemplateKey; label: string }[] = [
  { value: 'interview_call_letter', label: 'Interview Call Letter' },
  { value: 'second_round_call_letter', label: 'Before Second Round F2F Call Letter' },
  { value: 'final_round_call_letter', label: 'Second Round F2F Call Letter' },
  { value: 'offer_letter', label: 'Letter for Initial Job Offer' },
];

function buildSubject(type: TemplateKey, role: string, company: string): string {
  switch (type) {
    case 'interview_call_letter':
      return `Interview Invitation – ${role} | ${company}`;
    case 'second_round_call_letter':
      return `Second Round Interview Confirmation – ${role} | ${company}`;
    case 'final_round_call_letter':
      return `Final Round Interview Invitation – ${role} | ${company}`;
    case 'offer_letter':
      return `Initial Offer Confirmation – ${role} | ${company}`;
  }
}

function buildBody(type: TemplateKey, candidateName: string, role: string, company: string): string {
  const date = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  switch (type) {
    case 'interview_call_letter':
      return `Dear ${candidateName},

We are pleased to invite you for an interview for the position of ${role} at ${company}.

Date: ${date}
Venue: [Interview Venue / Meeting Link]
Time: [Interview Time]
Mode: [Face-to-Face / Virtual]

Please confirm your availability by replying to this email. Kindly carry a copy of your updated resume and any relevant documents.

We look forward to meeting you.

Warm regards,
HR Team
${company}`;

    case 'second_round_call_letter':
      return `Dear ${candidateName},

Congratulations! We are pleased to inform you that you have successfully cleared the initial screening round for the position of ${role} at ${company}.

You are invited for the Second Round interview:

Date: ${date}
Venue: [Interview Venue / Meeting Link]
Time: [Interview Time]

Please confirm your attendance by responding to this email at your earliest convenience.

Best regards,
HR Team
${company}`;

    case 'final_round_call_letter':
      return `Dear ${candidateName},

We are delighted to invite you for the Final Round interview for the position of ${role} at ${company}.

Date: ${date}
Venue: [Interview Venue / Meeting Link]
Time: [Interview Time]
Panel: [Interviewer Names / Panel Details]

Please come prepared with all necessary documents. Confirm your availability by replying to this email.

Best regards,
HR Team
${company}`;

    case 'offer_letter':
      return `Dear ${candidateName},

Congratulations! You have been selected for the position of ${role} at ${company} following your successful interview process.

We are pleased to extend this initial offer to you. Detailed offer terms and formal letter will follow shortly.

Role: ${role}
Company: ${company}
Expected Date of Joining: [Date of Joining]
CTC: [Offered CTC]

Please confirm your acceptance by replying to this email within 48 hours.

We look forward to you joining our team!

Warm regards,
HR Team
${company}`;
  }
}

// ─── Metric Card ─────────────────────────────────────────────
function MetricCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-green-600" />
      </div>
      <div>
        <p className="text-xs text-slate-500" style={{ fontWeight: 500 }}>{label}</p>
        <p className="text-slate-800" style={{ fontWeight: 700, fontSize: '1.5rem', lineHeight: 1.1 }}>{value}</p>
      </div>
    </div>
  );
}

// ─── Formatted JD Helpers ─────────────────────────────────────
function formatJobDescriptionText(text: string): string {
  if (!text) return '';
  let s = text;

  // 1. Replace special Word / Wingdings bullets (\uF0A7, \uF0B7, etc) with clean bullet and newline
  s = s.replace(/[\uF0A7\uF0B7\uE25A\u25A0\u25CF\u2022\u00B7]/g, '\n• ');

  // 2. Identify known section headers and give them clear line breaks
  const headers = [
    'Key Responsibilities',
    'Key Responsibilities:',
    'Responsibilities:',
    'Roles & Responsibilities:',
    'Roles and Responsibilities:',
    'Required Skills',
    'Required Skills:',
    'Mandatory Skills:',
    'Preferred Skills',
    'Preferred Skills:',
    'Desired Skills:',
    'Technical Skills:',
    'Soft Skills:',
    'Requirements & Qualifications:',
    'Requirements & Qualifications',
    'Detailed Job Description:',
    'Job Description:',
    'Job Summary:',
    'Eligibility Criteria:',
    'Eligibility:',
    'About the Role:',
    'Work Mode:',
    'Work Location:',
    'Location:',
    'Category:',
    'Category',
    'Tags:',
    'Tags',
    'Rating scale',
    'Rating scale:',
    'Experience Type',
    'Experience Type:',
    'Organization:',
    'Organization',
    'Job Level:',
    'Job Level',
    'Position:',
    'Experience:'
  ];

  headers.forEach(h => {
    const re = new RegExp(`(?<!\\n)\\s*\\b(${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
    s = s.replace(re, '\n\n$1');
  });

  // 3. Normalize multiple line breaks
  s = s.replace(/\n{3,}/g, '\n\n').trim();
  return s;
}

function FormattedJobDescription({ text }: { text: string }) {
  if (!text) return null;
  const formatted = formatJobDescriptionText(text);
  const sections = formatted.split(/\n\n+/);

  return (
    <div className="space-y-3.5 text-sm leading-relaxed">
      {sections.map((sec, idx) => {
        const trimmed = sec.trim();
        if (!trimmed) return null;

        // If the section contains bullet points (•)
        if (trimmed.includes('•')) {
          const lines = trimmed.split('\n');
          const firstLineIsBullet = lines[0].trim().startsWith('•');
          const headerLine = firstLineIsBullet ? null : lines[0].trim();
          const bulletLines = lines
            .filter(l => l.trim().startsWith('•'))
            .map(l => l.replace(/^•\s*/, '').trim())
            .filter(Boolean);

          return (
            <div key={idx} className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-4 shadow-xs">
              {headerLine && (
                <h4 className="text-xs uppercase tracking-wider font-bold text-slate-800 mb-2.5 flex items-center gap-1.5 border-b border-slate-200/60 pb-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  {headerLine}
                </h4>
              )}
              <ul className="space-y-2">
                {bulletLines.map((b, bIdx) => (
                  <li key={bIdx} className="flex items-start gap-2.5 text-slate-700">
                    <span className="text-green-600 font-bold mt-0.5 select-none">•</span>
                    <span className="leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        // If the section starts with a known header
        const isHeaderPattern = /^(Key Responsibilities|Required Skills|Preferred Skills|Requirements|Job Description|About the Role|Eligibility Criteria|Tags|Category|Organization|Job Level|Position|Experience|Work Mode|Location)/i.test(trimmed);

        if (isHeaderPattern) {
          const colonIdx = trimmed.indexOf(':');
          const newlineIdx = trimmed.indexOf('\n');
          let header = trimmed;
          let content = '';

          if (newlineIdx !== -1) {
            header = trimmed.slice(0, newlineIdx);
            content = trimmed.slice(newlineIdx + 1).trim();
          } else if (colonIdx !== -1 && colonIdx < 35) {
            header = trimmed.slice(0, colonIdx + 1);
            content = trimmed.slice(colonIdx + 1).trim();
          }

          return (
            <div key={idx} className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-4 shadow-xs">
              <h4 className="text-xs uppercase tracking-wider font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                {header}
              </h4>
              {content && <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{content}</p>}
            </div>
          );
        }

        return (
          <div key={idx} className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 text-slate-700 whitespace-pre-wrap leading-relaxed">
            {trimmed}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export function JRSummaryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  const [selectedLetter, setSelectedLetter] = useState<TemplateKey | ''>('');
  const [candidateName, setCandidateName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [copiedJd, setCopiedJd] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getJob(id!);
        setJob(res.job || res);

        // Fetch candidates for this JR
        setLoadingCandidates(true);
        const candData = await api.getCandidatesForJob(id!);
        setCandidates(candData.candidates || []);
      } catch {
        setError('Failed to load job details.');
      } finally {
        setLoading(false);
        setLoadingCandidates(false);
      }
    };
    load();
  }, [id]);

  const handleLetterChange = (type: TemplateKey) => {
    setSelectedLetter(type);
    setSent(false);
    const role = job?.jobTitle || job?.projectedRole || '[Role]';
    const company = job?.client || job?.companyName || '[Company]';
    setSubject(buildSubject(type, role, company));
    setBody(buildBody(type, candidateName || '[Candidate Name]', role, company));
  };

  const handleCandidateNameChange = (name: string) => {
    setCandidateName(name);
    if (selectedLetter) {
      const role = job?.jobTitle || job?.projectedRole || '[Role]';
      const company = job?.client || job?.companyName || '[Company]';
      setBody(buildBody(selectedLetter, name || '[Candidate Name]', role, company));
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('ats_token') || ''}`,
        },
        body: JSON.stringify({
          subject,
          body,
          messageType: selectedLetter,
          jobId: id,
          templateData: { candidateName, role: job?.jobTitle, company: job?.client || job?.companyName },
        }),
      });
      setSent(true);
    } catch {
      // silent fail — show a basic error state if needed
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const jobTitle = job?.jobTitle || '—';
  const hrName = job?.hrName || '—';
  const spocName = job?.spocName || '—';
  const client = job?.client || job?.companyName || '—';
  const jrNumber = job?.jrNumber || '—';
  const recruiterName = job?.recruiterName || '—';
  const raisedBy = job?.createdBy?.name 
    ? `${job.createdBy.name}${job.createdBy.employeeId ? ` (${job.createdBy.employeeId})` : ''}${job.createdBy.role ? ` · ${job.createdBy.role.toUpperCase()}` : ''}`
    : (job?.recruiterName || '—');

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Top nav with Back and Close */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/jobs')}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Jobs
          </button>
          <span className="text-slate-300">|</span>
          <button
            onClick={() => navigate('/recruiter/add')}
            className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-800 font-semibold transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Add Candidate
          </button>
        </div>
        <button
          onClick={() => navigate('/admin/jobs')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-slate-200"
          title="Close and return to Job Requirements"
        >
          <X className="w-3.5 h-3.5" />
          Close
        </button>
      </div>

      {/* Header Banner */}
      <div className="bg-green-600 rounded-xl px-6 py-5 text-white flex items-start justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-lg font-bold mb-1">
            {jobTitle}
          </h1>
          <p className="text-green-200 text-sm">
            Raised By: <span className="text-white font-semibold">{raisedBy}</span>
            &nbsp;·&nbsp;
            HR: <span className="text-white font-semibold">{hrName}</span>
            &nbsp;·&nbsp;
            SPOC: <span className="text-white font-semibold">{spocName}</span>
            &nbsp;·&nbsp;
            Company: <span className="text-white font-semibold">{client}</span>
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/jobs')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex-shrink-0"
          title="Close Job Requirement Details"
        >
          <X className="w-4 h-4" />
          Close
        </button>
      </div>

      {/* JR Details Panel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-green-600" />
            <h2 className="text-slate-800 font-semibold">JR Details</h2>
          </div>
          <button
            onClick={() => navigate('/admin/jobs')}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-4 grid sm:grid-cols-3 gap-4 text-sm">
          {[
            { label: 'JR Number', value: jrNumber },
            { label: 'Job Title', value: jobTitle },
            { label: 'Raised By / Creator', value: raisedBy },
            { label: 'Client Company', value: client },
            { label: 'Recruiter Name', value: recruiterName },
            { label: 'SPOC Name', value: spocName },
            { label: 'HR Name', value: hrName },
            { label: 'Department', value: job?.department || '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-slate-500 mb-0.5" style={{ fontWeight: 500 }}>{label}</p>
              <p className="text-slate-800 font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Job Description & Requirements Section ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            <h2 className="text-slate-800 font-semibold">Job Description & Specification</h2>
          </div>
          <button
            onClick={() => {
              const fullText = `Job Title: ${jobTitle}\nJR Number: ${jrNumber}\nClient: ${client}\nLocation: ${job?.location || 'N/A'}\nExperience: ${job?.experience || 'N/A'}\nPositions: ${job?.positions || 1}\n\nJob Description:\n${job?.description || 'N/A'}\n\nRequirements:\n${job?.requirements || 'N/A'}\n\nSkills:\n${Array.isArray(job?.skills) ? job.skills.join(', ') : job?.skills || 'N/A'}`;
              navigator.clipboard.writeText(fullText);
              setCopiedJd(true);
              setTimeout(() => setCopiedJd(false), 2500);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-semibold transition-colors border border-green-200 cursor-pointer"
          >
            {copiedJd ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedJd ? 'Copied to Clipboard!' : 'Copy Job Description'}
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Key Specs Badges */}
          <div className="flex flex-wrap gap-2 text-xs">
            {job?.location && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-medium">
                <MapPin className="w-3.5 h-3.5 text-slate-500" /> {job.location}
              </span>
            )}
            {job?.experience && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-medium">
                <Clock className="w-3.5 h-3.5 text-slate-500" /> {job.experience} Exp
              </span>
            )}
            {job?.jobType && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-medium">
                <Briefcase className="w-3.5 h-3.5 text-slate-500" /> {job.jobType}
              </span>
            )}
            {job?.positions && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-semibold">
                <Users className="w-3.5 h-3.5 text-blue-600" /> {job.positions} Position{job.positions > 1 ? 's' : ''}
              </span>
            )}
            {job?.priority && (
              <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold ${
                job.priority === 'High' ? 'bg-red-50 text-red-700' : job.priority === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
              }`}>
                Priority: {job.priority}
              </span>
            )}
            {job?.status && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg font-semibold">
                Status: {job.status}
              </span>
            )}
          </div>

          {/* Detailed Job Description Text */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Detailed Job Description</h3>
            {job?.description ? (
              <FormattedJobDescription text={job.description} />
            ) : (
              <p className="text-slate-400 text-sm italic">No detailed description added for this JR.</p>
            )}
          </div>

          {/* Requirements / Qualifications */}
          {job?.requirements && (
            <div>
              <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Requirements & Qualifications</h3>
              <FormattedJobDescription text={job.requirements} />
            </div>
          )}

          {/* Required Skills */}
          {((Array.isArray(job?.skills) && job.skills.length > 0) || (typeof job?.skills === 'string' && job.skills.trim())) && (
            <div>
              <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-green-600" /> Required Skills & Keywords
              </h3>
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(job?.skills) ? job.skills : job.skills.split(',')).map((sk: string, idx: number) => (
                  <span key={idx} className="px-3 py-1 bg-green-50 text-green-800 border border-green-200 text-xs rounded-full font-medium">
                    {sk.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Attached JD File (if any) */}
          {(job?.jdFileUrl || job?.jdFileName || job?.attachment) && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Original Job Description Attachment: <strong>{job.jdFileName || 'JD Document'}</strong></span>
              </div>
              <a
                href={job.jdFileUrl || job.attachment}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline"
              >
                <Download className="w-3.5 h-3.5" /> Download Document
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Candidate Pipeline Metrics */}
      <div className="grid sm:grid-cols-3 gap-4">
        <MetricCard label="Total Resumes" value={job?.totalResumes ?? candidates.length} icon={FileText} />
        <MetricCard label="Shortlisted Resumes" value={job?.shortlistedResumes ?? 0} icon={Users} />
        <MetricCard label="Shortlisted Candidates" value={job?.shortlistedCandidates ?? 0} icon={Users} />
      </div>

      {/* Candidates Submitted for This JR */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-green-600" />
          <h2 className="text-slate-800 font-semibold">Candidates Submitted</h2>
          <span className="ml-auto text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-semibold">
            {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="px-6 py-4">
          {loadingCandidates ? (
            <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading candidates…</span>
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
              <User className="w-8 h-8 opacity-30" />
              <p className="text-sm">No candidates submitted for this JR yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['Name', 'Contact', 'Department', 'Position', 'Location', 'Experience', 'Status'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs text-slate-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {candidates.slice(0, 20).map((c: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-green-700 text-xs font-semibold">
                              {(c.name || '?').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <button
                            onClick={() => window.location.href = `/recruiter/candidate/${c._id}`}
                            className="text-slate-700 hover:text-blue-600 hover:underline text-xs font-semibold truncate"
                          >
                            {c.name}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="space-y-0.5">
                          {c.phone && (
                            <div className="flex items-center gap-1 text-slate-600">
                              <Phone className="w-3 h-3" />
                              {c.phone}
                            </div>
                          )}
                          {c.email && (
                            <div className="flex items-center gap-1 text-slate-600 truncate">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{c.email}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 text-xs font-medium">
                        {c.department || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700 text-xs font-medium">
                        {c.positionApplied || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {c.location || c.currentCity || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {c.experience || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          c.status === 'Selected'
                            ? 'bg-emerald-100 text-emerald-700'
                            : c.status === 'Rejected'
                            ? 'bg-red-100 text-red-700'
                            : c.status === 'On Hold'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {c.status || 'New'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {candidates.length > 20 && (
                <div className="px-4 py-3 text-xs text-slate-500 border-t border-slate-100">
                  Showing 20 of {candidates.length} candidates. View more from Admin Candidates page.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Interview Call Letters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <FileText className="w-5 h-5 text-green-600" />
          <h2 className="text-slate-800 font-semibold">Interview Call Letters</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Letter type selector */}
          <div className="relative">
            <label className="block text-sm text-slate-700 mb-1.5 font-medium">Select Letter Type</label>
            <div className="relative">
              <select
                value={selectedLetter}
                onChange={e => handleLetterChange(e.target.value as TemplateKey)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 transition-colors appearance-none pr-10"
              >
                <option value="">— Select a letter template —</option>
                {LETTER_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {selectedLetter && (
            <>
              {/* Candidate Name */}
              <div>
                <label className="block text-sm text-slate-700 mb-1.5 font-medium">
                  Candidate Name
                </label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={e => handleCandidateNameChange(e.target.value)}
                  placeholder="Enter candidate name to personalise the letter"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 transition-colors"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm text-slate-700 mb-1.5 font-medium">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 transition-colors"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm text-slate-700 mb-1.5 font-medium">Email Body</label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={14}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 transition-colors font-mono resize-y"
                />
              </div>

              {/* Send */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSend}
                  disabled={sending || sent}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-semibold transition-colors"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? 'Sending…' : sent ? 'Sent!' : 'Send Letter'}
                </button>
                {sent && (
                  <span className="text-green-600 text-sm font-medium">Letter sent successfully.</span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
