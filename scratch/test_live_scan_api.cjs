const fs = require('fs');
const path = require('path');

// Test the classifier logic with live server behavior
const { classifyUniversalRole } = require('../backend/src/utils/universalRoleClassifier');

const sampleCandidate = {
  name: 'Ananya Verma',
  email: 'ananya.verma@example.com',
  phone: '9876543219',
  summary: 'Experienced customer service and international voice calling specialist with 3 years handling inbound and outbound BPO processes for US telecom clients.',
  skills: [{ name: 'Customer Service' }, { name: 'Voice Calling' }, { name: 'Inbound Calling' }, { name: 'Client Support' }],
  experience: [{ title: 'Senior Customer Support Representative', company: 'Concentrix', duration: '3 years' }],
  education: [{ degree: 'B.A. English', institution: 'Bangalore University' }]
};

const profile = classifyUniversalRole(sampleCandidate, []);

console.log('Testing Universal Role Engine Output:');
console.log('Best-Fit Role:', profile.bestFitRole);
console.log('Domain:', profile.primaryDomain);
console.log('Confidence Score:', profile.confidenceScore + '%');
console.log('Seniority:', profile.seniority.label);
console.log('Top Recommendations Count:', profile.topRecommendations.length);

if (profile.bestFitRole && profile.primaryDomain && profile.confidenceScore > 60) {
  console.log('\n✅ TEST PASSED: Engine produces complete Universal Role profile!');
} else {
  console.error('\n❌ TEST FAILED');
  process.exit(1);
}
