/**
 * Generate OTP - 6 digit numeric
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Simulate sending OTP (in production, integrate SMS/email service)
 */
const sendOTP = async (user, otp) => {
  // In production: use Twilio, SendGrid, etc.
  console.log(`[OTP] Sending OTP ${otp} to user ${user.name} (${user.email})`);
  return true;
};

/**
 * Generate walk-in token: WI-XXXX format
 */
const generateWalkInToken = () => {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `WI-${num}`;
};

/**
 * Generate employee ID: WHMC-126-XXX format, starting from 108
 * Checks both Employee and User models to find the highest existing number.
 * @param {Model} Employee - Mongoose Employee model
 * @param {Model} User     - Mongoose User model
 */
let employeeIdPromise = null;
let candidateIdPromise = null;
let lastUsedEmployeeIdNum = null;
let lastUsedCandidateIdNum = null;

const generateEmployeeId = async (Employee, User) => {
  const START = 1;
  const PREFIX = 'WH';
  const regex = { $regex: /^(WH|wh)\d+$/i };

  if (lastUsedEmployeeIdNum === null) {
    if (!employeeIdPromise) {
      employeeIdPromise = (async () => {
        const [employees, users] = await Promise.all([
          Employee.find({ employeeId: regex }, { employeeId: 1 }).lean(),
          User ? User.find({ employeeId: regex }, { employeeId: 1 }).lean() : Promise.resolve([])
        ]);

        const extractNum = (id) => {
          if (!id) return 0;
          const match = id.match(/^(?:WH|wh)(\d+)$/i);
          return match ? parseInt(match[1], 10) : 0;
        };

        let max = START - 1;
        employees.forEach(doc => {
          const n = extractNum(doc.employeeId);
          if (n > max) max = n;
        });
        if (users) {
          users.forEach(doc => {
            const n = extractNum(doc.employeeId);
            if (n > max) max = n;
          });
        }
        lastUsedEmployeeIdNum = max;
      })();
    }
    await employeeIdPromise;
  }

  lastUsedEmployeeIdNum++;
  return `${PREFIX}${String(lastUsedEmployeeIdNum).padStart(6, '0')}`;
};

const generateCandidateId = async (Candidate) => {
  const START = 1;
  const PREFIX = 'CAN';
  const regex = { $regex: /^(CAN|can)\d+$/i };

  if (lastUsedCandidateIdNum === null) {
    if (!candidateIdPromise) {
      candidateIdPromise = (async () => {
        const candidates = await Candidate.find({ candidateId: regex }, { candidateId: 1 }).lean();

        const extractNum = (id) => {
          if (!id) return 0;
          const match = id.match(/^(?:CAN|can)(\d+)$/i);
          return match ? parseInt(match[1], 10) : 0;
        };

        let max = START - 1;
        candidates.forEach(doc => {
          const n = extractNum(doc.candidateId);
          if (n > max) max = n;
        });
        lastUsedCandidateIdNum = max;
      })();
    }
    await candidateIdPromise;
  }

  lastUsedCandidateIdNum++;
  return `${PREFIX}${String(lastUsedCandidateIdNum).padStart(7, '0')}`;
};

/**
 * Get date range helpers
 */
const getDateRange = (range, customStart, customEnd) => {
  const now = new Date();
  let start, end;

  switch (range) {
    case 'day':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(start);
      end.setDate(end.getDate() + 1);
      break;
    case 'week':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
    case 'quarter':
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), qMonth, 1);
      end = new Date(now.getFullYear(), qMonth + 3, 1);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear() + 1, 0, 1);
      break;
    case 'custom':
      start = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1);
      end = customEnd ? new Date(customEnd) : new Date();
      if (isNaN(start.getTime())) start = new Date(now.getFullYear(), 0, 1);
      if (isNaN(end.getTime())) end = new Date();
      if (start > end) {
        const temp = start;
        start = end;
        end = temp;
      }
      end.setDate(end.getDate() + 1);
      break;
    default: // 'all'
      start = new Date(2020, 0, 1);
      end = new Date(2030, 0, 1);
  }

  if (start > end) {
    const temp = start;
    start = end;
    end = temp;
  }

  return { start, end };
};

/**
 * Get date parts in Asia/Kolkata timezone (IST)
 */
const getKolkataDate = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const findPart = (type) => parseInt(parts.find(p => p.type === type).value, 10);
  
  const year = findPart('year');
  const month = findPart('month') - 1; // 0-indexed in JS Dates
  const day = findPart('day');
  const hour = findPart('hour');
  const minute = findPart('minute');
  const second = findPart('second');
  
  return new Date(year, month, day, hour, minute, second);
};

/**
 * Check if a time HH:MM falls within a start/end HH:MM window
 */
const isTimeInWindow = (current, start, end) => {
  const toMins = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };
  
  const currentMins = toMins(current);
  const startMins = toMins(start);
  let endMins = toMins(end);
  
  if (endMins === 0) {
    endMins = 24 * 60; // 00:00 is midnight
  }
  
  if (endMins < startMins) {
    // Overnight overlap (e.g. 09:00 to 02:00)
    return currentMins >= startMins || currentMins <= endMins;
  }
  
  return currentMins >= startMins && currentMins <= endMins;
};

module.exports = { generateOTP, sendOTP, generateWalkInToken, generateEmployeeId, generateCandidateId, getDateRange, getKolkataDate, isTimeInWindow };
