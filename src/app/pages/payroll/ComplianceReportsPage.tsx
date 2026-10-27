import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  ShieldCheck, Download, FileSpreadsheet, FileText, CheckCircle2,
  Calendar, RefreshCw, Building, DollarSign, Users, AlertCircle, ArrowUpRight, ArrowDownRight, Copy, Check
} from 'lucide-react';

export function ComplianceReportsPage() {
  const [activeTab, setActiveTab] = useState<'epf' | 'esic' | 'bank' | 'variance'>('epf');
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadReports();
  }, [month, year]);

  async function loadReports() {
    setLoading(true);
    try {
      const data = await api.getComplianceReports({
        month: String(month),
        year: String(year)
      });
      setReportData(data);
    } catch (err: any) {
      console.error('Failed to load compliance reports:', err);
    } finally {
      setLoading(false);
    }
  }

  function downloadEcrTextFile() {
    if (!reportData?.ecrRawText) return;
    const blob = new Blob([reportData.ecrRawText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EPFO_ECR_${year}_${String(month).padStart(2, '0')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadNeftCsvFile() {
    if (!reportData?.neftCsv) return;
    const blob = new Blob([reportData.neftCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bank_NEFT_Batch_${year}_${String(month).padStart(2, '0')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function copyEcrToClipboard() {
    if (!reportData?.ecrRawText) return;
    navigator.clipboard.writeText(reportData.ecrRawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl shadow-xl border border-indigo-800/40 text-white">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-500/40 text-emerald-400">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Statutory Compliance & Bank Audit Suite</h1>
              <p className="text-slate-400 text-sm mt-0.5">
                Official EPFO Electronic Challan Return (ECR), ESIC Form 5, Bank NEFT batch disbursements, and MoM audit variances.
              </p>
            </div>
          </div>
        </div>

        {/* Month & Year Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-xl p-1 shadow-inner">
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="bg-transparent text-white text-xs font-semibold px-2 py-1.5 focus:outline-none"
            >
              {MONTHS.map((m, idx) => (
                <option key={idx + 1} value={idx + 1} className="bg-slate-900 text-white">
                  {m}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="bg-transparent text-white text-xs font-semibold px-2 py-1.5 focus:outline-none border-l border-slate-700"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y} className="bg-slate-900 text-white">
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={loadReports}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
            title="Reload Compliance"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('epf')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'epf'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>EPFO Electronic Challan (ECR)</span>
        </button>
        <button
          onClick={() => setActiveTab('esic')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'esic'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>ESIC Monthly Return</span>
        </button>
        <button
          onClick={() => setActiveTab('bank')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'bank'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Bank NEFT Disbursal Batch</span>
        </button>
        <button
          onClick={() => setActiveTab('variance')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'variance'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Month-on-Month Variance</span>
        </button>
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-400">Loading statutory compliance data for {MONTHS[month - 1]} {year}...</div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: EPFO ECR */}
          {activeTab === 'epf' && (
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Eligible PF Members</span>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                    {reportData?.ecrCount || 0} Staff
                  </div>
                  <span className="text-[11px] text-emerald-600 font-medium">Non-opted out members</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">EPF Wage Ceiling</span>
                  <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                    ₹15,000 / mo
                  </div>
                  <span className="text-[11px] text-slate-400">Statutory EPFO limit</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee EPF (12%)</span>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                    ₹{((reportData?.ecrCount || 0) * 1800).toLocaleString('en-IN')}
                  </div>
                  <span className="text-[11px] text-slate-400">Max ₹1,800/mo per member</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Employer EPF+EPS (12%)</span>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                    ₹{((reportData?.ecrCount || 0) * 1800).toLocaleString('en-IN')}
                  </div>
                  <span className="text-[11px] text-slate-400">EPS (8.33%) + EPF (3.67%)</span>
                </div>
              </div>

              {/* Action Banner */}
              <div className="bg-gradient-to-r from-emerald-900 to-teal-950 p-6 rounded-2xl border border-emerald-700/50 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
                <div>
                  <h3 className="font-bold text-lg">EPFO Unified Portal ECR File Ready</h3>
                  <p className="text-xs text-emerald-200 mt-0.5 max-w-xl">
                    Standard pipe-delimited format (UAN#MEMBER_NAME#GROSS#EPF_WAGES#EPS_WAGES...) ready for direct electronic upload to the official EPFO Employer Unified Portal.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyEcrToClipboard}
                    className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-600 transition-all"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                  </button>
                  <button
                    onClick={downloadEcrTextFile}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/30 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download EPFO ECR (.txt)</span>
                  </button>
                </div>
              </div>

              {/* Raw Preview */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                  <span className="font-mono uppercase font-semibold">ECR Raw Electronic Challan Format Preview</span>
                  <span>{reportData?.ecrCount || 0} Records</span>
                </div>
                <pre className="font-mono text-xs text-emerald-400 overflow-x-auto p-2 bg-slate-950/80 rounded-xl max-h-60 leading-relaxed">
                  {reportData?.ecrRawText || '# No eligible PF members found for this month'}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: ESIC MONTHLY RETURN */}
          {activeTab === 'esic' && (
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Covered Employees</span>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                    {reportData?.esicRecords?.length || 0} Staff
                  </div>
                  <span className="text-[11px] text-slate-400">Gross salary &lt;= ₹21,000/mo</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee Contribution (0.75%)</span>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                    ₹{((reportData?.esicRecords || []).reduce((s: number, r: any) => s + (r.eeESI || 0), 0)).toLocaleString('en-IN')}
                  </div>
                  <span className="text-[11px] text-slate-400">Deducted from employee</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Monthly ESIC (4%)</span>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    ₹{(reportData?.esicTotalContribution || 0).toLocaleString('en-IN')}
                  </div>
                  <span className="text-[11px] text-emerald-500 font-medium">Employee 0.75% + Employer 3.25%</span>
                </div>
              </div>

              {/* ESIC Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Form 5 ESIC Monthly Statement ({reportData?.esicRecords?.length || 0} Insured Persons)
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">IP Insurance No.</th>
                        <th className="py-3 px-4">Member Name</th>
                        <th className="py-3 px-4">Payable Days</th>
                        <th className="py-3 px-4">Total Wages</th>
                        <th className="py-3 px-4">Employee ESIC (0.75%)</th>
                        <th className="py-3 px-4">Employer ESIC (3.25%)</th>
                        <th className="py-3 px-4">Total ESIC (4%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {(reportData?.esicRecords || []).map((r: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-mono font-semibold">{r.ipNumber}</td>
                          <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">{r.ipName}</td>
                          <td className="py-3 px-4">{r.paidDays} Days</td>
                          <td className="py-3 px-4 font-mono">₹{r.totalWages?.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 font-mono text-rose-600">₹{r.eeESI?.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 font-mono text-indigo-600">₹{r.erESI?.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-600">₹{r.totalESI?.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BANK NEFT BATCH TRANSFER */}
          {activeTab === 'bank' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-6 rounded-2xl border border-indigo-700/50 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
                <div>
                  <h3 className="font-bold text-lg">Bank NEFT Batch Transfer File</h3>
                  <p className="text-xs text-indigo-200 mt-0.5 max-w-xl">
                    Standard corporate netbanking bulk upload CSV format with Beneficiary Name, Account Number, IFSC Code, and Net Payables.
                  </p>
                </div>
                <button
                  onClick={downloadNeftCsvFile}
                  className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/30 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Bank NEFT Batch (.csv)</span>
                </button>
              </div>

              {/* Preview table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold uppercase tracking-wider">CSV Batch Disbursal Preview</span>
                  <span>{reportData?.recordCount || 0} Transfers</span>
                </div>
                <pre className="font-mono text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl max-h-80 overflow-auto leading-relaxed border border-slate-200 dark:border-slate-800">
                  {reportData?.neftCsv || 'No records available'}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: MOM VARIANCE AUDIT */}
          {activeTab === 'variance' && (
            <div className="space-y-6">
              {/* Variance Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Headcount Variance</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                      {reportData?.variance?.currentHeadcount || 0}
                    </div>
                    <span className={`text-xs font-bold flex items-center ${
                      (reportData?.variance?.headcountDelta || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {(reportData?.variance?.headcountDelta || 0) >= 0 ? '+' : ''}{reportData?.variance?.headcountDelta || 0}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">vs {reportData?.variance?.prevHeadcount || 0} previous month</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Payroll Variance</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                      ₹{(reportData?.variance?.currentGross || 0).toLocaleString('en-IN')}
                    </div>
                    <span className={`text-xs font-bold flex items-center ${
                      (reportData?.variance?.grossDelta || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {(reportData?.variance?.grossDelta || 0) >= 0 ? '+' : ''}₹{(reportData?.variance?.grossDelta || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">vs ₹{(reportData?.variance?.prevGross || 0).toLocaleString('en-IN')} last month</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Disbursable Variance</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                      ₹{(reportData?.variance?.currentNet || 0).toLocaleString('en-IN')}
                    </div>
                    <span className={`text-xs font-bold flex items-center ${
                      (reportData?.variance?.netDelta || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {(reportData?.variance?.netDelta || 0) >= 0 ? '+' : ''}₹{(reportData?.variance?.netDelta || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">vs ₹{(reportData?.variance?.prevNet || 0).toLocaleString('en-IN')} last month</span>
                </div>
              </div>

              {/* Explanatory audit card */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-2">
                  Month-on-Month Audit Reconciliation
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Comparing current pay run (<strong>{reportData?.variance?.currentMonth}</strong>) with preceding pay run (<strong>{reportData?.variance?.prevMonth}</strong>). Variances are caused by new employee onboardings, salary increments, loss-of-pay (LOP) attendance adjustments, and recruitment placement incentive releases.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
