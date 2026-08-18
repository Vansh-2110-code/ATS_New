import { Download, FileText, Calendar, User, Briefcase } from 'lucide-react';
import {
  generateSalaryFromNet,
  formatCurrency,
  SalaryBreakdown,
  AttendanceSummary,
} from '../utils/salaryCalculations';

interface SalarySlipProps {
  employeeName: string;
  employeeId: string;
  designation?: string;
  department?: string;
  netTakeHome: number;
  month: number;
  year: number;
  wfhAllowance?: number;
  incentives?: number;
  attendance?: AttendanceSummary;
  presentDays?: number;
  workingDays?: number;
  isDownloadLocked?: boolean;
  firstDownloadedAt?: string | Date | null;
  onDownload?: () => void;
}

export function SalarySlip({
  employeeName,
  employeeId,
  designation = 'Employee',
  department = 'Operations',
  netTakeHome,
  month,
  year,
  wfhAllowance = 0,
  incentives = 0,
  attendance,
  presentDays = 22,
  workingDays = 22,
  isDownloadLocked = false,
  firstDownloadedAt = null,
  onDownload,
}: SalarySlipProps) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const breakdown = generateSalaryFromNet(
    netTakeHome,
    wfhAllowance,
    incentives,
    presentDays,
    workingDays
  );

  const handleDownload = () => {
    if (isDownloadLocked) return;
    if (onDownload) {
      onDownload();
    } else {
      // Default: Print to PDF via browser
      const element = document.getElementById('salary-slip-printable');
      if (element) {
        window.print();
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header Action & Single Download Policy Banner */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {isDownloadLocked ? (
          <div className="flex items-center gap-2 px-3.5 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
            <span>⚠️ Downloaded on {firstDownloadedAt ? new Date(firstDownloadedAt).toLocaleDateString('en-IN') : 'previous date'} (One-time download policy)</span>
          </div>
        ) : (
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span>ℹ️ Note: Salary slips can be downloaded once per month.</span>
          </div>
        )}

        <button
          onClick={handleDownload}
          disabled={isDownloadLocked}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
            isDownloadLocked
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-md'
          }`}
          title={isDownloadLocked ? 'Already downloaded' : 'Print or download as PDF'}
        >
          <Download className="w-4 h-4" />
          {isDownloadLocked ? 'Already Downloaded' : 'Download Salary Slip'}
        </button>
      </div>

      {/* Salary Slip Document */}
      <div
        id="salary-slip-printable"
        className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6"
        style={{ pageBreakAfter: 'avoid' }}
      >
        {/* Header */}
        <div className="border-b-2 border-slate-300 pb-4">
          <div className="text-center mb-4">
            <h1 className="text-xl text-slate-800" style={{ fontWeight: 700 }}>
              SALARY SLIP
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {monthNames[month - 1]} {year}
            </p>
          </div>
        </div>

        {/* Employee Info */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500" style={{ fontWeight: 600 }}>
                EMPLOYEE NAME
              </p>
              <p className="text-slate-800 font-semibold">{employeeName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500" style={{ fontWeight: 600 }}>
                EMPLOYEE ID
              </p>
              <p className="text-slate-800 font-semibold">{employeeId}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500" style={{ fontWeight: 600 }}>
                DESIGNATION
              </p>
              <p className="text-slate-800 font-semibold">{designation}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500" style={{ fontWeight: 600 }}>
                DEPARTMENT
              </p>
              <p className="text-slate-800 font-semibold">{department}</p>
            </div>
          </div>
        </div>

        {/* Attendance Summary */}
        {attendance && (
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h3 className="text-sm text-slate-800 mb-3" style={{ fontWeight: 600 }}>
              ATTENDANCE SUMMARY
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs">Present Days</p>
                <p className="text-slate-800 font-semibold">{attendance.presentDays}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Absent Days</p>
                <p className="text-slate-800 font-semibold">{attendance.absentDays}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">WFH Days</p>
                <p className="text-slate-800 font-semibold">{attendance.wfhDays}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Late Entries</p>
                <p className={`font-semibold ${attendance.lateEntries > 0 ? 'text-orange-600' : 'text-slate-800'}`}>
                  {attendance.lateEntries}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Half Days</p>
                <p className="text-slate-800 font-semibold">{attendance.halfDays}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Leave Days</p>
                <p className="text-slate-800 font-semibold">{attendance.leaveDays}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Holidays</p>
                <p className="text-slate-800 font-semibold">{attendance.holidays}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Working Days</p>
                <p className="text-slate-800 font-semibold">{workingDays}</p>
              </div>
            </div>
          </div>
        )}

        {/* Earnings */}
        <div>
          <h3 className="text-sm text-slate-800 mb-3" style={{ fontWeight: 600 }}>
            EARNINGS
          </h3>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-200">
                <tr className="bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-600">Basic Salary (50% of Gross)</td>
                  <td className="px-4 py-2.5 text-right text-slate-800 font-semibold">
                    {formatCurrency(breakdown.earnings.basic)}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-slate-600">HRA (40% of Basic)</td>
                  <td className="px-4 py-2.5 text-right text-slate-800 font-semibold">
                    {formatCurrency(breakdown.earnings.hra)}
                  </td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-600">Special Allowance</td>
                  <td className="px-4 py-2.5 text-right text-slate-800 font-semibold">
                    {formatCurrency(breakdown.earnings.specialAllowance)}
                  </td>
                </tr>
                {breakdown.earnings.wfhAllowance > 0 && (
                  <tr>
                    <td className="px-4 py-2.5 text-slate-600">WFH Allowance</td>
                    <td className="px-4 py-2.5 text-right text-slate-800 font-semibold">
                      {formatCurrency(breakdown.earnings.wfhAllowance)}
                    </td>
                  </tr>
                )}
                {breakdown.earnings.incentives > 0 && (
                  <tr className="bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-600">Incentives / Bonus</td>
                    <td className="px-4 py-2.5 text-right text-slate-800 font-semibold">
                      {formatCurrency(breakdown.earnings.incentives)}
                    </td>
                  </tr>
                )}
                <tr className="bg-green-50 border-t-2 border-green-200">
                  <td className="px-4 py-2.5 text-green-800 font-semibold">Total Earnings (Gross Salary)</td>
                  <td className="px-4 py-2.5 text-right text-green-800 font-bold text-base">
                    {formatCurrency(breakdown.earnings.totalEarnings)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Deductions */}
        <div>
          <h3 className="text-sm text-slate-800 mb-3" style={{ fontWeight: 600 }}>
            DEDUCTIONS
          </h3>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-200">
                <tr className="bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-600">
                    PF (Employee 12% of Basic)
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-800 font-semibold">
                    {formatCurrency(breakdown.deductions.employeePF)}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-slate-600">
                    ESI (Employee 0.75% of Gross)
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-800 font-semibold">
                    {formatCurrency(breakdown.deductions.employeeESI)}
                  </td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-600">Professional Tax</td>
                  <td className="px-4 py-2.5 text-right text-slate-800 font-semibold">
                    {formatCurrency(breakdown.deductions.professionalTax)}
                  </td>
                </tr>
                {breakdown.deductions.absencePenalty > 0 && (
                  <tr>
                    <td className="px-4 py-2.5 text-slate-600">Absence Penalty</td>
                    <td className="px-4 py-2.5 text-right text-red-600 font-semibold">
                      {formatCurrency(breakdown.deductions.absencePenalty)}
                    </td>
                  </tr>
                )}
                <tr className="bg-red-50 border-t-2 border-red-200">
                  <td className="px-4 py-2.5 text-red-800 font-semibold">Total Deductions</td>
                  <td className="px-4 py-2.5 text-right text-red-800 font-bold text-base">
                    {formatCurrency(breakdown.deductions.totalDeductions)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Employer Contributions  */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h3 className="text-sm text-blue-800 mb-3" style={{ fontWeight: 600 }}>
            EMPLOYER CONTRIBUTIONS
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-blue-600 text-xs">Employer PF (12% of Basic)</p>
              <p className="text-blue-800 font-bold text-lg">
                {formatCurrency(breakdown.employerContributions.employerPF)}
              </p>
            </div>
            <div>
              <p className="text-blue-600 text-xs">Employer ESI (3.25% of Gross)</p>
              <p className="text-blue-800 font-bold text-lg">
                {formatCurrency(breakdown.employerContributions.employerESI)}
              </p>
            </div>
          </div>
        </div>

        {/* Net Salary */}
        <div className="bg-emerald-50 rounded-lg p-4 border-2 border-emerald-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-600 text-sm" style={{ fontWeight: 600 }}>
                NET SALARY (Take Home)
              </p>
              <p className="text-emerald-800 text-xs mt-0.5">After all deductions</p>
            </div>
            <div className="text-right">
              <p className="text-emerald-800 font-bold text-3xl">
                {formatCurrency(breakdown.netPay)}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
          <p>This is a computer-generated salary slip and is valid without a signature.</p>
          <p className="mt-1">
            For queries, contact HR Department
          </p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          #salary-slip-printable {
            box-shadow: none;
            border: none;
            page-break-inside: avoid;
          }
          button {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
