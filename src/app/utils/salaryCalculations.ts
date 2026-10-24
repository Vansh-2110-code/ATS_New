/**
 * Salary Calculations Utility
 * Reverse Salary Calculation based on Net Take Home.
 */

export interface SalaryBreakdown {
  netTakeHome: number;
  grossSalary: number;
  earnings: {
    basic: number;
    hra: number;
    specialAllowance: number;
    wfhAllowance: number;
    incentives: number;
    totalEarnings: number;
  };
  deductions: {
    employeePF: number;
    employeeESI: number;
    professionalTax: number;
    absencePenalty: number;
    totalDeductions: number;
  };
  employerContributions: {
    employerPF: number;
    employerESI: number;
  };
  netPay: number;
}

export interface AttendanceSummary {
  presentDays: number;
  absentDays: number;
  halfDays: number;
  wfhDays: number;
  leaveDays: number;
  lateEntries: number;
}

const OFFICE_START_TIME = 9.5; // 9:30 AM in decimal hours

export interface StatutoryOptions {
  isPFExempt?: boolean;
  isESIExempt?: boolean;
  isPTExempt?: boolean;
}

/**
 * Generate complete salary breakdown from Net Take Home
 */
export function generateSalaryFromNet(
  netTakeHome: number,
  wfhAllowance: number = 0,
  incentives: number = 0,
  presentDays: number = 22,
  workingDays: number = 22,
  statutoryOpts?: StatutoryOptions
): SalaryBreakdown {
  const isPFExempt = statutoryOpts?.isPFExempt === true;
  const isESIExempt = statutoryOpts?.isESIExempt === true;
  const isPTExempt = statutoryOpts?.isPTExempt === true;

  const pt = isPTExempt ? 0 : 200;
  let grossSalary: number;

  if (isPFExempt) {
    if (isESIExempt || (netTakeHome + pt) > 21000) {
      grossSalary = Math.round(netTakeHome + pt);
    } else {
      grossSalary = Math.round((netTakeHome + pt) / 0.9925);
    }
  } else {
    // Formula based on fixed 0.85 ratio when PF is active
    grossSalary = Math.round(netTakeHome / 0.85);
  }

  // Earning Components
  const basic = Math.round(grossSalary * 0.5);
  const hra = Math.round(basic * 0.4);
  const specialAllowance = Math.max(0, grossSalary - (basic + hra)); // Balance
  
  // Deduction Components
  const employeePF = isPFExempt ? 0 : Math.round(basic * 0.12);
  const employeeESI = (!isESIExempt && grossSalary <= 21000) ? Math.round(grossSalary * 0.0075) : 0;
  const professionalTax = pt;

  let totalDeductionsBase = employeePF + employeeESI + professionalTax;
  
  // Base net pay verified
  const calculatedNetPayBase = grossSalary - totalDeductionsBase;

  // Absences penalty
  const absentDays = Math.max(0, workingDays - presentDays);
  const perDayRate = workingDays > 0 ? (basic / workingDays) : 0;
  const absencePenalty = Math.round(absentDays * perDayRate);

  const totalDeductions = totalDeductionsBase + absencePenalty;

  // Final Computations
  const totalEarnings = grossSalary + wfhAllowance + incentives;
  const finalNetPay = totalEarnings - totalDeductions;

  // Employer Contributions
  const employerPF = isPFExempt ? 0 : Math.round(basic * 0.12);
  const employerESI = (!isESIExempt && grossSalary <= 21000) ? Math.round(grossSalary * 0.0325) : 0;

  return {
    netTakeHome: calculatedNetPayBase,
    grossSalary,
    earnings: {
      basic,
      hra,
      specialAllowance,
      wfhAllowance,
      incentives,
      totalEarnings,
    },
    deductions: {
      employeePF,
      employeeESI,
      professionalTax,
      absencePenalty,
      totalDeductions,
    },
    employerContributions: {
      employerPF,
      employerESI
    },
    netPay: finalNetPay,
  };
}

/**
 * Format amount as Indian currency
 */
export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatCurrencyPrecise(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Convert login time (Date or string) to decimal hours
 */
export function getDecimalHours(timeString: string | Date): number {
  const date = typeof timeString === 'string' ? new Date(timeString) : timeString;
  return date.getHours() + date.getMinutes() / 60;
}

export function islateEntry(loginTime: Date | string): boolean {
  const decimalHours = getDecimalHours(loginTime);
  return decimalHours > OFFICE_START_TIME;
}
