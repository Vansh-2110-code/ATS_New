const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');
const OfferLetter = require('../models/OfferLetter');
const Candidate = require('../models/Candidate');
const User = require('../models/User');
const { createLog } = require('../utils/helpers');
const { sendEmail } = require('../utils/emailService');

// Official template configurations matching the 5 docx files from offer letter.zip
const TEMPLATE_CONFIGS = {
  master: {
    key: 'master',
    name: 'Master Offer & Appointment Letter',
    filename: 'Master Offer and appointment letter 2026.docx',
    defaultDesignation: 'Recruiter / Operations Associate',
    defaultReportingTo: 'Team Leader / Manager',
    defaultPlaceOfPosting: 'Bangalore',
    defaultKpis: [
      { area: 'Successful Joinings', measurement: 'Target assigned by Company' },
      { area: 'Quality Line-ups', measurement: 'As per requirement/benchmark' },
      { area: 'Candidate Screening', measurement: '100% of submitted candidates' },
      { area: 'ATS Updates', measurement: '100% of required activities' },
      { area: 'Interview Follow-up', measurement: 'Timely follow-up' },
      { area: 'Offer Follow-up', measurement: 'Continuous until joining' },
      { area: 'Candidate Retention', measurement: 'As per applicable requirement' },
      { area: 'Attendance', measurement: 'As per Company policy' },
      { area: 'Process Compliance', measurement: '100% adherence expected' },
      { area: 'Professional Conduct', measurement: 'Continuous' },
    ],
  },
  sr_recruiter: {
    key: 'sr_recruiter',
    name: 'Sr Recruiter Offer and appointment letter 2026',
    filename: 'Sr Recruiter Offer and appointment letter 2026.docx',
    defaultDesignation: 'Senior Recruiter',
    defaultReportingTo: 'Team Leader / Manager',
    defaultPlaceOfPosting: 'Bangalore',
    defaultKpis: [
      { area: 'Successful Joinings', measurement: 'Target assigned by Company' },
      { area: 'Quality Line-ups', measurement: 'As per requirement/benchmark' },
      { area: 'Candidate Screening', measurement: '100% of submitted candidates' },
      { area: 'ATS Updates', measurement: '100% of required activities' },
      { area: 'Interview Follow-up', measurement: 'Timely follow-up' },
      { area: 'Offer Follow-up', measurement: 'Continuous until joining' },
      { area: 'Candidate Retention', measurement: 'As per applicable requirement' },
      { area: 'Attendance', measurement: 'As per Company policy' },
      { area: 'Process Compliance', measurement: '100% adherence expected' },
      { area: 'Professional Conduct', measurement: 'Continuous' },
    ],
  },
  team_leader: {
    key: 'team_leader',
    name: 'Team Leader Offer and appointment letter 2026',
    filename: 'Team Leader Offer and appointment letter 2026.docx',
    defaultDesignation: 'Team Leader - Recruitment',
    defaultReportingTo: 'Branch Manager / Business Head / Director',
    defaultPlaceOfPosting: 'Bangalore',
    defaultKpis: [
      { area: 'Team Joinings', measurement: 'Achieve assigned target' },
      { area: 'Individual Recruiter Performance', measurement: 'Monitor and improve' },
      { area: 'Quality Line-ups', measurement: 'Maintain quality' },
      { area: 'Interview Conversion', measurement: 'Improve conversion' },
      { area: 'Offer Conversion', measurement: 'Monitor closely' },
      { area: 'Joining Conversion', measurement: 'Drive closures' },
      { area: 'Candidate Retention', measurement: 'Minimize dropouts' },
      { area: 'ATS Compliance', measurement: 'Ensure accurate records' },
      { area: 'Attendance', measurement: 'Monitor team attendance' },
      { area: 'Client Requirements', measurement: 'Ensure timely action' },
      { area: 'Recruiter Training', measurement: 'Continuous coaching' },
      { area: 'Reporting', measurement: 'Accurate daily/weekly/monthly reporting' },
    ],
  },
  branch_manager: {
    key: 'branch_manager',
    name: 'Branch Manager Offer and appointment letter 2026',
    filename: 'Branch Manager Offer and appointment letter 2026.docx',
    defaultDesignation: 'Branch Manager',
    defaultReportingTo: 'Director / Business Head',
    defaultPlaceOfPosting: 'Bangalore',
    defaultKpis: [
      { area: 'Branch/Team Revenue', measurement: 'Achievement against assigned target' },
      { area: 'Revenue Collection', measurement: 'Actual realization/collection' },
      { area: 'Successful Joinings', measurement: 'Achievement against assigned target' },
      { area: 'Recruiter Productivity', measurement: 'Individual/team performance' },
      { area: 'Quality Line-ups', measurement: 'Relevance and conversion' },
      { area: 'Client Acquisition', measurement: 'New clients generated' },
      { area: 'Client Retention', measurement: 'Continued business' },
      { area: 'Employee Attendance', measurement: 'Regularity and discipline' },
      { area: 'ATS Compliance', measurement: 'Accuracy and completeness' },
      { area: 'Branch Expenses', measurement: 'Within approved budget' },
      { area: 'Client Satisfaction', measurement: 'Feedback and issue resolution' },
      { area: 'Team Development', measurement: 'Training and performance improvement' },
      { area: 'Reporting', measurement: 'Timely and accurate reporting' },
    ],
  },
  business_developer: {
    key: 'business_developer',
    name: 'Business Developer Offer and appointment letter 2026',
    filename: 'Business Developer Offer and appointment letter 2026.docx',
    defaultDesignation: 'Business Development Executive',
    defaultReportingTo: 'Business Head / Manager / Director',
    defaultPlaceOfPosting: 'Bangalore',
    defaultKpis: [
      { area: 'Prospecting', measurement: 'As assigned by management' },
      { area: 'New Corporate Leads', measurement: 'Monthly target assigned' },
      { area: 'Decision-Maker Contacts', measurement: 'Monthly target assigned' },
      { area: 'Client Meetings', measurement: 'As assigned' },
      { area: 'New Recruitment Requirements', measurement: 'Monthly target assigned' },
      { area: 'New Client Acquisition', measurement: 'Monthly target assigned' },
      { area: 'Empanelments', measurement: 'As assigned' },
      { area: 'Active Clients', measurement: 'Quality and activity based' },
      { area: 'Revenue Generated', measurement: 'Monthly/quarterly target' },
      { area: 'Revenue Collection', measurement: 'As applicable' },
      { area: 'CRM/ATS Updates', measurement: '100% compliance' },
      { area: 'Client Relationship', measurement: 'Ongoing' },
    ],
  },
};

// Format currency as Indian rupee format
const formatInr = (val) => {
  const num = Number(val) || 0;
  return num.toLocaleString('en-IN');
};

// Format date as DD/MM/YYYY
const formatDateStr = (d) => {
  if (!d) return '';
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return String(d);
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
};

// ── GET /api/offer-letters/templates ──
exports.getTemplates = async (req, res, next) => {
  try {
    const templates = Object.values(TEMPLATE_CONFIGS).map(t => ({
      key: t.key,
      name: t.name,
      filename: t.filename,
      defaultDesignation: t.defaultDesignation,
      defaultReportingTo: t.defaultReportingTo,
      defaultPlaceOfPosting: t.defaultPlaceOfPosting,
      defaultKpis: t.defaultKpis,
    }));
    res.json({ success: true, templates });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/offer-letters ──
exports.getOfferLetters = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 25,
      search,
      status,
      templateKey,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {};
    if (status && status !== 'All') query.status = status;
    if (templateKey && templateKey !== 'All') query.templateKey = templateKey;

    if (search) {
      const re = new RegExp(search, 'i');
      query.$or = [
        { offerNumber: re },
        { 'recipient.name': re },
        { 'recipient.email': re },
        { 'recipient.designation': re },
        { 'recipient.phone': re },
      ];
    }

    const total = await OfferLetter.countDocuments(query);
    const letters = await OfferLetter.find(query)
      .populate('candidate', 'name email phone status positionApplied')
      .populate('user', 'name email role employeeId')
      .populate('issuedBy', 'name email role')
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      success: true,
      data: letters,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/offer-letters/:id ──
exports.getOfferLetterById = async (req, res, next) => {
  try {
    const letter = await OfferLetter.findById(req.params.id)
      .populate('candidate', 'name email phone status positionApplied currentLocation address')
      .populate('user', 'name email role employeeId')
      .populate('issuedBy', 'name email role');

    if (!letter) {
      return res.status(404).json({ message: 'Offer letter not found' });
    }

    res.json({ success: true, data: letter });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/offer-letters ──
exports.createOfferLetter = async (req, res, next) => {
  try {
    const b = req.body;
    const templateConfig = TEMPLATE_CONFIGS[b.templateKey] || TEMPLATE_CONFIGS.master;

    const letterData = {
      templateKey: templateConfig.key,
      templateName: templateConfig.name,
      recipientType: b.recipientType || 'candidate',
      candidate: b.candidateId || null,
      user: b.userId || null,
      recipient: {
        name: b.name || b.recipient?.name,
        email: b.email || b.recipient?.email,
        phone: b.phone || b.recipient?.phone,
        address: b.address || b.recipient?.address,
        designation: b.designation || b.recipient?.designation || templateConfig.defaultDesignation,
        dateOfJoining: b.dateOfJoining || b.recipient?.dateOfJoining || new Date(),
        dateOfJoiningStr: b.dateOfJoiningStr || formatDateStr(b.dateOfJoining || b.recipient?.dateOfJoining),
        reportingTo: b.reportingTo || b.recipient?.reportingTo || templateConfig.defaultReportingTo,
        placeOfPosting: b.placeOfPosting || b.recipient?.placeOfPosting || templateConfig.defaultPlaceOfPosting,
      },
      terms: {
        probationMonths: b.terms?.probationMonths ?? 3,
        probationNoticeDays: b.terms?.probationNoticeDays ?? 30,
        confirmedNoticeDays: b.terms?.confirmedNoticeDays ?? 90,
        workLocation: b.terms?.workLocation || b.recipient?.placeOfPosting || templateConfig.defaultPlaceOfPosting,
      },
      salary: {
        grossMonthly: b.salary?.grossMonthly ?? 30000,
        grossAnnual: b.salary?.grossAnnual ?? ((b.salary?.grossMonthly ?? 30000) * 12),
        basicMonthly: b.salary?.basicMonthly ?? 15000,
        basicAnnual: b.salary?.basicAnnual ?? ((b.salary?.basicMonthly ?? 15000) * 12),
        hraMonthly: b.salary?.hraMonthly ?? 7500,
        hraAnnual: b.salary?.hraAnnual ?? ((b.salary?.hraMonthly ?? 7500) * 12),
        specialAllowanceMonthly: b.salary?.specialAllowanceMonthly ?? 7500,
        specialAllowanceAnnual: b.salary?.specialAllowanceAnnual ?? ((b.salary?.specialAllowanceMonthly ?? 7500) * 12),
        pfMonthly: b.salary?.pfMonthly ?? 'Not Applicable',
        pfAnnual: b.salary?.pfAnnual ?? 'Not Applicable',
        esiMonthly: b.salary?.esiMonthly ?? 'As applicable',
        esiAnnual: b.salary?.esiAnnual ?? 'As applicable',
        ptMonthly: b.salary?.ptMonthly ?? 'As applicable',
        ptAnnual: b.salary?.ptAnnual ?? 'As applicable',
        tdsMonthly: b.salary?.tdsMonthly ?? 'As applicable',
        tdsAnnual: b.salary?.tdsAnnual ?? 'As applicable',
        netSalaryEstimated: b.salary?.netSalaryEstimated ?? 'Subject to statutory deductions',
      },
      kpiDetails: Array.isArray(b.kpiDetails) && b.kpiDetails.length > 0 ? b.kpiDetails : templateConfig.defaultKpis,
      customClauses: b.customClauses || '',
      status: b.status || 'Draft',
      issuedDate: b.status === 'Issued' ? new Date() : (b.issuedDate || new Date()),
      issuedBy: req.user._id,
      issuedByName: req.user.name,
      notes: b.notes || '',
    };

    const offerLetter = await OfferLetter.create(letterData);

    // If candidate linked and status is Issued, update candidate pipeline stage to Offer
    if (offerLetter.candidate && offerLetter.status === 'Issued') {
      try {
        const cand = await Candidate.findById(offerLetter.candidate);
        if (cand) {
          cand.currentStage = 'Offer';
          cand.candidateStatusPostOffer = 'Offer Released';
          cand.offeredDate = new Date();
          cand.designationOffered = offerLetter.recipient.designation;
          cand.joiningSalary = String(offerLetter.salary.grossMonthly);
          cand.stageHistory = cand.stageHistory || [];
          cand.stageHistory.push({
            stage: 'Offer',
            subStatus: 'Offer Released',
            changedAt: new Date(),
          });
          await cand.save();
        }
      } catch (errCand) {
        console.error('Failed to update candidate offer status:', errCand);
      }
    }

    await createLog({
      type: 'create',
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: `Created offer letter ${offerLetter.offerNumber} for ${offerLetter.recipient.name} (${offerLetter.recipient.designation})`,
      target: offerLetter._id.toString(),
      ip: req.ip,
    });

    res.status(201).json({ success: true, data: offerLetter });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/offer-letters/:id ──
exports.updateOfferLetter = async (req, res, next) => {
  try {
    const letter = await OfferLetter.findById(req.params.id);
    if (!letter) {
      return res.status(404).json({ message: 'Offer letter not found' });
    }

    const b = req.body;
    if (b.templateKey && TEMPLATE_CONFIGS[b.templateKey]) {
      letter.templateKey = b.templateKey;
      letter.templateName = TEMPLATE_CONFIGS[b.templateKey].name;
    }

    if (b.recipient) Object.assign(letter.recipient, b.recipient);
    if (b.terms) Object.assign(letter.terms, b.terms);
    if (b.salary) Object.assign(letter.salary, b.salary);
    if (Array.isArray(b.kpiDetails)) letter.kpiDetails = b.kpiDetails;
    if (b.customClauses !== undefined) letter.customClauses = b.customClauses;
    if (b.status !== undefined) {
      letter.status = b.status;
      if (b.status === 'Issued' && !letter.issuedDate) {
        letter.issuedDate = new Date();
      }
    }
    if (b.notes !== undefined) letter.notes = b.notes;

    await letter.save();

    await createLog({
      type: 'edit',
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: `Updated offer letter ${letter.offerNumber} for ${letter.recipient.name}`,
      target: letter._id.toString(),
      ip: req.ip,
    });

    res.json({ success: true, data: letter });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/offer-letters/:id ──
exports.deleteOfferLetter = async (req, res, next) => {
  try {
    const letter = await OfferLetter.findById(req.params.id);
    if (!letter) {
      return res.status(404).json({ message: 'Offer letter not found' });
    }

    await OfferLetter.findByIdAndDelete(req.params.id);

    await createLog({
      type: 'delete',
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: `Deleted offer letter ${letter.offerNumber} (${letter.recipient.name})`,
      target: letter._id.toString(),
      ip: req.ip,
    });

    res.json({ success: true, message: 'Offer letter deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/offer-letters/:id/download-docx ──
exports.downloadDocx = async (req, res, next) => {
  try {
    const letter = await OfferLetter.findById(req.params.id);
    if (!letter) {
      return res.status(404).json({ message: 'Offer letter not found' });
    }

    const templateConfig = TEMPLATE_CONFIGS[letter.templateKey] || TEMPLATE_CONFIGS.master;
    const templateFilePath = path.join(__dirname, '../../templates/offer_letters', templateConfig.filename);

    if (!fs.existsSync(templateFilePath)) {
      return res.status(404).json({ message: `Template file ${templateConfig.filename} not found on server` });
    }

    const templateBuffer = fs.readFileSync(templateFilePath);
    const zip = await JSZip.loadAsync(templateBuffer);

    let docXml = await zip.file('word/document.xml').async('text');

    const dojFormatted = formatDateStr(letter.recipient.dateOfJoining || letter.recipient.dateOfJoiningStr);
    const currentDateStr = formatDateStr(letter.issuedDate || new Date());
    const recipientName = letter.recipient.name || 'Valued Candidate';
    const designation = letter.recipient.designation || templateConfig.defaultDesignation;
    const address = letter.recipient.address || 'Address on file';
    const reportingManager = letter.recipient.reportingTo || templateConfig.defaultReportingTo;
    const placeOfPosting = letter.recipient.placeOfPosting || templateConfig.defaultPlaceOfPosting;
    const probationDays = `${letter.terms.probationNoticeDays || 30} days`;
    const confirmedDays = `${letter.terms.confirmedNoticeDays || 90} days`;

    // Perform exact placeholder replacements across the XML
    docXml = docXml
      .replace(/\[FULL NAME\]/g, recipientName)
      .replace(/\[Employee Name\]/g, recipientName)
      .replace(/\[EMPLOYEE ADDRESS\]/g, address)
      .replace(/\[DESIGNATION\]/g, designation)
      .replace(/\[Designation\]/g, designation)
      .replace(/\[DD\/MM\/YYYY\]/g, currentDateStr)
      .replace(/\[Date of Joining\]/g, dojFormatted)
      .replace(/\[REPORTING MANAGER \/ DESIGNATION\]/g, reportingManager)
      .replace(/\[BANGALORE \/ HYDERABAD \/ OTHER\]/g, placeOfPosting.toUpperCase())
      .replace(/\[Bangalore \/ Hyderabad \/ Other\]/g, placeOfPosting)
      .replace(/\[Office Location\]/g, placeOfPosting)
      .replace(/\[30 days\]/g, probationDays)
      .replace(/\[90 days\]/g, confirmedDays);

    // Replace default salary numbers in Table 1 if present
    if (letter.salary.grossMonthly) {
      docXml = docXml.replace(/>30,000</g, `>${formatInr(letter.salary.grossMonthly)}<`);
      docXml = docXml.replace(/>3,60,000</g, `>${formatInr(letter.salary.grossAnnual || letter.salary.grossMonthly * 12)}<`);
    }

    zip.file('word/document.xml', docXml);

    const generatedBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    });

    const safeFilename = `Offer_Letter_${recipientName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${letter.offerNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.send(generatedBuffer);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/offer-letters/:id/send-email ──
exports.sendOfferEmail = async (req, res, next) => {
  try {
    const letter = await OfferLetter.findById(req.params.id);
    if (!letter) {
      return res.status(404).json({ message: 'Offer letter not found' });
    }

    if (!letter.recipient.email) {
      return res.status(400).json({ message: 'Recipient email address is required to send offer letter' });
    }

    const recipientName = letter.recipient.name;
    const designation = letter.recipient.designation;
    const doj = formatDateStr(letter.recipient.dateOfJoining || letter.recipient.dateOfJoiningStr);
    const grossMonthly = formatInr(letter.salary.grossMonthly);
    const grossAnnual = formatInr(letter.salary.grossAnnual);

    const subject = `Offer & Appointment Letter – ${designation} | White Horse Manpower`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
        <div style="background-color: #0f172a; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">WHITE HORSE MANPOWER CONSULTANCY PVT. LTD.</h2>
          <p style="color: #94a3b8; margin: 6px 0 0; font-size: 12px;">Official Offer & Appointment Intimation</p>
        </div>
        <div style="background-color: #ffffff; padding: 28px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 15px;">Dear <strong>${recipientName}</strong>,</p>
          <p>We are pleased to offer you employment with <strong>White Horse Manpower Consultancy Private Limited</strong> as <strong>${designation}</strong>.</p>
          
          <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 8px; font-size: 13px;"><strong>Offer Reference:</strong> ${letter.offerNumber}</p>
            <p style="margin: 0 0 8px; font-size: 13px;"><strong>Position:</strong> ${designation}</p>
            <p style="margin: 0 0 8px; font-size: 13px;"><strong>Date of Joining:</strong> ${doj}</p>
            <p style="margin: 0 0 8px; font-size: 13px;"><strong>Place of Posting:</strong> ${letter.recipient.placeOfPosting}</p>
            <p style="margin: 0; font-size: 13px;"><strong>Gross CTC:</strong> ₹${grossMonthly} / Month (₹${grossAnnual} / Annum)</p>
          </div>

          <p>Please find the complete terms, salary annexure, and role guidelines in your formal appointment letter. Kindly confirm your acceptance of this offer by replying to this email.</p>
          
          <p style="margin-top: 24px; font-size: 13px; color: #64748b;">
            Best Regards,<br/>
            <strong>Human Resources Department</strong><br/>
            White Horse Manpower Consultancy Private Limited<br/>
            Bangalore – 560051
          </p>
        </div>
      </div>
    `;

    await sendEmail({
      to: letter.recipient.email,
      subject,
      html,
    });

    letter.status = 'Sent';
    await letter.save();

    await createLog({
      type: 'edit',
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: `Sent offer letter ${letter.offerNumber} via email to ${letter.recipient.email}`,
      target: letter._id.toString(),
      ip: req.ip,
    });

    res.json({ success: true, message: `Offer letter emailed successfully to ${letter.recipient.email}` });
  } catch (err) {
    next(err);
  }
};
