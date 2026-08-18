export const RECRUITER_STATUSES = [
  'Eligible',
  'Not Eligible',
  'Not Interested',
  'No Response',
  'Duplicate-Client',
  'Call Back',
  'Hold',
  'Hotlist',
  'Submitted to Client',
  'Walkin Company',
  'Walkin WHM',
  'No Show',
  'VNA Select',
  'VNA Reject',
  'Test Select',
  'Test Reject',
  'Candidate Drop Post L1 Select',
  'Candidate Drop Post L2 Select',
  'Candidate Drop During Final Stage',
] as const;

export const TL_MANAGEMENT_STATUSES = [
  'L1 Select',
  'L1 Reject',
  'L2 Select',
  'L2 Reject',
  'Final Select',
  'Final Reject',
  'Document Initialized',
  'Documentation Completed',
  'Documentation Incomplete',
  'Waiting for Offer',
  'Offer Accept',
  'Offer Reject',
  'Joined',
  'Joined and Abort',
] as const;

export const GLOBAL_STATUSES = [
  'Black List',
] as const;

export const CANDIDATE_STATUS_OPTIONS = [
  ...RECRUITER_STATUSES,
  ...TL_MANAGEMENT_STATUSES,
] as const;

export type CandidateStatus = typeof CANDIDATE_STATUS_OPTIONS[number];

export function isTLOnlyStatus(status: string): boolean {
  return (TL_MANAGEMENT_STATUSES as readonly string[]).includes(status);
}

export function canUserUpdateCandidateStatus(status: string, role?: string): boolean {
  if (!role) return false;
  const isTLOrAbove = ['admin', 'tl', 'manager'].includes(role);
  if (isTLOnlyStatus(status)) {
    return isTLOrAbove;
  }
  return true;
}

export const CANDIDATE_STATUS_COLORS: Record<string, string> = {
  // Recruiter Statuses
  Eligible: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Not Eligible': 'bg-red-100 text-red-700 border-red-200',
  'Not Interested': 'bg-rose-100 text-rose-700 border-rose-200',
  'No Response': 'bg-slate-100 text-slate-600 border-slate-200',
  'Duplicate-Client': 'bg-orange-100 text-orange-700 border-orange-200',
  'Call Back': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Hold: 'bg-amber-100 text-amber-700 border-amber-200',
  Hotlist: 'bg-orange-100 text-orange-800 border-orange-300 font-semibold',
  'Hot List': 'bg-orange-100 text-orange-800 border-orange-300 font-semibold',
  'Submitted to Client': 'bg-blue-100 text-blue-700 border-blue-200',
  'Walkin Company': 'bg-sky-100 text-sky-700 border-sky-200',
  'Walkin WHM': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  'No Show': 'bg-rose-100 text-rose-700 border-rose-200',
  'VNA Select': 'bg-teal-100 text-teal-700 border-teal-200',
  'VNA Reject': 'bg-pink-100 text-pink-700 border-pink-200',
  'Test Select': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Test Reject': 'bg-rose-100 text-rose-700 border-rose-200',
  'Candidate Drop Post L1 Select': 'bg-amber-100 text-amber-800 border-amber-200',
  'Candidate Drop Post L2 Select': 'bg-orange-100 text-orange-800 border-orange-200',
  'Candidate Drop During Final Stage': 'bg-red-100 text-red-800 border-red-200',

  // TL / Manager / Admin Statuses (18 to 31)
  'L1 Select': 'bg-emerald-100 text-emerald-800 border-emerald-300 font-medium',
  'L1 Reject': 'bg-red-100 text-red-800 border-red-300 font-medium',
  'L2 Select': 'bg-teal-100 text-teal-800 border-teal-300 font-medium',
  'L2 Reject': 'bg-rose-100 text-rose-800 border-rose-300 font-medium',
  'Final Select': 'bg-green-100 text-green-800 border-green-300 font-medium',
  'Final Reject': 'bg-red-100 text-red-800 border-red-300 font-medium',
  'Document Initialized': 'bg-purple-100 text-purple-800 border-purple-300 font-medium',
  'Documentation Completed': 'bg-indigo-100 text-indigo-800 border-indigo-300 font-medium',
  'Documentation Incomplete': 'bg-amber-100 text-amber-800 border-amber-300 font-medium',
  'Waiting for Offer': 'bg-blue-100 text-blue-800 border-blue-300 font-medium',
  'Offer Accept': 'bg-emerald-100 text-emerald-800 border-emerald-300 font-medium',
  'Offer Reject': 'bg-orange-100 text-orange-800 border-orange-300 font-medium',
  Joined: 'bg-emerald-200 text-emerald-900 border-emerald-400 font-semibold',
  'Joined and Abort': 'bg-rose-200 text-rose-900 border-rose-400 font-semibold',

  // Global Status (32)
  'Black List': 'bg-stone-800 text-white border-stone-900 font-semibold',

  // Backward compatibility for legacy statuses
  New: 'bg-slate-100 text-slate-600 border-slate-200',
  Contacted: 'bg-green-100 text-green-700 border-green-200',
  Interested: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Selected for Call': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  Screening: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Interview Scheduled': 'bg-violet-100 text-violet-700 border-violet-200',
  Selected: 'bg-teal-100 text-teal-700 border-teal-200',
  Rejected: 'bg-red-100 text-red-600 border-red-200',
  'Eligible Candidates': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Wrong Number': 'bg-orange-100 text-orange-700 border-orange-200',
  Unreachable: 'bg-orange-100 text-orange-700 border-orange-200',
  'Did Not Pick': 'bg-amber-100 text-amber-700 border-amber-200',
  'Unanswered Calls': 'bg-amber-100 text-amber-700 border-amber-200',
  'HR Shortlist': 'bg-purple-100 text-purple-700 border-purple-200',
  'Written Test': 'bg-blue-100 text-blue-700 border-blue-200',
  'Operations Round': 'bg-sky-100 text-sky-700 border-sky-200',
  'Document Pending': 'bg-rose-100 text-rose-700 border-rose-200',
  Documentation: 'bg-rose-100 text-rose-700 border-rose-200',
  'Yet To Join': 'bg-purple-100 text-purple-700 border-purple-200',
  Exited: 'bg-red-100 text-red-700 border-red-200',
};
