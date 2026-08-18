import { useState, useEffect } from 'react';
import { Clock, Wifi, Monitor, Search, Calendar, Gift, Loader2, Plus, X, Eye, TrendingUp, Award, BarChart2, Download } from 'lucide-react';
import api from '../../services/api';

interface Employee {
  id: string;
  name: string;
  role: string;
  login: string;
  logout: string;
  wfh: boolean;
  status: string;
}

interface Holiday {
  date: string;
  name: string;
  type: 'National' | 'Festival' | 'Optional';
}

const STATUS_STYLES: Record<string, string> = {
  Present:   'bg-emerald-100 text-emerald-700',
  WFH:       'bg-blue-100    text-blue-700',
  Late:      'bg-amber-100   text-amber-800',
  'Half Day':'bg-purple-100  text-purple-700',
  Leave:     'bg-indigo-100  text-indigo-700',
  Break:     'bg-amber-100   text-amber-700',
  Absent:    'bg-red-100     text-red-600',
};

const HOLIDAY_TYPE_STYLES: Record<string, string> = {
  National: 'bg-green-100 text-green-700',
  Festival: 'bg-amber-100 text-amber-700',
  Optional: 'bg-slate-100 text-slate-600',
};

const formatAttendanceTime = (val: any): string => {
  if (!val || val === '—' || val === 'N/A' || val === 'null' || val === 'undefined') return '—';
  if (typeof val === 'string' && /^\d{1,2}:\d{2}(\s*(AM|PM))?$/i.test(val.trim())) {
    return val.trim();
  }
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
  } catch {
    return String(val);
  }
};

export function AttendancePage() {
  const [search, setSearch] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [filter, setFilter] = useState('All');
  const [holidayYear, setHolidayYear] = useState(String(new Date().getFullYear()));
  const [activeTab, setActiveTab] = useState<'attendance' | 'holidays'>('attendance');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '', type: 'National' });
  const [addingHoliday, setAddingHoliday] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailSummary, setDetailSummary] = useState<any>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'monthly' | 'history'>('overview');
  const [detailYear, setDetailYear] = useState(new Date().getFullYear());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await api.getAttendance({ date });
        const list = (data.records || data.attendance || data.employees || data || []).map((e: any) => ({
          id: e.employeeId || e._id || e.id,
          name: e.user?.name || e.name || '',
          role: e.user?.role || e.role || '',
          login: formatAttendanceTime(e.loginTime || e.login),
          logout: formatAttendanceTime(e.logoutTime || e.logout),
          wfh: e.isWFH ?? e.wfh ?? false,
          status: e.status || 'Absent',
        }));
        setEmployees(list);
      } catch (err) {
        console.error('Failed to load attendance:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [date]);

  useEffect(() => {
    const loadHolidays = async () => {
      try {
        const data = await api.getHolidays(Number(holidayYear));
        setHolidays(data.holidays || data || []);
      } catch (err) {
        console.error('Failed to load holidays:', err);
      }
    };
    loadHolidays();
  }, [holidayYear]);

  useEffect(() => {
    api.getLeaveBalance().then(data => setLeaveBalance(data)).catch(() => {});
  }, []);

  const handleAddHoliday = async () => {
    if (!newHoliday.date || !newHoliday.name) return;
    setAddingHoliday(true);
    try {
      await api.addHoliday(newHoliday);
      const data = await api.getHolidays(Number(holidayYear));
      setHolidays(data.holidays || data || []);
      setNewHoliday({ date: '', name: '', type: 'National' });
      setShowAddHoliday(false);
    } catch (err) {
      console.error('Failed to add holiday:', err);
    } finally {
      setAddingHoliday(false);
    }
  };

  const openDetail = async (emp: Employee, year?: number) => {
    setDetailEmployee(emp);
    setDetailSummary(null);
    setDetailTab('overview');
    setLoadingDetail(true);
    const yr = year ?? detailYear;
    try {
      const summary = await api.getEmployeeAttendanceSummary(emp.id, yr).catch(() => null);
      setDetailSummary(summary);
    } catch (err) {
      console.error('Failed to load detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await api.exportAttendanceExcel({ date, status });
    } catch (err) {
      console.error('Failed to export attendance:', err);
      alert('Failed to export attendance data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const filtered = employees.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || e.status === filter || (filter === 'WFH' && e.wfh);
    return matchSearch && matchFilter;
  });

  const present = employees.filter(e => e.status === 'Present').length;
  const absent  = employees.filter(e => e.status === 'Absent').length;
  const wfh     = employees.filter(e => e.wfh).length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-slate-800" style={{ fontWeight: 700, fontSize: '1.4rem' }}>Attendance & Holidays</h1>
          <p className="text-slate-500 text-sm mt-0.5">Daily login/logout tracking and holiday calendar</p>
        </div>
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
          <Gift className="w-4 h-4 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-xs text-green-700" style={{ fontWeight: 500 }}>Earned Leave Policy</p>
            <p className="text-green-800" style={{ fontWeight: 700, fontSize: '1.1rem' }}>
              1 <span className="text-xs" style={{ fontWeight: 500 }}>day / month per employee</span>
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['attendance', 'holidays'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors ${
              activeTab === tab ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
            style={{ fontWeight: activeTab === tab ? 600 : 400 }}
          >
            {tab === 'attendance' ? 'Attendance' : 'Holidays'}
          </button>
        ))}
      </div>

      {activeTab === 'attendance' && (
        <>
      {/* Summary - clickable to filter */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Present', value: present, color: 'emerald', filterVal: 'Present' },
              { label: 'Absent',  value: absent,  color: 'red',     filterVal: 'Absent' },
              { label: 'WFH',     value: wfh,     color: 'blue',    filterVal: 'WFH' },
            ].map((s, i) => {
              const styles: Record<string, string> = {
                emerald: 'bg-emerald-50 border-emerald-100',
                red:     'bg-red-50     border-red-100',
                blue:    'bg-green-50   border-green-100',
              };
              const text: Record<string, string> = {
                emerald: 'text-emerald-600',
                red:     'text-red-600',
                blue:    'text-green-600',
              };
              const isActive = filter === s.filterVal;
              return (
                <button
                  key={i}
                  onClick={() => setFilter(isActive ? 'All' : s.filterVal)}
                  className={`bg-white rounded-xl p-4 border shadow-sm text-center transition-all hover:shadow-md hover:-translate-y-0.5 ${styles[s.color]} ${
                    isActive ? 'ring-2 ring-green-400 ring-offset-1' : ''
                  }`}
                >
                  <div className={`text-2xl mb-1 ${text[s.color]}`} style={{ fontWeight: 700 }}>{s.value}</div>
                  <div className="text-slate-500 text-sm">{s.label}</div>
                  {isActive && <div className="text-xs text-slate-400 mt-0.5">Filtered</div>}
                </button>
              );
            })}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search employee..."
                  className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white"
                />
              </div>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white"
              />
              <div className="flex gap-1.5">
                {['All', 'Present', 'Absent', 'WFH', 'Break'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${filter === f ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    style={{ fontWeight: filter === f ? 600 : 400 }}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <button
                onClick={handleExportExcel}
                disabled={exporting}
                className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                style={{ fontWeight: 600 }}
                title="Export attendance to Excel"
              >
                {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Export to Excel
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                                    {['Employee', 'ID', 'Role', 'Login Time', 'Logout Time', 'Type', 'Status', 'Detail'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs text-slate-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-700 text-xs" style={{ fontWeight: 600 }}>
                              {e.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <button onClick={() => openDetail(e)}
                            className="text-slate-700 text-sm hover:text-green-700 hover:underline text-left" style={{ fontWeight: 500 }}>{e.name}</button>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-sm">{e.id}</td>
                      <td className="px-5 py-3.5 text-slate-500 text-sm">{e.role}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-sm">
                          {e.login !== '—' && <Clock className="w-3.5 h-3.5 text-slate-400" />}
                          <span className={e.login === '—' ? 'text-slate-300' : 'text-slate-700'}>{e.login}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={e.logout === '—' ? 'text-slate-300 text-sm' : 'text-slate-700 text-sm'}>{e.logout}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {e.wfh ? (
                          <span className="flex items-center gap-1 text-green-600 text-xs">
                            <Wifi className="w-3.5 h-3.5" /> WFH
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-500 text-xs">
                            <Monitor className="w-3.5 h-3.5" /> Office
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_STYLES[e.status]}`} style={{ fontWeight: 500 }}>
                          {e.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => openDetail(e)}
                          className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="View attendance history"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-slate-100">
              {filtered.map(e => (
                <div key={e.id} className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-700 text-sm" style={{ fontWeight: 600 }}>
                      {e.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-700 text-sm" style={{ fontWeight: 500 }}>{e.name}</p>
                    <p className="text-slate-400 text-xs">{e.id} · {e.role}</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      In: {e.login} {e.logout !== '—' && `— Out: ${e.logout}`}
                      {e.wfh && ' · WFH'}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${STATUS_STYLES[e.status]}`} style={{ fontWeight: 500 }}>
                    {e.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'holidays' && (
        <>
          {/* ── Declared Holidays Section ── */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h2 className="text-slate-800 text-sm" style={{ fontWeight: 600 }}>Declared Holidays</h2>
                  <p className="text-slate-400 text-xs">{holidays.length} holidays declared for {holidayYear}</p>
                </div>
              </div>
              {/* Year Selector */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddHoliday(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                  style={{ fontWeight: 600 }}
                >
                  {showAddHoliday ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  {showAddHoliday ? 'Cancel' : 'Add Holiday'}
                </button>
                <span className="text-xs text-slate-400" style={{ fontWeight: 500 }}>Year:</span>
                <div className="flex gap-1">
                  {['2025', '2026', '2027'].map(y => (
                    <button
                      key={y}
                      onClick={() => setHolidayYear(y)}
                      className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                        holidayYear === y ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      style={{ fontWeight: holidayYear === y ? 600 : 400 }}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-3 mb-4 flex-wrap">
              {Object.entries(HOLIDAY_TYPE_STYLES).map(([type, style]) => (
                <span key={type} className={`text-xs px-2.5 py-1 rounded-full ${style}`} style={{ fontWeight: 500 }}>
                  {type}
                </span>
              ))}
            </div>

            {/* Add Holiday Form */}
            {showAddHoliday && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="date"
                    value={newHoliday.date}
                    onChange={e => setNewHoliday(p => ({ ...p, date: e.target.value }))}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Holiday name"
                    value={newHoliday.name}
                    onChange={e => setNewHoliday(p => ({ ...p, name: e.target.value }))}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white"
                  />
                  <select
                    value={newHoliday.type}
                    onChange={e => setNewHoliday(p => ({ ...p, type: e.target.value }))}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white"
                  >
                    <option value="National">National</option>
                    <option value="Festival">Festival</option>
                    <option value="Optional">Optional</option>
                  </select>
                </div>
                <button
                  onClick={handleAddHoliday}
                  disabled={addingHoliday || !newHoliday.date || !newHoliday.name}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  style={{ fontWeight: 600 }}
                >
                  {addingHoliday ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
                  Save Holiday
                </button>
              </div>
            )}

            {/* Holiday List */}
            <div className="space-y-2">
              {holidays.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex flex-col items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="text-slate-600 text-xs" style={{ fontWeight: 700, lineHeight: 1.1 }}>
                        {h.date.split(' ')[1]}
                      </span>
                      <span className="text-slate-400" style={{ fontSize: '9px', fontWeight: 500 }}>
                        {h.date.split(' ')[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-slate-700 text-sm" style={{ fontWeight: 500 }}>{h.name}</p>
                      <p className="text-slate-400 text-xs">{h.date}, {holidayYear}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full ${HOLIDAY_TYPE_STYLES[h.type]}`} style={{ fontWeight: 500 }}>
                    {h.type}
                  </span>
                </div>
              ))}

              {holidays.length === 0 && (
                <div className="py-10 text-center">
                  <Calendar className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No holidays declared for {holidayYear}</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Monthly Earned Holiday Display ── */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                <Gift className="w-4 h-4 text-green-600" />
              </div>
              <h2 className="text-slate-800 text-sm" style={{ fontWeight: 600 }}>Monthly Earned Leaves</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Monthly Accrual',    value: `${leaveBalance?.monthlyAccrual ?? 1.5} days`,  sub: 'Per month' },
                { label: 'Annual Entitlement', value: `${leaveBalance?.annualEntitlement ?? 18} days`,   sub: `For ${holidayYear}` },
                { label: 'Used This Month',    value: `${leaveBalance?.usedThisMonth ?? 0} days`,  sub: leaveBalance?.currentMonth || 'Current month' },
                { label: 'Balance Available',  value: `${leaveBalance?.balance ?? 0} days`,  sub: 'Carry-forward included' },
              ].map((item, i) => (
                <div key={i} className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                  <p className="text-green-800 mb-1" style={{ fontWeight: 700, fontSize: '1.2rem' }}>{item.value}</p>
                  <p className="text-slate-600 text-xs" style={{ fontWeight: 500 }}>{item.label}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-4 italic">
              * Earned Leave accrual is computed automatically. Values shown are indicative (UI display only).
            </p>
          </div>
        </>
      )}

      {/* Employee Attendance Detail Modal */}
      {detailEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">

            {/* Header */}
            <div className="bg-gradient-to-br from-green-600 to-green-700 px-6 py-5 flex-shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-base" style={{ fontWeight: 700 }}>
                      {detailEmployee.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-white text-base" style={{ fontWeight: 700 }}>{detailEmployee.name}</h3>
                    <p className="text-white/70 text-xs mt-0.5">{detailEmployee.id} · <span className="capitalize">{detailEmployee.role}</span></p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[detailEmployee.status] || 'bg-white/20 text-white'} bg-white/20 text-white`} style={{ fontWeight: 500 }}>
                        Today: {detailEmployee.status}
                      </span>
                      <span className="text-white/60 text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />{detailEmployee.login} → {detailEmployee.logout}
                      </span>
                      {detailEmployee.wfh && <span className="text-white/70 text-xs flex items-center gap-1"><Wifi className="w-3 h-3" />WFH</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Year selector */}
                  <select
                    value={detailYear}
                    onChange={e => {
                      const y = Number(e.target.value);
                      setDetailYear(y);
                      openDetail(detailEmployee, y);
                    }}
                    className="text-xs bg-white/20 text-white border border-white/30 rounded-lg px-2 py-1.5 outline-none cursor-pointer"
                  >
                    {[new Date().getFullYear(), new Date().getFullYear() - 1].map(y =>
                      <option key={y} value={y} className="text-slate-800 bg-white">{y}</option>
                    )}
                  </select>
                  <button onClick={() => setDetailEmployee(null)} className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Attendance Rate bar — shown in header if data loaded */}
              {detailSummary?.yearlySummary && (() => {
                const ys = detailSummary.yearlySummary;
                const rate = ys.workingDays > 0 ? Math.round(((ys.presentDays + ys.wfhDays) / ys.workingDays) * 100) : 0;
                return (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white/70 text-xs">Attendance Rate {detailYear}</span>
                      <span className="text-white text-xs" style={{ fontWeight: 700 }}>{rate}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div className="bg-white rounded-full h-2 transition-all" style={{ width: `${rate}%` }} />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Stats Row */}
            {loadingDetail ? (
              <div className="flex items-center justify-center py-8 flex-shrink-0">
                <Loader2 className="w-5 h-5 animate-spin text-green-600" />
              </div>
            ) : detailSummary?.yearlySummary ? (
              <div className="px-5 py-4 border-b border-slate-100 flex-shrink-0">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { label: 'Present',  value: detailSummary.yearlySummary.presentDays,   color: 'text-emerald-600', bg: 'bg-emerald-50', icon: TrendingUp },
                    { label: 'Absent',   value: detailSummary.yearlySummary.absentDays,    color: 'text-red-600',     bg: 'bg-red-50',     icon: TrendingUp },
                    { label: 'WFH',      value: detailSummary.yearlySummary.wfhDays,       color: 'text-blue-600',    bg: 'bg-blue-50',    icon: Wifi },
                    { label: 'Holidays', value: detailSummary.yearlySummary.totalHolidays, color: 'text-amber-600',   bg: 'bg-amber-50',   icon: Calendar },
                    { label: 'Leave',    value: detailSummary.yearlySummary.leaveDays,     color: 'text-violet-600',  bg: 'bg-violet-50',  icon: Gift },
                    { label: 'Earned L.',value: detailSummary.yearlySummary.earnedLeaves,  color: 'text-green-600',   bg: 'bg-green-50',   icon: Award },
                  ].map((s, i) => (
                    <div key={i} className={`${s.bg} rounded-xl p-2.5 text-center border border-white`}>
                      <div className={`text-xl ${s.color}`} style={{ fontWeight: 700 }}>{s.value ?? '—'}</div>
                      <div className="text-slate-500 text-xs mt-0.5" style={{ fontSize: '10px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Tabs */}
            {!loadingDetail && (
              <div className="px-5 pt-3 border-b border-slate-100 flex gap-1 flex-shrink-0">
                {([
                  { key: 'overview', label: 'Overview', icon: BarChart2 },
                  { key: 'monthly',  label: 'Monthly',  icon: Calendar },
                  { key: 'history',  label: 'Activity', icon: Clock },
                ] as const).map(t => (
                  <button key={t.key} onClick={() => setDetailTab(t.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-t-lg border-b-2 transition-colors mb-[-1px] ${
                      detailTab === t.key ? 'border-green-500 text-green-600 bg-green-50' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                    style={{ fontWeight: detailTab === t.key ? 600 : 400 }}>
                    <t.icon className="w-3.5 h-3.5" />{t.label}
                  </button>
                ))}
              </div>
            )}

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              {loadingDetail ? null

              /* ── Overview ── */
              : detailTab === 'overview' ? (
                <div className="p-5 space-y-5">

                  {/* Yearly performance grid */}
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-3" style={{ fontWeight: 600 }}>Yearly Performance — {detailYear}</p>
                    {detailSummary?.yearlySummary ? (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {[
                          ['Working Days',    detailSummary.yearlySummary.workingDays ?? '—'],
                          ['Total Present',   detailSummary.yearlySummary.presentDays ?? '—'],
                          ['Total Absent',    detailSummary.yearlySummary.absentDays ?? '—'],
                          ['Attendance Rate', detailSummary.yearlySummary.workingDays
                            ? `${Math.round(((detailSummary.yearlySummary.presentDays + detailSummary.yearlySummary.wfhDays) / detailSummary.yearlySummary.workingDays) * 100)}%`
                            : '—'],
                          ['WFH Days',        detailSummary.yearlySummary.wfhDays ?? '—'],
                          ['Leave Days',      detailSummary.yearlySummary.leaveDays ?? '—'],
                          ['Half Days',       detailSummary.yearlySummary.halfDays ?? '—'],
                          ['Earned Leaves',   `${detailSummary.yearlySummary.earnedLeaves ?? 0} (1/month)`],
                        ].map(([label, value]) => (
                          <div key={label as string} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-xl">
                            <span className="text-slate-500 text-xs">{label}</span>
                            <span className="text-slate-800 text-xs" style={{ fontWeight: 600 }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-slate-400 text-sm">No data for {detailYear}</p>}
                  </div>

                  {/* Declared Holidays */}
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-3" style={{ fontWeight: 600 }}>Declared Holidays — {detailYear}</p>
                    {(detailSummary?.holidays || []).length > 0 ? (
                      <div className="space-y-1.5">
                        {detailSummary.holidays.map((h: any, i: number) => (
                          <div key={i} className="flex items-center justify-between px-3 py-2 bg-amber-50 rounded-xl text-xs">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                              <span className="text-slate-700" style={{ fontWeight: 500 }}>{h.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">{h.date ? new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs ${HOLIDAY_TYPE_STYLES[h.type] || 'bg-slate-100 text-slate-500'}`} style={{ fontWeight: 500 }}>{h.type}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-xs text-center py-4">No holidays declared for {detailYear}</p>
                    )}
                  </div>

                  {/* Earned Leave breakdown — 1 per month */}
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-3" style={{ fontWeight: 600 }}>Earned Leave Accrual — {detailYear}</p>
                    <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Gift className="w-4 h-4 text-green-600" />
                          <span className="text-green-800 text-sm" style={{ fontWeight: 600 }}>1 earned leave per month</span>
                        </div>
                        <span className="text-green-700 text-sm" style={{ fontWeight: 700 }}>
                          {detailSummary?.yearlySummary?.earnedLeaves ?? 0} / 12 earned
                        </span>
                      </div>
                      <div className="grid grid-cols-6 gap-1.5">
                        {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((mon, idx) => {
                          const monthData = detailSummary?.monthlyData?.find((m: any) => m.month === idx + 1);
                          const earned = monthData ? monthData.earnedLeave : 0;
                          return (
                            <div key={mon} className={`rounded-lg p-1.5 text-center border ${
                              earned > 0 ? 'bg-green-100 border-green-200' : 'bg-white border-slate-200'
                            }`}>
                              <div className="text-xs text-slate-500" style={{ fontSize: '10px' }}>{mon}</div>
                              <div className={`text-xs ${earned > 0 ? 'text-green-700' : 'text-slate-300'}`} style={{ fontWeight: 700 }}>{earned}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

              /* ── Monthly ── */
              ) : detailTab === 'monthly' ? (
                <div className="p-4 space-y-2">
                  {detailSummary?.monthlyData?.length > 0 ? (
                    detailSummary.monthlyData.map((m: any, i: number) => {
                      const total = m.present + m.absent + m.wfh;
                      const rate  = total > 0 ? Math.round(((m.present + m.wfh) / total) * 100) : 0;
                      return (
                        <div key={i} className="bg-slate-50 rounded-xl p-3">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center flex-shrink-0">
                              <span className="text-slate-700 text-xs" style={{ fontWeight: 700 }}>{m.monthName}</span>
                            </div>
                            <div className="flex-1 grid grid-cols-5 gap-2 text-center text-xs">
                              <div><div className="text-emerald-600" style={{ fontWeight: 700 }}>{m.present}</div><div className="text-slate-400">Present</div></div>
                              <div><div className="text-red-500" style={{ fontWeight: 700 }}>{m.absent}</div><div className="text-slate-400">Absent</div></div>
                              <div><div className="text-blue-600" style={{ fontWeight: 700 }}>{m.wfh}</div><div className="text-slate-400">WFH</div></div>
                              <div><div className="text-amber-600" style={{ fontWeight: 700 }}>{m.holidays}</div><div className="text-slate-400">Holidays</div></div>
                              <div><div className="text-violet-600" style={{ fontWeight: 700 }}>{m.earnedLeave}</div><div className="text-slate-400">EL</div></div>
                            </div>
                          </div>
                          {/* Attendance rate bar */}
                          <div>
                            <div className="flex justify-between mb-0.5">
                              <span className="text-slate-400" style={{ fontSize: '10px' }}>Attendance</span>
                              <span className="text-slate-500" style={{ fontSize: '10px', fontWeight: 600 }}>{rate}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${ rate >= 80 ? 'bg-emerald-500' : rate >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                                style={{ width: `${rate}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-slate-400 text-sm text-center py-8">No monthly data available</p>
                  )}
                </div>

              /* ── Activity ── */
              ) : detailTab === 'history' ? (
                detailSummary?.recentRecords?.length > 0 ? (
                  <div className="divide-y divide-slate-50">
                    {detailSummary.recentRecords.map((rec: any, i: number) => {
                      // Use server-computed flags; fall back to string comparison for legacy data
                      const isLateLogin   = rec.lateLogin   ?? (rec.login  !== '—' && rec.login  > '09:30');
                      const isEarlyLogout = rec.earlyLogout ?? (rec.logout !== '—' && rec.logout < '18:00');
                      const hasProblem = isLateLogin || isEarlyLogout;
                      return (
                        <div key={i} className={`px-5 py-3 flex items-start gap-4 hover:bg-slate-50 ${hasProblem ? 'border-l-2 border-amber-300' : ''}`}>
                          <div className="w-16 flex-shrink-0 pt-0.5">
                            <p className="text-slate-600 text-xs" style={{ fontWeight: 600 }}>{rec._date}</p>
                            {rec.totalHours > 0 && (
                              <p className={`text-xs mt-0.5 ${rec.totalHours < 8 ? 'text-amber-500' : 'text-emerald-600'}`} style={{ fontWeight: 600 }}>
                                {rec.totalHours.toFixed(1)}h
                              </p>
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                              {/* Login */}
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-emerald-500" />
                                <span style={{ fontWeight: 500 }}>{rec.login}</span>
                                {isLateLogin && (
                                  <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full" style={{ fontWeight: 600 }}>Late</span>
                                )}
                              </span>
                              <span className="text-slate-300">→</span>
                              {/* Logout */}
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-red-400" />
                                <span style={{ fontWeight: 500 }}>{rec.logout}</span>
                                {isEarlyLogout && rec.logout !== '—' && (
                                  <span className="bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded-full" style={{ fontWeight: 600 }}>Early Out</span>
                                )}
                              </span>
                              {rec.wfh && <span className="text-blue-500 flex items-center gap-0.5"><Wifi className="w-3 h-3" />WFH</span>}
                            </div>
                            {/* Salary impact note */}
                            {(isLateLogin || isEarlyLogout) && (
                              <p className="text-xs text-amber-600" style={{ fontWeight: 500 }}>
                                {isLateLogin && isEarlyLogout ? '⚠ Late login & early logout — may affect salary' :
                                 isLateLogin ? '⚠ Late login — logged in System Logs' :
                                 '⚠ Early logout — logged in System Logs'}
                              </p>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${STATUS_STYLES[rec.status] || 'bg-slate-100 text-slate-500'}`} style={{ fontWeight: 500 }}>
                            {rec.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm text-center py-10">No recent activity records</p>
                )
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
