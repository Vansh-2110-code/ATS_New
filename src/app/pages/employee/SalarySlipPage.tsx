import { useState, useEffect } from 'react';
import { Calendar, Loader2, AlertCircle, FileText, Eye, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { SalarySlip } from '../../components/SalarySlip';
import { AttendanceSummary, generateSalaryFromNet } from '../../utils/salaryCalculations';
import { SalarySlipAccessRequestModal } from '../../components/SalarySlipAccessRequestModal';

export function SalarySlipPage() {
  const { user } = useAuth();
  const now = new Date();
  const currentYear = now.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [salaryData, setSalaryData] = useState<any>(null);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailView, setDetailView] = useState(false);
  const [accessRequestModal, setAccessRequestModal] = useState(false);
  const [hasAccess, setHasAccess] = useState(true);
  const [requestPending, setRequestPending] = useState(false);
  const [isDownloadLocked, setIsDownloadLocked] = useState(false);
  const [firstDownloadedAt, setFirstDownloadedAt] = useState<string | null>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const months = Array.from({ length: 12 }, (_, i) => ({
    label: monthNames[i],
    month: i + 1,
  }));

  // Load salary slip data and attendance for selected month
  useEffect(() => {
    const load = async () => {
      if (!user?._id) return;

      try {
        setLoading(true);
        setError('');

        // Check download lock status
        try {
          const dlRes = await api.checkSalarySlipDownload(selectedMonth, currentYear);
          setIsDownloadLocked(!!dlRes?.downloadLocked);
          setFirstDownloadedAt(dlRes?.firstDownloadedAt || null);
        } catch {
          setIsDownloadLocked(false);
        }

        // Check access permissions for recruiters
        if (user.role === 'recruiter') {
          try {
            const accessRes = await api.checkSalarySlipAccess?.(selectedMonth, now.getFullYear());
            setHasAccess(accessRes?.hasAccess || false);
            setRequestPending(accessRes?.hasPendingRequest || false);
          } catch {
            setHasAccess(false);
            setRequestPending(false);
          }
        } else {
          setHasAccess(true);
        }

        // Fetch salary data
        const salaryRes = await api.getSalary(selectedMonth, currentYear);
        const salaries = Array.isArray(salaryRes)
          ? salaryRes
          : typeof salaryRes === 'object' && salaryRes.salaryData
          ? salaryRes.salaryData
          : [salaryRes];

        // Find salary for current user
        const userSalary = salaries.find(
          (s: any) =>
            s.user?._id === user._id ||
            s.user === user._id ||
            s.userId === user._id
        );

        if (!userSalary) {
          setError('Salary slip not generated for this month yet. Please contact HR.');
          setSalaryData(null);
          return;
        }

        setSalaryData(userSalary);

        // Fetch attendance data for this month
        const startDate = new Date(currentYear, selectedMonth - 1, 1);
        const endDate = new Date(currentYear, selectedMonth, 0);

        try {
          const attendanceRes = await api.getAttendance?.({
            userId: user._id,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          });

          if (attendanceRes?.attendance) {
            const records = attendanceRes.attendance;
            const holidays = await api.getHolidays?.({
              month: selectedMonth,
              year: currentYear,
            });

            const presentCount = records.filter(
              (r: any) => r.status === 'Present'
            ).length;
            const absentCount = records.filter(
              (r: any) => r.status === 'Absent'
            ).length;
            const halfDayCount = records.filter(
              (r: any) => r.status === 'Half Day'
            ).length;
            const wfhCount = records.filter(
              (r: any) => r.status === 'WFH'
            ).length;
            const leaveCount = records.filter(
              (r: any) => r.status === 'Leave'
            ).length;
            const lateCount = records.filter((r: any) => {
              if (!r.loginTime) return false;
              const loginHour = new Date(r.loginTime).getHours();
              const loginMin = new Date(r.loginTime).getMinutes();
              const decimalHour = loginHour + loginMin / 60;
              return decimalHour > 9.5; // After 9:30 AM
            }).length;

            setAttendance({
              presentDays: presentCount,
              absentDays: absentCount,
              halfDays: halfDayCount,
              wfhDays: wfhCount,
              leaveDays: leaveCount,
              lateEntries: lateCount,
              holidays: holidays?.holidays?.length || 0,
            });
          }
        } catch {
          // Attendance data not available, continue anyway
          console.log('Attendance data not available');
        }
      } catch (err: any) {
        setError(
          err.message || 'Failed to load salary slip. Please try again.'
        );
        setSalaryData(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [selectedMonth, user?._id, currentYear]);

  const handleAccessRequest = async (reason: string, durationDays: number) => {
    try {
      await api.requestSalarySlipAccess?.({
        month: selectedMonth,
        year: currentYear,
        reason,
        durationDays,
      });
      setRequestPending(true);
      alert('Access request submitted successfully!');
    } catch (err: any) {
      throw err;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <p className="text-slate-600">Please log in to view your salary slip</p>
        </div>
      </div>
    );
  }

  const breakdown = salaryData ? generateSalaryFromNet(
    salaryData.netSalary || salaryData.baseSalary || 0,
    salaryData.wfhAllowance || 0,
    salaryData.bonus || 0,
    attendance?.presentDays || 22,
    22
  ) : null;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1
              className="text-2xl text-slate-800"
              style={{ fontWeight: 700 }}
            >
              My Salary Slip
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              View and download your monthly salary break up
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none bg-white text-slate-700"
            >
              {months.map((m) => (
                <option key={m.month} value={m.month}>
                  {m.label} {currentYear}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Info Cards */}
        {salaryData && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500" style={{ fontWeight: 500 }}>
                    Gross Salary
                  </p>
                  <p
                    className="text-slate-800 text-lg"
                    style={{ fontWeight: 700 }}
                  >
                    ₹
                    {(
                      salaryData.baseSalary ||
                      salaryData.base ||
                      0
                    ).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500" style={{ fontWeight: 500 }}>
                    Total Deductions
                  </p>
                  <p
                    className="text-slate-800 text-lg"
                    style={{ fontWeight: 700 }}
                  >
                    ₹{(salaryData.deductions || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500" style={{ fontWeight: 500 }}>
                    Net Salary
                  </p>
                  <p
                    className="text-slate-800 text-lg"
                    style={{ fontWeight: 700 }}
                  >
                    ₹{(salaryData.netSalary || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Access Restricted (Recruiter) */}
        {user?.role === 'recruiter' && !hasAccess && !requestPending && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
            <Lock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-yellow-800 text-sm font-semibold">Access Restricted</p>
              <p className="text-yellow-700 text-sm mt-1">
                You need manager approval to view salary slips. Request access to proceed.
              </p>
              <button
                onClick={() => setAccessRequestModal(true)}
                className="mt-3 px-4 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-semibold"
              >
                Request Access
              </button>
            </div>
          </div>
        )}

        {/* Access Pending (Recruiter) */}
        {user?.role === 'recruiter' && requestPending && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-blue-800 text-sm font-semibold">Access Pending</p>
              <p className="text-blue-700 text-sm mt-1">
                Your access request is pending manager approval. You will get notification once approved.
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mb-3" />
              <p className="text-slate-600 text-sm">Loading salary slip...</p>
            </div>
          </div>
        )}

        {/* Salary Slip Display */}
        {salaryData && !loading && (user?.role !== 'recruiter' || hasAccess) && (
          <>
            {detailView ? (
              // Detailed Salary Slip View
              <SalarySlip
                employeeName={user.name}
                employeeId={user.employeeId || user._id}
                designation={salaryData.role}
                netTakeHome={salaryData.netSalary || salaryData.baseSalary || 0}
                month={selectedMonth}
                year={currentYear}
                wfhAllowance={salaryData.wfhAllowance || 0}
                incentives={salaryData.bonus || 0}
                attendance={attendance || undefined}
                presentDays={attendance?.presentDays || 22}
                workingDays={22}
                isDownloadLocked={isDownloadLocked}
                firstDownloadedAt={firstDownloadedAt}
                onDownload={async () => {
                  try {
                    await api.recordSalarySlipDownload(selectedMonth, currentYear);
                    setIsDownloadLocked(true);
                    setFirstDownloadedAt(new Date().toISOString());
                    const element = document.getElementById('salary-slip-printable');
                    if (element) {
                      window.print();
                    }
                  } catch (err) {
                    const element = document.getElementById('salary-slip-printable');
                    if (element) {
                      window.print();
                    }
                  }
                }}
              />
            ) : (
              // Summary View
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                  <h2
                    className="text-slate-800 text-sm"
                    style={{ fontWeight: 600 }}
                  >
                    Salary Breakdown — {monthNames[selectedMonth - 1]}{' '}
                    {currentYear}
                  </h2>
                </div>

                <div className="p-6 space-y-6">
                  {/* Earnings Summary */}
                  <div>
                    <h3 className="text-sm text-slate-800 mb-3" style={{ fontWeight: 600 }}>
                      Your Earnings (Gross)
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600">Base Salary</span>
                        <span className="text-slate-800 font-semibold">
                          ₹{(breakdown?.earnings.basic || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      {breakdown?.earnings.wfhAllowance ? breakdown.earnings.wfhAllowance > 0 && (
                        <div className="flex items-center justify-between py-2 border-b border-slate-100">
                          <span className="text-slate-600">WFH Allowance</span>
                          <span className="text-slate-800 font-semibold">
                            ₹{breakdown.earnings.wfhAllowance.toLocaleString('en-IN')}
                          </span>
                        </div>
                      ) : null}
                      {breakdown?.earnings.incentives ? breakdown.earnings.incentives > 0 && (
                        <div className="flex items-center justify-between py-2 border-b border-slate-100">
                          <span className="text-slate-600">Bonus / Incentive</span>
                          <span className="text-emerald-600 font-semibold">
                            ₹{breakdown.earnings.incentives.toLocaleString('en-IN')}
                          </span>
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between py-2 bg-green-50 px-3 rounded mt-3 font-semibold">
                        <span className="text-green-800">Total Earnings</span>
                        <span className="text-green-800">
                          ₹
                          {(breakdown?.earnings.totalEarnings || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions Summary */}
                  <div>
                    <h3 className="text-sm text-slate-800 mb-3" style={{ fontWeight: 600 }}>
                      Your Deductions
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600">PF Deduction</span>
                        <span className="text-red-600 font-semibold">
                          ₹{(breakdown?.deductions.employeePF || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600">ESI Deduction</span>
                        <span className="text-red-600 font-semibold">
                          ₹{(breakdown?.deductions.employeeESI || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600">Professional Tax</span>
                        <span className="text-red-600 font-semibold">
                          ₹{(breakdown?.deductions.professionalTax || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      {breakdown?.deductions.absencePenalty ? breakdown.deductions.absencePenalty > 0 && (
                        <div className="flex items-center justify-between py-2 border-b border-slate-100">
                          <span className="text-slate-600">Absence Penalty</span>
                          <span className="text-red-600 font-semibold">
                            ₹{(breakdown.deductions.absencePenalty).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between py-2 bg-red-50 px-3 rounded mt-3 font-semibold">
                        <span className="text-red-800">Total Deductions</span>
                        <span className="text-red-800">
                          ₹{(breakdown?.deductions.totalDeductions || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Net Salary */}
                  <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-800 font-semibold">
                        Net Salary (Take Home)
                      </span>
                      <span className="text-emerald-800 font-bold text-2xl">
                        ₹{(breakdown?.netPay || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* View Details Button */}
                  <button
                    onClick={() => setDetailView(true)}
                    className="w-full py-2.5 mt-4 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Full Breakdown
                  </button>
                </div>
              </div>
            )}

            {/* Back to Summary Button */}
            {detailView && (
              <div className="flex justify-center">
                <button
                  onClick={() => setDetailView(false)}
                  className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-semibold transition-colors"
                >
                  Back to Summary
                </button>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && !salaryData && !error && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 text-sm">
              No salary slip available for{' '}
              <span className="font-semibold">
                {monthNames[selectedMonth - 1]}
              </span>
            </p>
            <p className="text-slate-400 text-xs mt-2">
              Please check back later or contact HR
            </p>
          </div>
        )}
      </div>

      {/* Access Request Modal */}
      <SalarySlipAccessRequestModal
        isOpen={accessRequestModal}
        onClose={() => setAccessRequestModal(false)}
        onSubmit={handleAccessRequest}
        salaryMonth={monthNames[selectedMonth - 1]}
        salaryYear={currentYear}
      />
    </div>
  );
}
