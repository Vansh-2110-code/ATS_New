const { classifyUniversalRole, calculateSeniority, UNIVERSAL_ROLES } = require('../backend/src/utils/universalRoleClassifier');

console.log('Testing Universal Job Role Classifier across Universal Profiles...\n');

const testProfiles = [
  {
    name: 'Candidate 1 - BPO Voice',
    parsed: {
      name: 'Rohan Sharma',
      summary: 'Experienced customer service executive with 3 years handling international voice calling, customer support, inbound queries, and resolving technical queries for US process clients.',
      skills: [{ name: 'Customer Service' }, { name: 'Voice Calling' }, { name: 'Communication' }, { name: 'Inbound Calling' }],
      experience: [{ title: 'Customer Support Executive', company: 'Teleperformance', duration: '3 years' }],
      education: [{ degree: 'B.Com', institution: 'Delhi University' }]
    },
    expectedDomain: 'BPO / Customer Operations'
  },
  {
    name: 'Candidate 2 - React Frontend Dev',
    parsed: {
      name: 'Priya Ramesh',
      summary: 'Senior Frontend Engineer with 4.5 years building scalable web applications in React, TypeScript, Redux Toolkit, Tailwind CSS, and Git.',
      skills: [{ name: 'React.js' }, { name: 'TypeScript' }, { name: 'Tailwind CSS' }, { name: 'Git' }],
      experience: [{ title: 'Senior Frontend Developer', company: 'Infosys', duration: '4.5 years' }],
      education: [{ degree: 'B.Tech Computer Science', institution: 'VTU' }]
    },
    expectedDomain: 'IT & Software Development'
  },
  {
    name: 'Candidate 3 - Inside Sales BDE',
    parsed: {
      name: 'Amit Patel',
      summary: 'Dynamic Inside Sales and Business Development Executive with 2 years generating B2B leads, cold outreach, handling CRM pipelines, client presentations, and closing deals.',
      skills: [{ name: 'Inside Sales' }, { name: 'Lead Generation' }, { name: 'B2B Sales' }, { name: 'CRM' }, { name: 'Cold Calling' }],
      experience: [{ title: 'Business Development Executive', company: 'Byjus', duration: '2 years' }],
      education: [{ degree: 'BBA', institution: 'Pune University' }]
    },
    expectedDomain: 'Sales & Business Development'
  },
  {
    name: 'Candidate 4 - US Healthcare AR Caller',
    parsed: {
      name: 'Kavitha S',
      summary: 'Healthcare associate with 3 years in US Healthcare revenue cycle management, AR calling, insurance claim follow-up, denials management, and HIPAA compliance.',
      skills: [{ name: 'AR Calling' }, { name: 'US Healthcare' }, { name: 'Denial Management' }, { name: 'Revenue Cycle Management' }],
      experience: [{ title: 'Senior AR Caller', company: 'Omega Healthcare', duration: '3 years' }],
      education: [{ degree: 'B.Sc Biotechnology', institution: 'Madras University' }]
    },
    expectedDomain: 'Healthcare & Medical BPO'
  }
];

const mockOpenJobs = [
  {
    _id: 'job1',
    jrNumber: 'JR-2024-101',
    jobTitle: 'Customer Support Associate (US Voice)',
    companyName: 'Concentrix',
    skills: ['Customer Service', 'Voice Calling', 'Communication'],
    division: 'BPO / Customer Operations',
    location: 'Bangalore',
    experience: '1-3 Years',
    positions: 15,
    status: 'Open'
  },
  {
    _id: 'job2',
    jrNumber: 'JR-2024-102',
    jobTitle: 'Frontend Developer (React)',
    companyName: 'TechCorp Solutions',
    skills: ['React.js', 'TypeScript', 'Tailwind CSS'],
    division: 'IT & Software Development',
    location: 'Bangalore',
    experience: '3-5 Years',
    positions: 4,
    status: 'Open'
  }
];

let allPassed = true;

testProfiles.forEach(tp => {
  const profile = classifyUniversalRole(tp.parsed, mockOpenJobs);
  console.log(`=== ${tp.name} ===`);
  console.log(`Best-Fit Role: ${profile.bestFitRole}`);
  console.log(`Primary Domain: ${profile.primaryDomain} (Confidence: ${profile.confidenceScore}%)`);
  console.log(`Seniority: ${profile.seniority.label} (${profile.seniority.years} Yrs)`);
  console.log(`Top 2 Roles: ${profile.topRecommendations.slice(0, 2).map(r => `${r.roleName} (${r.matchScore}%)`).join(' | ')}`);
  console.log(`Matched Open JRs: ${profile.matchedActiveJobs.map(j => `${j.jrNumber} - ${j.jobTitle} (${j.matchScore}%)`).join(', ') || 'None'}`);

  const domainMatch = profile.primaryDomain === tp.expectedDomain;
  console.log(`Verification: ${domainMatch ? '✅ PASS' : '❌ FAIL'}\n`);
  if (!domainMatch) allPassed = false;
});

if (allPassed) {
  console.log('🎉 ALL UNIVERSAL ROLE CLASSIFICATION TESTS PASSED 100%!');
} else {
  console.error('❌ Some tests failed.');
  process.exit(1);
}
