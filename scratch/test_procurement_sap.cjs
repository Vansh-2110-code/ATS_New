const { classifyUniversalRole } = require('../backend/src/utils/universalRoleClassifier');

const procurementCandidate = {
  name: 'Rajesh Kumar',
  summary: 'Procurement specialist with 5 years experience in vendor management, purchase orders, sourcing, contract negotiation, RFQ/RFP and supply chain operations.',
  skills: [{ name: 'Procurement' }, { name: 'Vendor Management' }, { name: 'Purchase Orders' }, { name: 'Sourcing' }, { name: 'Supply Chain' }, { name: 'Negotiation' }],
  experience: [{ title: 'Senior Procurement Specialist', company: 'L&T', duration: '5 years' }],
  education: [{ degree: 'B.Tech Mechanical', institution: 'NIT' }]
};

const sapCandidate = {
  name: 'Vikas Gupta',
  summary: 'SAP MM / S4 HANA Functional Consultant with 6 years implementing ERP modules, master data, procure to pay (P2P), configuration, and integration with FICO and SD.',
  skills: [{ name: 'SAP MM' }, { name: 'SAP S/4 HANA' }, { name: 'ERP' }, { name: 'Procure to Pay (P2P)' }, { name: 'SAP Configuration' }, { name: 'Master Data' }],
  experience: [{ title: 'SAP Functional Consultant', company: 'TCS', duration: '6 years' }],
  education: [{ degree: 'B.E Computer Science', institution: 'Anna University' }]
};

console.log('--- Current Classification of Procurement Candidate ---');
const pRes = classifyUniversalRole(procurementCandidate, []);
console.log('Result:', pRes.bestFitRole, '| Domain:', pRes.primaryDomain, '| Score:', pRes.confidenceScore);

console.log('\n--- Current Classification of SAP Candidate ---');
const sRes = classifyUniversalRole(sapCandidate, []);
console.log('Result:', sRes.bestFitRole, '| Domain:', sRes.primaryDomain, '| Score:', sRes.confidenceScore);
