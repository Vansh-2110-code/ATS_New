const CustomJd = require('../models/CustomJd');

// Helper to extract basic info from raw JD text
function extractJdInfo(text = '') {
  const clean = text.trim();
  
  // Try extracting title
  let suggestedTitle = '';
  const titleMatch = clean.match(/(?:Position|Role|Job Title|Designation)\s*[:\-–]\s*([^\r\n]+)/i);
  if (titleMatch) {
    suggestedTitle = titleMatch[1].trim();
  } else {
    // Take first line if short
    const firstLine = clean.split('\n')[0].trim();
    if (firstLine.length > 3 && firstLine.length < 60) {
      suggestedTitle = firstLine.replace(/^(?:JD|Job Description|Hiring For)[:\-–\s]*/i, '');
    }
  }

  // Try extracting experience
  let suggestedExp = '';
  const expMatch = clean.match(/(\d+[\s\-\–to]+\d+\s*(?:Years?|Yrs?))/i) || clean.match(/(\d+\+?\s*(?:Years?|Yrs?)\s*(?:of)?\s*experience)/i);
  if (expMatch) {
    suggestedExp = expMatch[1].trim();
  }

  // Common keywords & skill dictionary
  const COMMON_SKILLS = [
    'P2P', 'Procure to Pay', 'Accounts Payable', 'AP', 'O2C', 'Order to Cash', 'Accounts Receivable', 'AR',
    'R2R', 'Record to Report', 'General Ledger', 'GL', 'Financial Reporting', 'Reconciliation',
    'Java', 'Spring Boot', 'Microservices', 'Hibernate', 'Python', 'Django', 'FastAPI', 'Node.js',
    'React', 'React.js', 'Angular', 'Vue.js', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'Tailwind',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'CI/CD', 'Jenkins', 'Git',
    'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Oracle', 'PL/SQL',
    'BPO', 'Customer Service', 'Voice Process', 'Non-Voice', 'Chat Support', 'Email Support',
    'Technical Support', 'Inbound', 'Outbound', 'Telesales', 'Lead Generation',
    'SAP', 'SAP FICO', 'SAP MM', 'SAP SD', 'NetSuite', 'Tally', 'Excel', 'Advanced Excel',
    'Medical Coding', 'CPC', 'ICD-10', 'Healthcare BPO', 'US Healthcare', 'Prior Authorization',
    'HR', 'Recruitment', 'Talent Acquisition', 'Sourcing', 'Screening', 'Onboarding'
  ];

  const foundSkills = [];
  const lowerText = clean.toLowerCase();
  for (const skill of COMMON_SKILLS) {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(clean)) {
      foundSkills.push(skill);
    }
  }

  // Also check if there's a "Skills" or "Keywords" section
  const skillsSectionMatch = clean.match(/(?:Required Skills|Key Skills|Skills|Keywords|Competencies)\s*[:\-–]\s*([^\r\n]+(?:\r?\n[^\r\n]+)*)/i);
  if (skillsSectionMatch) {
    const rawSkills = skillsSectionMatch[1].split(/[,\n•\-\/]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 35);
    rawSkills.forEach(s => {
      if (!foundSkills.some(f => f.toLowerCase() === s.toLowerCase())) {
        foundSkills.push(s);
      }
    });
  }

  // Suggest category
  let category = 'General Operations';
  if (/p2p|o2c|r2r|accounts|payable|receivable|finance|ledger|audit|tax/i.test(clean)) {
    category = 'Finance & Procurement Operations';
  } else if (/java|python|react|angular|node|developer|software|engineer|cloud|aws|devops/i.test(clean)) {
    category = 'IT & Software Development';
  } else if (/bpo|customer service|voice|inbound|outbound|telecaller/i.test(clean)) {
    category = 'BPO & Customer Operations';
  } else if (/healthcare|medical coding|icd|claims|hospital/i.test(clean)) {
    category = 'Healthcare & Medical BPO';
  } else if (/sales|business development|marketing|client acquisition/i.test(clean)) {
    category = 'Sales & Business Development';
  } else if (/hr|recruitment|talent acquisition/i.test(clean)) {
    category = 'Human Resources';
  }

  return {
    suggestedTitle: suggestedTitle || 'Custom Job Requirement',
    suggestedExp: suggestedExp || '1-5 Years',
    category,
    skills: foundSkills.slice(0, 20)
  };
}

// GET /api/jd-presets
exports.getAll = async (req, res, next) => {
  try {
    const jds = await CustomJd.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(jds);
  } catch (err) {
    next(err);
  }
};

// POST /api/jd-presets/extract
exports.extract = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'JD text is required for analysis.' });
    }
    const extracted = extractJdInfo(text);
    res.json(extracted);
  } catch (err) {
    next(err);
  }
};

// POST /api/jd-presets
exports.create = async (req, res, next) => {
  try {
    const { title, category, experience, location, salary, skills, text } = req.body;
    if (!title || !text) {
      return res.status(400).json({ message: 'Title and JD text are required.' });
    }

    const customJd = await CustomJd.create({
      title: title.trim(),
      category: category || 'General Operations',
      experience: experience || '',
      location: location || '',
      salary: salary || '',
      skills: Array.isArray(skills) ? skills.filter(Boolean) : (skills ? skills.split(',').map(s => s.trim()) : []),
      text: text.trim(),
      createdBy: req.user?._id,
      createdByName: req.user?.name || req.user?.email || 'Admin',
      isActive: true,
    });

    res.status(201).json(customJd);
  } catch (err) {
    next(err);
  }
};

// PUT /api/jd-presets/:id
exports.update = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    if (typeof updates.skills === 'string') {
      updates.skills = updates.skills.split(',').map(s => s.trim()).filter(Boolean);
    }
    const customJd = await CustomJd.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!customJd) return res.status(404).json({ message: 'JD not found' });
    res.json(customJd);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/jd-presets/:id
exports.remove = async (req, res, next) => {
  try {
    const customJd = await CustomJd.findByIdAndDelete(req.params.id);
    if (!customJd) return res.status(404).json({ message: 'JD not found' });
    res.json({ message: 'JD deleted successfully' });
  } catch (err) {
    next(err);
  }
};

exports.extractJdInfo = extractJdInfo;
