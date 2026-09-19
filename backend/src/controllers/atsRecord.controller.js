const AtsRecord = require('../models/AtsRecord');
const XLSX = require('xlsx');

/* ─── Column definitions for Excel export (exact order) ─────── */
const EXCEL_COLUMNS = [
  { key: 'jobTitle',               header: 'Job Title' },
  { key: 'scanDate',               header: 'Date of Application' },
  { key: 'name',                   header: 'Name' },
  { key: 'email',                  header: 'Email ID' },
  { key: 'phone',                  header: 'Phone Number' },
  { key: 'currentLocation',        header: 'Current Location' },
  { key: 'preferredLocations',     header: 'Preferred Locations' },
  { key: 'totalExperience',        header: 'Total Experience' },
  { key: 'currentCompanyName',     header: 'Current Company Name' },
  { key: 'currentCompanyDesignation', header: 'Current Company Designation' },
  { key: 'department',             header: 'Department' },
  { key: 'role',                   header: 'Role' },
  { key: 'industry',               header: 'Industry' },
  { key: 'keySkills',              header: 'Key Skills' },
  { key: 'annualSalary',           header: 'Annual Salary' },
  { key: 'noticePeriod',           header: 'Notice Period / Availability to Join' },
  { key: 'resumeHeadline',         header: 'Resume Headline' },
  { key: 'summary',                header: 'Summary' },
  { key: 'ugDegree',               header: 'Under Graduation Degree' },
  { key: 'ugSpecialization',       header: 'UG Specialization' },
  { key: 'ugInstitute',            header: 'UG University/Institute Name' },
  { key: 'ugGraduationYear',       header: 'UG Graduation Year' },
  { key: 'pgDegree',               header: 'Post Graduation Degree' },
  { key: 'pgSpecialization',       header: 'PG Specialization' },
  { key: 'pgInstitute',            header: 'PG University/Institute Name' },
  { key: 'pgGraduationYear',       header: 'PG Graduation Year' },
  { key: 'doctorateDegree',        header: 'Doctorate Degree' },
  { key: 'doctorateSpecialization',header: 'Doctorate Specialization' },
  { key: 'doctorateInstitute',     header: 'Doctorate University/Institute Name' },
  { key: 'doctorateGraduationYear',header: 'Doctorate Graduation Year' },
  { key: 'gender',                 header: 'Gender' },
  { key: 'maritalStatus',          header: 'Marital Status' },
  { key: 'homeTownCity',           header: 'Home Town/City' },
  { key: 'pinCode',                header: 'Pin Code' },
  { key: 'workPermitUSA',          header: 'Work Permit for USA' },
  { key: 'dateOfBirth',            header: 'Date of Birth' },
  { key: 'permanentAddress',       header: 'Permanent Address' },
  // ATS-specific columns
  { key: 'atsScore',               header: 'ATS Score' },
  { key: 'atsStatus',              header: 'ATS Status' },
  { key: 'matchedSkills',          header: 'Matched Skills' },
  { key: 'missingSkills',          header: 'Missing Skills' },
  { key: 'keywordMatchPct',        header: 'Keyword Match %' },
  { key: 'experienceMatchScore',   header: 'Experience Match Score' },
  { key: 'educationMatchScore',    header: 'Education Match Score' },
  { key: 'resumeQualityScore',     header: 'Resume Quality Score' },
  { key: 'scanDate',               header: 'Scan Date' },
  { key: 'scannedBy',              header: 'Scanned By' },
  { key: 'source',                 header: 'Source' },
  { key: 'remarks',                header: 'Remarks / Feedback' },
];

function buildFilterQuery(query, user) {
  const {
    status, minScore, maxScore,
    startDate, endDate,
    search,
    company, excludeKeywords, skills,
    minExp, maxExp,
    location,
    minSalary, maxSalary,
    gender, qualification
  } = query;

  const andClauses = [];

  // 1. Status
  if (status && status.trim() && status !== 'all') {
    andClauses.push({ atsStatus: status.trim() });
  }

  // 2. Score range
  if (minScore || maxScore) {
    const scoreFilter = {};
    if (minScore) scoreFilter.$gte = parseInt(minScore, 10);
    if (maxScore) scoreFilter.$lte = parseInt(maxScore, 10);
    andClauses.push({ atsScore: scoreFilter });
  }

  // 3. Date range
  if (startDate || endDate) {
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate)   dateFilter.$lte = new Date(new Date(endDate).setHours(23, 59, 59));
    andClauses.push({ scanDate: dateFilter });
  }

  // 4. Company Hiring For (matching jobTitle, currentCompanyName, industry, department)
  if (company && company.trim()) {
    const cRe = { $regex: company.trim(), $options: 'i' };
    andClauses.push({
      $or: [
        { jobTitle: cRe },
        { currentCompanyName: cRe },
        { industry: cRe },
        { department: cRe }
      ]
    });
  }

  // 5. Positive Keywords / Search
  if (search && search.trim()) {
    const sTerm = search.trim();
    const sRe = { $regex: sTerm, $options: 'i' };
    andClauses.push({
      $or: [
        { name: sRe },
        { email: sRe },
        { phone: sRe },
        { keySkills: sRe },
        { jobTitle: sRe },
        { currentCompanyName: sRe },
        { summary: sRe },
        { resumeHeadline: sRe },
        { currentCompanyDesignation: sRe }
      ]
    });
  }

  // 6. Exclude Keywords
  if (excludeKeywords && excludeKeywords.trim()) {
    const exWords = excludeKeywords.trim().split(/[, ]+/).filter(Boolean);
    exWords.forEach(ex => {
      const exRe = { $regex: ex, $options: 'i' };
      andClauses.push({
        name: { $not: exRe },
        keySkills: { $not: exRe },
        jobTitle: { $not: exRe },
        currentCompanyName: { $not: exRe },
        summary: { $not: exRe },
        resumeHeadline: { $not: exRe }
      });
    });
  }

  // 7. Add Skills
  if (skills && skills.trim()) {
    const skillList = skills.trim().split(/[,;]+/).map(s => s.trim()).filter(Boolean);
    skillList.forEach(s => {
      const skRe = { $regex: s, $options: 'i' };
      andClauses.push({
        $or: [
          { keySkills: skRe },
          { matchedSkills: skRe },
          { summary: skRe }
        ]
      });
    });
  }

  // 8. Location
  if (location && location.trim() && location.toLowerCase() !== 'all') {
    const locRe = { $regex: location.trim(), $options: 'i' };
    andClauses.push({
      $or: [
        { currentLocation: locRe },
        { preferredLocations: locRe },
        { homeTownCity: locRe }
      ]
    });
  }

  // 9. Gender
  if (gender && gender.trim() && gender.toLowerCase() !== 'all') {
    andClauses.push({
      gender: { $regex: `^${gender.trim()}`, $options: 'i' }
    });
  }

  // 10. Qualification
  if (qualification && qualification.trim() && qualification.toLowerCase() !== 'all') {
    const qRe = { $regex: qualification.trim(), $options: 'i' };
    andClauses.push({
      $or: [
        { ugDegree: qRe },
        { ugSpecialization: qRe },
        { pgDegree: qRe },
        { pgSpecialization: qRe },
        { doctorateDegree: qRe },
        { resumeHeadline: qRe },
        { summary: qRe }
      ]
    });
  }

  // 11. Experience Filter
  if ((minExp !== undefined && minExp !== '' && minExp !== 'any') || 
      (maxExp !== undefined && maxExp !== '' && maxExp !== 'any')) {
    const minE = minExp && minExp !== 'any' ? parseFloat(minExp) : 0;
    const maxE = maxExp && maxExp !== 'any' ? parseFloat(maxExp) : 999;
    const expRegexes = [];
    for (let y = Math.floor(minE); y <= Math.min(Math.ceil(maxE), 40); y++) {
      expRegexes.push(`\\b${y}\\b|\\b${y}\\s*(?:yr|year|plus|\\+)`);
    }
    if (expRegexes.length > 0) {
      andClauses.push({
        $or: [
          { totalExperience: { $regex: expRegexes.join('|'), $options: 'i' } },
          { experienceMatchScore: { $gte: minE > 0 ? 30 : 0 } }
        ]
      });
    }
  }

  // 12. Salary Filter
  if ((minSalary !== undefined && minSalary !== '' && minSalary !== 'any') || 
      (maxSalary !== undefined && maxSalary !== '' && maxSalary !== 'any')) {
    const minS = minSalary && minSalary !== 'any' ? parseFloat(minSalary) : 0;
    const maxS = maxSalary && maxSalary !== 'any' ? parseFloat(maxSalary) : 999;
    const salRegexes = [];
    for (let s = Math.floor(minS); s <= Math.min(Math.ceil(maxS), 60); s++) {
      salRegexes.push(`\\b${s}\\b|\\b${s}\\s*(?:lpa|lac|lakh|l)`);
    }
    if (salRegexes.length > 0) {
      andClauses.push({
        annualSalary: { $regex: salRegexes.join('|'), $options: 'i' }
      });
    }
  }

  // 13. RBAC Scoping
  if (user && (user.role === 'recruiter' || user.role === 'spoc')) {
    const hasSearchQuery = !!(search && search.trim());
    if (hasSearchQuery) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      andClauses.push({
        $or: [
          { scannedBy: user._id },
          { scanDate: { $lt: thirtyDaysAgo } }
        ]
      });
    } else {
      andClauses.push({ scannedBy: user._id });
    }
  }

  return andClauses.length > 0 ? { $and: andClauses } : {};
}

/* ─── GET /api/ats-records ──────────────────────────────────── */
exports.list = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const filter = buildFilterQuery(req.query, req.user);

    const skip  = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await AtsRecord.countDocuments(filter);
    const records = await AtsRecord.find(filter)
      .sort({ scanDate: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    res.json({ total, page: parseInt(page, 10), limit: parseInt(limit, 10), records });
  } catch (err) {
    next(err);
  }
};

/* ─── GET /api/ats-records/export ───────────────────────────── */
exports.exportExcel = async (req, res, next) => {
  try {
    const filter = buildFilterQuery(req.query, req.user);
    const records = await AtsRecord.find(filter).sort({ scanDate: -1 }).lean();

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('ATS Records');

    // Define Columns (Matching the 37-column requirement where possible + ATS fields)
    const columns = [
      { header: 'Job Title', key: 'jobTitle', width: 25 },
      { header: 'Date of application', key: 'dateOfApplication', width: 20 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Email ID', key: 'email', width: 30 },
      { header: 'Phone Number', key: 'phone', width: 20 },
      { header: 'Current Location', key: 'currentLocation', width: 20 },
      { header: 'Preferred Locations', key: 'preferredLocations', width: 25 },
      { header: 'Total Experience', key: 'totalExperience', width: 15 },
      { header: 'Curr. Company name', key: 'currentCompanyName', width: 30 },
      { header: 'Curr. Company Designation', key: 'currentCompanyDesignation', width: 30 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Role', key: 'role', width: 20 },
      { header: 'Industry', key: 'industry', width: 20 },
      { header: 'Key Skills', key: 'keySkills', width: 40 },
      { header: 'Annual Salary', key: 'annualSalary', width: 15 },
      { header: 'Notice period/ Availability to join', key: 'noticePeriod', width: 25 },
      { header: 'Resume Headline', key: 'resumeHeadline', width: 40 },
      { header: 'Summary', key: 'summary', width: 50 },
      { header: 'Under Graduation degree', key: 'ugDegree', width: 25 },
      { header: 'UG Specialization', key: 'ugSpecialization', width: 25 },
      { header: 'UG University/institute Name', key: 'ugInstitute', width: 30 },
      { header: 'UG Graduation year', key: 'ugGraduationYear', width: 15 },
      { header: 'Post graduation degree', key: 'pgDegree', width: 25 },
      { header: 'PG specialization', key: 'pgSpecialization', width: 25 },
      { header: 'PG university/institute name', key: 'pgInstitute', width: 30 },
      { header: 'PG graduation year', key: 'pgGraduationYear', width: 15 },
      { header: 'Doctorate degree', key: 'doctorateDegree', width: 25 },
      { header: 'Doctorate specialization', key: 'doctorateSpecialization', width: 25 },
      { header: 'Doctorate university/institute name', key: 'doctorateInstitute', width: 30 },
      { header: 'Doctorate graduation year', key: 'doctorateGraduationYear', width: 15 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Marital Status', key: 'maritalStatus', width: 15 },
      { header: 'Home Town/City', key: 'homeTownCity', width: 20 },
      { header: 'Pin Code', key: 'pinCode', width: 10 },
      { header: 'Work Permit for USA', key: 'workPermitUSA', width: 15 },
      { header: 'Date of Birth', key: 'dateOfBirth', width: 15 },
      { header: 'Permanent Address', key: 'permanentAddress', width: 40 },
      // ATS Specific
      { header: 'ATS Score', key: 'atsScore', width: 12 },
      { header: 'ATS Status', key: 'atsStatus', width: 20 },
      { header: 'Matched Skills', key: 'matchedSkills', width: 30 },
      { header: 'Missing Skills', key: 'missingSkills', width: 30 },
      { header: 'Keyword Match %', key: 'keywordMatchPct', width: 15 },
      { header: 'Scan Date', key: 'scanDate', width: 20 },
      { header: 'Scanned By', key: 'scannedByName', width: 25 },
      { header: 'Remarks', key: 'remarks', width: 40 },
    ];

    worksheet.columns = columns;

    // Bold Headers with subtle background
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF166534' } // Green-800
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    const formatDate = (date) => {
      if (!date) return 'N/A';
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'N/A';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };

    records.forEach(rec => {
      const rowData = {};
      columns.forEach(col => {
        let val = rec[col.key];
        
        // Specialized formatting
        if (col.key === 'dateOfApplication' || col.key === 'scanDate') {
          val = formatDate(rec.scanDate);
        } else if (col.key === 'scannedByName') {
          val = rec.scannedByName ? `${rec.scannedByName} (${rec.scannedByRole || 'User'})` : 'N/A';
        } else if (col.key === 'atsScore') {
          val = rec.atsScore || 0;
        } else if (col.key === 'keywordMatchPct') {
          val = rec.keywordMatchPct ? `${rec.keywordMatchPct}%` : '0%';
        }
        
        rowData[col.key] = (val === null || val === undefined || val === '') ? 'N/A' : val;
      });
      worksheet.addRow(rowData);
    });

    // Auto-filter for better usability
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length }
    };

    const filename = `ATS_Records_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

/* ─── GET /api/ats-records/:id ──────────────────────────────── */
exports.getOne = async (req, res, next) => {
  try {
    const record = await AtsRecord.findById(req.params.id).lean();
    if (!record) return res.status(404).json({ message: 'ATS record not found' });
    res.json(record);
  } catch (err) {
    next(err);
  }
};

/* ─── PATCH /api/ats-records/:id ────────────────────── */
exports.updateRecord = async (req, res, next) => {
  try {
    // We allow updating any provided fields (e.g., name, email, phone, experience, etc.)
    const update = { ...req.body };

    // Prevent updating protected fields if any (like _id, scanDate, atsScore)
    delete update._id;
    delete update.scanDate;

    // Optional: Recalculate keywords/status if needed, but for now we trust manual edits.

    const record = await AtsRecord.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!record) return res.status(404).json({ message: 'ATS record not found' });
    res.json(record);
  } catch (err) {
    next(err);
  }
};
