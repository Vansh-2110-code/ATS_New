/**
 * AI-Based Resume Parser — v2
 * Features:
 *   • Phrase-first skill extraction (React Native, Machine Learning, etc.)
 *   • Section-aware parsing (Skills / Experience / Education / Summary / Certs)
 *   • Synonym normalisation (JS→JavaScript, RN→React Native, ML→Machine Learning)
 *   • Weighted 6-component ATS scoring model
 *   • JD semantic matching with bigram overlap + phrase matching
 *   • Fit Tier: "Top Match" | "Good Fit" | "Low Fit"
 */

const fs          = require('fs');
const path        = require('path');
const { parseDocx } = require('./docxParser');

/* ─────────────────────────────────────────────────────────────
   PHRASE SKILLS DICTIONARY
   Always matched as a unit BEFORE any word-level splitting.
   Order matters — longer phrases go first.
 ───────────────────────────────────────────────────────────── */
const PHRASE_SKILLS = [
  // Mobile
  'react native', 'flutter development', 'android development', 'ios development',
  // AI / ML / Data
  'machine learning', 'deep learning', 'natural language processing', 'computer vision',
  'data science', 'neural networks', 'reinforcement learning', 'generative ai',
  'large language models', 'prompt engineering',
  // Cloud / DevOps
  'amazon web services', 'google cloud platform', 'microsoft azure',
  'continuous integration', 'continuous deployment', 'continuous delivery',
  'infrastructure as code', 'site reliability engineering',
  // Databases
  'elastic search', 'ms sql server', 'sql server', 'oracle database',
  'nosql database', 'graph database',
  // Frontend
  'next.js', 'nuxt.js', 'vue.js', 'angular.js', 'react.js', 'express.js',
  'tailwind css', 'material ui', 'ant design', 'chakra ui',
  // Methodologies
  'agile methodology', 'scrum master', 'test driven development', 'behavior driven development',
  'domain driven design', 'microservices architecture', 'event driven architecture',
  'design patterns', 'system design', 'object oriented programming', 'functional programming',
  // BPO / HR Domain
  'customer service', 'customer support', 'technical support', 'call center',
  'quality assurance', 'business process outsourcing', 'client management',
  'stakeholder management', 'project management', 'product management',
  'talent acquisition', 'resume screening', 'candidate sourcing', 'end to end recruitment',
  'technical recruiting', 'volume hiring', 'interview scheduling', 'salary negotiation',
  // Procurement, P2P & O2C Operations
  'procure to pay', 'p2p operations', 'invoice processing', 'accounts payable',
  'payment processing', 'vendor payments', 'po invoice', 'non po invoice',
  'invoice verification', 'invoice matching', 'payment reconciliation', 'account reconciliation',
  'vendor master data', 'order to cash', 'accounts receivable', 'billing management',
  'revenue management', 'cash application', 'cash allocation', 'dispute management',
  'deduction management', 'receivables management', 'customer reconciliation',
  // Procurement & Supply Chain
  'strategic sourcing', 'vendor management', 'purchase order', 'purchase orders',
  'contract negotiation', 'vendor development', 'spend analysis',
  'supplier evaluation', 'supply chain management', 'inventory management',
  'warehouse management', 'logistics operations', 'material management',
  // Enterprise Systems, ERP, SAP, ServiceNow & Monitoring
  'sap erp', 'sap s/4 hana', 'sap mm', 'sap fico', 'sap sd', 'sap abap',
  'sap bpc', 'sap ehs', 'sap ewm', 'sap pp', 'sap qm', 'sap ariba',
  'cds views', 'odata services', 'sap btp', 'restful abap programming',
  'oracle ebs', 'oracle scm', 'oracle financials',
  'servicenow development', 'servicenow testing', 'servicenow itsm', 'service catalog',
  'business rules', 'client scripts', 'ui policies', 'ui actions',
  'infrastructure monitoring', 'application monitoring', 'monitoring operations',
  'major incident management', 'event management', 'alert management',
  'sap hana', 'sap basis', 'erp implementation', 'master data management',
  // Finance / Ops
  'financial analysis', 'business analysis', 'data analysis', 'root cause analysis',
  // Digital Marketing, AdOps & Performance
  'ad operations', 'adops execution', 'campaign architecture', 'performance marketing',
  'google ads', 'meta ads manager', 'meta ads', 'display & video 360', 'dv360',
  'the trade desk', 'programmatic advertising', 'conversion api', 'attribution modeling',
  'genai in adops', 'roas optimization', 'media planning', 'creative testing',
  // Telecom, Service Transition & Day 2 Readiness (JL4A/JL5B)
  'service transition', 'day 2 readiness', 'operational readiness', 'sla governance',
  'incident management', 'ticketing workflows', 'escalation procedures', 'ses door lock',
  'raci matrix', 'steady state operations', 'service assurance', 'telecom infrastructure',
  'long-haul fiber', 'fiber build', 'hut deployment', 'lateral builds',
  'construction and engineering', 'building management systems', 'telemetry systems',
  'operational turn-up', 'commercial readiness', 'iru build charges', 'o&m charges',
  // Soft skills (multi-word)
  'problem solving', 'critical thinking', 'time management', 'team management',
  'people management', 'conflict resolution', 'public speaking', 'written communication',
  'voice and accent training', 'voice & accent', 'soft skills training', 'accent neutralization',
];

/* ─────────────────────────────────────────────────────────────
   SYNONYM MAP  canonical → [aliases]
 ───────────────────────────────────────────────────────────── */
const SYNONYMS = {
  'javascript':         ['js', 'es6', 'es5', 'ecmascript', 'es2015', 'es2016', 'es2017', 'es2022'],
  'typescript':         ['ts'],
  'react':              ['reactjs', 'react js'],
  'react native':       ['rn', 'reactnative'],
  'node.js':            ['node', 'nodejs', 'node js', 'express', 'express.js', 'expressjs'],
  'python':             ['py', 'python3'],
  'machine learning':   ['ml', 'artificial intelligence'],
  'artificial intelligence': ['ai'],
  'natural language processing': ['nlp'],
  'kubernetes':         ['k8s'],
  'docker':             ['containerisation', 'containerization', 'containers'],
  'postgresql':         ['postgres', 'pg'],
  'mongodb':            ['mongo', 'nosql'],
  'microsoft azure':    ['azure'],
  'amazon web services':['aws', 'amazon aws'],
  'google cloud platform': ['gcp', 'google cloud'],
  'ci/cd':              ['ci cd', 'cicd', 'continuous integration', 'continuous deployment'],
  'git':                ['github', 'gitlab', 'bitbucket', 'version control'],
  'c#':                 ['csharp', 'dotnet', '.net', 'asp.net'],
  'ruby on rails':      ['rails', 'ror'],
  'vue.js':             ['vue', 'vuejs', 'vue js'],
  'angular':            ['angularjs', 'angular.js', 'angular js'],
  'next.js':            ['next', 'nextjs'],
  'tailwind css':       ['tailwind', 'tailwindcss'],
  'quality assurance':  ['qa', 'qe', 'quality engineer', 'testing'],
  'customer service':   ['customer support', 'client service'],
  'human resources':    ['hr', 'hrd'],
  'microsoft excel':    ['excel', 'ms excel'],
  'microsoft word':     ['word', 'ms word'],
  'microsoft office':   ['ms office', 'office 365'],
  'power bi':           ['powerbi'],
  'tableau':            ['tableau desktop'],
  'salesforce':         ['sfdc', 'crm'],
  'agile':              ['scrum', 'kanban', 'agile methodology'],
  'rest api':           ['rest', 'restful', 'restful api', 'api'],
  'graphql':            ['graph ql'],
  'procurement':        ['sourcing', 'purchasing', 'purchase', 'strategic sourcing'],
  'procure to pay':     ['p2p', 'p2p operations', 'procure-to-pay', 'purchase to pay'],
  'order to cash':      ['o2c', 'o2c operations', 'order-to-cash'],
  'accounts payable':   ['ap', 'ap operations', 'invoice processing', 'payment processing'],
  'accounts receivable':['ar', 'ar operations', 'billing management', 'cash application', 'cash allocation', 'collections'],
  'vendor management':  ['supplier management', 'vendor development', 'supplier evaluation', 'vendor master data'],
  'purchase order':     ['purchase orders', 'po management', 'po processing', 'po invoice', 'non po invoice'],
  'supply chain':       ['supply chain management', 'scm', 'logistics operations'],
  'servicenow':         ['service now', 'servicenow developer', 'servicenow itsm', 'servicenow testing'],
  'infrastructure monitoring': ['monitoring operations', 'server monitoring', 'application monitoring', 'noc operations', 'noc'],
  'sap':                ['sap erp', 's/4 hana', 's4 hana', 'sap hana', 'sap mm', 'sap fico', 'sap sd', 'sap abap', 'sap bpc', 'sap ehs', 'sap ewm', 'sap pp', 'sap qm'],
  'ad operations':      ['adops', 'ad ops', 'advertising operations'],
  'google ads':         ['adwords', 'google adwords', 'search ads', 'display ads'],
  'meta ads':           ['facebook ads', 'fb ads', 'instagram ads', 'meta ads manager'],
  'dv360':              ['display & video 360', 'display and video 360', 'doubleclick bid manager', 'dbm'],
  'the trade desk':     ['ttd', 'thetradedesk'],
  'service transition': ['service transition management', 'transition project management'],
  'day 2 readiness':    ['day-2 readiness', 'day 2 operational readiness', 'day 2 operations'],
  'long-haul fiber':    ['long haul fiber', 'fiber deployment', 'lh fiber'],
  'building management systems': ['bms', 'hut bms'],
};

// Build reverse lookup: alias → canonical
const SYNONYM_REVERSE = {};
for (const [canonical, aliases] of Object.entries(SYNONYMS)) {
  for (const alias of aliases) {
    SYNONYM_REVERSE[alias.toLowerCase()] = canonical;
  }
}

/* ─────────────────────────────────────────────────────────────
   SKILL MASTER LIST  (phrase + single-word, all lowercase)
 ───────────────────────────────────────────────────────────── */
const ALL_SKILLS = [
  ...PHRASE_SKILLS,
  // Languages
  'javascript','typescript','python','java','c++','c#','ruby','php','go','rust',
  'swift','kotlin','scala','r','matlab','perl','bash','shell','powershell',
  // Frontend
  'react','angular','vue.js','html','css','sass','scss','less','bootstrap',
  'tailwind css','webpack','vite','next.js','nuxt.js','svelte','ember',
  'jquery','redux','mobx','zustand','recoil',
  // Backend
  'node.js','express','django','flask','fastapi','spring','spring boot',
  'rails','laravel','asp.net','graphql','rest api','soap','grpc',
  // Mobile
  'react native','flutter','swift','kotlin','android','ios','xamarin',
  // Databases
  'mysql','postgresql','mongodb','redis','elasticsearch','cassandra',
  'dynamodb','sqlite','oracle','firebase','supabase','prisma','sequelize',
  // DevOps / Cloud
  'docker','kubernetes','jenkins','terraform','ansible','puppet','chef',
  'aws','azure','google cloud platform','heroku','vercel','netlify','digitalocean',
  'ci/cd','nginx','apache','linux','ubuntu','centos',
  // Data / AI
  'machine learning','deep learning','natural language processing','computer vision',
  'tensorflow','pytorch','scikit-learn','keras','pandas','numpy','opencv',
  'spark','hadoop','kafka','airflow','dbt','tableau','power bi','excel',
  // Tools
  'git','jira','confluence','figma','postman','swagger','notion','slack',
  'salesforce','sap','zendesk','hubspot',
  // Testing
  'jest','mocha','cypress','selenium','playwright','junit','pytest','testing',
  'unit testing','integration testing','automation testing',
  // BPO / HR / Soft
  'recruitment','sourcing','screening','onboarding','training','coaching',
  'customer service','technical support','call center','crm',
  'communication','leadership','teamwork','problem solving','time management',
  'agile','scrum','project management','product management',
  // Finance/Ops/Procurement/ERP/ServiceNow
  'accounting','financial analysis','business analysis','data analysis',
  'operations','logistics','supply chain','inventory management','warehousing',
  'procurement','sourcing','purchasing','purchase order','vendor management',
  'sap','sap mm','sap fico','sap sd','sap abap','sap bpc','sap ehs','sap ewm','sap pp','sap qm',
  'erp','p2p','o2c','rfq','rfp','servicenow','glidescript','noc','tosca','playwright','cds views','odata','rap',
];

/* ─────────────────────────────────────────────────────────────
   SECTION HEADERS  used to classify resume sections
 ───────────────────────────────────────────────────────────── */
const SECTION_HEADERS = {
  skills:        ['skill', 'technical skill', 'key skill', 'core competenc', 'expertise', 'technology', 'tools'],
  experience:    ['experience', 'work history', 'employment', 'professional background', 'career'],
  education:     ['education', 'academic', 'qualification', 'degree', 'institution', 'university', 'college'],
  summary:       ['summary', 'profile', 'objective', 'about me', 'overview', 'introduction'],
  certification: ['certif', 'license', 'accreditation', 'credential', 'award'],
  project:       ['project', 'portfolio'],
};

/* ─────────────────────────────────────────────────────────────
   DEGREE KEYWORDS for education detection
 ───────────────────────────────────────────────────────────── */
const DEGREE_KEYWORDS = [
  'b.tech','be ','b.e','btech','bsc','b.sc','bca','b.ca',
  'b.com','bcom','bba','b.ba','ba ','b.a ',
  'm.tech','me ','m.e','mtech','msc','m.sc','mca','m.ca',
  'm.com','mcom','mba','m.ba','ma ','m.a ',
  'phd','ph.d','doctorate','pgdm',
  'diploma','10th','12th','hsc','ssc','intermediate','matriculation',
];

/* ─────────────────────────────────────────────────────────────
   CORE HELPERS
 ───────────────────────────────────────────────────────────── */

function normalise(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9\s.#+/-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function canonicalise(skill) {
  const lower = skill.toLowerCase().trim();
  return SYNONYM_REVERSE[lower] || lower;
}

function escapeRe(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Pre-compile skill regexes for performance
const SKILL_REGEXES = ALL_SKILLS.map(skill => ({
  name: skill,
  canonical: canonicalise(skill),
  pattern: new RegExp(`(?<![a-z])${escapeRe(skill)}(?![a-z])`, 'i')
})).sort((a, b) => b.name.length - a.name.length);

/**
 * Extract all skills from a text using phrase-first approach.
 * Returns array of canonical skill names (deduplicated).
 */
function extractSkillsFromText(text) {
  if (!text) return [];
  const lower = normalise(text);
  const found = new Set();
  const working = ' ' + lower + ' '; // pad for boundary checks

  // 1) Phrase skills (using pre-compiled regexes)
  for (const skillObj of SKILL_REGEXES) {
    if (skillObj.pattern.test(working)) {
      found.add(skillObj.canonical);
    }
  }

  // 2) Fallback: single tokens not captured above
  const tokens = lower.split(/[\s,;|•·]+/).filter(t => t.length > 2);
  for (const token of tokens) {
    const c = canonicalise(token);
    if (ALL_SKILLS.includes(c) && !found.has(c)) {
      found.add(c);
    }
  }

  return [...found];
}

/** Detect which section a line belongs to */
function detectSection(line) {
  const lower = line.toLowerCase();
  for (const [section, patterns] of Object.entries(SECTION_HEADERS)) {
    if (patterns.some(p => lower.includes(p))) return section;
  }
  return null;
}

/**
 * Assign proficiency level based on frequency and context clues.
 */
function inferLevel(skillName, resumeText) {
  const lower = resumeText.toLowerCase();
  const occurrences = (lower.match(new RegExp(escapeRe(skillName), 'g')) || []).length;
  const expertWords  = ['expert', 'advanced', 'proficient', 'senior', 'lead', 'architect', 'principal'];
  const beginnerWords = ['learning', 'basic', 'beginner', 'familiar', 'exposure'];

  const nearbyText = (() => {
    const idx = lower.indexOf(skillName.toLowerCase());
    if (idx === -1) return '';
    return lower.substring(Math.max(0, idx - 60), Math.min(lower.length, idx + 60));
  })();

  if (expertWords.some(w => nearbyText.includes(w)) || occurrences >= 4) return 'expert';
  if (beginnerWords.some(w => nearbyText.includes(w))) return 'beginner';
  if (occurrences >= 2) return 'intermediate';
  return 'beginner';
}

/* ─────────────────────────────────────────────────────────────
   SECTION PARSER
 ───────────────────────────────────────────────────────────── */
function parseSections(lines) {
  const sections = {
    summary: [], skills: [], experience: [], education: [],
    certification: [], project: [], other: []
  };
  let currentSection = 'other';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const detected = detectSection(trimmed);
    // Short lines that are purely a header (< 50 chars)
    if (detected && trimmed.length < 60) {
      currentSection = detected;
      continue;
    }
    sections[currentSection].push(trimmed);
  }
  return sections;
}

/* ─────────────────────────────────────────────────────────────
   EXPERIENCE EXTRACTOR
 ───────────────────────────────────────────────────────────── */
function parseExperience(expLines) {
  // Each block: job title line followed by company/duration/points
  const experiences = [];
  let current = null;

  for (const line of expLines) {
    const lower = line.toLowerCase();
    
    // Safety: ignore extremely long lines for date matching to avoid backtracking
    if (line.length < 150) {
      // Simplified date pattern: Month/Year to Month/Year or Present
      const datePattern = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})\b.*?(?:–|-|to).*?(present|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})\b)/i;
      const durationPattern = /\b\d+\s*(year|yr|month|mon)s?\b/i;

      if (datePattern.test(line) || durationPattern.test(line)) {
        if (current) current.duration = line;
        continue;
      }
    }
    // Title + company heuristic: SHORT line that may contain known title words
    if (line.length < 80 && /\b(developer|engineer|manager|analyst|consultant|specialist|lead|head|officer|director|associate|executive|intern|trainee|architect|designer|hr|recruiter|coordinator|support)\b/i.test(line)) {
      if (current) experiences.push(current);
      current = { title: line, company: '', duration: '', points: [] };
      continue;
    }
    // Company line often comes right after title
    if (current && !current.company && line.length < 80 && !/^[•·\-–]/.test(line)) {
      current.company = line;
      continue;
    }
    // Bullet points
    if (current) {
      const clean = line.replace(/^[•·\-–*]\s*/, '');
      if (clean.length > 10) current.points.push(clean);
    }
  }
  if (current) experiences.push(current);
  return experiences.slice(0, 6);
}

/* ─────────────────────────────────────────────────────────────
   EDUCATION EXTRACTOR
 ───────────────────────────────────────────────────────────── */
function parseEducation(eduLines, allLines) {
  const education = [];
  const src = eduLines.length > 0 ? eduLines : allLines;

  for (const line of src) {
    const lower = line.toLowerCase();
    if (DEGREE_KEYWORDS.some(d => lower.includes(d))) {
      const gpaMatch = line.match(/(\d+\.?\d*)\s*\/\s*10|\b([0-9]\.[0-9])\s*gpa\b/i);
      const yearMatch = line.match(/\b(19|20)\d{2}\b/);
      education.push({
        degree: line.substring(0, 90),
        institution: '',
        year: yearMatch ? yearMatch[0] : '',
        gpa: gpaMatch ? gpaMatch[0] : '',
      });
    }
  }
  return education.slice(0, 4);
}

/* ─────────────────────────────────────────────────────────────
   WEIGHTED SCORING ENGINE
 ───────────────────────────────────────────────────────────── */
/**
 * Calculate weighted ATS score.
 * @param {object} breakdown - { skillMatch, experienceRelevance, roleAlignment, educationRelevance, resumeQuality }
 * @returns {number} 0-100
 */
function calculateWeightedScore({ skillMatch, experienceRelevance, roleAlignment, educationRelevance, resumeQuality }) {
  const weights = {
    skillMatch:          0.50,
    experienceRelevance: 0.15,
    roleAlignment:       0.15,
    educationRelevance:  0.10,
    resumeQuality:       0.10,
  };
  const raw =
    skillMatch          * weights.skillMatch +
    experienceRelevance * weights.experienceRelevance +
    roleAlignment       * weights.roleAlignment +
    educationRelevance  * weights.educationRelevance +
    resumeQuality       * weights.resumeQuality;

  return Math.min(100, Math.max(0, Math.round(raw)));
}

function getFitTier(score) {
  if (score >= 78) return 'Top Match';
  if (score >= 52) return 'Good Fit';
  return 'Low Fit';
}

/* ─────────────────────────────────────────────────────────────
   JD MATCHING ENGINE
 ───────────────────────────────────────────────────────────── */
function extractJDSkills(jdText) {
  return extractSkillsFromText(jdText);
}

function extractRoleFromJD(jdText) {
  // Common job title lines
  const lines = jdText.split('\n').filter(Boolean);
  for (const line of lines.slice(0, 5)) {
    if (/\b(developer|engineer|manager|analyst|consultant|specialist|lead|architect|designer|hr|recruiter|coordinator|executive|officer)\b/i.test(line) && line.length < 80) {
      return line.trim().toLowerCase();
    }
  }
  return '';
}

function biggramOverlap(a, b) {
  const bigrams = str => {
    const words = str.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const result = new Set();
    if (words.length > 0) result.add(words.join(' '));
    for (let i = 0; i < words.length - 1; i++) result.add(words[i] + ' ' + words[i + 1]);
    words.forEach(w => result.add(w));
    return result;
  };
  const aSet = bigrams(a || '');
  const bSet = bigrams(b || '');
  let shared = 0;
  for (const item of aSet) if (bSet.has(item)) shared++;
  const union = new Set([...aSet, ...bSet]).size;
  return union === 0 ? 0 : (shared / union);
}

/* ─────────────────────────────────────────────────────────────
   SUGGESTIONS GENERATOR
 ───────────────────────────────────────────────────────────── */
function generateSuggestions({ found, missing, resumeText, jdText, scoreBreakdown }) {
  const suggestions = { strengths: [], weaknesses: [], suggestions: [] };

  // Strengths
  if (found.length >= 5) {
    suggestions.strengths.push({
      type: 'success',
      text: `Strong skill match: ${found.slice(0, 5).map(s => titleCase(s)).join(', ')} — directly aligned with JD requirements`,
    });
  }
  if (scoreBreakdown.experienceRelevance >= 70) {
    suggestions.strengths.push({ type: 'success', text: 'Work experience is relevant and aligns well with the required role' });
  }
  if (scoreBreakdown.resumeQuality >= 80) {
    suggestions.strengths.push({ type: 'success', text: 'Resume is well-structured with all key sections present (Skills, Experience, Education)' });
  }
  if (scoreBreakdown.roleAlignment >= 70) {
    suggestions.strengths.push({ type: 'success', text: 'Candidate profile closely mirrors the target job role' });
  }

  // Weaknesses
  if (missing.length > 0) {
    suggestions.weaknesses.push({
      type: 'error',
      text: `${missing.length} required skill(s) missing: ${missing.slice(0, 5).map(s => titleCase(s)).join(', ')}${missing.length > 5 ? ` and ${missing.length - 5} more` : ''}`,
    });
  }
  if (scoreBreakdown.experienceRelevance < 40) {
    suggestions.weaknesses.push({ type: 'warning', text: 'Work experience section appears limited or does not align with the job role' });
  }
  if (scoreBreakdown.educationRelevance < 40) {
    suggestions.weaknesses.push({ type: 'warning', text: 'Educational background may not meet standard requirements — verify degree details' });
  }
  if (scoreBreakdown.resumeQuality < 50) {
    suggestions.weaknesses.push({ type: 'warning', text: 'Resume appears incomplete — missing key sections (summary, skills, or education)' });
  }

  // Actionable suggestions
  if (missing.length > 0) {
    suggestions.suggestions.push({
      type: 'warning',
      text: `Add these skills if applicable: ${missing.slice(0, 6).map(s => titleCase(s)).join(', ')}`,
    });
  }
  const wordCount = (resumeText || '').split(/\s+/).length;
  if (wordCount < 300) {
    suggestions.suggestions.push({ type: 'warning', text: 'Resume is too short (<300 words) — expand experience bullet points with achievements and metrics' });
  } else if (wordCount > 1200) {
    suggestions.suggestions.push({ type: 'warning', text: 'Resume is too long (>1200 words) — trim to keep focus; recruiters scan in 6–8 seconds' });
  } else {
    suggestions.suggestions.push({ type: 'success', text: `Resume length is optimal (${wordCount} words)` });
  }

  if (resumeText && !resumeText.match(/\d+%|\d+x|\d+ (million|lakh|crore|users|clients)/i)) {
    suggestions.suggestions.push({ type: 'warning', text: 'Add quantified achievements (e.g., "reduced cost by 30%", "managed team of 8") for higher impact' });
  }
  if (resumeText && !resumeText.toLowerCase().includes('linkedin')) {
    suggestions.suggestions.push({ type: 'warning', text: 'Add your LinkedIn profile URL — most recruiters verify profiles' });
  }

  return suggestions;
}

function titleCase(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.slice(1));
}

/* ─────────────────────────────────────────────────────────────
   RESUME QUALITY SCORER
 ───────────────────────────────────────────────────────────── */
function scoreResumeQuality(sections, wordCount, hasContact) {
  let score = 0;
  if (sections.summary.length > 0)       score += 15;
  if (sections.skills.length > 0)         score += 25;
  if (sections.experience.length > 0)     score += 30;
  if (sections.education.length > 0)      score += 15;
  if (sections.certification.length > 0)  score += 10;
  if (hasContact)                         score += 5;
  // Word count bonus
  if (wordCount >= 300 && wordCount <= 1200) score = Math.min(100, score + 10);
  return score;
}

/* ─────────────────────────────────────────────────────────────
   EXPERIENCE RELEVANCE SCORER
 ───────────────────────────────────────────────────────────── */
function scoreExperience(expLines, jdText) {
  if (!expLines || expLines.length === 0) return 10;
  const yearsMatch = expLines.join(' ').match(/(\d+)\+?\s*(year|yr)/i);
  const years = yearsMatch ? parseInt(yearsMatch[1], 10) : 1;

  const jdYearsMatch = jdText ? jdText.match(/(\d+)\+?\s*(year|yr)/i) : null;
  const jdYears = jdYearsMatch ? parseInt(jdYearsMatch[1], 10) : 0;

  let baseScore = Math.min(years * 12, 72); // 6 years = 72 pts base

  // Bonus: JD experience met
  if (jdYears > 0 && years >= jdYears) baseScore = Math.min(100, baseScore + 20);
  else if (jdYears > 0 && years >= jdYears * 0.7) baseScore = Math.min(100, baseScore + 10);

  return baseScore;
}

/* ─────────────────────────────────────────────────────────────
   EDUCATION RELEVANCE SCORER
 ───────────────────────────────────────────────────────────── */
function scoreEducation(education, jdText) {
  if (!education || education.length === 0) return 20;
  let score = 40;
  const hasAdvanced = education.some(e => /mba|m\.tech|mtech|m\.e|msc|phd|pgdm/i.test(e.degree));
  const hasDegree   = education.some(e => /b\.tech|btech|bsc|bca|b\.e|be |bcom|bba|b\.a /i.test(e.degree));
  const hasDiploma  = education.some(e => /diploma/i.test(e.degree));

  if (hasAdvanced)    score = 100;
  else if (hasDegree) score = 80;
  else if (hasDiploma) score = 55;

  // Check if JD requires specific degrees
  const needsMasters = jdText && /master|mba|m\.tech|postgrad/i.test(jdText);
  if (needsMasters && !hasAdvanced) score = Math.max(score - 20, 10);
  return score;
}

/* ─────────────────────────────────────────────────────────────
   MAIN PARSE FUNCTION
 ───────────────────────────────────────────────────────────── */
const parseResume = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  let text       = '';
  let docxMeta   = null;  // populated only for DOCX/DOC files

  try {
    if (ext === '.pdf') {
      // ── PDF ──────────────────────────────────────────────
      const pdfParse = require('pdf-parse');
      const buffer   = fs.readFileSync(filePath);
      const data     = await pdfParse(buffer);
      text = data.text || '';

    } else if (['.txt', '.text'].includes(ext)) {
      // ── Plain text ───────────────────────────────────────
      text = fs.readFileSync(filePath, 'utf-8');

    } else if (['.doc', '.docx'].includes(ext)) {
      // ── DOCX / DOC  (improved engine) ───────────────────
      const result = await parseDocx(filePath);
      text     = result.text || '';
      docxMeta = {
        method:      result.method,
        warnings:    result.warnings,
        confidence:  result.confidence,
        parseErrors: result.parseErrors,
      };

      // Log any parse errors without breaking the workflow
      if (result.parseErrors && result.parseErrors.length > 0) {
        console.error('[Resume Parser] DOCX parse errors:', result.parseErrors);
      }
      if (result.warnings && result.warnings.length > 0) {
        console.warn('[Resume Parser] DOCX warnings:', result.warnings);
      }

    } else if (['.rtf'].includes(ext)) {
      // ── RTF: strip control words, extract readable text ──
      const raw = fs.readFileSync(filePath, 'latin1');
      text = raw
        .replace(/\{\\[^{}]+\}/g, '')          // remove embedded groups
        .replace(/\\[a-z]+\d* ?/gi, ' ')         // remove control words
        .replace(/[{}\\]/g, ' ')                  // remove braces/backslashes
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ');   // strip non-printable

    } else {
      // ── Unknown: best-effort ASCII strip ─────────────────
      text = fs.readFileSync(filePath, 'utf-8')
               .replace(/[^\x20-\x7E\n\r\t]/g, ' ');
    }
  } catch (err) {
    console.error('[Resume Parser] File read error:', err.message);
    text = '';
  }

  // Guard: prevent empty-text result from reaching extractInfo
  if (!text || text.trim().length < 20) {
    console.warn('[Resume Parser] Extracted text too short — returning empty result');
    const empty = emptyResult();
    if (docxMeta) empty._docxMeta = docxMeta;
    return empty;
  }

  const result = extractInfo(text);
  if (docxMeta) result._docxMeta = docxMeta;
  return result;
};

const extractInfo = (text) => {
  if (!text || text.trim().length === 0) {
    return emptyResult();
  }

  // Remove duplicate lines before processing (helps multi-column DOCX)
  const deduped = [];
  const seenLines = new Set();
  for (const l of text.split('\n')) {
    const t = l.trim();
    if (t && !seenLines.has(t)) { seenLines.add(t); deduped.push(t); }
  }
  const lines = deduped.filter(Boolean);
  const cleanText = lines.join('\n');

  const sections = parseSections(lines);

  // ── Contact Info ──────────────────────────────────────
  const emailMatch    = cleanText.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  // Phone: Indian (+91 / 10-digit 6-9 start) or international
  const phoneMatch    = cleanText.match(
    /(?:\+?91[\s\-.]?)?[6-9]\d{9}|(?:\+?1[\s\-.]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}|\+\d{1,3}[\s\-.]?\d{6,12}/
  );
  // Links — allow optional https:// prefix already in text
  const linkedinMatch = cleanText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w%-]+/i);
  const githubMatch   = cleanText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[\w%-]+/i);
  const portfolioMatch = cleanText.match(/(?:https?:\/\/)[\w.-]+\.(?:io|com|dev|me|in|co)[\w/.-]*/i);

  const email    = emailMatch    ? emailMatch[0]    : '';
  const phone    = phoneMatch    ? phoneMatch[0]    : '';
  const linkedin = linkedinMatch
    ? (linkedinMatch[0].startsWith('http') ? linkedinMatch[0] : `https://${linkedinMatch[0]}`)
    : '';
  const github = githubMatch
    ? (githubMatch[0].startsWith('http') ? githubMatch[0] : `https://${githubMatch[0]}`)
    : '';
  const portfolio = portfolioMatch ? portfolioMatch[0] : '';

  // ── Name — improved heuristic ─────────────────────────
  // Skip lines that look like section headers, URLs, emails, phones, addresses
  const skipPatterns = [
    /^[\d\s.()+-]+$/,              // all digits / phone
    /@/,                           // email
    /http|www\.|linkedin|github/i, // URL
    /^(resume|curriculum|cv|profile|skills|experience|education|summary|objective|contact|address|about)/i,
  ];
  const nameLine = lines.find(l =>
    l.length >= 3 && l.length <= 60 &&
    !skipPatterns.some(p => p.test(l)) &&
    /[A-Za-z]/.test(l)            // must have at least one letter
  ) || lines[0] || '';
  // Capitalise properly and strip stray punctuation from name
  const name = nameLine.replace(/[^A-Za-z .'-]/g, ' ').replace(/\s+/g, ' ').trim();

  // ── Location ─────────────────────────────────────────
  const CITIES = [
    'bangalore','bengaluru','mumbai','delhi','new delhi','noida','gurgaon','gurugram',
    'hyderabad','chennai','kolkata','pune','ahmedabad','jaipur','lucknow','chandigarh',
    'indore','bhopal','nagpur','surat','vadodara','kochi','thiruvananthapuram','coimbatore',
    'madurai','visakhapatnam','vijayawada','patna','ranchi','bhubaneswar','raipur',
    'dehradun','guwahati','amritsar','faridabad','ghaziabad','agra','varanasi','kanpur',
    'navi mumbai','greater noida','thane','nashik','aurangabad','rajkot',
  ];
  let location = '';
  const lowerText = cleanText.toLowerCase();
  for (const city of CITIES) {
    if (lowerText.includes(city)) {
      location = city.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      break;
    }
  }

  // ── Skills ───────────────────────────────────────────
  const allSkillsFound = extractSkillsFromText(cleanText);
  const skills = allSkillsFound.map(s => ({
    name: titleCase(s),
    level: inferLevel(s, cleanText),
  }));

  // ── Experience ───────────────────────────────────────
  const expSource  = sections.experience.length > 0 ? sections.experience : [];
  const experience = parseExperience(expSource);

  // ── Derived experience fields ─────────────────────────
  const jobTitles    = [...new Set(experience.map(e => e.title).filter(Boolean))];
  const companyNames = [...new Set(experience.map(e => e.company).filter(Boolean))];

  // Total experience: extract from text or count roles
  const totalExpMatch = cleanText.match(/(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:total|overall|work)?\s*experience/i);
  const totalExperience = totalExpMatch
    ? totalExpMatch[0].trim()
    : experience.length > 0 ? `${experience.length} role(s) detected` : '';

  // ── Education ────────────────────────────────────────
  const education = parseEducation(sections.education, lines);

  // ── Certifications ───────────────────────────────────
  const certLines    = sections.certification;
  const certKeywords = ['certif', 'aws certified', 'google certified', 'microsoft certified', 'pmp', 'scrum master', 'six sigma', 'itil'];
  const certifications = [
    ...certLines,
    ...lines.filter(l => certKeywords.some(k => l.toLowerCase().includes(k)) && !certLines.includes(l)),
  ].map(c => c.replace(/^[•·\-–*]\s*/, '')).filter(c => c.length > 5).slice(0, 8);

  // ── Projects ─────────────────────────────────────────
  const projects = sections.project
    .map(l => l.replace(/^[•·\-–*]\s*/, '').trim())
    .filter(l => l.length > 8)
    .slice(0, 10);

  // ── Summary ──────────────────────────────────────────
  const summaryText = sections.summary.slice(0, 3).join(' ').substring(0, 320) ||
    lines.slice(1, 4).join(' ').substring(0, 320);

  // ── Basic resume quality score (no JD) ───────────────
  const hasContact   = !!(email || phone);
  const wordCount    = cleanText.split(/\s+/).filter(Boolean).length;
  const qualityScore = scoreResumeQuality(sections, wordCount, hasContact);
  const eduScore     = scoreEducation(education, '');
  const expScore     = scoreExperience(sections.experience, '');

  const scoreBreakdown = {
    skillMatch:          skills.length > 0 ? Math.min(100, skills.length * 6) : 20,
    experienceRelevance: expScore,
    roleAlignment:       50, // neutral without JD
    educationRelevance:  eduScore,
    resumeQuality:       qualityScore,
  };
  const atsScore = calculateWeightedScore(scoreBreakdown);
  const fitTier  = getFitTier(atsScore);

  const noJDSuggestions = generateBaseSuggestions(email, phone, linkedin, skills.length, wordCount, education.length);

  return {
    name,
    email,
    phone,
    location,
    linkedin,
    github,
    portfolio,
    summary: summaryText,
    atsScore,
    fitTier,
    scoreBreakdown,
    skills,
    experience,
    education,
    certifications,
    projects,
    links: { linkedin, github, portfolio },
    totalExperience,
    jobTitles,
    companyNames,
    keywords: { found: allSkillsFound.map(s => titleCase(s)), missing: [] },
    suggestions: noJDSuggestions,
    wordCount,
    pageCount: Math.max(1, Math.ceil(wordCount / 400)),
    format: '',
  };
};

function generateBaseSuggestions(email, phone, linkedin, skillCount, wordCount, eduCount) {
  const items = [];
  if (!email)        items.push({ type: 'error',   text: 'No email address found — add your professional email' });
  if (!phone)        items.push({ type: 'error',   text: 'No phone number found — add your contact number' });
  if (!linkedin)     items.push({ type: 'warning', text: 'No LinkedIn profile found — recruiters verify online presence' });
  if (skillCount < 3) items.push({ type: 'warning', text: 'Very few skills detected — add a dedicated Skills section' });
  if (wordCount < 200) items.push({ type: 'warning', text: 'Resume is very short — add more detail to experience and skills' });
  if (eduCount === 0) items.push({ type: 'warning', text: 'No education section detected — add your highest qualification' });
  if (email && phone) items.push({ type: 'success', text: 'Contact information is complete and well-formatted' });
  if (skillCount >= 5) items.push({ type: 'success', text: 'Good range of skills detected' });
  return items;
}

function emptyResult() {
  return {
    name: '', email: '', phone: '', location: '', linkedin: '', github: '',
    summary: 'Could not extract content from resume. Please ensure the file is readable.',
    atsScore: 0, fitTier: 'Low Fit',
    scoreBreakdown: { skillMatch: 0, experienceRelevance: 0, roleAlignment: 0, educationRelevance: 0, resumeQuality: 0 },
    skills: [], experience: [], education: [], certifications: [],
    keywords: { found: [], missing: [] },
    suggestions: [{ type: 'error', text: 'Could not parse resume — try a PDF or plain-text version' }],
    wordCount: 0, pageCount: 1, format: '',
  };
}

/* ─────────────────────────────────────────────────────────────
   JD MATCHING  (called with jobDescription provided)
 ───────────────────────────────────────────────────────────── */
const matchWithJD = (parsed, jdText) => {
  const jdSkills     = extractJDSkills(jdText);
  const resumeSkills = new Set(parsed.skills.map(s => canonicalise(s.name)));

  const found   = jdSkills.filter(s => resumeSkills.has(s));
  const missing = jdSkills.filter(s => !resumeSkills.has(s));

  const skillMatchPct = jdSkills.length > 0 ? (found.length / jdSkills.length) * 100 : 0;

  // Role alignment via bigram overlap
  const candidateTitle = (parsed.experience && parsed.experience.length > 0) ? parsed.experience[0].title : '';
  const jdRole         = extractRoleFromJD(jdText);
  const roleAlignment  = jdRole && candidateTitle
    ? Math.round(biggramOverlap(candidateTitle, jdRole) * 100)
    : 50;

  // Experience relevance vs JD
  const expLines      = (parsed.experience || []).flatMap(e => [e.title, e.company, ...(e.points || [])]);
  const expRelevance  = scoreExperience(expLines, jdText);
  const eduRelevance  = scoreEducation(parsed.education, jdText);
  const qualityScore  = parsed.scoreBreakdown?.resumeQuality ?? 50;

  const scoreBreakdown = {
    skillMatch:          Math.round(skillMatchPct),
    experienceRelevance: expRelevance,
    roleAlignment,
    educationRelevance:  eduRelevance,
    resumeQuality:       qualityScore,
  };

  const atsScore = calculateWeightedScore(scoreBreakdown);
  const fitTier  = getFitTier(atsScore);

  const resumeText = [
    parsed.summary || '',
    (parsed.skills || []).map(s => s.name).join(' '),
    (parsed.experience || []).map(e => `${e.title} ${e.company} ${e.points?.join(' ') || ''}`).join(' '),
    (parsed.education || []).map(e => e.degree).join(' '),
    (parsed.certifications || []).join(' '),
  ].join(' ');

  const structuredSuggestions = generateSuggestions({
    found, missing, resumeText, jdText, scoreBreakdown,
  });

  // Flatten suggestions for legacy frontend compatibility,
  // but also attach structured version
  const flatSuggestions = [
    ...structuredSuggestions.strengths,
    ...structuredSuggestions.weaknesses,
    ...structuredSuggestions.suggestions,
  ];

  return {
    ...parsed,
    atsScore,
    fitTier,
    scoreBreakdown,
    keywords: {
      found:   found.map(s => titleCase(s)),
      missing: missing.map(s => titleCase(s)),
    },
    suggestions: flatSuggestions,
    structuredFeedback: structuredSuggestions,
  };
};

module.exports = { parseResume, matchWithJD };
