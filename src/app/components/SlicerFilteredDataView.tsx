import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { X, Filter, Loader2, UserCheck, Eye, Phone, Calendar, User, Clock, CheckCircle } from 'lucide-react';
import api from '../services/api';
import { CANDIDATE_STATUS_OPTIONS, canUserUpdateCandidateStatus } from '../utils/candidateStatusUtils';
import { useAuth } from '../context/AuthContext';

interface SlicerFilteredDataViewProps {
  slicerName: string;
  onClear: () => void;
  division?: string;
  recruiter?: string;
  company?: string;
  customer?: string;
  title?: string;
  range?: string;
  fromDate?: string;
  toDate?: string;
}

export function SlicerFilteredDataView({
  slicerName,
  onClear,
  division,
  recruiter,
  company,
  customer,
  title,
  range,
  fromDate,
  toDate
}: SlicerFilteredDataViewProps) {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  const handleTopScroll = () => {
    if (topScrollRef.current && tableScrollRef.current) {
      tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  const handleTableScroll = () => {
    if (topScrollRef.current && tableScrollRef.current) {
      topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
    }
  };

  const handleStatusChange = async (candidateId: string, newStatus: string) => {
    if (!newStatus) return;
    setUpdatingId(candidateId);
    try {
      await api.updateCandidateStatus(candidateId, newStatus);
      setCandidates(prev => prev.map(c => {
        if ((c._id || c.id) === candidateId) {
          return {
            ...c,
            status: newStatus,
            lastStatusChangedByName: user?.name || 'User',
            lastStatusChangedRole: user?.role || 'user',
            lastStatusChangedAt: new Date().toISOString()
          };
        }
        return c;
      }));
    } catch (err: any) {
      alert(err.message || 'Failed to update candidate status');
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    if (!slicerName || slicerName === 'All') {
      setCandidates([]);
      setLoading(false);
      return;
    }

    const fetchFilteredCandidates = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = { limit: '200' };

        // Map slicer keys to the correct candidate query params
        if (slicerName === 'Today Uploads') {
          params.createdToday = 'true';
        } else if (slicerName === 'Open Requirements') {
          // Open Requirements = Active JRs — show all non-terminal pipeline candidates
          params.activeOnly = 'true';
        } else if (slicerName === 'Screening Round' || slicerName === 'Screening' || slicerName === 'screening') {
          params.statusIn = 'Eligible,Eligible Candidates,Screening,Shortlisted,Submitted to Client,Submitted To Client,Sublitted To Client,Walkin Company,Walkin WHM,Call Back,Hold,No Response,Walk-in Submitted,Contacted,Interested,Selected for Call,New,HR Shortlist';
        } else if (slicerName === 'Interview Stage' || slicerName === 'Interview' || slicerName === 'interview') {
          params.statusIn = 'Interview Scheduled,Interview Rescheduled,Interview Completed,Interview,Selected for Interview,Written Test,Operations Round,Interview Feedback Pending,Test Select,Test Reject';
        } else if (slicerName === 'Offer Accept' || slicerName === 'Offer' || slicerName === 'offer') {
          params.statusIn = 'Offer Accept,Offer Accepted,Offered,Offer Released';
        } else if (slicerName === 'Offered / Selected' || slicerName === 'Offer Selected' || slicerName === 'offerSelected' || slicerName === 'offered') {
          params.statusIn = 'Document Initialized,Documennt Initialted,Documentation Completed,Documentation Incomplete,Waiting for Offer,Offer Accept,Offered,Offer Released,Offer Accepted,Document Pending,Documentation,Selected,L1 Select,L2 Select,Final Select,VNA Select,Client Select';
        } else if (slicerName === 'Yet To Join' || slicerName === 'yetToJoin') {
          params.statusIn = 'Yet To Join,Joining Date Confirmed,Joining Postponed';
        } else if (slicerName === 'Joined Candidates' || slicerName === 'joined' || slicerName === 'Joined') {
          params.statusIn = 'Joined';
        } else if (slicerName === 'Eligible Candidates' || slicerName === 'Eligible') {
          params.statusIn = 'Eligible,Eligible Candidates';
        } else if (slicerName === 'Hotlist' || slicerName === 'Hot List') {
          params.statusIn = 'Hotlist,Hot List';
        } else if (slicerName === 'Submitted to Client' || slicerName === 'Submitted To Client' || slicerName === 'Sublitted To Client') {
          params.statusIn = 'Submitted to Client,Submitted To Client,Sublitted To Client';
        } else if (slicerName === 'Document Initialized' || slicerName === 'Documennt Initialted') {
          params.statusIn = 'Document Initialized,Documennt Initialted';
        } else if (slicerName === 'Documentation' || slicerName === 'Document Pending') {
          params.statusIn = 'Documentation,Document Pending,Documentation Completed,Documentation Incomplete,Documennt Initialted,Document Initialized';
        } else if (slicerName === '__final_select_group') {
          params.statusIn = 'Final Select,Final Round Scheduled,Final Round Completed,L1 Select,Client Select,Selected';
        } else if (slicerName === '__waiting_for_offer_group') {
          params.statusIn = 'Offer Released,Yet To Join,Documentation in Progress,Documentation';
        } else if (slicerName === 'Today Calls') {
          params.calledToday = 'true';
        } else if (slicerName === 'Follow-Ups') {
          params.followUpToday = 'true';
        } else if (slicerName === 'Resume Inflow') {
          params.createdToday = 'true';
        } else {
          // Direct status match for all pipeline status cards
          params.status = slicerName;
        }


        if (division && division !== 'All') params.division = division;
        if (recruiter && recruiter !== 'All') params.recruiter = recruiter;
        if (company) params.company = company;
        if (customer) params.customer = customer;
        if (range && range !== 'all' && range !== 'All') params.range = range;
        if (fromDate) params.fromDate = fromDate;
        if (toDate) params.toDate = toDate;

        const res = await api.getCandidates(params);
        const list = res.candidates || res.data || (Array.isArray(res) ? res : []);
        setCandidates(list);
      } catch (err) {
        console.error('Failed to load slicer candidates:', err);
        setCandidates([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFilteredCandidates();
  }, [slicerName, division, recruiter, company, customer, range, fromDate, toDate]);

  if (!slicerName || slicerName === 'All') return null;

  return (
    <div className="bg-white rounded-xl border border-green-200 shadow-md overflow-hidden space-y-0 transition-all my-4">
      {/* Slicer Header Banner */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-5 py-3 border-b border-green-200 flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-600 text-white flex items-center justify-center font-bold">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>{title || 'Slicer Filtered Data'} — <span className="text-green-700 font-extrabold">
                {slicerName === '__final_select_group' ? 'Final Select (L1 + L2 + Final)'
                  : slicerName === '__waiting_for_offer_group' ? 'Waiting for Offer'
                  : slicerName}
              </span></span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-green-600 text-white font-bold">
                {loading ? '...' : candidates.length} Records Found
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Showing candidates strictly filtered for this metric slicer. Recruiters & TLs can change status directly below.</p>
          </div>
        </div>

        <button
          onClick={onClear}
          className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
        >
          <X className="w-3.5 h-3.5 text-slate-500" />
          <span>Clear Slicer Filter</span>
        </button>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
        </div>
      ) : candidates.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          No candidate records found matching status: <strong className="text-slate-600">"{slicerName}"</strong>
        </div>
      ) : (
        <div className="flex flex-col">
          {/* Top Horizontal Scrollbar Bar */}
          <div className="flex items-center justify-between px-4 py-1.5 bg-slate-100/90 border-b border-slate-200 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-1.5 flex-shrink-0 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Top Scrollbar</span>
            </div>
            <div
              ref={topScrollRef}
              onScroll={handleTopScroll}
              className="overflow-x-auto max-w-full flex-1 ml-4 py-0.5 cursor-pointer"
              style={{ scrollbarWidth: 'auto' }}
            >
              <div style={{ width: '1300px', height: '1px' }} />
            </div>
          </div>

          <div
            ref={tableScrollRef}
            onScroll={handleTableScroll}
            className="overflow-x-auto max-h-[450px] overflow-y-auto"
          >
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50 shadow-xs">
                <tr className="bg-slate-50 border-b border-slate-100 text-left text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3 font-semibold">Candidate Name</th>
                <th className="px-5 py-3 font-semibold">Contact / Phone</th>
                <th className="px-5 py-3 font-semibold">Position Applied</th>
                <th className="px-5 py-3 font-semibold">Company / Client</th>
                <th className="px-5 py-3 font-semibold">Division</th>
                <th className="px-5 py-3 font-semibold">Recruiter</th>
                <th className="px-5 py-3 font-semibold">Current Status & Change</th>
                <th className="px-5 py-3 font-semibold">Last Status Changed By</th>
                <th className="px-5 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {candidates.map((c: any, i: number) => {
                const candId = c._id || c.id;
                const isUpdating = updatingId === candId;
                return (
                <tr key={candId || i} className="hover:bg-green-50/30 transition-colors">
                  <td className="px-5 py-3 font-bold text-slate-900">{c.name}</td>
                  <td className="px-5 py-3 text-slate-500">{c.phone || c.email || '—'}</td>
                  <td className="px-5 py-3 text-slate-700 font-medium">{c.positionApplied || '—'}</td>
                  <td className="px-5 py-3 text-blue-600 font-semibold">{c.clientName || c.companyName || '—'}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                      {c.division || 'BPO'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{c.assignedRecruiterName || c.sourcedBy || '—'}</td>
                  <td className="px-5 py-3 min-w-[200px]">
                    <div className="flex flex-col gap-1">
                      <select
                        value={c.status || c.firstCallStatus || ''}
                        disabled={isUpdating}
                        onChange={e => handleStatusChange(candId, e.target.value)}
                        className="px-2 py-1 rounded border border-slate-200 text-xs bg-white font-semibold outline-none focus:border-green-400 disabled:opacity-50 cursor-pointer"
                      >
                        <option value="">Change Status...</option>
                        {CANDIDATE_STATUS_OPTIONS.map(st => (
                          <option
                            key={st}
                            value={st}
                            disabled={!canUserUpdateCandidateStatus(st, user?.role)}
                          >
                            {st} {!canUserUpdateCandidateStatus(st, user?.role) ? '(TL/Admin Only)' : ''}
                          </option>
                        ))}
                      </select>
                      {isUpdating && <span className="text-[10px] text-green-600 flex items-center gap-1 font-semibold"><Loader2 className="w-3 h-3 animate-spin" /> Updating...</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs">
                    {c.lastStatusChangedByName ? (
                      <div>
                        <div className="font-semibold text-slate-700">{c.lastStatusChangedByName} <span className="text-[10px] text-slate-400 font-normal">({c.lastStatusChangedRole || 'user'})</span></div>
                        <div className="text-[10px] text-slate-400">
                          {c.lastStatusChangedAt ? new Date(c.lastStatusChangedAt).toLocaleString() : 'Recent'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">System / Initial</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      to={
                        window.location.pathname.startsWith('/admin') ? `/admin/candidate/${candId}` :
                        window.location.pathname.startsWith('/tl') ? `/tl/candidate/${candId}` :
                        window.location.pathname.startsWith('/manager') ? `/manager/candidate/${candId}` :
                        `/recruiter/candidate/${candId}`
                      }
                      className="inline-flex items-center gap-1 text-green-600 hover:text-green-800 font-semibold text-xs"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </Link>
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
