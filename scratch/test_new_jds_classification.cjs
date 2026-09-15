const { classifyUniversalRole } = require('../backend/src/utils/universalRoleClassifier');

console.log('Testing Universal Role Classifier for new JDs...\n');

// Candidate 1: DMO Solutions Architect
const candidateDmo = {
  jobTitle: 'Senior Digital Marketing Solutions Architect',
  totalExperience: '9 Years',
  summary: 'Over 9 years of experience in performance marketing, Ad Operations (AdOps), and presales consulting. Expertise in Google Ads, Meta Ads Manager, DV360, The Trade Desk, campaign architecture, and tracking setup with Conversion API and GA4. Proven track record leading RFP responses and pitch presentations.',
  skills: ['Ad Operations (AdOps)', 'Presales', 'Google Ads', 'Meta Ads', 'DV360', 'The Trade Desk', 'Campaign Architecture', 'GA4', 'Conversion API', 'ROAS', 'RFP'],
  experience: [
    {
      title: 'DMO Solutions Architect & Presales Lead',
      company: 'Omnicom Media Group',
      duration: '5 Years'
    }
  ]
};

// Candidate 2: Telecom Transition Project Manager
const candidateTransition = {
  jobTitle: 'Transition Project Manager',
  totalExperience: '16 Years',
  summary: '16+ years of telecom infrastructure and network operations experience. Expertise in Day 2 Operational Readiness, service transition, SLA governance, NOC / GRE NOC coordination, RACI matrices, SES door lock systems, and production handoff.',
  skills: ['Service Transition', 'Day 2 Readiness', 'Operational Readiness', 'SLA Governance', 'Incident Management', 'NOC', 'GRE NOC', 'SES Door Lock', 'RACI Matrix', 'Advanced Excel'],
  experience: [
    {
      title: 'Principal Transition Project Manager',
      company: 'Ericsson / Infosys BPM',
      duration: '6 Years'
    }
  ]
};

// Candidate 3: Telecom Transformation Project Manager
const candidateTransformation = {
  jobTitle: 'Transformation Project Manager',
  totalExperience: '17 Years',
  summary: '17 years of experience delivering large-scale telecom infrastructure transformation and long-haul fiber network deployment. Expert in hut deployment, lateral builds, Construction & Engineering (C&E), telemetry systems, BMS, operational turn-up, and IRU / O&M commercial readiness.',
  skills: ['Long-Haul Fiber', 'Fiber Build', 'Hut Deployment', 'Lateral Builds', 'Construction & Engineering (C&E)', 'BMS', 'Telemetry Systems', 'Operational Turn-Up', 'IRU Build Charges', 'Customer Governance'],
  experience: [
    {
      title: 'Senior Transformation Program Manager',
      company: 'Zayo Group / Telco Infra',
      duration: '7 Years'
    }
  ]
};

const res1 = classifyUniversalRole(candidateDmo);
console.log('--- Candidate 1 (DMO Solutions Architect) ---');
console.log('Role Name  :', res1.bestFitRole);
console.log('Domain     :', res1.primaryDomain);
console.log('Confidence :', res1.confidenceScore);
console.log('Seniority  :', res1.seniority?.label);
console.log('Top Recs   :', res1.topRecommendations?.map(r => `${r.roleName} (${r.matchScore}%)`).join(' | '));

const res2 = classifyUniversalRole(candidateTransition);
console.log('\n--- Candidate 2 (Telecom Transition PM) ---');
console.log('Role Name  :', res2.bestFitRole);
console.log('Domain     :', res2.primaryDomain);
console.log('Confidence :', res2.confidenceScore);
console.log('Seniority  :', res2.seniority?.label);
console.log('Top Recs   :', res2.topRecommendations?.map(r => `${r.roleName} (${r.matchScore}%)`).join(' | '));

const res3 = classifyUniversalRole(candidateTransformation);
console.log('\n--- Candidate 3 (Telecom Transformation PM) ---');
console.log('Role Name  :', res3.bestFitRole);
console.log('Domain     :', res3.primaryDomain);
console.log('Confidence :', res3.confidenceScore);
console.log('Seniority  :', res3.seniority?.label);
console.log('Top Recs   :', res3.topRecommendations?.map(r => `${r.roleName} (${r.matchScore}%)`).join(' | '));

let allPassed = true;
if (!res1.bestFitRole.includes('DMO Solutions Architect') || res1.confidenceScore < 75) allPassed = false;
if (!res2.bestFitRole.includes('Telecom Transition') || res2.confidenceScore < 75) allPassed = false;
if (!res3.bestFitRole.includes('Telecom Transformation') || res3.confidenceScore < 75) allPassed = false;

console.log('\n=============================================================');
console.log('VERIFICATION RESULT:', allPassed ? '✅ ALL 3 ROLES ACCURATELY CLASSIFIED!' : '❌ FAILURE');
console.log('=============================================================');
