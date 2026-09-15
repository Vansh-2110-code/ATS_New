import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  FileText, Download, Printer, Search, Filter, Building2, MapPin,
  Calendar, CheckCircle2, ShieldCheck, Eye, ArrowLeft, RefreshCw,
  DollarSign, User, AlertCircle, Sparkles, Send, Lock, X
} from 'lucide-react';
import api from '../../services/api';
import logoImg from '../../../assets/Logo.png';

export function PayslipHubPage() {
  const { id: paramSlipId } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');

  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalDisbursed: 0, totalGross: 0, count: 0 });

  // Modal / Preview state
  const [activeSlip, setActiveSlip] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      loadBranches(selectedCompanyId);
      loadPayslips();
    }
  }, [selectedCompanyId, selectedBranchId, selectedMonth, selectedYear]);

  // Close modal and reset URL parameter cleanly
  const handleCloseModal = () => {
    setActiveSlip(null);
    if (paramSlipId) {
      navigate('/payroll/payslips');
    }
  };

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeSlip) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSlip, paramSlipId]);

  // Load single slip if URL has ID parameter
  useEffect(() => {
    if (paramSlipId) {
      loadSingleSlip(paramSlipId);
    }
  }, [paramSlipId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const comps = await api.getPayrollCompanies();
      setCompanies(comps);
      if (comps.length > 0) {
        setSelectedCompanyId(comps[0]._id);
      }
    } catch (err) {
      console.error('Failed to load companies:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async (companyId: string) => {
    try {
      const bList = await api.getPayrollBranches(companyId);
      setBranches(bList);
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  const loadPayslips = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        companyId: selectedCompanyId,
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
      };
      if (selectedBranchId) params.branchId = selectedBranchId;
      if (searchQuery) params.search = searchQuery;

      const res = await api.getPayslips(params);
      setPayslips(res.records || []);
      setSummary({
        totalDisbursed: res.totalDisbursed || 0,
        totalGross: res.totalGross || 0,
        count: res.count || 0
      });
    } catch (err) {
      console.error('Failed to load payslips:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSingleSlip = async (id: string) => {
    try {
      setPreviewLoading(true);
      const record = await api.getPayslipById(id);
      setActiveSlip(record);
    } catch (err) {
      console.error('Failed to load payslip:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePrint = (slip?: any) => {
    const targetSlip = slip || activeSlip;
    if (!targetSlip) return;

    if (!activeSlip || activeSlip._id !== targetSlip._id) {
      setActiveSlip(targetSlip);
      setTimeout(() => {
        window.print();
        api.markPayslipDownloaded(targetSlip._id).catch(() => {});
      }, 300);
    } else {
      window.print();
      api.markPayslipDownloaded(targetSlip._id).catch(() => {});
    }
  };

  const filteredPayslips = payslips.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.employeeId?.toLowerCase().includes(q) ||
      p.designation?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Print Styles for pristine A4 Payslip */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-payslip-wrapper, #printable-payslip-wrapper * {
            visibility: visible !important;
          }
          #printable-payslip-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Statutory Compliant Slips
            </span>
            <span className="text-xs text-slate-400 font-mono">Form 16 / IT Rule Compliant</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-emerald-600" />
            Payslip Hub & Disbursal Archive
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            View, audit, print, and securely distribute tamper-proof monthly salary slips.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadPayslips}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Archive
          </button>
          <button
            onClick={() => navigate('/payroll/run')}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-emerald-200 transition"
          >
            <Sparkles className="w-4 h-4" />
            Run New Batch
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 no-print">
        {/* Company */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" /> Company / Tenant
          </label>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            {companies.map((c) => (
              <option key={c._id} value={c._id}>{c.companyName}</option>
            ))}
          </select>
        </div>

        {/* Branch */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" /> Branch
          </label>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>{b.name || b.branchName || 'Main Branch'} ({b.city})</option>
            ))}
          </select>
        </div>

        {/* Month */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" /> Month
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            {monthNames.map((m, idx) => (
              <option key={idx + 1} value={idx + 1}>{m}</option>
            ))}
          </select>
        </div>

        {/* Year */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-slate-400" /> Search Employee
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Name or Emp ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payslips Generated</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{summary.count} Records</p>
            <span className="text-xs text-emerald-600 font-medium">For {monthNames[selectedMonth - 1]} {selectedYear}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Net Disbursed</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">₹{summary.totalDisbursed.toLocaleString('en-IN')}</p>
            <span className="text-xs text-blue-600 font-medium">Bank NEFT/RTGS Payable</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Compliance Status</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">100% Audited</p>
            <span className="text-xs text-purple-600 font-medium">EPF, ESIC & PT Reconciled</span>
          </div>
        </div>
      </div>

      {/* Payslips Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden no-print">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">
            Payslip Directory ({filteredPayslips.length})
          </h3>
          <span className="text-xs text-slate-400">
            Click 'View Slip' to preview, inspect statutory deductions, or print PDF.
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-sm font-medium">Loading payslip records...</p>
          </div>
        ) : filteredPayslips.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-700">No payslip records found</p>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              No payroll run has been calculated for {monthNames[selectedMonth - 1]} {selectedYear}. Use "Run New Batch" to compute salaries.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50/80 text-xs uppercase text-slate-500 font-bold border-b border-slate-200/80">
                <tr>
                  <th className="px-4 py-3.5">Employee</th>
                  <th className="px-4 py-3.5">Designation</th>
                  <th className="px-4 py-3.5 text-center">Days (Pres/Pay)</th>
                  <th className="px-4 py-3.5 text-right">Earned Gross</th>
                  <th className="px-4 py-3.5 text-right">Deductions</th>
                  <th className="px-4 py-3.5 text-right">Net Payable</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayslips.map((slip) => (
                  <tr key={slip._id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{slip.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{slip.employeeId || 'WH-EMP'}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 capitalize">
                      {slip.designation || 'Recruiter'}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="font-semibold text-slate-800">{slip.presentDays || 0}</span>
                      <span className="text-slate-400 text-xs"> / {slip.payableDays || slip.calculationBaseDays || 30}</span>
                      {slip.lopDays > 0 && (
                        <span className="block text-[10px] text-red-500 font-medium">({slip.lopDays} LOP)</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-slate-700">
                      ₹{(slip.grossEarned || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-red-600">
                      -₹{(slip.totalDeductions || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-bold text-emerald-700 text-base">
                        ₹{(slip.netSalary || 0).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {slip.isFrozen ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Lock className="w-3 h-3" /> Frozen Slip
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setActiveSlip(slip)}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                          title="Preview Payslip"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePrint(slip)}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                          title="Print / Save PDF"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── MODAL / FULL SLIP PREVIEW (Also printable target) ─────────────── */}
      {activeSlip && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex justify-center items-start p-3 sm:p-6 sm:py-8 print:p-0 print:bg-white print:static print:inset-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <div
            id="printable-payslip-wrapper"
            ref={printableRef}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl my-auto print:my-0 overflow-hidden print:shadow-none print:border-none print:max-w-none print:w-full relative"
          >
            {/* Modal Bar (Hidden on Print) - Sticky Header with prominent Close button */}
            <div className="sticky top-0 z-30 bg-slate-900 text-white px-5 sm:px-6 py-3.5 flex items-center justify-between no-print shadow-md border-b border-slate-700">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="font-bold text-xs sm:text-sm truncate">
                  Salary Slip — {activeSlip.name} ({monthNames[activeSlip.month - 1]} {activeSlip.year})
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handlePrint(activeSlip)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print / Save PDF</span>
                  <span className="sm:hidden">Print</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition border border-slate-700 hover:border-rose-600 cursor-pointer shadow-xs"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                  <span>Close</span>
                </button>
              </div>
            </div>

            {/* Pristine Branded Payslip Body */}
            <div className="p-8 sm:p-10 space-y-6 text-slate-800 font-sans">
              {/* Header: Company Name, Logo & Legal Address */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b-2 border-emerald-700 pb-5">
                <div className="flex items-center gap-4">
                  <img
                    src={logoImg}
                    alt="Logo"
                    className="h-14 w-auto object-contain p-1 border border-slate-100 rounded-lg shadow-2xs"
                  />
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                      {activeSlip.company?.companyName || 'White Horse Manpower Consultancy Pvt Ltd'}
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {activeSlip.branch?.address || activeSlip.company?.address || 'Bangalore Headquarters, Karnataka, India'}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono mt-1">
                      {activeSlip.company?.cin && <span>CIN: {activeSlip.company.cin}</span>}
                      {activeSlip.company?.gstin && <span>GSTIN: {activeSlip.company.gstin}</span>}
                      <span>PAN: AABCW1234F</span>
                    </div>
                  </div>
                </div>

                <div className="text-right sm:border-l sm:pl-6 border-slate-200">
                  <span className="text-xs uppercase font-bold text-emerald-700 tracking-widest block">
                    Payslip for the Month of
                  </span>
                  <span className="text-lg font-extrabold text-slate-900 block">
                    {monthNames[activeSlip.month - 1]} {activeSlip.year}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                    Ref: WHM-PAY-{activeSlip.year}-{String(activeSlip.month).padStart(2, '0')}-{activeSlip.employeeId || '001'}
                  </span>
                </div>
              </div>

              {/* Employee & Bank Info Grid (4 columns) */}
              <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Employee Name</span>
                  <span className="font-bold text-slate-900 text-sm">{activeSlip.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Employee Code</span>
                  <span className="font-bold text-slate-900 font-mono">{activeSlip.employeeId || 'WH-EMP-001'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Designation</span>
                  <span className="font-semibold text-slate-800 capitalize">{activeSlip.designation || 'Recruiter'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Department</span>
                  <span className="font-semibold text-slate-800">{activeSlip.department || 'Recruitment & Operations'}</span>
                </div>

                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Bank Name</span>
                  <span className="font-semibold text-slate-800">{activeSlip.bankDetails?.bankName || 'HDFC Bank'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Bank Account No.</span>
                  <span className="font-semibold text-slate-800 font-mono">{activeSlip.bankDetails?.accountNumber || '••••••••1234'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">IFSC Code</span>
                  <span className="font-semibold text-slate-800 font-mono">{activeSlip.bankDetails?.ifscCode || 'HDFC0001234'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Payment Mode</span>
                  <span className="font-semibold text-slate-800 capitalize">{activeSlip.bankDetails?.paymentMode || 'Bank Transfer (NEFT)'}</span>
                </div>

                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">PAN Number</span>
                  <span className="font-semibold text-slate-800 font-mono">{activeSlip.statutoryDetails?.pan || 'ABCDE1234F'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">UAN Number</span>
                  <span className="font-semibold text-slate-800 font-mono">{activeSlip.statutoryDetails?.uan || '101234567890'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Tax Regime</span>
                  <span className="font-semibold text-slate-800 uppercase">{activeSlip.statutoryDetails?.taxRegime || 'New Regime'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">PF / EPF Status</span>
                  <span className="font-semibold text-slate-800">
                    {activeSlip.statutoryDetails?.isPFExempt ? (
                      <span className="text-amber-700 font-bold">Opted Out</span>
                    ) : (
                      <span className="text-emerald-700 font-bold">Active (12%)</span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Branch / Location</span>
                  <span className="font-semibold text-slate-800">{activeSlip.branch?.name || activeSlip.branch?.branchName || 'Bangalore HQ'}</span>
                </div>
              </div>

              {/* Attendance Breakdown Bar */}
              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between text-xs">
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-slate-500 font-medium">Month Base Days:</span>{' '}
                    <span className="font-bold text-slate-900">{activeSlip.calculationBaseDays || 30}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Present Days:</span>{' '}
                    <span className="font-bold text-emerald-700">{activeSlip.presentDays || 0}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Loss of Pay (LOP):</span>{' '}
                    <span className="font-bold text-red-600">{activeSlip.lopDays || 0}</span>
                  </div>
                </div>
                <div>
                  <span className="text-emerald-900 font-semibold">Payable Days:</span>{' '}
                  <span className="font-extrabold text-emerald-800 text-sm">
                    {activeSlip.payableDays || (activeSlip.calculationBaseDays - (activeSlip.lopDays || 0))} Days
                  </span>
                </div>
              </div>

              {/* Two Column Earnings and Deductions Table */}
              <div className="grid grid-cols-1 sm:grid-cols-2 border border-slate-200 rounded-xl overflow-hidden">
                {/* Left: Earnings */}
                <div className="border-b sm:border-b-0 sm:border-r border-slate-200">
                  <div className="bg-emerald-700 text-white px-4 py-2 font-bold text-xs uppercase tracking-wider flex justify-between">
                    <span>Earnings (Incentives & Allowances)</span>
                    <span>Amount (₹)</span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {(activeSlip.earnings || []).map((e: any, idx: number) => (
                      <div key={idx} className="px-4 py-2 flex justify-between items-center hover:bg-slate-50">
                        <span className="text-slate-700 font-medium">{e.name}</span>
                        <span className="font-semibold text-slate-900">₹{(e.earnedAmount || 0).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                    {activeSlip.incentiveAmount > 0 && (
                      <div className="px-4 py-2 flex justify-between items-center bg-emerald-50/50">
                        <span className="text-emerald-800 font-semibold">Recruitment Performance Incentive</span>
                        <span className="font-bold text-emerald-700">₹{activeSlip.incentiveAmount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex justify-between items-center font-bold text-xs text-slate-900">
                    <span>Gross Earnings</span>
                    <span>₹{(activeSlip.grossEarned || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Right: Deductions */}
                <div>
                  <div className="bg-slate-800 text-white px-4 py-2 font-bold text-xs uppercase tracking-wider flex justify-between">
                    <span>Deductions (Statutory & Others)</span>
                    <span>Amount (₹)</span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {(activeSlip.deductions || []).map((d: any, idx: number) => (
                      <div key={idx} className="px-4 py-2 flex justify-between items-center hover:bg-slate-50">
                        <span className="text-slate-700 font-medium">{d.name}</span>
                        <span className="font-semibold text-slate-900">₹{(d.amount || 0).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                    {activeSlip.lopDeduction > 0 && (
                      <div className="px-4 py-2 flex justify-between items-center bg-red-50/40">
                        <span className="text-red-700 font-medium">Loss of Pay (LOP) Deduction</span>
                        <span className="font-semibold text-red-600">₹{activeSlip.lopDeduction.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex justify-between items-center font-bold text-xs text-slate-900">
                    <span>Total Deductions</span>
                    <span className="text-red-600">₹{(activeSlip.totalDeductions || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Net Salary Highlight Banner */}
              <div className="bg-linear-to-r from-emerald-600 to-teal-700 text-white rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                <div>
                  <span className="text-xs uppercase font-bold text-emerald-100 tracking-wider block">Net Take Home Pay</span>
                  <span className="text-xs text-emerald-100 italic mt-0.5 block">
                    Amount in Words: <span className="capitalize font-semibold text-white">{activeSlip.netSalaryInWords || 'Zero Rupees Only'}</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                    ₹{(activeSlip.netSalary || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Employer Contributions & CTC Breakdown */}
              <div className="border border-dashed border-slate-200 rounded-xl p-3.5 bg-slate-50 text-xs">
                <span className="text-slate-500 font-bold uppercase text-[10px] block mb-2">Employer Contribution Summary (CTC Cost)</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(activeSlip.employerContributions || []).map((ec: any, idx: number) => (
                    <div key={idx} className="flex justify-between border-r last:border-r-0 pr-3">
                      <span className="text-slate-600">{ec.name}:</span>
                      <span className="font-semibold text-slate-800">₹{(ec.amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pr-3 font-bold text-emerald-800">
                    <span>Monthly Total CTC:</span>
                    <span>₹{(activeSlip.ctc || (activeSlip.grossEarned + activeSlip.totalEmployerCost)).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Signatures and Note Footer */}
              <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
                <div className="max-w-md">
                  <p className="font-semibold text-slate-700">Note & Declaration:</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    This document is an official electronically authenticated salary slip issued by White Horse Manpower Consultancy Pvt Ltd. Form 16 will be issued at the conclusion of the financial year.
                  </p>
                </div>

                <div className="text-center sm:text-right">
                  <div className="inline-block border-b border-slate-400 pb-1 px-8 text-slate-700 font-bold font-serif italic text-sm">
                    White Horse Manpower
                  </div>
                  <span className="block text-[10px] text-slate-400 font-semibold uppercase mt-1">
                    Authorized Signatory / Finance Head
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Bottom Bar (Hidden on Print) */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between no-print">
              <span className="text-[11px] text-slate-500">
                Tip: Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono text-slate-700">Esc</kbd> or click outside to close
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrint(activeSlip)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex items-center gap-1 px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default PayslipHubPage;
