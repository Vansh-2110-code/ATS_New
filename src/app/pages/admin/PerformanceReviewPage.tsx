import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, Calendar, Star, FileText, CheckCircle2, Target, Briefcase } from 'lucide-react';
import api from '../../services/api';

export function PerformanceReviewPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState('Month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [employee, setEmployee] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    employee: '',
    reviewPeriodStart: '',
    reviewPeriodEnd: '',
    rating: 3,
    comments: '',
    metrics: {
      targetCalls: 0,
      actualCalls: 0,
      targetInterviews: 0,
      actualInterviews: 0,
      targetPlacements: 0,
      actualPlacements: 0,
    }
  });

  const [fetchingMetrics, setFetchingMetrics] = useState(false);

  const fetchLiveMetrics = async (empId: string, start: string, end: string) => {
    if (!empId || !start || !end) return;
    try {
      setFetchingMetrics(true);
      const res = await fetch(`/api/reviews/employee-metrics?employee=${empId}&startDate=${start}&endDate=${end}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('ats_token')}` }
      });
      if (res.ok) {
        const live = await res.json();
        setFormData(prev => ({
          ...prev,
          metrics: {
            ...prev.metrics,
            actualCalls: live.actualCalls ?? prev.metrics.actualCalls,
            actualInterviews: live.actualInterviews ?? prev.metrics.actualInterviews,
            actualPlacements: live.actualPlacements ?? prev.metrics.actualPlacements,
          }
        }));
      }
    } catch (err) {
      console.error('Failed to fetch live metrics:', err);
    } finally {
      setFetchingMetrics(false);
    }
  };

  useEffect(() => {
    // Fetch users for dropdown
    (api as any).getUsers({ role: 'recruiter' }).then((data: any) => {
      setUsers(data?.users || []);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (formData.employee && formData.reviewPeriodStart && formData.reviewPeriodEnd) {
      fetchLiveMetrics(formData.employee, formData.reviewPeriodStart, formData.reviewPeriodEnd);
    }
  }, [formData.employee, formData.reviewPeriodStart, formData.reviewPeriodEnd]);

  useEffect(() => {
    fetchReviews();
  }, [dateRange, customFrom, customTo, employee]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      let query = `?dateRange=${dateRange.toLowerCase()}`;
      if (dateRange === 'Custom') {
        if (customFrom) query += `&startDate=${customFrom}`;
        if (customTo) query += `&endDate=${customTo}`;
      }
      if (employee) query += `&employee=${employee}`;

      const res = await fetch(`/api/reviews${query}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('ats_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ats_token')}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowModal(false);
        fetchReviews();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const DATE_TABS = ['Week', 'Month', 'Quarter', 'Year', 'Custom'];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl text-slate-800" style={{ fontWeight: 700 }}>Performance Reviews</h1>
          <p className="text-slate-500 text-sm mt-1">Manage and view recruiter performance reviews</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          + New Review
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">TIME FRAME:</span>
          <div className="flex gap-1">
            {DATE_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setDateRange(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  dateRange === tab ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {dateRange === 'Custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="px-3 py-1.5 border rounded-lg text-xs outline-none" />
            <span className="text-slate-400 text-xs">to</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="px-3 py-1.5 border rounded-lg text-xs outline-none" />
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">EMPLOYEE:</span>
          <select value={employee} onChange={e => setEmployee(e.target.value)} className="px-3 py-1.5 border rounded-lg text-xs outline-none">
            <option value="">All Employees</option>
            {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </div>
      </div>

      {/* Reviews List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">Loading...</div>
        ) : reviews.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">No reviews found for this time frame.</div>
        ) : (
          reviews.map(review => (
            <div key={review._id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{review.employee?.name}</h3>
                  <p className="text-xs text-slate-500">{new Date(review.reviewPeriodStart).toLocaleDateString()} - {new Date(review.reviewPeriodEnd).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span className="text-sm font-bold">{review.rating}/5</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Calls (Target/Actual)</p>
                  <p className="text-sm font-semibold text-slate-700">{review.metrics.targetCalls} / {review.metrics.actualCalls}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Interviews (T/A)</p>
                  <p className="text-sm font-semibold text-slate-700">{review.metrics.targetInterviews} / {review.metrics.actualInterviews}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400 mb-1">COMMENTS</p>
                <p className="text-sm text-slate-600 line-clamp-3">{review.comments}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>Reviewed by {review.reviewer?.name}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">New Performance Review</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Employee</label>
                  <select required value={formData.employee} onChange={e => setFormData({...formData, employee: e.target.value})} className="w-full px-4 py-2 border rounded-xl outline-none focus:border-green-500">
                    <option value="">Select Employee</option>
                    {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rating (1-5)</label>
                  <input type="number" min="1" max="5" required value={formData.rating} onChange={e => setFormData({...formData, rating: Number(e.target.value)})} className="w-full px-4 py-2 border rounded-xl outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Period Start</label>
                  <input type="date" required value={formData.reviewPeriodStart} onChange={e => setFormData({...formData, reviewPeriodStart: e.target.value})} className="w-full px-4 py-2 border rounded-xl outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Period End</label>
                  <input type="date" required value={formData.reviewPeriodEnd} onChange={e => setFormData({...formData, reviewPeriodEnd: e.target.value})} className="w-full px-4 py-2 border rounded-xl outline-none focus:border-green-500" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3 border-b pb-2">
                  <h3 className="text-sm font-bold text-slate-800">Metrics</h3>
                  <button
                    type="button"
                    onClick={() => fetchLiveMetrics(formData.employee, formData.reviewPeriodStart, formData.reviewPeriodEnd)}
                    disabled={fetchingMetrics || !formData.employee}
                    className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg font-semibold transition-colors disabled:opacity-50"
                  >
                    {fetchingMetrics ? 'Fetching DB Stats...' : 'Auto-Fill Live Stats from DB'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Target Calls</label>
                    <input type="number" required value={formData.metrics.targetCalls} onChange={e => setFormData({...formData, metrics: {...formData.metrics, targetCalls: Number(e.target.value)}})} className="w-full px-3 py-1.5 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Actual Calls</label>
                    <input type="number" required value={formData.metrics.actualCalls} onChange={e => setFormData({...formData, metrics: {...formData.metrics, actualCalls: Number(e.target.value)}})} className="w-full px-3 py-1.5 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Target Interviews</label>
                    <input type="number" required value={formData.metrics.targetInterviews} onChange={e => setFormData({...formData, metrics: {...formData.metrics, targetInterviews: Number(e.target.value)}})} className="w-full px-3 py-1.5 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Actual Interviews</label>
                    <input type="number" required value={formData.metrics.actualInterviews} onChange={e => setFormData({...formData, metrics: {...formData.metrics, actualInterviews: Number(e.target.value)}})} className="w-full px-3 py-1.5 border rounded-lg text-sm" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Comments & Feedback</label>
                <textarea required rows={4} value={formData.comments} onChange={e => setFormData({...formData, comments: e.target.value})} className="w-full px-4 py-2 border rounded-xl outline-none focus:border-green-500" />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors">Save Review</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
