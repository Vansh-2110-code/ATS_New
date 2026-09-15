import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Users, Search, Edit3, ArrowLeft, Building2, CheckCircle2,
  XCircle, Filter, Loader2, Save, CreditCard, ShieldCheck
} from 'lucide-react';
import api from '../../services/api';

export function EmployeePayrollPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      loadBranches(selectedCompanyId);
      loadProfiles();
    }
  }, [selectedCompanyId, selectedBranchId]);

  const loadCompanies = async () => {
    try {
      const comps = await api.getPayrollCompanies();
      setCompanies(comps);
      if (comps.length > 0) {
        setSelectedCompanyId(comps[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadBranches = async (companyId: string) => {
    try {
      const bList = await api.getPayrollBranches(companyId);
      setBranches(bList);
    } catch (err) {
      console.error(err);
    }
  };

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const data = await api.getPayrollEmployees({
        companyId: selectedCompanyId,
        branchId: selectedBranchId,
      });
      setProfiles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.updatePayrollEmployee(currentProfile._id, {
        grossSalary: Number(currentProfile.grossSalary),
        annualCTC: Number(currentProfile.grossSalary) * 12,
        statutory: currentProfile.statutory,
        bank: currentProfile.bank,
        status: currentProfile.status
      });
      setEditModalOpen(false);
      loadProfiles();
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const filtered = profiles.filter((p) => {
    const text = `${p.user?.name || ''} ${p.user?.employeeId || ''} ${p.user?.email || ''} ${p.user?.role || ''}`.toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

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
            Employee Payroll Master Directory
          </h1>
          <p className="text-sm text-slate-500">
            Maintain employee salary CTC structures, statutory details (PF, ESI, PAN, UAN), and disbursement bank accounts
          </p>
        </div>

        {/* Company & Branch Filters */}
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

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-sm">
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent border-none text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by employee name, ID, role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 focus:bg-emerald-50/10 transition-colors"
          />
        </div>
        <div className="text-xs font-semibold text-slate-500">
          Showing <span className="text-slate-900">{filtered.length}</span> active payroll profiles
        </div>
      </div>

      {/* Employee Payroll Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Role / Designation</th>
                  <th className="py-3.5 px-4">Branch</th>
                  <th className="py-3.5 px-4">Monthly Gross</th>
                  <th className="py-3.5 px-4">Annual CTC</th>
                  <th className="py-3.5 px-4">Statutory Status</th>
                  <th className="py-3.5 px-4">Bank & Mode</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No matching employee payroll profiles found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs">
                            {(p.user?.name || 'U').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{p.user?.name || 'Unknown User'}</p>
                            <p className="text-xs text-slate-400 font-mono">{p.user?.employeeId || 'WH-STAFF'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold capitalize text-slate-700">
                        {p.user?.role || 'Staff'}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {p.branch?.name || 'Bangalore HQ'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        ₹{(p.grossSalary || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 text-xs">
                        ₹{(p.annualCTC || (p.grossSalary * 12)).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 text-[11px]">
                          <span className="font-mono text-slate-700">PAN: {p.statutory?.panNumber || 'N/A'}</span>
                          <span className="text-slate-400 font-mono">UAN: {p.statutory?.uanNumber || 'N/A'}</span>
                          <div>
                            {p.statutory?.isPFExempt ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                ✕ PF Opted Out
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ✓ PF Active (12%)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5 text-[11px]">
                          <span className="font-medium text-slate-700">{p.bank?.bankName || 'HDFC Bank'}</span>
                          <span className="text-slate-400 font-mono">A/C: {p.bank?.accountNumber ? '••••' + p.bank.accountNumber.slice(-4) : 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                          p.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setCurrentProfile(JSON.parse(JSON.stringify(p)));
                            setEditModalOpen(true);
                          }}
                          className="p-1.5 hover:bg-emerald-50 rounded-lg text-slate-600 hover:text-emerald-700 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {editModalOpen && currentProfile && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Edit Payroll Profile: {currentProfile.user?.name}
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Gross (₹)</label>
                  <input
                    type="number"
                    required
                    value={currentProfile.grossSalary || 0}
                    onChange={(e) => setCurrentProfile({ ...currentProfile, grossSalary: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Regime</label>
                  <select
                    value={currentProfile.statutory?.taxRegime || 'new'}
                    onChange={(e) => setCurrentProfile({
                      ...currentProfile,
                      statutory: { ...currentProfile.statutory, taxRegime: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  >
                    <option value="new">New Tax Regime (Default)</option>
                    <option value="old">Old Tax Regime</option>
                  </select>
                </div>
              </div>

              {/* Statutory */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">PAN Number</label>
                  <input
                    type="text"
                    value={currentProfile.statutory?.panNumber || ''}
                    onChange={(e) => setCurrentProfile({
                      ...currentProfile,
                      statutory: { ...currentProfile.statutory, panNumber: e.target.value.toUpperCase() }
                    })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">UAN Number</label>
                  <input
                    type="text"
                    value={currentProfile.statutory?.uanNumber || ''}
                    onChange={(e) => setCurrentProfile({
                      ...currentProfile,
                      statutory: { ...currentProfile.statutory, uanNumber: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Provident Fund (PF) Settings */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block">
                      Provident Fund (PF) Deduction
                    </label>
                    <p className="text-[11px] text-slate-500">
                      {currentProfile.statutory?.isPFExempt
                        ? 'PF Deselected / Opted Out (0% deduction - ₹0 deducted, full in-hand salary)'
                        : 'PF Active (12% EPF will be deducted during monthly payroll calculations)'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={!currentProfile.statutory?.isPFExempt}
                      onChange={(e) => {
                        const isEnabled = e.target.checked;
                        setCurrentProfile({
                          ...currentProfile,
                          statutory: {
                            ...currentProfile.statutory,
                            isPFExempt: !isEnabled
                          }
                        });
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {!currentProfile.statutory?.isPFExempt && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">PF Account / Member ID (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. KN/BLR/1234567/890"
                      value={currentProfile.statutory?.pfNumber || ''}
                      onChange={(e) => setCurrentProfile({
                        ...currentProfile,
                        statutory: { ...currentProfile.statutory, pfNumber: e.target.value }
                      })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Bank */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={currentProfile.bank?.bankName || ''}
                      onChange={(e) => setCurrentProfile({
                        ...currentProfile,
                        bank: { ...currentProfile.bank, bankName: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={currentProfile.bank?.ifscCode || ''}
                      onChange={(e) => setCurrentProfile({
                        ...currentProfile,
                        bank: { ...currentProfile.bank, ifscCode: e.target.value.toUpperCase() }
                      })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono uppercase"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={currentProfile.bank?.accountNumber || ''}
                    onChange={(e) => setCurrentProfile({
                      ...currentProfile,
                      bank: { ...currentProfile.bank, accountNumber: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
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
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
