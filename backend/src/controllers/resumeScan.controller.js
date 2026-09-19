const { parseResume, matchWithJD } = require('../utils/resumeParser');
const { classifyUniversalRole } = require('../utils/universalRoleClassifier');
const AtsRecord = require('../models/AtsRecord');
const Job = require('../models/Job');
const CustomJd = require('../models/CustomJd');
const Candidate = require('../models/Candidate');
const JSZip = require('jszip');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Helper to get all active Jobs and user-defined Custom JDs for dynamic parsing and matching
async function getAllActiveJobsAndCustomJds() {
  let openJobs = [];
  try {
    openJobs = await Job.find({})
      .select('jrNumber jobTitle companyName client skills division portfolioDepartment location experience positions description requirements status')
      .lean();
  } catch (jobErr) {
    console.warn('[ResumeScan] Failed to load open jobs for matching:', jobErr.message);
  }

  try {
    const customJds = await CustomJd.find({ isActive: true }).lean();
    if (Array.isArray(customJds)) {
      customJds.forEach(c => {
        openJobs.push({
          _id: c._id,
          jrNumber: 'JD-' + (c.title || 'CUSTOM').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase(),
          jobTitle: c.title,
          companyName: c.category || 'Client Requirement',
          skills: c.skills || [],
          description: c.text,
          requirements: c.text,
          experience: c.experience || '',
          location: c.location || '',
          positions: 1,
          status: 'Open',
          isCustomJd: true
        });
      });
    }
  } catch (jdErr) {
    console.warn('[ResumeScan] Failed to load custom JDs:', jdErr.message);
  }

  return openJobs;
}

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
    keySkills:              (parsed.skills || []).map(s => (typeof s === 'string' ? s : s?.name || '')).filter(Boolean).join(', '),
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
      await AtsRecord.findOneAndUpdate(
        { $or: criteria },
        { $set: record },
        { upsert: true, new: true, runValidators: true }
      );
    } else {
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

    // Universal Role Classification & Open JRs Matching (active jobs + custom JDs)
    const openJobs = await getAllActiveJobsAndCustomJds();
    const universalProfile = classifyUniversalRole(parsed, openJobs);
    parsed.universalRoleProfile = universalProfile;

    const effectiveJobTitle = jobTitle || universalProfile?.bestFitRole || parsed.experience?.[0]?.title || '';
    if (!parsed.jobTitle) {
      parsed.jobTitle = effectiveJobTitle;
    }

    // Auto-save to AtsRecord
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

    // Universal Role Classification & Open JRs Matching
    const openJobs = await getAllActiveJobsAndCustomJds();
    const universalProfile = classifyUniversalRole(parsed, openJobs);
    parsed.universalRoleProfile = universalProfile;

    const effectiveJobTitle = jobTitle || universalProfile?.bestFitRole || parsed.experience?.[0]?.title || '';
    if (!parsed.jobTitle) {
      parsed.jobTitle = effectiveJobTitle;
    }

    // Auto-save to AtsRecord
    await saveAtsRecord(parsed, req.user, effectiveJobTitle);

    res.json(parsed);
  } catch (err) {
    next(err);
  }
};

// POST /api/resumes/save-candidate
exports.saveCandidate = async (req, res, next) => {
  try {
    const data = req.body;
    const recruiterId = req.user?._id;
    const recruiterName = req.user?.name || req.user?.email || 'Recruiter';
    const recruiterRole = req.user?.role || 'recruiter';

    const cleanEmail = (data.email || '').trim().toLowerCase();
    const cleanPhone = (data.phone || '').replace(/\D/g, '').slice(-10);
    const finalPhone = cleanPhone || (data.phone || '').trim() || 'Not Provided';

    let existing = null;
    if (cleanPhone || cleanEmail) {
      const orClauses = [];
      if (cleanPhone) orClauses.push({ phone: { $regex: cleanPhone + '$' } });
      if (cleanEmail) orClauses.push({ email: cleanEmail });
      existing = await Candidate.findOne({ $or: orClauses });
    }

    if (existing) {
      if (data.name) existing.name = data.name.trim();
      if (data.location) existing.location = data.location;
      if (data.experience) existing.experience = data.experience;
      if (data.skills && Array.isArray(data.skills)) {
        existing.skills = Array.from(new Set([...(existing.skills || []), ...data.skills]));
      }
      if (data.jrNumber && !existing.jrNumber) {
        existing.jrNumber = data.jrNumber;
      }
      existing.scannedBy = recruiterId;
      existing.scannedByName = recruiterName;
      existing.scannedByRole = recruiterRole;
      existing.scannedDate = new Date();
      await existing.save();
      return res.json({ success: true, message: 'Candidate record updated successfully', candidate: existing });
    }

    const newCand = await Candidate.create({
      name: (data.name || '').trim() || 'Candidate',
      email: cleanEmail || undefined,
      phone: finalPhone,
      location: data.location || '',
      currentLocation: data.currentLocation || data.location || '',
      experience: data.experience || data.totalExperience || '',
      totalExperience: data.totalExperience || data.experience || '',
      currentCompany: data.currentCompany || data.currentCompanyName || '',
      positionApplied: data.positionApplied || data.role || data.jobTitle || '',
      skills: data.skills || [],
      summary: data.summary || '',
      source: data.source || 'ATS Scanner',
      status: data.status || 'Screening',
      jrNumber: data.jrNumber || '',
      clientName: data.clientName || data.company || '',
      company: data.company || data.clientName || '',
      totalScore: data.atsScore || data.totalScore || 65,
      assignedRecruiter: recruiterId,
      assignedRecruiterName: recruiterName,
      assignedAt: new Date(),
      ownershipStatus: 'Assigned',
      sourcedBy: recruiterName,
      scannedBy: recruiterId,
      scannedByName: recruiterName,
      scannedByRole: recruiterRole,
      scannedDate: new Date(),
    });

    res.status(201).json({ success: true, message: 'Candidate saved successfully', candidate: newCand });
  } catch (err) {
    next(err);
  }
};

// POST /api/resumes/bulk-scan
// Extracts and parses up to 120 resumes from a ZIP archive or file in batch
exports.bulkScan = async (req, res, next) => {
  let tempExtractDir = null;
  try {
    if (!req.file && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ success: false, message: 'ZIP archive or resume file is required.' });
    }

    const primaryFile = req.file || (req.files && req.files[0]);
    const uploadedPath = primaryFile.path;
    const ext = path.extname(primaryFile.originalname).toLowerCase();
    const isZip = ext === '.zip' || primaryFile.mimetype === 'application/zip' || primaryFile.mimetype === 'application/x-zip-compressed';

    // Load active jobs and custom JDs for matching
    const openJobs = await getAllActiveJobsAndCustomJds();
    const { jobDescription, targetJrNumber } = req.body;
    const filesToProcess = [];

    if (isZip) {
      const zipData = fs.readFileSync(uploadedPath);
      const zip = await JSZip.loadAsync(zipData);

      const batchId = `bulk_${Date.now()}_${uuidv4().slice(0, 6)}`;
      tempExtractDir = path.join(__dirname, '../../uploads/temp_extract', batchId);
      if (!fs.existsSync(tempExtractDir)) {
        fs.mkdirSync(tempExtractDir, { recursive: true });
      }

      const zipKeys = Object.keys(zip.files);

      for (const relativePath of zipKeys) {
        const fileObj = zip.files[relativePath];
        if (fileObj.dir) continue;

        if (relativePath.includes('__MACOSX') || relativePath.startsWith('.') || relativePath.includes('/.')) {
          continue;
        }

        const fileExt = path.extname(relativePath).toLowerCase();
        if (!['.pdf', '.docx', '.doc', '.txt'].includes(fileExt)) {
          continue;
        }

        const baseName = path.basename(relativePath);
        const targetDiskPath = path.join(tempExtractDir, `${uuidv4().slice(0, 8)}_${baseName}`);
        const buffer = await fileObj.async('nodebuffer');
        fs.writeFileSync(targetDiskPath, buffer);

        filesToProcess.push({
          originalName: baseName,
          diskPath: targetDiskPath,
          format: fileExt.replace('.', '').toUpperCase(),
          size: buffer.length
        });

        if (filesToProcess.length >= 120) break;
      }
    } else {
      // Single file or multi files
      const allFiles = req.files || [primaryFile];
      for (const f of allFiles) {
        filesToProcess.push({
          originalName: f.originalname,
          diskPath: f.path,
          format: path.extname(f.originalname).replace('.', '').toUpperCase(),
          size: f.size
        });
      }
    }

    if (filesToProcess.length === 0) {
      try { fs.unlinkSync(uploadedPath); } catch (_) {}
      return res.status(400).json({
        success: false,
        message: 'No supported resume files (.pdf, .docx, .doc, .txt) were found inside the uploaded archive.'
      });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < filesToProcess.length; i++) {
      const item = filesToProcess[i];
      try {
        let parsed = await parseResume(item.diskPath);
        parsed.format = item.format;
        parsed.fileName = item.originalName;

        if (jobDescription) {
          parsed = matchWithJD(parsed, jobDescription);
        }

        const universalProfile = classifyUniversalRole(parsed, openJobs);
        parsed.universalRoleProfile = universalProfile;

        const bestFitJob = universalProfile?.matchedActiveJobs?.[0];
        const matchScore = bestFitJob ? bestFitJob.matchScore : (parsed.atsScore || 65);

        let isExistingInDb = false;
        let existingRecruiter = null;
        let existingStatus = null;
        const cleanEmail = (parsed.email || '').trim().toLowerCase();
        const cleanPhone = (parsed.phone || '').replace(/\D/g, '').slice(-10);

        if (cleanEmail || cleanPhone) {
          const orClauses = [];
          if (cleanPhone) orClauses.push({ phone: { $regex: cleanPhone + '$' } });
          if (cleanEmail) orClauses.push({ email: cleanEmail });
          const found = await Candidate.findOne({ $or: orClauses }).select('name candidateId status assignedRecruiterName ownershipStatus').lean();
          if (found) {
            isExistingInDb = true;
            existingRecruiter = found.assignedRecruiterName;
            existingStatus = found.status;
          }
        }

        results.push({
          id: `batch_cand_${i + 1}`,
          fileName: item.originalName,
          name: parsed.name || 'Candidate',
          email: parsed.email || '',
          phone: parsed.phone || '',
          location: parsed.location || 'India',
          experience: parsed.experience?.[0]?.duration || (parsed.experience?.length ? `${parsed.experience.length * 2} Yrs` : 'Fresher / Exp N/A'),
          currentCompany: parsed.experience?.[0]?.company || '',
          currentRole: parsed.experience?.[0]?.title || parsed.universalRoleProfile?.bestFitRole || '',
          skills: (parsed.skills || []).slice(0, 8).map(s => (typeof s === 'string' ? s : s?.name || '')).filter(Boolean),
          summary: parsed.summary || '',
          atsScore: parsed.atsScore || 65,
          fitTier: parsed.fitTier || (matchScore >= 75 ? 'Top Match' : (matchScore >= 55 ? 'Good Fit' : 'Potential Fit')),
          bestFitJr: bestFitJob ? {
            jrNumber: bestFitJob.jrNumber,
            jobTitle: bestFitJob.jobTitle,
            companyName: bestFitJob.companyName,
            matchScore: bestFitJob.matchScore,
            tier: bestFitJob.tier
          } : null,
          allMatchedJobsCount: universalProfile?.matchedActiveJobs?.length || 0,
          isExistingInDb,
          existingRecruiter,
          existingStatus,
          fullParsed: parsed
        });
      } catch (parseErr) {
        console.warn(`[BulkScan] Failed to parse ${item.originalName}:`, parseErr.message);
        errors.push({ fileName: item.originalName, error: parseErr.message });
      }
    }

    if (tempExtractDir && fs.existsSync(tempExtractDir)) {
      try {
        fs.rmSync(tempExtractDir, { recursive: true, force: true });
      } catch (_) {}
    }
    try { fs.unlinkSync(uploadedPath); } catch (_) {}

    res.json({
      success: true,
      totalFound: filesToProcess.length,
      parsedCount: results.length,
      failedCount: errors.length,
      candidates: results,
      errors
    });
  } catch (err) {
    if (tempExtractDir && fs.existsSync(tempExtractDir)) {
      try { fs.rmSync(tempExtractDir, { recursive: true, force: true }); } catch (_) {}
    }
    next(err);
  }
};

// POST /api/resumes/bulk-save
exports.bulkSaveCandidates = async (req, res, next) => {
  try {
    const { candidates = [], defaultJrNumber = '' } = req.body;
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ success: false, message: 'No candidates provided to save.' });
    }

    const recruiterId = req.user?._id;
    const recruiterName = req.user?.name || req.user?.email || 'Recruiter';
    const recruiterRole = req.user?.role || 'recruiter';

    let savedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const cand of candidates) {
      try {
        const cleanName = (cand.name || '').trim() || 'Candidate';
        const cleanEmail = (cand.email || '').trim().toLowerCase();
        const cleanPhone = (cand.phone || '').replace(/\D/g, '').slice(-10);
        const finalPhone = cleanPhone || (cand.phone || '').trim() || 'Not Provided';

        let existing = null;
        if (cleanPhone || cleanEmail) {
          const orClauses = [];
          if (cleanPhone) orClauses.push({ phone: { $regex: cleanPhone + '$' } });
          if (cleanEmail) orClauses.push({ email: cleanEmail });
          existing = await Candidate.findOne({ $or: orClauses });
        }

        const jrToAssign = defaultJrNumber || cand.bestFitJr?.jrNumber || '';
        const clientToAssign = cand.bestFitJr?.companyName || '';

        if (existing) {
          const isSameRecruiter = existing.assignedRecruiter && String(existing.assignedRecruiter) === String(recruiterId);
          const isExpired = existing.ownershipStatus === 'Expired' ||
                            (existing.assignedAt && (Date.now() - new Date(existing.assignedAt).getTime() > 30 * 24 * 60 * 60 * 1000));
          const isUnassigned = !existing.assignedRecruiter || existing.ownershipStatus === 'Unassigned' || existing.ownershipStatus === 'General Data';

          if (isSameRecruiter || isExpired || isUnassigned) {
            existing.assignedRecruiter = recruiterId;
            existing.assignedRecruiterName = recruiterName;
            existing.assignedAt = new Date();
            existing.ownershipStatus = 'Assigned';
            if (jrToAssign && !existing.jrNumber) {
              existing.jrNumber = jrToAssign;
              existing.clientName = clientToAssign;
            }
            if (cand.skills?.length) {
              existing.skills = Array.from(new Set([...(existing.skills || []), ...cand.skills]));
            }
            existing.scannedBy = recruiterId;
            existing.scannedByName = recruiterName;
            existing.scannedByRole = recruiterRole;
            existing.scannedDate = new Date();
            await existing.save();
            updatedCount++;
          } else {
            skippedCount++;
          }
        } else {
          await Candidate.create({
            name: cleanName,
            email: cleanEmail || undefined,
            phone: finalPhone,
            location: cand.location || '',
            currentLocation: cand.location || '',
            experience: cand.experience || '',
            totalExperience: cand.experience || '',
            currentCompany: cand.currentCompany || '',
            positionApplied: cand.currentRole || cand.bestFitJr?.jobTitle || '',
            skills: cand.skills || [],
            summary: cand.summary || '',
            source: 'Bulk ZIP Scanner',
            status: 'Screening',
            jrNumber: jrToAssign,
            clientName: clientToAssign,
            company: clientToAssign,
            totalScore: cand.atsScore || 65,
            assignedRecruiter: recruiterId,
            assignedRecruiterName: recruiterName,
            assignedAt: new Date(),
            ownershipStatus: 'Assigned',
            sourcedBy: recruiterName,
            scannedBy: recruiterId,
            scannedByName: recruiterName,
            scannedByRole: recruiterRole,
            scannedDate: new Date(),
          });
          savedCount++;
        }
      } catch (err) {
        console.warn(`[BulkSave] Failed for ${cand.name}:`, err.message);
      }
    }

    res.json({
      success: true,
      message: `🎉 Batch Complete: ${savedCount} new candidates created, ${updatedCount} updated, ${skippedCount} protected.`,
      savedCount,
      updatedCount,
      skippedCount
    });
  } catch (err) {
    next(err);
  }
};
