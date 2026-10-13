import React, { useEffect } from 'react';
import {
  X, Briefcase, Building2, MapPin, Clock, DollarSign,
  Calendar, GraduationCap, User, FileText, CheckCircle2,
  AlertCircle, Download, ExternalLink, Tag
} from 'lucide-react';

interface JdPreviewModalProps {
  job: any;
  onClose: () => void;
}

export const JdPreviewModal: React.FC<JdPreviewModalProps> = ({ job, onClose }) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!job) return null;

  // Extract skills (handles array or comma-separated string)
  let skillsList: string[] = [];
  if (Array.isArray(job.skills)) {
    skillsList = job.skills.filter(Boolean);
  } else if (typeof job.skills === 'string' && job.skills.trim()) {
    skillsList = job.skills.split(',').map((s: string) => s.trim()).filter(Boolean);
  }

  const clientName = job.client || job.companyName || 'Not Specified';
  const jobTitle = job.jobTitle || job.projectedRole || 'Position Title Not Specified';
  const location = job.location || 'Location Not Specified';
  const experience = job.experience || 'Experience Not Specified';
  const positions = job.positions || 1;
  const jobType = job.jobType || 'Full-Time';
  const division = job.division || job.portfolioDepartment || '';
  const priority = job.priority || 'Medium';

  // Specific fields with fallbacks
  const salary = job.salary || job.ctc || job.budget || job.salaryRange || '';
  const noticePeriod = job.noticePeriod || job.notice || '';
  const shift = job.shift || job.shiftTimings || job.workingHours || job.workShift || '';
  const education = job.education || job.qualification || '';

  const description = job.description || '';
  const requirements = job.requirements || '';
  const recruiterNotes = job.recruiterInstructions || job.specialInstructions || job.notes || '';

  // Priority color styling
  const getPriorityBadgeClass = (p: string) => {
    switch (p.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-mono font-bold text-sm bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-md border border-blue-200">
                {job.jrNumber}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${getPriorityBadgeClass(priority)}`}>
                {priority} Priority
              </span>
              {division && (
                <span className="text-xs font-medium bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                  {division}
                </span>
              )}
              <span className="text-xs text-slate-500">
                Status: <strong className="text-green-700">{job.status || 'Open'}</strong>
              </span>
            </div>

            <h2 className="text-xl font-bold text-slate-900 truncate" title={jobTitle}>
              {jobTitle}
            </h2>

            <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
              <Building2 className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span className="font-semibold text-slate-800">{clientName}</span>
              {job.department && (
                <>
                  <span className="text-slate-300">•</span>
                  <span>Dept: {job.department}</span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors flex-shrink-0"
            title="Close Preview (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Highlights Strip */}
        <div className="bg-blue-50/50 border-b border-blue-100 px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div>
              <div className="text-slate-500 font-medium">Location</div>
              <div className="font-semibold text-slate-800 truncate" title={location}>{location}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div>
              <div className="text-slate-500 font-medium">Experience</div>
              <div className="font-semibold text-slate-800 truncate" title={experience}>{experience}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div>
              <div className="text-slate-500 font-medium">Vacancies</div>
              <div className="font-semibold text-slate-800">{positions} Openings</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div>
              <div className="text-slate-500 font-medium">Job Type</div>
              <div className="font-semibold text-slate-800">{jobType}</div>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-sm">
          {/* Key Parameters: Shift, Salary, Notice, Education */}
          {(shift || salary || noticePeriod || education) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {shift && (
                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-700">Shift / Working Hours:</span>{' '}
                    <span className="text-slate-800">{shift}</span>
                  </div>
                </div>
              )}
              {salary && (
                <div className="flex items-start gap-2.5">
                  <DollarSign className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-700">Salary / CTC:</span>{' '}
                    <span className="text-emerald-700 font-semibold">{salary}</span>
                  </div>
                </div>
              )}
              {noticePeriod && (
                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-700">Notice Period:</span>{' '}
                    <span className="text-slate-800">{noticePeriod}</span>
                  </div>
                </div>
              )}
              {education && (
                <div className="flex items-start gap-2.5">
                  <GraduationCap className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-700">Education / Qualification:</span>{' '}
                    <span className="text-slate-800">{education}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Skills / Technical Requirements */}
          {skillsList.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                Required Skills &amp; Technical Competencies
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {skillsList.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-slate-100 text-slate-800 font-medium text-xs rounded-lg border border-slate-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Job Description & Responsibilities */}
          {description ? (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                Job Description &amp; Responsibilities
              </h3>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed whitespace-pre-wrap font-sans text-xs sm:text-sm">
                {description}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 italic text-xs">
              No detailed text description provided for this Job Requisition.
            </div>
          )}

          {/* Additional Requirements / Qualifications if separate */}
          {requirements && requirements !== description && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Additional Requirements &amp; Eligibility
              </h3>
              <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 text-slate-700 leading-relaxed whitespace-pre-wrap text-xs sm:text-sm">
                {requirements}
              </div>
            </div>
          )}

          {/* Recruiter Instructions */}
          {recruiterNotes && (
            <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 text-xs">
              <span className="font-bold text-blue-900 block mb-1">Recruiter Instructions:</span>
              <p className="text-blue-800 whitespace-pre-wrap">{recruiterNotes}</p>
            </div>
          )}

          {/* Attached Document File */}
          {(job.jdFilePath || job.jdOriginalName) && (
            <div className="flex items-center justify-between p-3.5 bg-slate-100 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                <div>
                  <div className="font-semibold text-slate-800 text-xs">Attached Official JD Document</div>
                  <div className="text-slate-500 text-[11px] truncate max-w-xs">{job.jdOriginalName || 'Download File'}</div>
                </div>
              </div>
              <a
                href={job.jdFilePath?.startsWith('http') ? job.jdFilePath : `/${job.jdFilePath?.replace(/\\/g, '/')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 hover:text-blue-600 rounded-lg text-xs font-semibold border border-slate-200 shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>View Document</span>
              </a>
            </div>
          )}

          {/* Recruiter / Owner Meta */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Owner: <strong className="text-slate-700">{job.recruiterName || 'Unassigned'}</strong>
              {job.hrName && <span> • Client HR: <strong className="text-slate-700">{job.hrName}</strong></span>}
            </div>
            <div>
              Posted: {job.createdAt ? new Date(job.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Read-only preview • Candidate form progress is safely preserved
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
