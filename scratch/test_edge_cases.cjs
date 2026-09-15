const { classifyUniversalRole } = require('../backend/src/utils/universalRoleClassifier');

// 1. SAP resume with "CSR" and "customer support" words
const sapCandidateWithTrickyWords = {
  name: 'Vikas Gupta',
  summary: 'SAP MM Functional Consultant with 5+ years experience. Provided level 3 customer support to client enterprise users. Active participant in company CSR initiatives.',
  skills: [{ name: 'SAP MM' }, { name: 'SAP S/4 HANA' }, { name: 'ERP Implementation' }, { name: 'Customer Support' }],
  experience: [{ title: 'Senior SAP Consultant', company: 'Infosys', duration: '5 years' }],
  education: [{ degree: 'B.Tech IT' }]
};

// 2. Procurement candidate with "customer service" words
const procurementCandidateWithTrickyWords = {
  name: 'Rajesh Kumar',
  summary: 'Procurement Specialist with 6 years experience in vendor management, purchase orders (PO), strategic sourcing and contract negotiation. Dedicated to high international customer service standards across internal global teams.',
  skills: [{ name: 'Procurement' }, { name: 'Strategic Sourcing' }, { name: 'Purchase Orders' }, { name: 'Vendor Management' }, { name: 'Customer Service' }],
  experience: [{ title: 'Procurement Executive', company: 'Tata Motors', duration: '6 years' }],
  education: [{ degree: 'B.Com / MBA Supply Chain' }]
};

// 3. Real International Voice BPO agent
const voiceCandidate = {
  name: 'Ananya Verma',
  summary: 'International Voice Process Associate with 3 years handling inbound calling and customer support for US telecom clients at Concentrix.',
  skills: [{ name: 'Customer Support' }, { name: 'Voice Calling' }, { name: 'Inbound Calling' }],
  experience: [{ title: 'Customer Support Executive (Voice)', company: 'Concentrix', duration: '3 years' }],
  education: [{ degree: 'B.A. English' }]
};

console.log('=== Test 1: SAP Candidate with tricky "customer support" & "CSR" words ===');
const res1 = classifyUniversalRole(sapCandidateWithTrickyWords, []);
console.log('Classified:', res1.bestFitRole, '| Domain:', res1.primaryDomain, '| Score:', res1.confidenceScore);
console.log('Top 3:');
res1.topRecommendations.slice(0, 3).forEach(r => console.log(` - ${r.roleName}: ${r.matchScore}%`));

console.log('\n=== Test 2: Procurement Candidate with tricky "international customer service" words ===');
const res2 = classifyUniversalRole(procurementCandidateWithTrickyWords, []);
console.log('Classified:', res2.bestFitRole, '| Domain:', res2.primaryDomain, '| Score:', res2.confidenceScore);
console.log('Top 3:');
res2.topRecommendations.slice(0, 3).forEach(r => console.log(` - ${r.roleName}: ${r.matchScore}%`));

console.log('\n=== Test 3: True BPO Voice Agent ===');
const res3 = classifyUniversalRole(voiceCandidate, []);
console.log('Classified:', res3.bestFitRole, '| Domain:', res3.primaryDomain, '| Score:', res3.confidenceScore);
console.log('Top 3:');
res3.topRecommendations.slice(0, 3).forEach(r => console.log(` - ${r.roleName}: ${r.matchScore}%`));

// Assertions
let passed = true;
if (res1.bestFitRole !== 'SAP / ERP Functional & Technical Consultant' || res1.primaryDomain !== 'Enterprise Systems & ERP') {
  console.error('❌ FAIL: SAP candidate misclassified as ' + res1.bestFitRole);
  passed = false;
}
if (res2.bestFitRole !== 'Procurement, Sourcing & Purchase Specialist' || res2.primaryDomain !== 'Procurement & Supply Chain') {
  console.error('❌ FAIL: Procurement candidate misclassified as ' + res2.bestFitRole);
  passed = false;
}
if (!res3.bestFitRole.includes('Voice') || res3.primaryDomain !== 'BPO / Customer Operations') {
  console.error('❌ FAIL: Voice candidate misclassified as ' + res3.bestFitRole);
  passed = false;
}

if (passed) {
  console.log('\n✅ ALL TRICKY EDGE CASE TESTS PASSED 100%!');
} else {
  process.exit(1);
}
