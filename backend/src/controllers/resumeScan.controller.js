const { parseResume, matchWithJD } = require('../utils/resumeParser');
const { classifyUniversalRole } = require('../utils/universalRoleClassifier');
const AtsRecord = require('../models/AtsRecord');
const Job = require('../models/Job');
const path = require('path');

/* ─── Derive ATS status from score ─────────────────────────── */
function deriveAtsStatus(score) {
  if (score >= 78) return 'Selected';
  if (score >= 52) return 'Shortlisted';
  if (score >= 35) return 'Not Processed';
  return 'Rejected (ATS Low Score)';
}

/* ─── Categorise education entries into UG / PG / Doctorate ── */
function classifyEducation(education = []) {
  const ug  = { degree: '', spec: '', inst: '', year: '' };
  const pg  = { degree: '', spec: '', inst: '', year: '' };
  const doc = { degree: '', spec: '', inst: '', year: '' };

  for (const edu of education) {
    const lower = (edu.degree || '').toLowerCase();
    if (/phd|ph\.d|doctorate/i.test(lower) && !doc.degree) {
      doc.degree = edu.degree || '';
      doc.inst   = edu.institution || '';
      doc.year   = edu.year || '';
    } else if (/m\.tech|mtech|mba|m\.e|msc|mca|m\.com|pgd|post.grad/i.test(lower) && !pg.degree) {
      pg.degree = edu.degree || '';
      pg.inst   = edu.institution || '';
      pg.year   = edu.year || '';
    } else if (!ug.degree) {
      ug.degree = edu.degree || '';
      ug.inst   = edu.institution || '';
      ug.year   = edu.year || '';
    }
  }
  return { ug, pg, doc };
}

/* ─── Build an AtsRecord document from parsed resume + scan meta ── */
function buildAtsRecord(parsed, user, jobTitle) {
  const { ug, pg, doc } = classifyEducation(parsed.education);
  const score = parsed.atsScore || 0;
  const bd    = parsed.scoreBreakdown || {};

  const totalKw = (parsed.keywords?.found?.length || 0) + (parsed.keywords?.missing?.length || 0);
  const keywordMatchPct = totalKw > 0
    ? Math.round((parsed.keywords.found.length / totalKw) * 100)
    : 0;

  return {
    jobTitle:               jobTitle || '',
    name:                   parsed.name || 'Unknown',
    email:                  parsed.email || '',
    phone:                  parsed.phone || '',
    currentLocation:        parsed.location || '',
    preferredLocations:     '',
    totalExperience:        parsed.experience?.[0]?.duration || '',
    currentCompanyName:     parsed.experience?.[0]?.company  || '',
    currentCompanyDesignation: parsed.experience?.[0]?.title || '',
    department:             parsed.universalRoleProfile?.primaryDomain || '',
    role:                   parsed.universalRoleProfile?.bestFitRole || parsed.experience?.[0]?.title || '',
    industry:               parsed.universalRoleProfile?.primaryDomain || '',
    keySkills:              (parsed.skills || []).map(s => (typeof s === 'string' ? s : s.name)).filter(Boolean).join(', '),
    annualSalary:           '',
    noticePeriod:           '',
    resumeHeadline:         (parsed.summary || '').substring(0, 120),
    summary:                parsed.summary || '',

    // UG
    ugDegree:               ug.degree,
    ugSpecialization:       ug.spec,
    ugInstitute:            ug.inst,
    ugGraduationYear:       ug.year,

    // PG
    pgDegree:               pg.degree,
    pgSpecialization:       pg.spec,
    pgInstitute:            pg.inst,
    pgGraduationYear:       pg.year,

    // Doctorate
    doctorateDegree:        doc.degree,
    doctorateSpecialization:doc.spec,
    doctorateInstitute:     doc.inst,
    doctorateGraduationYear:doc.year,

    gender:                 '',
    maritalStatus:          '',
    homeTownCity:           parsed.location || '',
    pinCode:                '',
    workPermitUSA:          '',
    dateOfBirth:            '',
    permanentAddress:       '',

    // ATS fields
    atsScore:               score,
    atsStatus:              deriveAtsStatus(score),
    matchedSkills:          (parsed.keywords?.found  || []).join(', '),
    missingSkills:          (parsed.keywords?.missing || []).join(', '),
    keywordMatchPct,
    experienceMatchScore:   bd.experienceRelevance || 0,
    educationMatchScore:    bd.educationRelevance  || 0,
    resumeQualityScore:     bd.resumeQuality       || 0,

    scanDate:               new Date(),
    scannedBy:              user?._id,
    scannedByName:          user?.name  || user?.email || 'System',
    scannedByRole:          user?.role  || 'recruiter',
    source:                 'Upload',
    remarks:                '',

    reusable: true,
  };
}

/** 
 * Save scan result as a record, preventing duplicates by email/phone.
 */
async function saveAtsRecord(parsed, user, jobTitle) {
  try {
    const record = buildAtsRecord(parsed, user, jobTitle || '');
    
    // Duplicate detection criteria
    const criteria = [];
    if (record.email) criteria.push({ email: record.email });
    if (record.phone) criteria.push({ phone: record.phone });

    if (criteria.length > 0) {
      // Upsert: update existing if found, else create new
      await AtsRecord.findOneAndUpdate(
        { $or: criteria },
        { $set: record },
        { upsert: true, new: true, runValidators: true }
      );
    } else {
      // Fallback to create if no email/phone
      await AtsRecord.create(record);
    }
  } catch (err) {
    console.error('[ATS Record] Save failed:', err.message);
  }
}

// POST /api/resumes/scan
exports.scan = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Resume file is required' });
    }

    const filePath = req.file.path;
    let parsed = await parseResume(filePath);
    parsed.format = path.extname(req.file.originalname).replace('.', '').toUpperCase();

    // If JD text provided, match against it
    const { jobDescription, jobTitle } = req.body;
    if (jobDescription) {
      parsed = matchWithJD(parsed, jobDescription);
    }

    // ─── Universal Role Classification & Open JRs Matching ───
    let openJobs = [];
    try {
      openJobs = await Job.find({})
        .select('jrNumber jobTitle companyName client skills division portfolioDepartment location experience positions description requirements status')
        .lean();
    } catch (jobErr) {
      console.warn('[ResumeScan] Failed to load open jobs for matching:', jobErr.message);
    }

    const universalProfile = classifyUniversalRole(parsed, openJobs);
    parsed.universalRoleProfile = universalProfile;

    const effectiveJobTitle = jobTitle || universalProfile?.bestFitRole || parsed.experience?.[0]?.title || '';
    if (!parsed.jobTitle) {
      parsed.jobTitle = effectiveJobTitle;
    }

    // ─── Auto-save to AtsRecord (append-only, never skip) ───
    await saveAtsRecord(parsed, req.user, effectiveJobTitle);

    res.json(parsed);
  } catch (err) {
    next(err);
  }
};

// POST /api/resumes/scan-with-jd
exports.scanWithJD = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Resume file is required' });
    }

    const filePath = req.file.path;
    let parsed = await parseResume(filePath);
    parsed.format = path.extname(req.file.originalname).replace('.', '').toUpperCase();

    const { jobDescription, jobTitle } = req.body;
    if (jobDescription) {
      parsed = matchWithJD(parsed, jobDescription);
    }

    // ─── Universal Role Classification & Open JRs Matching ───
    let openJobs = [];
    try {
      openJobs = await Job.find({})
        .select('jrNumber jobTitle companyName client skills division portfolioDepartment location experience positions description requirements status')
        .lean();
    } catch (jobErr) {
      console.warn('[ResumeScan] Failed to load open jobs for matching:', jobErr.message);
    }

    const universalProfile = classifyUniversalRole(parsed, openJobs);
    parsed.universalRoleProfile = universalProfile;

    const effectiveJobTitle = jobTitle || universalProfile?.bestFitRole || parsed.experience?.[0]?.title || '';
    if (!parsed.jobTitle) {
      parsed.jobTitle = effectiveJobTitle;
    }

    // ─── Auto-save to AtsRecord ───────────────────────────
    await saveAtsRecord(parsed, req.user, effectiveJobTitle);

    res.json(parsed);
  } catch (err) {
    next(err);
  }
};
