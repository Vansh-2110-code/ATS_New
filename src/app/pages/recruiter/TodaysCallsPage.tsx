import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  ArrowLeft, Phone, Clock, Loader2, PhoneOff, Search,
  PhoneCall, CheckCircle2, XCircle, AlertCircle, Building2,
  ExternalLink, User, Copy, Check
} from 'lucide-react';
import api from '../../services/api';

const OUTCOME_COLORS: Record<string, { bg: string; icon: string }> = {
  'Interested':             { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: 'text-emerald-500' },
  'Eligible':               { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: 'text-emerald-500' },
  'Hotlist':                { bg: 'bg-amber-100 text-amber-800 border-amber-200',       icon: 'text-amber-600' },
  'Submitted to Client':    { bg: 'bg-blue-100 text-blue-700 border-blue-200',          icon: 'text-blue-500' },
  'Duplicate-Client':       { bg: 'bg-purple-100 text-purple-700 border-purple-200',    icon: 'text-purple-500' },
  'Not Interested':         { bg: 'bg-rose-100 text-rose-700 border-rose-200',          icon: 'text-rose-500' },
  'Not Eligible':           { bg: 'bg-red-100 text-red-600 border-red-200',             icon: 'text-red-400' },
  'Call Back':              { bg: 'bg-yellow-100 text-yellow-800 border-yellow-200',    icon: 'text-yellow-600' },
  'Hold':                   { bg: 'bg-orange-100 text-orange-700 border-orange-200',    icon: 'text-orange-500' },
  'No Answer':              { bg: 'bg-slate-100 text-slate-600 border-slate-200',       icon: 'text-slate-400' },
  'No Response':            { bg: 'bg-slate-100 text-slate-600 border-slate-200',       icon: 'text-slate-400' },
  'Busy':                   { bg: 'bg-orange-100 text-orange-700 border-orange-200',    icon: 'text-orange-500' },
  'Wrong Number':           { bg: 'bg-red-100 text-red-600 border-red-200',             icon: 'text-red-400' },
  'L1 Select':              { bg: 'bg-teal-100 text-teal-700 border-teal-200',          icon: 'text-teal-600' },
  'Final Select':           { bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: 'text-emerald-600' },
  'Joined':                 { bg: 'bg-green-100 text-green-800 border-green-300',       icon: 'text-green-600' },
  'Walkin Company':         { bg: 'bg-indigo-100 text-indigo-700 border-indigo-200',    icon: 'text-indigo-500' },
  'Walkin WHM':             { bg: 'bg-indigo-100 text-indigo-700 border-indigo-200',    icon: 'text-indigo-500' },
};

const OUTCOME_ICONS: Record<string, any> = {
  'Interested':             CheckCircle2,
  'Eligible':               CheckCircle2,
  'Hotlist':                CheckCircle2,
  'Submitted to Client':    Building2,
  'Duplicate-Client':       AlertCircle,
  'Not Interested':         XCircle,
  'Not Eligible':           XCircle,
  'Call Back':              PhoneCall,
  'Hold':                   Clock,
  'No Answer':              PhoneOff,
  'No Response':            PhoneOff,
  'Busy':                   PhoneOff,
  'Wrong Number':           PhoneOff,
};

export function TodaysCallsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { recruiterId?: string; recruiterName?: string } | null;

  const today = new Date().toISOString().split('T')[0];
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('All');
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getMyCalls(today, locationState?.recruiterId)
      .then((data: any) => setCalls(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [today, locationState?.recruiterId]);

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPhone(text);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  // Outcome statistics
  const outcomeStats = useMemo(() => {
    const counts: Record<string, number> = {};
    calls.forEach(c => {
      const key = c.outcome || c.status || 'Updated';
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [calls]);

  // Filtered calls
  const filteredCalls = useMemo(() => {
    return calls.filter(c => {
      const matchOutcome = selectedOutcome === 'All' || (c.outcome === selectedOutcome || c.status === selectedOutcome);
      const query = searchQuery.trim().toLowerCase();
      if (!query) return matchOutcome;

      const nameMatch = (c.candidateName || '').toLowerCase().includes(query);
      const phoneMatch = (c.candidatePhone || '').toLowerCase().includes(query);
      const emailMatch = (c.candidateEmail || '').toLowerCase().includes(query);
      const clientMatch = (c.clientName || '').toLowerCase().includes(query);
      const statusMatch = (c.outcome || c.status || '').toLowerCase().includes(query);

      return matchOutcome && (nameMatch || phoneMatch || emailMatch || clientMatch || statusMatch);
    });
  }, [calls, selectedOutcome, searchQuery]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <button
          onClick={() => navigate('/recruiter/resumes', { state: { todayCalls: true } })}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 text-xs font-semibold rounded-lg transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open in Candidate Management Table
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center text-green-700">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-slate-800 text-xl font-bold">
                Today's Calls & Entries
                {locationState?.recruiterName && (
                  <span className="text-slate-500 font-normal text-base ml-2">
                    — {locationState.recruiterName}
                  </span>
                )}
              </h1>
              <p className="text-slate-500 text-xs mt-0.5">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                {' • '}
                <span className="font-semibold text-green-700">{calls.length} candidate{calls.length !== 1 ? 's' : ''} touched today</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-center min-w-[80px]">
            <div className="text-green-700 text-2xl font-bold">{calls.length}</div>
            <div className="text-green-600 text-xs font-medium">Total Calls</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-center min-w-[80px]">
            <div className="text-blue-700 text-2xl font-bold">{Object.keys(outcomeStats).length}</div>
            <div className="text-blue-600 text-xs font-medium">Categories</div>
          </div>
        </div>
      </div>

      {/* Outcome Breakdown Filter Pills */}
      {!loading && calls.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">
              Filter by Outcome / Status
            </span>
            <span className="text-xs text-slate-400">
              Showing {filteredCalls.length} of {calls.length}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedOutcome('All')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedOutcome === 'All'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({calls.length})
            </button>
            {Object.entries(outcomeStats).map(([outcome, count]) => {
              const active = selectedOutcome === outcome;
              const color = OUTCOME_COLORS[outcome] || { bg: 'bg-slate-100 text-slate-700 border-slate-200' };
              return (
                <button
                  key={outcome}
                  onClick={() => setSelectedOutcome(outcome)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    active
                      ? 'ring-2 ring-slate-800 shadow-sm ' + color.bg
                      : color.bg + ' opacity-80 hover:opacity-100'
                  }`}
                >
                  <span>{outcome}</span>
                  <span className="ml-1 px-1.5 py-0.2 bg-black/10 rounded-full text-[10px]">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by candidate name, phone, email, client or status..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 shadow-sm transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-medium"
          >
            Clear
          </button>
        )}
      </div>

      {/* Calls Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <Loader2 className="w-8 h-8 text-green-600 animate-spin mb-2" />
          <p className="text-slate-500 text-sm">Loading today's calls and entries...</p>
        </div>
      ) : filteredCalls.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-12 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <PhoneOff className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="text-slate-800 font-semibold mb-1">
            {calls.length === 0 ? 'No calls or entries made today' : 'No matching candidates found'}
          </h3>
          <p className="text-slate-400 text-xs max-w-md mx-auto mb-4">
            {calls.length === 0
              ? 'Candidate entries and calls touched today will automatically appear here in real-time.'
              : 'Try clearing your search or selecting "All" from the outcome filters above.'}
          </p>
          <button
            onClick={() => navigate('/recruiter/resumes')}
            className="px-4 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-sm"
          >
            Go to Candidate Management Pool
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <span className="text-slate-700 text-xs font-bold uppercase tracking-wider">
              {filteredCalls.length} Candidate{filteredCalls.length !== 1 ? 's' : ''} Listed
            </span>
            <span className="text-slate-400 text-xs">Click candidate name to open full profile</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/40 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3 w-12 text-center">#</th>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Status / Outcome</th>
                  <th className="px-4 py-3">Client / Company</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Recruiter</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredCalls.map((call: any, i: number) => {
                  const outcome = call.outcome || call.status || 'Updated';
                  const OutcomeIcon = OUTCOME_ICONS[outcome] || AlertCircle;
                  const color = OUTCOME_COLORS[outcome] || { bg: 'bg-slate-100 text-slate-700 border-slate-200', icon: 'text-slate-500' };
                  const candId = call.candidate || call._id;

                  return (
                    <tr key={call._id || i} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 text-center text-slate-400 font-mono text-xs">
                        {i + 1}
                      </td>

                      {/* Candidate Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-green-100 text-green-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {(call.candidateName || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <button
                              onClick={() => candId && navigate(`/recruiter/candidate/${candId}`)}
                              className="font-semibold text-slate-800 hover:text-green-600 text-left transition-colors cursor-pointer block hover:underline"
                            >
                              {call.candidateName || 'Unnamed Candidate'}
                            </button>
                            {call.candidateEmail && (
                              <span className="text-[11px] text-slate-400 block truncate max-w-[200px]">
                                {call.candidateEmail}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${call.candidatePhone}`}
                            className="text-slate-700 hover:text-green-600 font-mono text-xs flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3 text-slate-400" />
                            {call.candidatePhone || '—'}
                          </a>
                          {call.candidatePhone && (
                            <button
                              onClick={() => copyToClipboard(call.candidatePhone)}
                              title="Copy Phone"
                              className="text-slate-400 hover:text-slate-600 p-0.5"
                            >
                              {copiedPhone === call.candidatePhone ? (
                                <Check className="w-3 h-3 text-green-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Outcome / Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold border ${color.bg}`}
                        >
                          <OutcomeIcon className={`w-3 h-3 ${color.icon}`} />
                          {outcome}
                        </span>
                      </td>

                      {/* Client / Company */}
                      <td className="px-4 py-3.5 text-xs text-slate-600 font-medium">
                        {call.clientName ? (
                          <div className="flex items-center gap-1 truncate max-w-[180px]">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{call.clientName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* Time */}
                      <td className="px-4 py-3.5 text-xs text-slate-500 font-medium">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatTime(call.startTime || call.createdAt)}
                        </div>
                      </td>

                      {/* Recruiter */}
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[120px]">{call.recruiterName || '—'}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {candId && (
                            <button
                              onClick={() => navigate(`/recruiter/candidate/${candId}`)}
                              className="px-2.5 py-1 bg-green-50 text-green-700 hover:bg-green-100 font-semibold text-xs rounded-lg transition-colors"
                            >
                              Profile
                            </button>
                          )}
                          {candId && (
                            <button
                              onClick={() => navigate(`/recruiter/call/${candId}`)}
                              className="p-1 text-slate-400 hover:text-green-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Open Calling Screen"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
