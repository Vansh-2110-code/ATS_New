import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { DollarSign, Download, Calendar, Wifi, Monitor, Loader2, Plus, Edit2, Trash2, AlertCircle, X, CheckCircle, Gift, Eye, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { generateSalaryFromGross, generateSalaryFromNet, formatCurrency } from '../../utils/salaryCalculations';

const ROLE_COLORS: Record<string, string> = {
  Recruiter: 'bg-emerald-100 text-emerald-700',
  'Team Lead': 'bg-violet-100 text-violet-700',
  Manager: 'bg-amber-100 text-amber-700',
  Admin: 'bg-red-100 text-red-700',
};

interface SalaryEmployee {
  id: string;
  _id?: string;
  userId: string;
  name: string;
  role: string;
  baseSalary: number;
  base: number;
  wfh: boolean;
  presentDays: number;
  workingDays: number;
  deductions: number;
  bonus: number;
  netSalary?: number;
  incentives?: any[];
  isOverridden?: boolean;
  overriddenBy?: string;
  adminNotes?: string;
  isPFExempt?: boolean;
  isESIExempt?: boolean;
  isPTExempt?: boolean;
  profileGross?: number;
  panNumber?: string;
  uanNumber?: string;
}

export function SalaryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [employees, setEmployees] = useState<SalaryEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<SalaryEmployee | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isCustomEmployee, setIsCustomEmployee] = useState(false);

  // Admin modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [incentiveModalOpen, setIncentiveModalOpen] = useState(false);
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState<SalaryEmployee | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [addForm, setAddForm] = useState({
    userId: '',
    name: '',
    role: '',
    baseSalary: '',
    deductions: '',
    bonus: '',
    wfhAllowance: '',
    adminNotes: '',
    isPFExempt: false,
    isESIExempt: false,
    isPTExempt: false,
  });

  const [editForm, setEditForm] = useState({
    baseSalary: '',
    deductions: '',
    bonus: '',
    wfhAllowance: '',
    presentDays: '',
    adminNotes: '',
    isPFExempt: false,
    isESIExempt: false,
    isPTExempt: false,
  });

  const [incentiveForm, setIncentiveForm] = useState({
    name: '',
    amount: '',
    description: '',
    category: 'Incentive',
  });

  // Incentive Calculator States
  const [calcInputs, setCalcInputs] = useState({
    w1: 0, w2: 0, w3: 0, w4: 0,
    anyDropouts: false,
    allJoinedNoDrop: false,
    recruitersMeetingTarget: 0,
    teamMetTarget: false
  });

  const [calcResults, setCalcResults] = useState({
    totalJoiners: 0,
    weeklyIncentive: 0,
    noDropoutBonus: 0,
    finalIncentive: 0,
    splitPayout: 0,
    tlBonus: 0
  });

  const [incentiveConfig, setIncentiveConfig] = useState({
    w1Rate: 1000,
    w2Rate: 750,
    w3Rate: 550,
    w4Rate: 250,
    noDropoutBonus: 1000,
    dropoutPenalty: 500,
    tlBonus: 12000,
  });
  const [showConfig, setShowConfig] = useState(false);

  // Override Salary Form
  const [overrideForm, setOverrideForm] = useState({
    overrideReason: '',
    adminNotes: '',
  });

  const fmt = (n: number) => {
    const val = Number(n);
    return isNaN(val) ? '₹0' : `₹${val.toLocaleString('en-IN')}`;
  };
  const calcNet = (e: SalaryEmployee) => {
    const totalIncentives = (e.incentives || []).reduce((s, inc) => s + (inc.amount || 0), 0);
    return (e.baseSalary || e.base || 0) - (e.deductions || 0) + (e.bonus || 0) + totalIncentives;
  };

  const mapSalaryList = (data: any): SalaryEmployee[] => {
    const rawList = Array.isArray(data) ? data : (data?.salaryData || data?.employees || []);
    return rawList.map((e: any) => ({
      ...e,
      id: e.employeeId || e._id || e.id,
      _id: e._id,
      userId: e.user?._id || e.userId || (typeof e.user === 'string' ? e.user : '') || e._id || e.id,
      name: e.user?.name || e.name || '',
      role: e.user?.role || e.role || '',
      baseSalary: Number(e.baseSalary ?? e.base ?? 0),
      base: Number(e.baseSalary ?? e.base ?? 0),
      wfh: Boolean(e.isWFH ?? e.wfh ?? false),
      presentDays: Number(e.presentDays ?? e.daysPresent ?? 0),
      workingDays: Number(e.workingDays ?? e.totalWorkingDays ?? 22),
      deductions: Number(e.deductions ?? 0),
      bonus: Number(e.bonus ?? e.incentive ?? 0),
      netSalary: Number(e.netSalary ?? 0),
      incentives: e.incentives || [],
      isOverridden: Boolean(e.isOverridden),
      overriddenBy: e.overriddenBy,
      adminNotes: e.adminNotes,
      isPFExempt: e.isPFExempt === true,
      isESIExempt: e.isESIExempt === true,
      isPTExempt: e.isPTExempt === true,
      profileGross: Number(e.profileGross ?? e.baseSalary ?? 0),
      panNumber: e.panNumber,
      uanNumber: e.uanNumber,
    }));
  };

  // Handler functions
  const handleAddSalary = async () => {
    if (!addForm.userId || !addForm.baseSalary) {
      alert('Please fill required fields');
      return;
    }

    setSaving(true);
    try {
      await api.createSalary({
        userId: addForm.userId,
        name: addForm.name,
        role: addForm.role,
        month: selectedMonth,
        year: selectedYear,
        baseSalary: parseFloat(addForm.baseSalary),
        deductions: parseFloat(addForm.deductions || 0),
        bonus: parseFloat(addForm.bonus || 0),
        wfhAllowance: parseFloat(addForm.wfhAllowance || 0),
        adminNotes: addForm.adminNotes,
        isPFExempt: addForm.isPFExempt,
        isESIExempt: addForm.isESIExempt,
        isPTExempt: addForm.isPTExempt,
      });
      setAddModalOpen(false);
      setIsCustomEmployee(false);
      setAddForm({ userId: '', name: '', role: '', baseSalary: '', deductions: '', bonus: '', wfhAllowance: '', adminNotes: '', isPFExempt: false, isESIExempt: false, isPTExempt: false });
      // Reload salaries
      const data = await api.getSalary(selectedMonth, selectedYear);
      setEmployees(mapSalaryList(data));
    } catch (err: any) {
      alert(err.message || 'Failed to add salary');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSalary = async () => {
    if (!selectedSalary?._id) return;

    setSaving(true);
    try {
      await api.updateSalary(selectedSalary._id, {
        baseSalary: parseFloat(editForm.baseSalary) || selectedSalary.baseSalary,
        deductions: parseFloat(editForm.deductions) !== undefined ? parseFloat(editForm.deductions) : selectedSalary.deductions,
        bonus: parseFloat(editForm.bonus) || 0,
        wfhAllowance: parseFloat(editForm.wfhAllowance) || 0,
        presentDays: parseInt(editForm.presentDays) || selectedSalary.presentDays,
        adminNotes: editForm.adminNotes,
        isPFExempt: editForm.isPFExempt,
        isESIExempt: editForm.isESIExempt,
        isPTExempt: editForm.isPTExempt,
      });
      setEditModalOpen(false);
      const data = await api.getSalary(selectedMonth, selectedYear);
      setEmployees(mapSalaryList(data));
    } catch (err: any) {
      alert(err.message || 'Failed to update salary');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSalary = async (id: string) => {
    if (!window.confirm('This will delete the salary entry. Continue?')) return;

    try {
      await api.deleteSalary(id);
      const data = await api.getSalary(selectedMonth, selectedYear);
      setEmployees(mapSalaryList(data));
      setDeleting(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete salary');
    }
  };

  const handleAddIncentive = async () => {
    if (!selectedSalary?._id || !incentiveForm.name || !incentiveForm.amount) {
      alert('Please fill all fields');
      return;
    }

    setSaving(true);
    try {
      await api.addIncentive(selectedSalary._id, {
        name: incentiveForm.name,
        amount: parseFloat(incentiveForm.amount),
        description: incentiveForm.description,
        category: incentiveForm.category,
      });
      setIncentiveForm({ name: '', amount: '', description: '', category: 'Incentive' });
      const data = await api.getSalary(selectedMonth, selectedYear);
      const mapped = mapSalaryList(data);
      setEmployees(mapped);
      const updated = mapped.find((e: any) => e._id === selectedSalary._id);
      setSelectedSalary(updated || null);
    } catch (err: any) {
      alert(err.message || 'Failed to add incentive');
    } finally {
      setSaving(false);
    }
  };

  // Recalculate incentives whenever inputs change
  useEffect(() => {
    const { w1, w2, w3, w4, anyDropouts, allJoinedNoDrop, teamMetTarget } = calcInputs;
    
    // Recruiter Logic
    const totalJoiners = Number(w1) + Number(w2) + Number(w3) + Number(w4);
    
    let weeklyIncentive = (Number(w1) * incentiveConfig.w1Rate) + 
                          (Number(w2) * incentiveConfig.w2Rate) + 
                          (Number(w3) * incentiveConfig.w3Rate) + 
                          (Number(w4) * incentiveConfig.w4Rate);
    
    // No Dropout Bonus
    let noDropoutBonus = allJoinedNoDrop ? incentiveConfig.noDropoutBonus : 0;
    
    let finalIncentive = weeklyIncentive + noDropoutBonus;
    
    // Dropout Adjustment 
    if (anyDropouts) {
      finalIncentive -= incentiveConfig.dropoutPenalty; 
    }

    // TL Logic
    let tlBonus = teamMetTarget ? incentiveConfig.tlBonus : 0;

    setCalcResults({
      totalJoiners,
      weeklyIncentive,
      noDropoutBonus,
      finalIncentive: Math.max(0, finalIncentive),
      splitPayout: Math.max(0, finalIncentive) / 2,
      tlBonus
    });
  }, [calcInputs, incentiveConfig]);

  const handleRemoveIncentive = async (incentiveId: string) => {
    if (!selectedSalary?._id) return;

    try {
      await api.removeIncentive(selectedSalary._id, incentiveId);
      const data = await api.getSalary(selectedMonth, selectedYear);
      const mapped = mapSalaryList(data);
      setEmployees(mapped);
      const updated = mapped.find((e: any) => e._id === selectedSalary._id);
      setSelectedSalary(updated || null);
    } catch (err: any) {
      alert(err.message || 'Failed to remove incentive');
    }
  };

  const handleOverrideSalary = async () => {
    if (!selectedSalary?._id || !overrideForm.overrideReason.trim()) {
      alert('Please provide a reason for override');
      return;
    }

    setSaving(true);
    try {
      await api.updateSalary(selectedSalary._id, {
        isOverridden: true,
        overriddenBy: user?._id,
        overrideReason: overrideForm.overrideReason,
        adminNotes: overrideForm.adminNotes,
        overriddenAt: new Date(),
      });
      setOverrideModalOpen(false);
      setOverrideForm({ overrideReason: '', adminNotes: '' });
      const data = await api.getSalary(selectedMonth, selectedYear);
      setEmployees(mapSalaryList(data));
      alert('Salary marked as overridden successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to override salary');
    } finally {
      setSaving(false);
    }
  };

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), month: d.getMonth() + 1, year: d.getFullYear() };
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await api.getSalary(selectedMonth, selectedYear);
        setEmployees(mapSalaryList(data));
      } catch (err) {
        console.error('Failed to load salary data:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (isAdmin && addModalOpen && allUsers.length === 0) {
      api.getUsers().then(data => {
        setAllUsers(data.users || data.data || data || []);
      }).catch(err => console.error("Failed to load users", err));
    }
  }, [isAdmin, addModalOpen, allUsers.length]);

  const totalPayroll = employees.reduce((s, e) => s + calcNet(e), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-slate-800" style={{ fontWeight: 700, fontSize: '1.4rem' }}>Salary Module</h1>
          <p className="text-slate-500 text-sm mt-0.5">{isAdmin ? 'Manage employee salaries and incentives' : 'Employee-wise salary calculation — view only'}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={`${selectedMonth}-${selectedYear}`}
            onChange={e => {
              const [m, y] = e.target.value.split('-');
              setSelectedMonth(Number(m));
              setSelectedYear(Number(y));
            }}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none bg-white text-slate-700"
          >
            {months.map(m => <option key={m.label} value={`${m.month}-${m.year}`}>{m.label}</option>)}
          </select>
          {isAdmin && (
            <button
              onClick={() => setAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
              style={{ fontWeight: 500 }}
            >
              <Plus className="w-4 h-4" />
              Add Salary
            </button>
          )}
          <button
            onClick={() => {
              const header = 'Name,EmployeeID,Role,Basic,HRA,Allowances,Deductions,Net Salary,Status\n';
              const rows = employees.map((e: any) => `${e.name},${e.employeeId},${e.role},${e.base},${e.bonus},${e.deductions},${calcNet(e)}`).join('\n');
              const blob = new Blob([header + rows], { type: 'text/csv' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `salary_${selectedMonth}_${selectedYear}.csv`; a.click();
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 transition-colors" style={{ fontWeight: 500 }}>
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Payroll', value: fmt(totalPayroll), icon: DollarSign, color: 'blue' },
          { label: 'Working Days', value: employees.length ? String(employees[0]?.workingDays || 22) : '22', icon: Calendar, color: 'slate' },
          { label: 'Total Bonuses', value: fmt(employees.reduce((s, e) => s + e.bonus, 0)), icon: DollarSign, color: 'emerald' },
          { label: 'Total Deductions', value: fmt(employees.reduce((s, e) => s + e.deductions, 0)), icon: DollarSign, color: 'red' },
        ].map((s, i) => {
          const Icon = s.icon;
          const bg: Record<string, string> = {
            blue: 'bg-green-50 text-green-600',
            slate: 'bg-slate-50 text-slate-600',
            emerald: 'bg-emerald-50 text-emerald-600',
            red: 'bg-red-50 text-red-600',
          };
          return (
            <div key={i} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${bg[s.color]}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-slate-800 text-lg mb-0.5" style={{ fontWeight: 700 }}>{s.value}</div>
              <div className="text-slate-500 text-xs">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-slate-800 text-sm" style={{ fontWeight: 600 }}>Employee Salary Breakdown — {months.find(m => m.month === selectedMonth && m.year === selectedYear)?.label || ''}</h3>
          <span className={`text-xs px-2.5 py-1 rounded-full text-xs ${isAdmin ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`} style={{ fontWeight: 500 }}>
            {isAdmin ? 'Editable' : 'View Only'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Employee', 'Role', 'Type', 'Days Present', 'Base Salary', 'Deductions', 'Bonus', 'Incentives', 'Net Salary', ...(isAdmin ? ['Actions'] : [])].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-slate-500 uppercase tracking-wide whitespace-nowrap" style={{ fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {employees.map(e => {
                const net = calcNet(e);
                return (
                  <tr key={e.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-green-700 text-xs" style={{ fontWeight: 600 }}>
                            {e.name.split(' ').map((n: string) => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <Link
                            to={`/admin/employee/${e.userId}`}
                            className="text-slate-700 text-sm hover:text-green-600 transition-colors"
                            style={{ fontWeight: 500 }}
                          >
                            {e.name}
                          </Link>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <p className="text-slate-400 text-xs">{e.id}</p>
                            {e.isPFExempt ? (
                              <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded font-bold shadow-2xs">
                                ✕ PF Opted Out (₹0)
                              </span>
                            ) : (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
                                ✓ PF (12%)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[e.role]}`} style={{ fontWeight: 500 }}>
                        {e.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {e.wfh ? (
                        <span className="flex items-center gap-1 text-green-600 text-xs">
                          <Wifi className="w-3 h-3" /> WFH
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-500 text-xs">
                          <Monitor className="w-3 h-3" /> Office
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-sm ${e.presentDays < e.workingDays ? 'text-amber-600' : 'text-slate-600'}`} style={{ fontWeight: e.presentDays < e.workingDays ? 600 : 400 }}>
                        {e.presentDays} / {e.workingDays}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-sm">{fmt(e.base)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className={`text-sm ${e.deductions > 0 ? 'text-red-500' : 'text-slate-400'}`} style={{ fontWeight: e.deductions > 0 ? 500 : 400 }}>
                          {e.deductions > 0 ? `-${fmt(e.deductions)}` : '—'}
                        </span>
                        {e.isPFExempt && (
                          <span className="text-[10px] text-amber-700 font-semibold mt-0.5">
                            PF: ₹0 (Opted Out)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-sm ${e.bonus > 0 ? 'text-emerald-600' : 'text-slate-400'}`} style={{ fontWeight: e.bonus > 0 ? 500 : 400 }}>
                        {e.bonus > 0 ? `+${fmt(e.bonus)}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {(e.incentives && e.incentives.length > 0) ? (
                        <button
                          onClick={() => setSelectedSalary(e)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs hover:underline"
                          style={{ fontWeight: 500 }}
                        >
                          <Gift className="w-3 h-3" />
                          {e.incentives.length} item{e.incentives.length !== 1 ? 's' : ''}
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-slate-800 text-sm" style={{ fontWeight: 700 }}>{fmt(net)}</span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3.5">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => {
                              setSelectedSalary(e);
                              setBreakdownModalOpen(true);
                            }}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                            title="View salary breakdown"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSalary(e);
                              const isPF = (e as any)?.isPFExempt === true;
                              const isESI = (e as any)?.isESIExempt === true;
                              const isPT = (e as any)?.isPTExempt === true;
                              const grossVal = Number(e.profileGross || e.baseSalary || e.base || 0);
                              const initialBreakdown = generateSalaryFromGross(
                                grossVal,
                                Number(e.wfhAllowance !== undefined ? e.wfhAllowance : (e.base - e.baseSalary) || 0),
                                0,
                                Number(e.presentDays || 22),
                                Number(e.workingDays || 22),
                                { isPFExempt: isPF, isESIExempt: isESI, isPTExempt: isPT }
                              );
                              setEditForm({
                                baseSalary: grossVal.toString(),
                                deductions: (e.deductions !== undefined && e.deductions > 0 ? e.deductions : initialBreakdown.deductions.totalDeductions).toString(),
                                bonus: (e.bonus || 0).toString(),
                                wfhAllowance: ((e.wfhAllowance !== undefined ? e.wfhAllowance : (e.base - e.baseSalary)) || 0).toString(),
                                presentDays: (e.presentDays || 22).toString(),
                                adminNotes: e.adminNotes || '',
                                isPFExempt: isPF,
                                isESIExempt: isESI,
                                isPTExempt: isPT,
                              });
                              setEditModalOpen(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit salary"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSalary(e);
                              setCalcInputs({
                                w1: 0, w2: 0, w3: 0, w4: 0,
                                anyDropouts: false,
                                allJoinedNoDrop: false,
                                recruitersMeetingTarget: 0,
                                teamMetTarget: false
                              });
                              setIncentiveModalOpen(true);
                            }}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                            title="Manage incentives"
                          >
                            <Gift className="w-4 h-4" />
                          </button>
                          {e.isOverridden && (
                            <span className="px-2 py-1.5 text-xs bg-orange-100 text-orange-700 rounded font-semibold" title="This salary has been overridden">
                              Overridden
                            </span>
                          )}
                          <button
                            onClick={() => {
                              setSelectedSalary(e);
                              setOverrideForm({ overrideReason: '', adminNotes: '' });
                              setOverrideModalOpen(true);
                            }}
                            className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                            title="Override salary entry"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleting(e._id || e.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete salary"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200">
                <td colSpan={7} className="px-4 py-3.5 text-slate-600 text-sm" style={{ fontWeight: 600 }}>Total Payroll</td>
                <td className="px-4 py-3.5 text-green-600" style={{ fontWeight: 700 }}>{fmt(totalPayroll)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ══════════ Add Salary Modal ══════════ */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-slate-800" style={{ fontWeight: 700 }}>Add Salary Entry</h2>
              <button onClick={() => setAddModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="text-xs text-slate-500" style={{ fontWeight: 500 }}>Select Employee *</label>
                <select 
                  className="w-full px-3 py-2.5 mt-1 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400"
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'NEW') {
                      setIsCustomEmployee(true);
                      setAddForm({ ...addForm, userId: '', name: '', role: '' });
                    } else {
                      setIsCustomEmployee(false);
                      const selectedUser = allUsers.find(u => (u._id === val || u.employeeId === val));
                      if (selectedUser) {
                        setAddForm({
                          ...addForm,
                          userId: selectedUser.employeeId || selectedUser._id,
                          name: selectedUser.name,
                          role: selectedUser.role || 'Employee'
                        });
                      } else {
                        setAddForm({ ...addForm, userId: '', name: '', role: '' });
                      }
                    }
                  }}
                >
                  <option value="">-- Choose Employee --</option>
                  <option value="NEW">-- New / Custom Employee --</option>
                  {allUsers.map(u => (
                    <option key={u._id || u.employeeId} value={u.employeeId || u._id}>
                      {u.name} ({u.employeeId || u._id})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500" style={{ fontWeight: 500 }}>Employee ID *</label>
                  <input type="text" value={addForm.userId} onChange={e => isCustomEmployee && setAddForm({...addForm, userId: e.target.value})} readOnly={!isCustomEmployee} placeholder="User ID" className={`w-full px-3 py-2.5 mt-1 rounded-lg border border-slate-200 text-sm outline-none ${isCustomEmployee ? 'focus:border-green-400' : 'bg-slate-50 text-slate-500 cursor-not-allowed'}`} />
                </div>
                <div>
                  <label className="text-xs text-slate-500" style={{ fontWeight: 500 }}>Role *</label>
                  {isCustomEmployee ? (
                    <select value={addForm.role} onChange={e => setAddForm({...addForm, role: e.target.value})} className="w-full px-3 py-2.5 mt-1 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400">
                      <option value="">Select role</option>
                      {['Recruiter', 'Team Lead', 'Manager', 'Admin', 'Employee'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={addForm.role} readOnly className="w-full px-3 py-2.5 mt-1 rounded-lg border border-slate-200 text-sm outline-none bg-slate-50 text-slate-500 cursor-not-allowed" />
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500" style={{ fontWeight: 500 }}>Employee Name *</label>
                <input type="text" value={addForm.name} onChange={e => isCustomEmployee && setAddForm({...addForm, name: e.target.value})} readOnly={!isCustomEmployee} placeholder="Full name" className={`w-full px-3 py-2.5 mt-1 rounded-lg border border-slate-200 text-sm outline-none ${isCustomEmployee ? 'focus:border-green-400' : 'bg-slate-50 text-slate-500 cursor-not-allowed'}`} />
              </div>
              {/* PF Opt-Out / Exemption Toggle Switch */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Provident Fund (PF - 12%)</span>
                    {addForm.isPFExempt ? (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                        ✕ Opted Out (₹0)
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                        ✓ Applicable (12%)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {addForm.isPFExempt ? 'PF deduction disabled for this entry (₹0).' : 'Standard statutory PF (12%) will be deducted.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextExempt = !addForm.isPFExempt;
                    const nextBreakdown = generateSalaryFromGross(
                      Number(addForm.baseSalary) || 0,
                      Number(addForm.wfhAllowance) || 0,
                      0,
                      22,
                      22,
                      { isPFExempt: nextExempt, isESIExempt: addForm.isESIExempt, isPTExempt: addForm.isPTExempt }
                    );
                    setAddForm(prev => ({
                      ...prev,
                      isPFExempt: nextExempt,
                      deductions: String(nextBreakdown.deductions.totalDeductions)
                    }));
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shadow-sm ${
                    addForm.isPFExempt
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {addForm.isPFExempt ? 'Enable PF' : 'Disable / Opt Out PF'}
                </button>
              </div>

              <div>
                <label className="text-xs text-slate-700 font-semibold" style={{ fontWeight: 600 }}>Monthly Gross Salary (₹) *</label>
                <input
                  type="number"
                  value={addForm.baseSalary}
                  onChange={e => {
                    const val = e.target.value;
                    const nextBreakdown = generateSalaryFromGross(
                      Number(val) || 0,
                      Number(addForm.wfhAllowance) || 0,
                      0,
                      22,
                      22,
                      { isPFExempt: addForm.isPFExempt, isESIExempt: addForm.isESIExempt, isPTExempt: addForm.isPTExempt }
                    );
                    setAddForm(prev => ({
                      ...prev,
                      baseSalary: val,
                      deductions: String(nextBreakdown.deductions.totalDeductions)
                    }));
                  }}
                  placeholder="e.g. 25000"
                  className="w-full px-3 py-2.5 mt-1 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 font-semibold"
                />
                {addForm.baseSalary && Number(addForm.baseSalary) > 0 && (() => {
                  const breakdown = generateSalaryFromGross(
                    Number(addForm.baseSalary),
                    Number(addForm.wfhAllowance) || 0,
                    0,
                    22,
                    22,
                    { isPFExempt: addForm.isPFExempt, isESIExempt: addForm.isESIExempt, isPTExempt: addForm.isPTExempt }
                  );
                  return (
                    <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="font-semibold text-slate-700 mb-1 border-b pb-1">Earnings</p>
                          <div className="flex justify-between text-slate-600"><span>Gross Salary</span> <span className="font-semibold">{formatCurrency(breakdown.grossSalary)}</span></div>
                          <div className="flex justify-between text-slate-600"><span>Basic (50%)</span> <span>{formatCurrency(breakdown.earnings.basic)}</span></div>
                          <div className="flex justify-between text-slate-600"><span>HRA (40%)</span> <span>{formatCurrency(breakdown.earnings.hra)}</span></div>
                          <div className="flex justify-between text-slate-600"><span>Special Allow.</span> <span>{formatCurrency(breakdown.earnings.specialAllowance)}</span></div>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-700 mb-1 border-b pb-1">Deductions</p>
                          <div className="flex justify-between text-slate-600">
                            <span>PF (12%)</span> 
                            {addForm.isPFExempt ? (
                              <span className="text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px]">
                                ✕ Opted Out (₹0)
                              </span>
                            ) : (
                              <span>{formatCurrency(breakdown.deductions.employeePF)}</span>
                            )}
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>ESI (0.75%)</span> 
                            {addForm.isESIExempt ? (
                              <span className="text-slate-400">Exempt</span>
                            ) : (
                              <span>{formatCurrency(breakdown.deductions.employeeESI)}</span>
                            )}
                          </div>
                          <div className="flex justify-between text-slate-600"><span>Prof. Tax</span> <span>{formatCurrency(breakdown.deductions.professionalTax)}</span></div>
                          <div className="flex justify-between text-slate-700 font-semibold mt-1 pt-1 border-t"><span>Total Ded.</span> <span>{formatCurrency(breakdown.deductions.totalDeductions)}</span></div>
                        </div>
                      </div>
                      <div className="mt-3 pt-2 border-t flex justify-between items-center">
                        <span className="font-semibold text-emerald-700">Calculated Net Pay:</span>
                        <span className="font-bold text-emerald-700 text-sm">{formatCurrency(breakdown.netPay)}</span>
                      </div>
                      <div className="mt-2 text-right">
                        <button
                          type="button"
                          onClick={() => setAddForm(prev => ({ ...prev, deductions: String(breakdown.deductions.totalDeductions) }))}
                          className="text-[11px] text-blue-600 hover:text-blue-800 underline font-medium"
                        >
                          Use Calculated Deductions ({formatCurrency(breakdown.deductions.totalDeductions)})
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div>
                <label className="text-xs text-slate-500" style={{ fontWeight: 500 }}>Deductions</label>
                <input type="number" value={addForm.deductions} onChange={e => setAddForm({...addForm, deductions: e.target.value})} placeholder="0" className="w-full px-3 py-2.5 mt-1 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400" />
              </div>
              <div>
                <label className="text-xs text-slate-500" style={{ fontWeight: 500 }}>Bonus</label>
                <input type="number" value={addForm.bonus} onChange={e => setAddForm({...addForm, bonus: e.target.value})} placeholder="0" className="w-full px-3 py-2.5 mt-1 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400" />
              </div>
              <div>
                <label className="text-xs text-slate-500" style={{ fontWeight: 500 }}>WFH Allowance</label>
                <input type="number" value={addForm.wfhAllowance} onChange={e => setAddForm({...addForm, wfhAllowance: e.target.value})} placeholder="0" className="w-full px-3 py-2.5 mt-1 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400" />
              </div>
              <div>
                <label className="text-xs text-slate-500" style={{ fontWeight: 500 }}>Admin Notes</label>
                <textarea value={addForm.adminNotes} onChange={e => setAddForm({...addForm, adminNotes: e.target.value})} placeholder="Add notes..." rows={3} className="w-full px-3 py-2.5 mt-1 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 resize-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
              <button onClick={() => setAddModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleAddSalary} disabled={saving} className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50" style={{ fontWeight: 500 }}>
                {saving ? 'Adding…' : 'Add Salary'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ Edit Salary Modal ══════════ */}
      {editModalOpen && selectedSalary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-slate-800" style={{ fontWeight: 700 }}>Edit Salary - {selectedSalary.name}</h2>
              <button onClick={() => setEditModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* PF Opt-Out / Exemption Toggle Switch */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Provident Fund (PF - 12%)</span>
                    {editForm.isPFExempt ? (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                        ✕ Opted Out (₹0)
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                        ✓ Applicable (12%)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {editForm.isPFExempt
                      ? 'PF deduction is disabled for this employee. Statutory PF is ₹0.'
                      : 'PF is currently active and calculated from Basic Pay.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextExempt = !editForm.isPFExempt;
                    const nextBreakdown = generateSalaryFromGross(
                      Number(editForm.baseSalary) || 0,
                      Number(editForm.wfhAllowance) || 0,
                      0,
                      Number(editForm.presentDays) || 22,
                      22,
                      { isPFExempt: nextExempt, isESIExempt: editForm.isESIExempt, isPTExempt: editForm.isPTExempt }
                    );
                    setEditForm(prev => ({
                      ...prev,
                      isPFExempt: nextExempt,
                      deductions: String(nextBreakdown.deductions.totalDeductions)
                    }));
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shadow-sm ${
                    editForm.isPFExempt
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {editForm.isPFExempt ? 'Enable PF' : 'Disable / Opt Out PF'}
                </button>
              </div>

              <div>
                <label className="text-xs text-slate-700 font-semibold" style={{ fontWeight: 600 }}>Monthly Gross Salary (₹) *</label>
                <input
                  type="number"
                  value={editForm.baseSalary}
                  onChange={e => {
                    const val = e.target.value;
                    const nextBreakdown = generateSalaryFromGross(
                      Number(val) || 0,
                      Number(editForm.wfhAllowance) || 0,
                      0,
                      Number(editForm.presentDays) || 22,
                      22,
                      { isPFExempt: editForm.isPFExempt, isESIExempt: editForm.isESIExempt, isPTExempt: editForm.isPTExempt }
                    );
                    setEditForm(prev => ({
                      ...prev,
                      baseSalary: val,
                      deductions: String(nextBreakdown.deductions.totalDeductions)
                    }));
                  }}
                  className="w-full px-3 py-2.5 mt-1 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 font-semibold"
                />
                {editForm.baseSalary && Number(editForm.baseSalary) > 0 && (() => {
                  const isPFExempt = editForm.isPFExempt;
                  const isESIExempt = editForm.isESIExempt;
                  const isPTExempt = editForm.isPTExempt;
                  const breakdown = generateSalaryFromGross(
                    Number(editForm.baseSalary),
                    Number(editForm.wfhAllowance) || 0,
                    0,
                    Number(editForm.presentDays) || 22,
                    22,
                    { isPFExempt, isESIExempt, isPTExempt }
                  );
                  return (
                    <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="font-semibold text-slate-700 mb-1 border-b pb-1">Earnings</p>
                          <div className="flex justify-between text-slate-600"><span>Gross Salary</span> <span className="font-semibold">{formatCurrency(breakdown.grossSalary)}</span></div>
                          <div className="flex justify-between text-slate-600"><span>Basic (50%)</span> <span>{formatCurrency(breakdown.earnings.basic)}</span></div>
                          <div className="flex justify-between text-slate-600"><span>HRA (40%)</span> <span>{formatCurrency(breakdown.earnings.hra)}</span></div>
                          <div className="flex justify-between text-slate-600"><span>Special Allow.</span> <span>{formatCurrency(breakdown.earnings.specialAllowance)}</span></div>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-700 mb-1 border-b pb-1">Deductions</p>
                          <div className="flex justify-between text-slate-600">
                            <span>PF (12%)</span> 
                            {isPFExempt ? (
                              <span className="text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px]">
                                ✕ Opted Out (₹0)
                              </span>
                            ) : (
                              <span>{formatCurrency(breakdown.deductions.employeePF)}</span>
                            )}
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>ESI (0.75%)</span> 
                            {isESIExempt ? (
                              <span className="text-slate-400">Exempt</span>
                            ) : (
                              <span>{formatCurrency(breakdown.deductions.employeeESI)}</span>
                            )}
                          </div>
                          <div className="flex justify-between text-slate-600"><span>Prof. Tax</span> <span>{formatCurrency(breakdown.deductions.professionalTax)}</span></div>
                          <div className="flex justify-between text-slate-700 font-semibold mt-1 pt-1 border-t"><span>Total Ded.</span> <span>{formatCurrency(breakdown.deductions.totalDeductions)}</span></div>
                        </div>
                      </div>
                      <div className="mt-3 pt-2 border-t flex justify-between items-center">
                        <span className="font-semibold text-emerald-700">Calculated Net Pay:</span>
                        <span className="font-bold text-emerald-700 text-sm">{formatCurrency(breakdown.netPay)}</span>
                      </div>
                      <div className="mt-2 text-right">
                        <button
                          type="button"
                          onClick={() => setEditForm(prev => ({ ...prev, deductions: String(breakdown.deductions.totalDeductions) }))}
                          className="text-[11px] text-blue-600 hover:text-blue-800 underline font-medium"
                        >
                          Use Calculated Deductions ({formatCurrency(breakdown.deductions.totalDeductions)})
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div>
                <label className="text-xs text-slate-500" style={{ fontWeight: 500 }}>Deductions</label>
                <input type="number" value={editForm.deductions} onChange={e => setEditForm({...editForm, deductions: e.target.value})} className="w-full px-3 py-2.5 mt-1 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400" />
              </div>
              <div>
                <label className="text-xs text-slate-500" style={{ fontWeight: 500 }}>Bonus</label>
                <input type="number" value={editForm.bonus} onChange={e => setEditForm({...editForm, bonus: e.target.value})} className="w-full px-3 py-2.5 mt-1 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400" />
              </div>
              <div>
                <label className="text-xs text-slate-500" style={{ fontWeight: 500 }}>WFH Allowance</label>
                <input type="number" value={editForm.wfhAllowance} onChange={e => setEditForm({...editForm, wfhAllowance: e.target.value})} className="w-full px-3 py-2.5 mt-1 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400" />
              </div>
              <div>
                <label className="text-xs text-slate-500" style={{ fontWeight: 500 }}>Days Present</label>
                <input type="number" value={editForm.presentDays} onChange={e => setEditForm({...editForm, presentDays: e.target.value})} className="w-full px-3 py-2.5 mt-1 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400" />
              </div>
              <div>
                <label className="text-xs text-slate-500" style={{ fontWeight: 500 }}>Admin Notes</label>
                <textarea value={editForm.adminNotes} onChange={e => setEditForm({...editForm, adminNotes: e.target.value})} placeholder="Add notes..." rows={3} className="w-full px-3 py-2.5 mt-1 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 resize-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
              <button onClick={() => setEditModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleEditSalary} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50" style={{ fontWeight: 500 }}>
                {saving ? 'Updating…' : 'Update Salary'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ Manage Incentives Modal ══════════ */}
      {incentiveModalOpen && selectedSalary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-slate-800" style={{ fontWeight: 700 }}>Manage Incentives - {selectedSalary.name}</h2>
              <button onClick={() => setIncentiveModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Role-Specific Calculator */}
              {(selectedSalary.role.toLowerCase() === 'recruiter' || selectedSalary.role.toLowerCase().includes('team lead') || selectedSalary.role.toLowerCase() === 'tl') && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-emerald-100 pb-3 mb-2">
                    <h3 className="text-emerald-800 text-sm" style={{ fontWeight: 700 }}>
                      {selectedSalary.role.toLowerCase() === 'recruiter' ? 'Recruiter Incentive Calculator' : 'Team Leader Incentive Calculator'}
                    </h3>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setShowConfig(!showConfig)}
                        className="px-2 py-1 bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50 rounded text-[10px] font-bold uppercase tracking-wider transition-colors"
                      >
                        {showConfig ? 'Hide Config' : 'Edit Config'}
                      </button>
                      <div className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded text-[10px] font-bold uppercase tracking-wider">Step 1: Calculate</div>
                    </div>
                  </div>

                  {showConfig && (
                    <div className="bg-white p-4 rounded-lg border border-emerald-200 mb-4 grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-emerald-600 font-bold uppercase mb-1 block">Week 1 Rate (₹)</label>
                        <input type="number" value={incentiveConfig.w1Rate} onChange={e => setIncentiveConfig({...incentiveConfig, w1Rate: parseInt(e.target.value) || 0})} className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded" />
                      </div>
                      <div>
                        <label className="text-[10px] text-emerald-600 font-bold uppercase mb-1 block">Week 2 Rate (₹)</label>
                        <input type="number" value={incentiveConfig.w2Rate} onChange={e => setIncentiveConfig({...incentiveConfig, w2Rate: parseInt(e.target.value) || 0})} className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded" />
                      </div>
                      <div>
                        <label className="text-[10px] text-emerald-600 font-bold uppercase mb-1 block">Week 3 Rate (₹)</label>
                        <input type="number" value={incentiveConfig.w3Rate} onChange={e => setIncentiveConfig({...incentiveConfig, w3Rate: parseInt(e.target.value) || 0})} className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded" />
                      </div>
                      <div>
                        <label className="text-[10px] text-emerald-600 font-bold uppercase mb-1 block">Week 4 Rate (₹)</label>
                        <input type="number" value={incentiveConfig.w4Rate} onChange={e => setIncentiveConfig({...incentiveConfig, w4Rate: parseInt(e.target.value) || 0})} className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded" />
                      </div>
                      <div>
                        <label className="text-[10px] text-emerald-600 font-bold uppercase mb-1 block">No Drop Bonus (₹)</label>
                        <input type="number" value={incentiveConfig.noDropoutBonus} onChange={e => setIncentiveConfig({...incentiveConfig, noDropoutBonus: parseInt(e.target.value) || 0})} className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded" />
                      </div>
                      <div>
                        <label className="text-[10px] text-emerald-600 font-bold uppercase mb-1 block">Dropout Penalty (₹)</label>
                        <input type="number" value={incentiveConfig.dropoutPenalty} onChange={e => setIncentiveConfig({...incentiveConfig, dropoutPenalty: parseInt(e.target.value) || 0})} className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-emerald-600 font-bold uppercase mb-1 block">TL Bonus (₹)</label>
                        <input type="number" value={incentiveConfig.tlBonus} onChange={e => setIncentiveConfig({...incentiveConfig, tlBonus: parseInt(e.target.value) || 0})} className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded" />
                      </div>
                    </div>
                  )}

                  {selectedSalary.role.toLowerCase() === 'recruiter' ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-4 gap-3">
                        {['w1', 'w2', 'w3', 'w4'].map((w, idx) => (
                          <div key={w}>
                            <label className="text-[10px] text-emerald-600 font-bold uppercase mb-1 block">Week {idx + 1}</label>
                            <input 
                              type="number" 
                              value={(calcInputs as any)[w]} 
                              onChange={e => setCalcInputs({...calcInputs, [w]: parseInt(e.target.value) || 0})} 
                              className="w-full px-3 py-2 text-sm bg-white border border-emerald-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20" 
                              placeholder="0"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-5 py-1">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input type="checkbox" checked={calcInputs.anyDropouts} onChange={e => setCalcInputs({...calcInputs, anyDropouts: e.target.checked})} className="w-4 h-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500" />
                          <span className="text-xs text-slate-700 group-hover:text-emerald-700 transition-colors" style={{ fontWeight: 500 }}>Any Dropouts?</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input type="checkbox" checked={calcInputs.allJoinedNoDrop} onChange={e => setCalcInputs({...calcInputs, allJoinedNoDrop: e.target.checked})} className="w-4 h-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500" />
                          <span className="text-xs text-slate-700 group-hover:text-emerald-700 transition-colors" style={{ fontWeight: 500 }}>All Joined & No Drop?</span>
                        </label>
                      </div>

                      <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-sm">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-4">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Total Joiners:</span>
                            <span className="font-bold text-slate-800">{calcResults.totalJoiners}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Base Incentive:</span>
                            <span className="font-bold text-slate-800">{fmt(calcResults.weeklyIncentive)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">No Drop Bonus:</span>
                            <span className="font-bold text-emerald-600">+{fmt(calcResults.noDropoutBonus)}</span>
                          </div>
                          <div className="flex justify-between text-xs pt-2 border-t border-slate-50">
                            <span className="font-bold text-slate-700 uppercase" style={{ fontSize: '10px' }}>Total Earned:</span>
                            <span className="font-bold text-emerald-700">{fmt(calcResults.finalIncentive)}</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-emerald-50/50 rounded-lg border border-emerald-100/50">
                          <div>
                            <p className="text-[9px] text-emerald-600 font-bold uppercase mb-0.5">Next Month (50%)</p>
                            <p className="text-sm font-bold text-slate-800">{fmt(calcResults.splitPayout)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-emerald-600 font-bold uppercase mb-0.5">90 Days (50%)</p>
                            <p className="text-sm font-bold text-slate-800">{fmt(calcResults.splitPayout)}</p>
                          </div>
                        </div>

                        <button 
                          onClick={() => setIncentiveForm({...incentiveForm, amount: calcResults.finalIncentive.toString(), name: `Recruiter Incentive (${calcResults.totalJoiners} Joiners)`, description: `W1:${calcInputs.w1}, W2:${calcInputs.w2}, W3:${calcInputs.w3}, W4:${calcInputs.w4}. Payout: 50/50 split.`})}
                          className="w-full py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all shadow-md active:scale-[0.98]"
                        >
                          Transfer to Final Entry ↓
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-emerald-600 font-bold uppercase mb-1 block">Recruiters Meeting Target</label>
                          <input type="number" value={calcInputs.recruitersMeetingTarget} onChange={e => setCalcInputs({...calcInputs, recruitersMeetingTarget: parseInt(e.target.value) || 0})} className="w-full px-3 py-2.5 text-sm bg-white border border-emerald-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="0" />
                        </div>
                        <div className="flex items-end pb-2">
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input type="checkbox" checked={calcInputs.teamMetTarget} onChange={e => setCalcInputs({...calcInputs, teamMetTarget: e.target.checked})} className="w-4 h-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500" />
                            <span className="text-xs text-slate-700 group-hover:text-emerald-700 transition-colors" style={{ fontWeight: 500 }}>Did Team Meet Target?</span>
                          </label>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-xs text-slate-500">Team Performance Bonus:</span>
                          <span className="text-lg font-bold text-emerald-700">{fmt(calcResults.tlBonus)}</span>
                        </div>
                        
                        <button 
                          onClick={() => setIncentiveForm({...incentiveForm, amount: calcResults.tlBonus.toString(), name: 'Team Performance Bonus', description: `Team Target Met: ${calcInputs.teamMetTarget ? 'Yes' : 'No'}. Recruiters meeting target: ${calcInputs.recruitersMeetingTarget}.`})}
                          className="w-full py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all shadow-md active:scale-[0.98]"
                        >
                          Transfer to Final Entry ↓
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">Step 2: Finalize Entry</span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              {/* Add Incentive Form */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                <h3 className="text-sm text-green-800" style={{ fontWeight: 600 }}>Add New Incentive</h3>
                <div>
                  <label className="text-xs text-slate-500" style={{ fontWeight: 500 }}>Name *</label>
                  <input type="text" value={incentiveForm.name} onChange={e => setIncentiveForm({...incentiveForm, name: e.target.value})} placeholder="e.g., Performance Bonus" className="w-full px-3 py-2.5 mt-1 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400" />
                </div>
                <div>
                  <label className="text-xs text-slate-500" style={{ fontWeight: 500 }}>Amount *</label>
                  <input type="number" value={incentiveForm.amount} onChange={e => setIncentiveForm({...incentiveForm, amount: e.target.value})} placeholder="0" className="w-full px-3 py-2.5 mt-1 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400" />
                </div>
                <div>
                  <label className="text-xs text-slate-500" style={{ fontWeight: 500 }}>Category</label>
                  <select value={incentiveForm.category} onChange={e => setIncentiveForm({...incentiveForm, category: e.target.value})} className="w-full px-3 py-2.5 mt-1 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400">
                    <option value="Bonus">Bonus</option>
                    <option value="Allowance">Allowance</option>
                    <option value="Incentive">Incentive</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500" style={{ fontWeight: 500 }}>Description</label>
                  <textarea value={incentiveForm.description} onChange={e => setIncentiveForm({...incentiveForm, description: e.target.value})} placeholder="Optional description" rows={2} className="w-full px-3 py-2.5 mt-1 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 resize-none" />
                </div>
                <button onClick={handleAddIncentive} disabled={saving} className="w-full px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50" style={{ fontWeight: 500 }}>
                  {saving ? 'Adding…' : 'Add Incentive'}
                </button>
              </div>

              {/* Current Incentives */}
              {selectedSalary.incentives && selectedSalary.incentives.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-sm text-slate-700" style={{ fontWeight: 600 }}>Current Incentives</h3>
                  {selectedSalary.incentives.map((inc: any) => (
                    <div key={inc.id} className="flex items-start justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-800" style={{ fontWeight: 500 }}>{inc.name}</p>
                        <p className="text-xs text-slate-500">{fmt(inc.amount)} · {inc.category}</p>
                        {inc.description && <p className="text-xs text-slate-600 mt-1">{inc.description}</p>}
                      </div>
                      <button
                        onClick={() => handleRemoveIncentive(inc.id)}
                        className="ml-3 p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                        title="Remove incentive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Gift className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No incentives added yet</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
              <button onClick={() => setIncentiveModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ Delete Confirmation ══════════ */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm text-center">
            <Trash2 className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <h3 className="text-slate-800 mb-1" style={{ fontWeight: 700 }}>Delete Salary Entry?</h3>
            <p className="text-slate-500 text-sm mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleting(null)} className="flex-1 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={() => handleDeleteSalary(deleting)} className="flex-1 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors" style={{ fontWeight: 500 }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ Salary Breakdown Modal ══════════ */}
      {breakdownModalOpen && selectedSalary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden my-4">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-slate-800" style={{ fontWeight: 700 }}>Salary Breakdown - {selectedSalary.name}</h2>
              <button onClick={() => setBreakdownModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedSalary.baseSalary > 0 && (() => {
                const isPF = (selectedSalary as any)?.isPFExempt === true;
                const isESI = (selectedSalary as any)?.isESIExempt === true;
                const isPT = (selectedSalary as any)?.isPTExempt === true;
                const grossVal = Number(selectedSalary.profileGross || selectedSalary.baseSalary || selectedSalary.base || 0);
                const breakdown = generateSalaryFromGross(
                  grossVal,
                  Number(selectedSalary.wfhAllowance !== undefined ? selectedSalary.wfhAllowance : (selectedSalary.base - selectedSalary.baseSalary) || 0),
                  selectedSalary.bonus || 0,
                  selectedSalary.presentDays || 22,
                  selectedSalary.workingDays || 22,
                  { isPFExempt: isPF, isESIExempt: isESI, isPTExempt: isPT }
                );

                return (
                  <>
                    {/* Earnings */}
                    <div>
                      <h3 className="text-sm text-slate-800 mb-3" style={{ fontWeight: 600 }}>EARNINGS</h3>
                      <div className="space-y-2 bg-slate-50 rounded-lg p-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Basic Salary</span>
                          <span className="text-slate-800 font-semibold">{formatCurrency(breakdown.earnings.basic)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">HRA (40% of Basic)</span>
                          <span className="text-slate-800 font-semibold">{formatCurrency(breakdown.earnings.hra)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Special Allowance</span>
                          <span className="text-slate-800 font-semibold">{formatCurrency(breakdown.earnings.specialAllowance)}</span>
                        </div>
                        {breakdown.earnings.wfhAllowance > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">WFH Allowance</span>
                            <span className="text-slate-800 font-semibold">{formatCurrency(breakdown.earnings.wfhAllowance)}</span>
                          </div>
                        )}
                        {breakdown.earnings.incentives > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Incentives</span>
                            <span className="text-emerald-600 font-semibold">{formatCurrency(breakdown.earnings.incentives)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm border-t border-slate-200 pt-2 mt-2">
                          <span className="text-slate-800 font-semibold">Total Earnings</span>
                          <span className="text-emerald-600 font-bold">{formatCurrency(breakdown.earnings.totalEarnings)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Deductions */}
                    <div>
                      <h3 className="text-sm text-slate-800 mb-3" style={{ fontWeight: 600 }}>DEDUCTIONS</h3>
                      <div className="space-y-2 bg-red-50 rounded-lg p-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Employee PF</span>
                          {isPF ? (
                            <span className="text-amber-700 font-semibold bg-amber-100 border border-amber-300 px-2 py-0.5 rounded text-xs">
                              ✕ Opted Out (₹0)
                            </span>
                          ) : (
                            <span className="text-red-600 font-semibold">{formatCurrency(breakdown.deductions.employeePF)}</span>
                          )}
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Employee ESI</span>
                          {isESI ? (
                            <span className="text-slate-400">Exempt</span>
                          ) : (
                            <span className="text-red-600 font-semibold">{formatCurrency(breakdown.deductions.employeeESI)}</span>
                          )}
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Professional Tax</span>
                          <span className="text-red-600 font-semibold">{formatCurrency(breakdown.deductions.professionalTax)}</span>
                        </div>
                        {breakdown.deductions.absencePenalty > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Absence Penalty</span>
                            <span className="text-red-600 font-semibold">{formatCurrency(breakdown.deductions.absencePenalty)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm border-t border-red-200 pt-2 mt-2">
                          <span className="text-red-800 font-semibold">Total Deductions</span>
                          <span className="text-red-600 font-bold">{formatCurrency(breakdown.deductions.totalDeductions)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Net Salary */}
                    <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-800 font-semibold">NET SALARY</span>
                        <span className="text-emerald-800 font-bold text-xl">{formatCurrency(breakdown.netPay)}</span>
                      </div>
                    </div>

                    {/* Employer Contributions Info */}
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-blue-600 text-xs">Employer PF</p>
                          <p className="text-blue-800 font-semibold">{formatCurrency(breakdown.employerContributions.employerPF)}</p>
                        </div>
                        <div>
                          <p className="text-blue-600 text-xs">Employer ESI</p>
                          <p className="text-blue-800 font-semibold">{formatCurrency(breakdown.employerContributions.employerESI)}</p>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
              <button onClick={() => setBreakdownModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ Override Salary Modal ══════════ */}
      {overrideModalOpen && selectedSalary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <h2 className="text-slate-800" style={{ fontWeight: 700 }}>Override Salary - {selectedSalary.name}</h2>
              </div>
              <button onClick={() => setOverrideModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> Overriding a salary entry creates an audit trail. Provide clear reason for the override.
                </p>
              </div>

              <div>
                <label className="text-xs text-slate-500" style={{ fontWeight: 500 }}>Reason for Override *</label>
                <textarea
                  value={overrideForm.overrideReason}
                  onChange={e => setOverrideForm({...overrideForm, overrideReason: e.target.value})}
                  placeholder="e.g., Incorrect CTC entry, Salary adjustment due to promotion, Error correction..."
                  rows={3}
                  className="w-full px-3 py-2.5 mt-1 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 resize-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500" style={{ fontWeight: 500 }}>Admin Notes</label>
                <textarea
                  value={overrideForm.adminNotes}
                  onChange={e => setOverrideForm({...overrideForm, adminNotes: e.target.value})}
                  placeholder="Additional notes (optional)..."
                  rows={2}
                  className="w-full px-3 py-2.5 mt-1 rounded-lg border border-slate-200 text-sm outline-none focus:border-green-400 resize-none"
                />
              </div>

              {selectedSalary.isOverridden && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Previously Overridden:</strong> {selectedSalary.isOverridden && 'Yes'}
                  </p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
              <button onClick={() => setOverrideModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleOverrideSalary} disabled={saving} className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50" style={{ fontWeight: 500 }}>
                {saving ? 'Marking…' : 'Mark as Overridden'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
