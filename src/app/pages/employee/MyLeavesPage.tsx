import { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, AlertCircle, CheckCircle2, Plus,
  X, Loader2, Info, ChevronRight,
  Sparkles,
} from 'lucide-react';
import api from '../../services/api';

export function MyLeavesPage() {
  const [balance, setBalance] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [leaveType, setLeaveType] = useState('Paid Leave');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDaySlot, setHalfDaySlot] = useState<'Morning' | 'Evening'>('Morning');
  const [reason, setReason] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [balData, reqData] = await Promise.all([
        api.getLeaveBalance(),
        api.getMyLeaveRequests(),
      ]);
      setBalance(balData);
      setRequests(reqData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load leave data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate days requested
  const calculateDays = () => {
    if (isHalfDay) return 0.5;
    if (!fromDate || !toDate) return 0;
    const f = new Date(fromDate);
    const t = new Date(toDate);
    if (t < f) return 0;
    let count = 0;
    const cur = new Date(f);
    while (cur <= t) {
      if (cur.getDay() !== 0) count++; // Skip Sunday
      cur.setDate(cur.getDate() + 1);
    }
    return Math.max(1, count);
  };

  const daysCount = calculateDays();

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!fromDate) {
      setFormError('Please select a start date');
      return;
    }
    if (!isHalfDay && !toDate) {
      setFormError('Please select an end date');
      return;
    }
    if (!reason.trim()) {
      setFormError('Please provide a reason for the leave');
      return;
    }

    const calculatedType = isHalfDay ? `Half Day (${halfDaySlot})` : leaveType;

    if (calculatedType === 'Paid Leave' && balance && balance.balance < daysCount) {
      setFormError(`Insufficient paid leave balance (${balance.balance} days available, requested ${daysCount} days).`);
      return;
    }

    try {
      setSubmitting(true);
      await api.applyLeave({
        leaveType: calculatedType,
        fromDate,
        toDate: isHalfDay ? fromDate : toDate,
        daysCount,
        reason: reason.trim(),
      });
      setSuccessMsg('Leave application submitted successfully! Awaiting TL/Admin approval.');
      setTimeout(() => setSuccessMsg(''), 5000);
      setModalOpen(false);
      setFromDate('');
      setToDate('');
      setReason('');
      setIsHalfDay(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit leave application');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Approved</span>;
      case 'Rejected':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1"><X className="w-3.5 h-3.5 text-rose-600" /> Rejected</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Approval</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-slate-800 font-bold tracking-tight">My Leaves & Attendance Rules</h1>
          <p className="text-sm text-slate-500 mt-1">Apply for leave, track leave balances, and view monthly late login penalty status</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md"
        >
          <Plus className="w-4 h-4" /> Apply for Leave
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Paid Leaves */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">+1.5 / Month</span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-800">
              {loading ? '...' : `${balance?.balance ?? 0} Days`}
            </div>
            <div className="text-xs text-slate-500 mt-1">Available Paid Leave Balance</div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-50 text-[11px] text-slate-400">
            Total Accrued: <strong>{balance?.accruedLeaves ?? 0} days</strong> this year
          </div>
        </div>

        {/* Leaves Taken */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-800">
              {loading ? '...' : `${balance?.usedLeaves ?? 0} Days`}
            </div>
            <div className="text-xs text-slate-500 mt-1">Leaves Used (This Year)</div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-50 text-[11px] text-slate-400">
            Pending Approval: <strong>{balance?.pendingLeaves ?? 0} days</strong>
          </div>
        </div>

        {/* Late Logins This Month */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${(balance?.lateLoginsThisMonth || 0) >= 5 ? 'bg-rose-100 text-rose-800' : 'bg-amber-50 text-amber-700'}`}>
              Rule: 5 Late = 0.5D Cut
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-800">
              {loading ? '...' : `${balance?.lateLoginsThisMonth ?? 0} / 5`}
            </div>
            <div className="text-xs text-slate-500 mt-1">Late Logins (After 9:15 AM)</div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-50 text-[11px] text-slate-400">
            {5 - ((balance?.lateLoginsThisMonth || 0) % 5)} more late logins will trigger a 0.5-day deduction
          </div>
        </div>

        {/* Deductions Triggered */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-800">
              {loading ? '...' : `${balance?.lateDeductionsThisMonth ?? 0} Days`}
            </div>
            <div className="text-xs text-slate-500 mt-1">Late Penalty Deductions</div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-50 text-[11px] text-slate-400">
            Deducted automatically on monthly attendance
          </div>
        </div>
      </div>

      {/* Policy Notice Box */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-700 space-y-1">
          <p className="font-semibold text-blue-900">White Horse Attendance & Leave Policy Guidelines:</p>
          <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
            <li><strong>Shift Timings:</strong> 09:00 AM. A 15-minute grace period is provided up to <strong>09:15 AM</strong>.</li>
            <li><strong>Late Login Penalty:</strong> If you log in after 09:15 AM for <strong>5 days in a calendar month</strong>, <strong>0.5 day (Half Day)</strong> is automatically deducted.</li>
            <li><strong>Monthly Paid Leave:</strong> <strong>1.5 days</strong> of Paid Leave are credited at the beginning of every month.</li>
          </ul>
        </div>
      </div>

      {/* My Leave Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">My Leave Applications</h2>
            <p className="text-xs text-slate-400 mt-0.5">History of applied leaves and their approval status</p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading your leave history...
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="font-medium text-slate-600">No leave applications found</p>
            <p className="text-xs text-slate-400 mt-1">Click "Apply for Leave" above to submit a new request.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Leave Type</th>
                  <th className="px-6 py-3.5">From Date</th>
                  <th className="px-6 py-3.5">To Date</th>
                  <th className="px-6 py-3.5">Total Days</th>
                  <th className="px-6 py-3.5">Reason</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Reviewed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r: any) => (
                  <tr key={r._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">{r.leaveType}</td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                      {new Date(r.fromDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                      {new Date(r.toDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700">
                      {r.daysCount} {r.daysCount === 1 ? 'Day' : 'Days'}
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={r.reason}>
                      {r.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(r.status)}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {r.reviewedByName ? (
                        <div>
                          <span className="font-medium text-slate-700">{r.reviewedByName}</span>
                          {r.reviewRemarks && <p className="text-slate-400 italic text-[11px]">"{r.reviewRemarks}"</p>}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Apply Leave Modal ────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Apply for Leave</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApply} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {formError}
                </div>
              )}

              {/* Leave Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={e => setLeaveType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-400 bg-white"
                >
                  <option value="Paid Leave">Paid Leave (Available: {balance?.balance ?? 0} days)</option>
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Unpaid Leave">Unpaid Leave / LOP</option>
                </select>
              </div>

              {/* Half Day Checkbox */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-xs font-medium text-slate-700 cursor-pointer flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isHalfDay}
                    onChange={e => setIsHalfDay(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Apply as Half Day (0.5 Day)</span>
                </label>
                {isHalfDay && (
                  <select
                    value={halfDaySlot}
                    onChange={e => setHalfDaySlot(e.target.value as any)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="Morning">Morning Half</option>
                    <option value="Evening">Evening Half</option>
                  </select>
                )}
              </div>

              {/* Date Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {isHalfDay ? 'Date' : 'From Date'}
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={e => {
                      setFromDate(e.target.value);
                      if (isHalfDay) setToDate(e.target.value);
                    }}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-400"
                  />
                </div>
                {!isHalfDay && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">To Date</label>
                    <input
                      type="date"
                      value={toDate}
                      min={fromDate}
                      onChange={e => setToDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-400"
                    />
                  </div>
                )}
              </div>

              {/* Total Duration Calculated */}
              <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                <span className="flex items-center gap-1.5 font-medium"><Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Total Duration:</span>
                <span className="font-bold text-sm">{daysCount} {daysCount === 1 ? 'Day' : 'Days'}</span>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Reason for Leave</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Please state the purpose of your leave..."
                  rows={3}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-400 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
