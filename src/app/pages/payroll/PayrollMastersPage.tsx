import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Settings, Layers, ShieldCheck, Building2, Plus, Edit3,
  CheckCircle2, ArrowLeft, Loader2, Save, Trash2, Sliders,
  HelpCircle, ChevronRight
} from 'lucide-react';
import api from '../../services/api';

export function PayrollMastersPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'components' | 'structures' | 'statutory' | 'branches'>('components');
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [components, setComponents] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [statutoryConfig, setStatutoryConfig] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Component Edit Modal State
  const [compModalOpen, setCompModalOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<any>({
    name: '',
    code: '',
    type: 'earning',
    calcType: 'percentage',
    percentageOf: 'BASIC',
    percentageValue: 0,
    formula: '',
    isTaxable: true,
    isPFApplicable: true,
    isESIApplicable: true,
    isPTApplicable: true,
    isProratedOnLOP: true,
    includeInCTC: true,
    showOnPayslip: true,
    displayOrder: 1
  });

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      loadTabData();
    }
  }, [selectedCompanyId, activeTab]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const comps = await api.getPayrollCompanies();
      setCompanies(comps);
      if (comps.length > 0) {
        setSelectedCompanyId(comps[0]._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'components') {
        const data = await api.getPayrollComponents(selectedCompanyId);
        setComponents(data);
      } else if (activeTab === 'structures') {
        const data = await api.getPayrollStructures(selectedCompanyId);
        setStructures(data);
      } else if (activeTab === 'statutory') {
        const data = await api.getPayrollStatutory(selectedCompanyId);
        setStatutoryConfig(data);
      } else if (activeTab === 'branches') {
        const data = await api.getPayrollBranches(selectedCompanyId);
        setBranches(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.savePayrollComponent({
        ...editingComp,
        company: selectedCompanyId
      });
      setCompModalOpen(false);
      setSuccessMsg('Component saved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadTabData();
    } catch (err: any) {
      alert(err.message || 'Failed to save component');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStatutory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.savePayrollStatutory({
        ...statutoryConfig,
        companyId: selectedCompanyId
      });
      setSuccessMsg('Statutory Configuration saved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save statutory config');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/payroll/dashboard')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Payroll Masters & Configuration Suite
          </h1>
          <p className="text-sm text-slate-500">
            Define salary components, formula structures, EPF/ESIC statutory ceilings & state PT slabs
          </p>
        </div>

        {/* Company Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-sm">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none cursor-pointer"
            >
              {companies.map((c) => (
                <option key={c._id} value={c._id}>{c.companyName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-6 rounded-t-2xl pt-2">
        {[
          { id: 'components', label: 'Salary Components', icon: Sliders },
          { id: 'structures', label: 'Salary Structures', icon: Layers },
          { id: 'statutory', label: 'Statutory (PF / ESI / PT)', icon: ShieldCheck },
          { id: 'branches', label: 'Branches & Locations', icon: Building2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                isActive
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-white p-6 rounded-b-2xl border border-slate-200/80 border-t-0 shadow-sm min-h-[500px]">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : (
          <>
            {/* ─── TAB 1: SALARY COMPONENTS ─── */}
            {activeTab === 'components' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Configured Salary Components</h3>
                    <p className="text-xs text-slate-500">Earnings, deductions, and employer contributions</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingComp({
                        name: '',
                        code: '',
                        type: 'earning',
                        calcType: 'percentage',
                        percentageOf: 'BASIC',
                        percentageValue: 0,
                        formula: '',
                        isTaxable: true,
                        isPFApplicable: true,
                        isESIApplicable: true,
                        isPTApplicable: true,
                        isProratedOnLOP: true,
                        includeInCTC: true,
                        showOnPayslip: true,
                        displayOrder: components.length + 1
                      });
                      setCompModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Component
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                        <th className="py-3 px-4">Component Name</th>
                        <th className="py-3 px-4">Code</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Calculation</th>
                        <th className="py-3 px-4 text-center">Taxable</th>
                        <th className="py-3 px-4 text-center">PF / ESI</th>
                        <th className="py-3 px-4 text-center">LOP Prorated</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {components.map((c) => (
                        <tr key={c._id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">{c.name}</td>
                          <td className="py-3 px-4 font-mono text-xs font-bold text-slate-600">{c.code}</td>
                          <td className="py-3 px-4">
                            <span className={`text-xs px-2 py-0.5 rounded-md font-semibold uppercase ${
                              c.type === 'earning'
                                ? 'bg-emerald-100 text-emerald-800'
                                : c.type === 'deduction'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}>
                              {c.type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">
                            {c.calcType === 'percentage'
                              ? `${c.percentageValue}% of ${c.percentageOf}`
                              : c.calcType === 'formula'
                              ? c.formula
                              : c.calcType}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {c.isTaxable ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">-</span>}
                          </td>
                          <td className="py-3 px-4 text-center text-xs text-slate-500">
                            {c.isPFApplicable ? 'PF ' : ''}{c.isESIApplicable ? 'ESI' : ''}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {c.isProratedOnLOP ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">-</span>}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setEditingComp(c);
                                setCompModalOpen(true);
                              }}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-emerald-700 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ─── TAB 2: SALARY STRUCTURES ─── */}
            {activeTab === 'structures' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Salary Structure Builder</h3>
                    <p className="text-xs text-slate-500">Ordered formula calculation templates applied to employee CTCs</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {structures.map((s) => (
                    <div key={s._id} className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900">{s.name}</h4>
                            {s.isDefault && (
                              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{s.description || 'Standard formula calculation'}</p>
                        </div>
                        <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded-md">
                          {s.code || 'STD'}
                        </span>
                      </div>

                      <div className="space-y-2 border-t border-slate-100 pt-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Calculation Sequence:</p>
                        {s.components?.map((c: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-slate-50 border border-slate-100">
                            <span className="font-medium text-slate-700">
                              {idx + 1}. {c.name} ({c.code})
                            </span>
                            <span className="font-mono text-slate-500">
                              {c.formula ? c.formula : c.percentageValue ? `${c.percentageValue}% of ${c.percentageOf}` : c.calcType}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── TAB 3: STATUTORY CONFIGURATION ─── */}
            {activeTab === 'statutory' && statutoryConfig && (
              <form onSubmit={handleSaveStatutory} className="space-y-6 max-w-4xl">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Statutory Compliance Rules</h3>
                  <p className="text-xs text-slate-500">Indian EPF, ESIC, and State Professional Tax parameter rules</p>
                </div>

                {/* EPF Card */}
                <div className="border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    Employees' Provident Fund (EPF) Rules
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Employee Share (%)</label>
                      <input
                        type="number"
                        value={statutoryConfig.epf?.employeeRate || 12}
                        onChange={(e) => setStatutoryConfig({
                          ...statutoryConfig,
                          epf: { ...statutoryConfig.epf, employeeRate: Number(e.target.value) }
                        })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Wage Ceiling (₹)</label>
                      <input
                        type="number"
                        value={statutoryConfig.epf?.wageCeiling || 15000}
                        onChange={(e) => setStatutoryConfig({
                          ...statutoryConfig,
                          epf: { ...statutoryConfig.epf, wageCeiling: Number(e.target.value) }
                        })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium"
                      />
                    </div>
                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={statutoryConfig.epf?.isCappedAtCeiling ?? true}
                          onChange={(e) => setStatutoryConfig({
                            ...statutoryConfig,
                            epf: { ...statutoryConfig.epf, isCappedAtCeiling: e.target.checked }
                          })}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-xs font-medium text-slate-700">Cap deduction at ₹1,800/month</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* ESIC Card */}
                <div className="border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    Employees' State Insurance (ESIC) Rules
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Employee Share (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={statutoryConfig.esic?.employeeRate || 0.75}
                        onChange={(e) => setStatutoryConfig({
                          ...statutoryConfig,
                          esic: { ...statutoryConfig.esic, employeeRate: Number(e.target.value) }
                        })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Employer Share (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={statutoryConfig.esic?.employerRate || 3.25}
                        onChange={(e) => setStatutoryConfig({
                          ...statutoryConfig,
                          esic: { ...statutoryConfig.esic, employerRate: Number(e.target.value) }
                        })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Eligibility Ceiling (₹)</label>
                      <input
                        type="number"
                        value={statutoryConfig.esic?.wageCeiling || 21000}
                        onChange={(e) => setStatutoryConfig({
                          ...statutoryConfig,
                          esic: { ...statutoryConfig.esic, wageCeiling: Number(e.target.value) }
                        })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* PT Slabs Card */}
                <div className="border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    Professional Tax (PT) Slabs
                  </div>
                  <div className="space-y-2">
                    {statutoryConfig.ptSlabs?.map((slab: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm">
                        <span className="font-bold text-slate-800">{slab.state}</span>
                        <span className="text-slate-600 text-xs">Gross ≥ ₹{slab.minSalary.toLocaleString('en-IN')}</span>
                        <span className="font-mono font-bold text-slate-900">₹{slab.taxAmount}/month</span>
                        <span className="text-xs text-amber-700 font-medium">₹{slab.specialFebAmount || slab.taxAmount} in Feb</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Statutory Settings
                  </button>
                </div>
              </form>
            )}

            {/* ─── TAB 4: BRANCHES & LOCATIONS ─── */}
            {activeTab === 'branches' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Operating Branches</h3>
                    <p className="text-xs text-slate-500">Locations associated with Professional Tax jurisdictions</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {branches.map((b) => (
                    <div key={b._id} className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900">{b.name}</h4>
                          <span className="text-xs font-mono font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            {b.code}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{b.address || `${b.city}, ${b.state}`}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            PT Rule: {b.ptStateRule || b.state}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Component Modal */}
      {compModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {editingComp._id ? 'Edit Component' : 'Add Salary Component'}
            </h3>

            <form onSubmit={handleSaveComponent} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={editingComp.name}
                    onChange={(e) => setEditingComp({ ...editingComp, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    placeholder="e.g. Conveyance"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Code</label>
                  <input
                    type="text"
                    required
                    value={editingComp.code}
                    onChange={(e) => setEditingComp({ ...editingComp, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl uppercase font-mono"
                    placeholder="e.g. CONVEYANCE"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
                  <select
                    value={editingComp.type}
                    onChange={(e) => setEditingComp({ ...editingComp, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  >
                    <option value="earning">Earning</option>
                    <option value="deduction">Deduction</option>
                    <option value="employer_contribution">Employer Contribution</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Calculation Type</label>
                  <select
                    value={editingComp.calcType}
                    onChange={(e) => setEditingComp({ ...editingComp, calcType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount</option>
                    <option value="formula">Formula</option>
                    <option value="manual">Manual Entry</option>
                    <option value="system_generated">System Generated</option>
                  </select>
                </div>
              </div>

              {editingComp.calcType === 'percentage' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Percentage (%)</label>
                    <input
                      type="number"
                      value={editingComp.percentageValue}
                      onChange={(e) => setEditingComp({ ...editingComp, percentageValue: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">% Of</label>
                    <select
                      value={editingComp.percentageOf}
                      onChange={(e) => setEditingComp({ ...editingComp, percentageOf: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    >
                      <option value="BASIC">Basic</option>
                      <option value="GROSS">Gross</option>
                      <option value="CTC">CTC</option>
                    </select>
                  </div>
                </div>
              )}

              {editingComp.calcType === 'formula' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Formula Expression</label>
                  <input
                    type="text"
                    value={editingComp.formula}
                    onChange={(e) => setEditingComp({ ...editingComp, formula: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs"
                    placeholder="e.g. GROSS - BASIC - HRA"
                  />
                </div>
              )}

              {/* Checkboxes */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingComp.isTaxable}
                    onChange={(e) => setEditingComp({ ...editingComp, isTaxable: e.target.checked })}
                    className="rounded text-emerald-600"
                  />
                  Taxable Earning
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingComp.isProratedOnLOP}
                    onChange={(e) => setEditingComp({ ...editingComp, isProratedOnLOP: e.target.checked })}
                    className="rounded text-emerald-600"
                  />
                  Prorate on LOP
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingComp.isPFApplicable}
                    onChange={(e) => setEditingComp({ ...editingComp, isPFApplicable: e.target.checked })}
                    className="rounded text-emerald-600"
                  />
                  PF Applicable
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingComp.isESIApplicable}
                    onChange={(e) => setEditingComp({ ...editingComp, isESIApplicable: e.target.checked })}
                    className="rounded text-emerald-600"
                  />
                  ESI Applicable
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCompModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Component
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
