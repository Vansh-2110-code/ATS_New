import { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Check, X, Clock, AlertCircle, CheckCircle2,
  Search, Filter, Loader2, User as UserIcon,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export function LeaveManagementPage() {
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [remarks, setRemarks] = useState<{ [key: string]: string }>({});

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [pending, all] = await Promise.all([
        api.getPendingLeaveRequests(),
        api.getAllLeaveRequests({ status: filterStatus !== 'All' ? filterStatus : '' }),
      ]);
      setPendingRequests(pending || []);
      setAllRequests(all || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch leave requests');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReview = async (id: string, action: 'Approve' | 'Reject') => {
    try {
      setActionLoading(id);
      await api.reviewLeaveRequest(id, action, remarks[id] || '');
      setSuccess(`Leave request ${action.toLowerCase()}d successfully`);
      setTimeout(() => setSuccess(''), 4000);
      fetchData();
    } catch (err: any) {
      setError(err.message || `Failed to ${action.toLowerCase()} leave request`);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredAll = allRequests.filter((r: any) => {
    if (search && !r.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Leave Approvals & Management</h1>
          <p className="text-sm text-slate-500 mt-1">Review team leave applications, view leave records, and manage approvals</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <button
            onClick={() => setTab('pending')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === 'pending'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending Requests ({pendingRequests.length})
          </button>
          <button
            onClick={() => setTab('all')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Requests History
          </button>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="text-sm font-medium">{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {tab === 'pending' ? (
        /* Pending Queue */
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading pending leave requests...
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-base font-bold text-slate-800">All Caught Up!</p>
              <p className="text-xs text-slate-500 mt-1">There are no pending leave requests awaiting approval.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingRequests.map((r: any) => (
                <div key={r._id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{r.name}</div>
                        <div className="text-xs text-slate-400 capitalize">{r.role}</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {r.leaveType}
                    </span>
                  </div>

                  {/* Dates & Duration */}
                  <div className="p-3 bg-slate-50 rounded-xl grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <div className="text-slate-400 font-medium">From</div>
                      <div className="font-bold text-slate-700 mt-0.5">
                        {new Date(r.fromDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 font-medium">To</div>
                      <div className="font-bold text-slate-700 mt-0.5">
                        {new Date(r.toDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 font-medium">Duration</div>
                      <div className="font-bold text-emerald-700 mt-0.5">
                        {r.daysCount} {r.daysCount === 1 ? 'Day' : 'Days'}
                      </div>
                    </div>
                  </div>

                  {/* Reason */}
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Reason:</div>
                    <p className="text-xs text-slate-700 mt-1 italic bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                      "{r.reason}"
                    </p>
                  </div>

                  {/* Optional Remarks input */}
                  <input
                    type="text"
                    placeholder="Optional remarks (e.g. Approved for exam)"
                    value={remarks[r._id] || ''}
                    onChange={e => setRemarks({ ...remarks, [r._id]: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 outline-none focus:border-emerald-400"
                  />

                  {/* Approve / Reject buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleReview(r._id, 'Reject')}
                      disabled={actionLoading === r._id}
                      className="flex-1 py-2 px-3 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                    <button
                      onClick={() => handleReview(r._id, 'Approve')}
                      disabled={actionLoading === r._id}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                    >
                      {actionLoading === r._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Approve Leave
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* All Requests Table */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by employee name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 outline-none focus:border-emerald-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Status:</span>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-emerald-400"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Employee</th>
                  <th className="px-6 py-3.5">Leave Type</th>
                  <th className="px-6 py-3.5">Duration</th>
                  <th className="px-6 py-3.5">Dates</th>
                  <th className="px-6 py-3.5">Reason</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Reviewed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAll.map((r: any) => (
                  <tr key={r._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{r.name}</div>
                      <div className="text-xs text-slate-400 capitalize">{r.role}</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{r.leaveType}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">
                      {r.daysCount} {r.daysCount === 1 ? 'Day' : 'Days'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 whitespace-nowrap">
                      {new Date(r.fromDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} —{' '}
                      {new Date(r.toDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate" title={r.reason}>
                      {r.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {r.status === 'Approved' ? (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">Approved</span>
                      ) : r.status === 'Rejected' ? (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 border border-rose-200">Rejected</span>
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {r.reviewedByName ? (
                        <div>
                          <div className="font-semibold text-slate-700">{r.reviewedByName}</div>
                          {r.reviewRemarks && <div className="text-[11px] text-slate-400 italic">"{r.reviewRemarks}"</div>}
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
