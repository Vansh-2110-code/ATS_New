const Job = require('../models/Job');
const { createLog } = require('../utils/auditLogger');

// GET /api/jobs
exports.list = async (req, res, next) => {
  try {
    const { search, status, company, division, page = 1, limit = 20 } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { jobTitle: { $regex: search, $options: 'i' } },
        { jrNumber: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) query.status = { $regex: new RegExp(`^${status.trim()}$`, 'i') };
    if (company) query.companyName = { $regex: company.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), $options: 'i' };
    if (division && division !== 'All') query.division = { $regex: new RegExp(`^${division.trim()}$`, 'i') };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [jobs, total, totalPositionsResult] = await Promise.all([
      Job.find(query).populate('createdBy', 'name email employeeId role').sort('-createdAt').skip(skip).limit(parseInt(limit)),
      Job.countDocuments(query),
      Job.aggregate([
        { $match: query },
        { $group: { _id: null, sum: { $sum: { $toInt: { $ifNull: ['$positions', 1] } } } } }
      ])
    ]);
    const totalPositions = totalPositionsResult[0]?.sum || total;

    // Attach candidate counts per job title & jrNumber (batch lookup)
    const Candidate = require('../models/Candidate');
    const jobTitles = jobs.map(j => j.jobTitle).filter(Boolean);
    const jrNumbers = jobs.map(j => j.jrNumber).filter(Boolean);

    const [byJr, byTitle] = await Promise.all([
      Candidate.aggregate([
        { $match: { jrNumber: { $in: jrNumbers } } },
        { $group: { _id: '$jrNumber', count: { $sum: 1 } } }
      ]),
      Candidate.aggregate([
        { $match: { positionApplied: { $in: jobTitles } } },
        { $group: { _id: { $toLower: '$positionApplied' }, count: { $sum: 1 } } }
      ])
    ]);

    const jrCountMap = Object.fromEntries(byJr.map(c => [c._id, c.count]));
    const titleCountMap = Object.fromEntries(byTitle.map(c => [c._id, c.count]));

    const jobsWithCounts = jobs.map(j => {
      const jrCount = jrCountMap[j.jrNumber] || 0;
      const titleCount = titleCountMap[(j.jobTitle || '').toLowerCase()] || 0;
      return {
        ...j.toObject(),
        candidateCount: Math.max(jrCount, titleCount),
      };
    });

    res.json({
      jobs: jobsWithCounts,
      pagination: {
        total,
        totalPositions,
        pages: Math.ceil(total / parseInt(limit)),
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/jobs/:id/candidates — admin/manager: candidates linked to a JR by positionApplied
exports.candidatesForJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).populate('createdBy', 'name email employeeId role');
    if (!job) return res.status(404).json({ message: 'Job not found' });
    const Candidate = require('../models/Candidate');
    // Escape regex special chars
    const escaped = job.jobTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const candidates = await Candidate.find({
      $or: [
        { jrNumber: job.jrNumber },
        { positionApplied: { $regex: `^${escaped}$`, $options: 'i' } }
      ]
    })
      .sort('-createdAt')
      .limit(200)
      .select('name phone email status source positionApplied assignedRecruiterName location city createdAt jrNumber');
    res.json({ candidates, total: candidates.length, job: { jobTitle: job.jobTitle, jrNumber: job.jrNumber, companyName: job.companyName, status: job.status, createdBy: job.createdBy } });
  } catch (err) {
    next(err);
  }
};

// GET /api/jobs/:id
exports.getById = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).populate('createdBy', 'name email employeeId role');
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (err) {
    next(err);
  }
};

// POST /api/jobs
exports.create = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (typeof data.skills === 'string') {
      data.skills = data.skills.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (typeof data.assignedRecruiters === 'string') {
      try { data.assignedRecruiters = JSON.parse(data.assignedRecruiters); } catch { delete data.assignedRecruiters; }
    }
    if (req.file) {
      data.jdFilePath = `/uploads/jd/${req.file.filename}`;
      data.jdOriginalName = req.file.originalname;
    }
    data.createdBy = req.user._id;
    if (!data.recruiterName) data.recruiterName = req.user.name;
    if (!data.recruiterEmail) data.recruiterEmail = req.user.email;

    // Prevent duplicate JR creation for same company and job title
    const companyName = (data.companyName || data.client || '').trim();
    const jobTitle = (data.jobTitle || '').trim();

    if (companyName && jobTitle) {
      const escapeRegex = str => str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const existingJob = await Job.findOne({
        $or: [
          { companyName: { $regex: `^${escapeRegex(companyName)}$`, $options: 'i' } },
          { client: { $regex: `^${escapeRegex(companyName)}$`, $options: 'i' } }
        ],
        jobTitle: { $regex: `^${escapeRegex(jobTitle)}$`, $options: 'i' },
        status: { $ne: 'Closed' }
      });

      if (existingJob) {
        return res.status(400).json({
          message: `An active Job Requisition already exists for ${companyName} - ${jobTitle} (JR Number: ${existingJob.jrNumber}). Duplicate JR creation is not allowed.`
        });
      }
    }

    // Auto-generate JR Number if not provided: JRWH0001, JRWH0002, ... (max numeric suffix safe)
    if (!data.jrNumber) {
      const allJobs = await Job.find({ jrNumber: /^JRWH\d+$/i }).select('jrNumber').lean();
      let maxNum = 0;
      allJobs.forEach(j => {
        const num = parseInt(j.jrNumber.replace(/^JRWH/i, ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      });
      data.jrNumber = `JRWH${String(maxNum + 1).padStart(4, '0')}`;
    }

    const job = await Job.create(data);
    await job.populate('createdBy', 'name email employeeId role');

    await createLog({
      type: 'create', user: req.user._id, userName: req.user.name,
      role: req.user.role, action: `Created job: ${job.jobTitle} (${job.jrNumber})`,
      target: job._id.toString(), ip: req.ip,
    });

    res.status(201).json(job);
  } catch (err) {
    next(err);
  }
};

// POST /api/jobs/:id/extract-keywords
exports.extractKeywords = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Basic keyword extraction from description/requirements
    const text = `${job.description || ''} ${job.requirements || ''} ${job.skills.join(' ')}`.toLowerCase();
    const commonWords = new Set(['the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'can', 'could', 'with', 'this', 'that', 'these', 'those', 'it', 'its', 'not', 'no', 'but', 'if', 'so', 'as', 'by', 'from', 'up', 'out', 'about', 'into', 'over', 'after', 'we', 'our', 'you', 'your', 'they', 'their', 'he', 'she', 'him', 'her', 'who', 'what', 'which', 'when', 'where', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'than', 'too', 'very', 'just', 'also', 'etc']);
    
    const words = text.split(/[\s,.;:()[\]{}]+/).filter(w => w.length > 3 && !commonWords.has(w));
    const freq = {};
    words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    
    const keywords = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));

    job.suggestedKeywords = keywords;
    await job.save();

    res.json({ keywords });
  } catch (err) {
    next(err);
  }
};

// PUT /api/jobs/:id
exports.update = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (typeof data.skills === 'string') {
      data.skills = data.skills.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (typeof data.assignedRecruiters === 'string') {
      try { data.assignedRecruiters = JSON.parse(data.assignedRecruiters); } catch { delete data.assignedRecruiters; }
    }
    if (req.file) {
      data.jdFilePath = `/uploads/jd/${req.file.filename}`;
      data.jdOriginalName = req.file.originalname;
    }
    const job = await Job.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true }).populate('createdBy', 'name email employeeId role');
    if (!job) return res.status(404).json({ message: 'Job not found' });
    await createLog({
      type: 'edit', user: req.user._id, userName: req.user.name,
      role: req.user.role, action: `Updated job: ${job.jobTitle} (${job.jrNumber})`,
      target: job._id.toString(), ip: req.ip,
    });
    res.json(job);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/jobs/:id
exports.remove = async (req, res, next) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    await createLog({
      type: 'delete', user: req.user._id, userName: req.user.name,
      role: req.user.role, action: `Deleted job: ${job.jobTitle} (${job.jrNumber})`,
      target: job._id.toString(), ip: req.ip,
    });
    res.json({ message: 'Job deleted' });
  } catch (err) {
    next(err);
  }
};

// POST /api/jobs/bulk
exports.bulkCreate = async (req, res, next) => {
  try {
    let jobs = req.body.jobs;

    // If Excel/CSV file uploaded, parse it
    if (req.file) {
      const XLSX = require('xlsx');
      const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      const colVal = (row, keys) => {
        for (const k of keys) {
          const found = Object.keys(row).find(
            rk => rk.toLowerCase().replace(/[\s_-]/g, '') === k.toLowerCase().replace(/[\s_-]/g, '')
          );
          if (found && row[found] !== '') return String(row[found]).trim();
        }
        return '';
      };

      jobs = rows.map(row => {
        const divisionRaw = colVal(row, ['division', 'div', 'segment']).toUpperCase();
        let division = 'BPO';
        if (divisionRaw.includes('IT')) {
          division = 'IT';
        } else if (divisionRaw.includes('LATERAL')) {
          division = 'Lateral';
        }
        return {
          companyName: colVal(row, ['companyname', 'company', 'client']),
          jobTitle:    colVal(row, ['jobtitle', 'title', 'position', 'role', 'designation']),
          department:  colVal(row, ['department', 'dept']),
          division:    division,
          jobType:     colVal(row, ['jobtype', 'type', 'employmenttype']),
          experience:  colVal(row, ['experience', 'exp', 'experiencerequired']),
          location:    colVal(row, ['location', 'city', 'place']),
          positions:   parseInt(colVal(row, ['positions', 'openings', 'vacancies', 'count'])) || 1,
          priority:    colVal(row, ['priority']),
          status:      colVal(row, ['status']),
          hrName:      colVal(row, ['hrname', 'hr', 'contactname']),
          hrEmail:     colVal(row, ['hremail', 'hremailid', 'contactemail']),
          skills:      colVal(row, ['skills', 'keyskills']).split(',').map(s => s.trim()).filter(Boolean),
          description: colVal(row, ['description', 'desc', 'jobdescription', 'jd']),
        };
      });
    }

    if (!Array.isArray(jobs) || jobs.length === 0) {
      return res.status(400).json({ message: 'No jobs provided' });
    }
    if (jobs.length > 100) {
      return res.status(400).json({ message: 'Maximum 100 jobs per bulk post' });
    }

    const allJobs = await Job.find({ jrNumber: /^JRWH\d+$/i }).select('jrNumber').lean();
    let maxNum = 0;
    allJobs.forEach(j => {
      const num = parseInt(j.jrNumber.replace(/^JRWH/i, ''), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    });

    const created = [];
    const failed = [];

    const escapeRegex = str => str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

    for (let i = 0; i < jobs.length; i++) {
      const jobData = { ...jobs[i] };
      const companyName = (jobData.companyName || jobData.client || '').trim();
      const jobTitle = (jobData.jobTitle || '').trim();

      if (!companyName || !jobTitle) {
        failed.push({ row: i + 1, error: 'companyName and jobTitle are required', jobTitle: jobTitle || '(empty)' });
        continue;
      }

      // Check if duplicate open job exists
      const existingJob = await Job.findOne({
        $or: [
          { companyName: { $regex: `^${escapeRegex(companyName)}$`, $options: 'i' } },
          { client: { $regex: `^${escapeRegex(companyName)}$`, $options: 'i' } }
        ],
        jobTitle: { $regex: `^${escapeRegex(jobTitle)}$`, $options: 'i' },
        status: { $ne: 'Closed' }
      });

      if (existingJob) {
        failed.push({ row: i + 1, error: `Duplicate active JR already exists (${existingJob.jrNumber})`, jobTitle });
        continue;
      }

      try {
        maxNum++;
        jobData.jrNumber  = `JRWH${String(maxNum).padStart(4, '0')}`;
        jobData.createdBy = req.user._id;
        if (!jobData.recruiterName) jobData.recruiterName = req.user.name;
        if (!jobData.recruiterEmail) jobData.recruiterEmail = req.user.email;
        jobData.status    = jobData.status   || 'Open';
        jobData.priority  = jobData.priority || 'Medium';
        const doc = await Job.create(jobData);
        created.push({ _id: doc._id, jrNumber: doc.jrNumber, jobTitle: doc.jobTitle, companyName: doc.companyName });
      } catch (err) {
        failed.push({ row: i + 1, error: err.message, jobTitle: jobTitle });
      }
    }

    await createLog({
      type: 'create', user: req.user._id, userName: req.user.name, role: req.user.role,
      action: `Bulk created ${created.length} job(s) (${failed.length} failed)`,
      target: 'bulk', ip: req.ip,
    });

    res.status(201).json({ created: created.length, failed: failed.length, total: jobs.length, jobs: created, errors: failed.slice(0, 20) });
  } catch (err) {
    next(err);
  }
};

// GET /api/jobs/companies - Company list with stats
exports.companies = async (req, res, next) => {
  try {
    const Candidate = require('../models/Candidate');
    const companies = await Job.aggregate([
      {
        $group: {
          _id: '$companyName',
          totalJRs: { $sum: 1 },
          openJRs: { $sum: { $cond: [{ $eq: ['$status', 'Open'] }, 1, 0] } },
          closedJRs: { $sum: { $cond: [{ $eq: ['$status', 'Closed'] }, 1, 0] } },
          totalPositions: { $sum: '$positions' },
          departments: { $addToSet: '$department' },
          latestJR: { $max: '$createdAt' },
        },
      },
      { $sort: { totalJRs: -1 } },
    ]);

    const result = await Promise.all(companies.map(async (c) => {
      const jobDocs = await Job.find({ companyName: c._id }).select('_id jobTitle jrNumber');
      const jobTitles = jobDocs.map(j => j.jobTitle).filter(Boolean);
      const jrNumbers = jobDocs.map(j => j.jrNumber).filter(Boolean);
      // Count candidates by positionApplied or jrNumber matching
      const candidateCount = jobDocs.length
        ? await Candidate.countDocuments({
            $or: [
              { jrNumber: { $in: jrNumbers } },
              { positionApplied: { $in: jobTitles } }
            ]
          })
        : 0;
      return {
        companyName: c._id,
        totalJRs: c.totalJRs,
        openJRs: c.openJRs,
        closedJRs: c.closedJRs,
        totalPositions: c.totalPositions,
        departments: (c.departments || []).filter(Boolean),
        lastActivity: c.latestJR,
        candidateCount,
      };
    }));

    res.json({ companies: result, total: result.length });
  } catch (err) {
    next(err);
  }
};

// ─── Get HR Contacts for dropdown ──────────────────────────────────
exports.getHRContacts = async (req, res, next) => {
  try {
    const Job = require('../models/Job');

    // Fetch all unique HR contacts from jobs
    const jobs = await Job.find({ hrName: { $exists: true, $ne: '' } })
      .select('hrName hrEmail')
      .lean()
      .exec();

    // Create set of unique HR contacts (avoid duplicates)
    const hrSet = new Map();

    jobs.forEach(job => {
      if (job.hrName && job.hrName.trim()) {
        const key = job.hrName.toLowerCase().trim();
        if (!hrSet.has(key)) {
          hrSet.set(key, {
            name: job.hrName.trim(),
            email: job.hrEmail?.trim() || '',
          });
        }
      }
    });

    // Convert to array with consistent format
    const hrContacts = Array.from(hrSet.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((hr, idx) => ({
        _id: `hr_${idx}`,
        name: hr.name,
        email: hr.email,
      }));

    res.json({ success: true, hrContacts });
  } catch (err) {
    console.error('Error fetching HR contacts:', err);
    res.status(500).json({ message: err.message });
  }
};

// ─── Bulk Import JDs from Files (ZIP, PDF, DOCX, TXT, Excel) to Active JRs ───
exports.bulkImportJds = async (req, res, next) => {
  let tempExtractDir = null;
  try {
    const files = req.files || (req.file ? [req.file] : []);
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'No JD files, ZIP archive, or Excel sheet provided.' });
    }

    const defaultClient = (req.body.defaultClientName || '').trim() || 'Client Requirement';
    const defaultLocation = (req.body.defaultLocation || '').trim() || 'Bangalore, India';
    const fs = require('fs');
    const path = require('path');
    const JSZip = require('jszip');
    const { v4: uuidv4 } = require('uuid');
    const { extractJdInfo } = require('./customJd.controller');
    const { parseDocx } = require('../utils/docxParser');
    const pdfParse = require('pdf-parse');
    const XLSX = require('xlsx');

    const jdItemsToProcess = [];

    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();

      // Case 1: Excel or CSV spreadsheet
      if (['.xlsx', '.xls', '.csv'].includes(ext)) {
        try {
          const workbook = XLSX.readFile(file.path);
          const sheetName = workbook.SheetNames[0];
          const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

          for (const row of rows) {
            const getVal = (keys) => {
              for (const k of keys) {
                const foundKey = Object.keys(row).find(rk => rk.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, ''));
                if (foundKey && String(row[foundKey]).trim()) return String(row[foundKey]).trim();
              }
              return '';
            };

            const title = getVal(['jobTitle', 'title', 'role', 'position', 'designation']);
            const client = getVal(['client', 'company', 'companyName']) || defaultClient;
            const exp = getVal(['experience', 'exp', 'years']) || '1-5 Years';
            const loc = getVal(['location', 'city', 'place']) || defaultLocation;
            const rawSkills = getVal(['skills', 'keySkills', 'technologies', 'technicalSkills']);
            const desc = getVal(['description', 'jobDescription', 'jd', 'requirements']) || `${title} requirement for ${client}`;
            const skills = rawSkills ? rawSkills.split(/[,;\/]/).map(s => s.trim()).filter(Boolean) : [];

            if (title) {
              jdItemsToProcess.push({
                jobTitle: title,
                companyName: client,
                experience: exp,
                location: loc,
                skills,
                description: desc,
                requirements: desc,
              });
            }
          }
        } catch (excelErr) {
          console.warn('[BulkJD] Failed to parse Excel sheet:', excelErr.message);
        }
      }
      // Case 2: ZIP archive of JD files
      else if (ext === '.zip' || file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed') {
        const zipData = fs.readFileSync(file.path);
        const zip = await JSZip.loadAsync(zipData);

        const batchId = `jd_extract_${Date.now()}_${uuidv4().slice(0, 6)}`;
        tempExtractDir = path.join(__dirname, '../../uploads/temp_extract', batchId);
        if (!fs.existsSync(tempExtractDir)) fs.mkdirSync(tempExtractDir, { recursive: true });

        for (const relPath of Object.keys(zip.files)) {
          const zipFile = zip.files[relPath];
          if (zipFile.dir || relPath.includes('__MACOSX') || relPath.startsWith('.')) continue;

          const fileExt = path.extname(relPath).toLowerCase();
          if (!['.pdf', '.docx', '.doc', '.txt'].includes(fileExt)) continue;

          const buf = await zipFile.async('nodebuffer');
          const diskPath = path.join(tempExtractDir, `${uuidv4().slice(0, 8)}_${path.basename(relPath)}`);
          fs.writeFileSync(diskPath, buf);

          let text = '';
          if (fileExt === '.pdf') {
            const p = await pdfParse(buf);
            text = p.text || '';
          } else if (['.docx', '.doc'].includes(fileExt)) {
            const r = await parseDocx(diskPath);
            text = r.text || '';
          } else {
            text = buf.toString('utf8');
          }

          if (text.trim()) {
            const info = extractJdInfo(text);
            const baseFileName = path.basename(relPath, fileExt).replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
            jdItemsToProcess.push({
              jobTitle: info.suggestedTitle || baseFileName || 'Custom Job Requirement',
              companyName: defaultClient,
              experience: info.suggestedExp || '1-5 Years',
              location: defaultLocation,
              skills: info.skills || [],
              description: text,
              requirements: text,
            });
          }
        }
      }
      // Case 3: Direct document file (.pdf, .docx, .doc, .txt)
      else if (['.pdf', '.docx', '.doc', '.txt'].includes(ext)) {
        let text = '';
        if (ext === '.pdf') {
          const buf = fs.readFileSync(file.path);
          const p = await pdfParse(buf);
          text = p.text || '';
        } else if (['.docx', '.doc'].includes(ext)) {
          const r = await parseDocx(file.path);
          text = r.text || '';
        } else {
          text = fs.readFileSync(file.path, 'utf8');
        }

        if (text.trim()) {
          const info = extractJdInfo(text);
          const baseFileName = path.basename(file.originalname, ext).replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
          jdItemsToProcess.push({
            jobTitle: info.suggestedTitle || baseFileName || 'Custom Job Requirement',
            companyName: defaultClient,
            experience: info.suggestedExp || '1-5 Years',
            location: defaultLocation,
            skills: info.skills || [],
            description: text,
            requirements: text,
          });
        }
      }

      try { fs.unlinkSync(file.path); } catch (_) {}
    }

    if (tempExtractDir && fs.existsSync(tempExtractDir)) {
      try { fs.rmSync(tempExtractDir, { recursive: true, force: true }); } catch (_) {}
    }

    if (jdItemsToProcess.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No readable job descriptions found in the uploaded files. Please check file format.'
      });
    }

    // Assign sequential JRWH numbers
    const allJobs = await Job.find({ jrNumber: /^JRWH\d+$/i }).select('jrNumber').lean();
    let maxNum = 0;
    allJobs.forEach(j => {
      const num = parseInt(j.jrNumber.replace(/^JRWH/i, ''), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    });

    const created = [];
    const failed = [];
    const escapeRegex = str => str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

    for (let i = 0; i < jdItemsToProcess.length; i++) {
      const item = jdItemsToProcess[i];
      const jobTitle = (item.jobTitle || 'Client Job Requirement').trim();
      const companyName = (item.companyName || defaultClient).trim();

      // Check if duplicate open job exists
      const existingJob = await Job.findOne({
        companyName: { $regex: `^${escapeRegex(companyName)}$`, $options: 'i' },
        jobTitle: { $regex: `^${escapeRegex(jobTitle)}$`, $options: 'i' },
        status: { $ne: 'Closed' }
      });

      if (existingJob) {
        failed.push({
          row: i + 1,
          jobTitle,
          companyName,
          error: `Duplicate active JR already exists (${existingJob.jrNumber})`
        });
        continue;
      }

      try {
        maxNum++;
        const newJrNumber = `JRWH${String(maxNum).padStart(4, '0')}`;
        const newJob = await Job.create({
          jrNumber: newJrNumber,
          companyName,
          client: companyName,
          jobTitle,
          experience: item.experience || '1-5 Years',
          location: item.location || defaultLocation,
          skills: item.skills || [],
          description: item.description || '',
          requirements: item.requirements || item.description || '',
          positions: 1,
          status: 'Open',
          priority: 'Medium',
          division: item.jobTitle.toLowerCase().includes('it') || (item.skills || []).some(s => ['react', 'node', 'java', 'python'].includes(s.toLowerCase())) ? 'IT' : 'BPO',
          portfolioDepartment: 'BPO',
          createdBy: req.user?._id,
          recruiterName: req.user?.name || 'Recruiter',
          recruiterEmail: req.user?.email || '',
        });

        created.push({
          _id: newJob._id,
          jrNumber: newJob.jrNumber,
          jobTitle: newJob.jobTitle,
          companyName: newJob.companyName,
          skills: newJob.skills,
          experience: newJob.experience
        });
      } catch (err) {
        failed.push({ row: i + 1, jobTitle, error: err.message });
      }
    }

    await createLog({
      type: 'create',
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: `Bulk imported ${created.length} active JR(s) from files (${failed.length} skipped/failed)`
    });

    res.json({
      success: true,
      message: `🎉 Successfully created ${created.length} new Active JRs in the ATS database!`,
      totalFound: jdItemsToProcess.length,
      createdCount: created.length,
      failedCount: failed.length,
      createdJobs: created,
      failed
    });
  } catch (err) {
    if (tempExtractDir && fs.existsSync(tempExtractDir)) {
      try { fs.rmSync(tempExtractDir, { recursive: true, force: true }); } catch (_) {}
    }
    next(err);
  }
};
