import { useState } from 'react';
import {
  X, Calendar, Loader2, Lock, Shield, CheckCircle2, AlertCircle, User,
  Phone, Mail, Briefcase, MapPin, Award,
} from 'lucide-react';
import api from '../../services/api';

const API_BASE = window.location.origin;

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

// Read-only field row for TL view
function ROField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 uppercase tracking-wide mb-1" style={{ fontWeight: 600 }}>{label}</label>
      <div className="w-full px-3 py-2 rounded-lg border border-slate-100 bg-slate-50 text-sm text-slate-500 min-h-[38px]">
        {value || <span className="text-slate-300 italic">—</span>}
      </div>
    </div>
  );
}

interface Props {
  candidate: any;
  onClose: () => void;
  onSaved: () => void;
}

export function TLCandidateViewModal({ candidate, onClose, onSaved }: Props) {
  const [interviewStatus, setInterviewStatus] = useState(candidate.interviewStatus || '');
  const [finalInterviewSlotStatus, setFinalInterviewSlotStatus] = useState(candidate.finalInterviewSlotStatus || '');
  const [scheduledDate, setScheduledDate] = useState(
    candidate.scheduledDate ? candidate.scheduledDate.slice(0, 10) : ''
  );
  const [finalSelectDate, setFinalSelectDate] = useState(
    candidate.finalSelectDate ? candidate.finalSelectDate.slice(0, 10) : ''
  );
  const [candidateStatusPostOffer, setCandidateStatusPostOffer] = useState(candidate.candidateStatusPostOffer || '');
  const [offeredDate, setOfferedDate] = useState(
    candidate.offeredDate ? candidate.offeredDate.slice(0, 10) : ''
  );
  const [designationOffered, setDesignationOffered] = useState(candidate.designationOffered || '');
  const [joiningSalary, setJoiningSalary] = useState(candidate.joiningSalary || '');
  const [dateOfJoining, setDateOfJoining] = useState(
    candidate.dateOfJoining ? candidate.dateOfJoining.slice(0, 10) : ''
  );
  const [finalInterviewStatus, setFinalInterviewStatus] = useState(candidate.finalInterviewStatus || '');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, any> = {
        interviewStatus,
        finalInterviewSlotStatus,
        scheduledDate,
        finalSelectDate,
        candidateStatusPostOffer,
        offeredDate,
        designationOffered,
        joiningSalary,
        dateOfJoining,
        finalInterviewStatus,
      };
      await api.updateCandidate(candidate._id || candidate.id, payload);
      setSaved(true);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to save interview status');
    } finally {
      setSaving(false);
    }
  };

  const isSelected = finalInterviewStatus === 'Selected';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-[60] p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-4">

        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-slate-800 text-base" style={{ fontWeight: 700 }}>
              {candidate.name || candidate.candidateName || 'Candidate'}
              {candidate.candidateId && (
                <span className="text-slate-500 font-normal ml-2">({candidate.candidateId})</span>
              )}
            </h2>
            <p className="text-xs text-violet-600 mt-0.5 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Recruiter-filled sections are read-only · Only Interview Status is editable
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* ── READ-ONLY: Basic Candidate Details ── */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 bg-slate-100 border-b border-slate-200 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500 text-sm" style={{ fontWeight: 600 }}>Basic Candidate Details</span>
              <span className="ml-auto text-xs text-slate-400 flex items-center gap-1"><Lock className="w-3 h-3" /> Read-only</span>
            </div>
            <div className="px-5 py-4 grid sm:grid-cols-3 gap-4">
              <ROField label="Candidate Name" value={candidate.name || candidate.candidateName} />
              <ROField label="Phone" value={candidate.phone || candidate.candidatePhone} />
              <ROField label="Email" value={candidate.email || candidate.candidateEmail} />
              <ROField label="Qualification" value={candidate.qualification} />
              <ROField label="Experience" value={candidate.experience || candidate.experienceYears} />
              <ROField label="Current Company" value={candidate.currentCompany} />
              <ROField label="Current Location" value={[candidate.currentCity, candidate.currentState].filter(Boolean).join(', ')} />
              <ROField label="Current CTC" value={candidate.currentCTC} />
              <ROField label="Expected CTC" value={candidate.expectedCTC} />
              <ROField label="Notice Period" value={candidate.noticePeriod} />
              <ROField label="Gender" value={candidate.gender} />
              <ROField label="JR Number" value={candidate.jrNumber} />
              {candidate.resumePath && (
                <div className="sm:col-span-3 mt-2 pt-3 border-t border-slate-200">
                  <a href={`${API_BASE}${candidate.resumePath}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 transition-colors shadow-sm" style={{ fontWeight: 600 }}>
                    <Briefcase className="w-4 h-4" />
                    View Candidate Resume
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* ── READ-ONLY: Candidate Status ── */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
              <Phone className="w-4 h-4 text-amber-400" />
              <span className="text-amber-700 text-sm" style={{ fontWeight: 600 }}>Candidate Status</span>
              <span className="ml-auto text-xs text-slate-400 flex items-center gap-1"><Lock className="w-3 h-3" /> Read-only</span>
            </div>
            <div className="px-5 py-4 grid sm:grid-cols-3 gap-4">
              <ROField label="Candidate Status" value={candidate.firstCallStatus || candidate.status} />
              <ROField label="Communication Rating" value={candidate.communicationRating} />
              <ROField label="First Call Date" value={candidate.firstCallDate ? new Date(candidate.firstCallDate).toLocaleDateString() : ''} />
              <ROField label="Comments" value={candidate.comments} />
            </div>
          </div>

          {/* ── READ-ONLY: Candidate Final Details ── */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 bg-green-50 border-b border-green-100 flex items-center gap-2">
              <Award className="w-4 h-4 text-green-500" />
              <span className="text-green-700 text-sm" style={{ fontWeight: 600 }}>Candidate Final Details</span>
              <span className="ml-auto text-xs text-slate-400 flex items-center gap-1"><Lock className="w-3 h-3" /> Read-only</span>
            </div>
            <div className="px-5 py-4 grid sm:grid-cols-3 gap-4">
              <ROField label="Candidate Age" value={candidate.candidateAge} />
              <ROField label="Recruiter Status" value={candidate.recruiterStatus} />
              <ROField label="Walk-in Schedule" value={candidate.walkInSchedule ? new Date(candidate.walkInSchedule).toLocaleString() : ''} />
              <ROField label="Tentative DOJ" value={candidate.tentativeDOJ ? new Date(candidate.tentativeDOJ).toLocaleDateString() : ''} />
            </div>
          </div>

          {/* ── EDITABLE: Interview Status ── */}
          <div className="bg-white rounded-xl border-2 border-violet-300 overflow-hidden shadow-sm">
            <div className="px-5 py-3 bg-violet-50 border-b border-violet-200 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-violet-600" />
              <span className="text-violet-800 text-sm" style={{ fontWeight: 700 }}>Interview Status</span>
              <span className="ml-auto text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full" style={{ fontWeight: 600 }}>
                ✏️ Editable by Team Leader
              </span>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>Interview Status</label>
                  <select
                    value={interviewStatus}
                    onChange={e => setInterviewStatus(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-violet-400 bg-white"
                  >
                    <option value="">Select status</option>
                    {INTERVIEW_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1.5 flex items-center gap-1" style={{ fontWeight: 500 }}>
                    <Shield className="w-3.5 h-3.5 text-violet-500" />
                    Final Round Status
                  </label>
                  <select
                    value={finalInterviewSlotStatus}
                    onChange={e => setFinalInterviewSlotStatus(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-violet-200 text-sm outline-none focus:border-violet-400 bg-white"
                  >
                    <option value="">Select</option>
                    <option value="Final Round Scheduled">Final Round Scheduled</option>
                  </select>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>Scheduled Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-violet-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>Date of Joining</label>
                  <input
                    type="date"
                    value={dateOfJoining}
                    onChange={e => setDateOfJoining(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-violet-400"
                  />
                </div>
              </div>

              {/* Post-offer fields - only enabled when Selected */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>
                    Candidate Status Post Offer
                    {!isSelected && <span className="ml-1 text-xs text-slate-400">(set Final Status = Selected first)</span>}
                  </label>
                  <select
                    value={candidateStatusPostOffer}
                    onChange={e => setCandidateStatusPostOffer(e.target.value)}
                    disabled={!isSelected}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors ${!isSelected ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed' : 'border-slate-200 focus:border-violet-400'}`}
                  >
                    <option value="">Select status</option>
                    {POST_OFFER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>Offered Date</label>
                  <input
                    type="date"
                    value={offeredDate}
                    onChange={e => setOfferedDate(e.target.value)}
                    disabled={!isSelected}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors ${!isSelected ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed' : 'border-slate-200 focus:border-violet-400'}`}
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>Final Select Date</label>
                  <input
                    type="date"
                    value={finalSelectDate}
                    onChange={e => setFinalSelectDate(e.target.value)}
                    disabled={!isSelected}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors ${!isSelected ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed' : 'border-slate-200 focus:border-violet-400'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>Designation Offered</label>
                  <input
                    type="text"
                    value={designationOffered}
                    onChange={e => setDesignationOffered(e.target.value)}
                    disabled={!isSelected}
                    placeholder="Job title / Designation"
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors ${!isSelected ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed' : 'border-slate-200 focus:border-violet-400'}`}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>Joining Salary (₹)</label>
                <input
                  type="text"
                  value={joiningSalary}
                  onChange={e => setJoiningSalary(e.target.value)}
                  disabled={!isSelected}
                  placeholder="e.g. 6,00,000"
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors ${!isSelected ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed' : 'border-slate-200 focus:border-violet-400'}`}
                />
              </div>

              {/* Final Interview Status */}
              <div className="rounded-xl border-2 border-violet-200 bg-violet-50/40 p-4">
                <p className="text-sm mb-1 flex items-center gap-1.5 text-violet-900" style={{ fontWeight: 600 }}>
                  <Lock className="w-4 h-4" /> Final Interview Status
                  <span className="text-xs text-violet-600 font-normal ml-1">(TL editable)</span>
                </p>
                <p className="text-xs text-slate-400 mb-3">Once set to Selected, post-offer fields become available.</p>
                <select
                  value={finalInterviewStatus}
                  onChange={e => setFinalInterviewStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-violet-300 text-sm outline-none focus:border-violet-500 bg-white"
                >
                  <option value="">Select final status</option>
                  {['Selected', 'Rejected', 'On Hold'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Error / Success */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
          {saved && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Interview status saved successfully!
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-5 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              style={{ fontWeight: 500 }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className="px-5 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 disabled:opacity-60 transition-colors flex items-center gap-2"
              style={{ fontWeight: 600 }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Interview Status'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
