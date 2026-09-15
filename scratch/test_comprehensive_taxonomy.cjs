const { classifyUniversalRole } = require('../backend/src/utils/universalRoleClassifier');

const testCases = [
  {
    name: 'Procurement Specialist (from Infosys TSO JD)',
    candidate: {
      name: 'Ramesh Patel',
      jobTitle: 'Technology Support Specialist', // Tricky title from JD!
      summary: 'Procurement operations executive handling PR/PO creation, vendor coordination, L1 procurement support, invoice validation, GRN updates and P2P cycle.',
      skills: [{ name: 'Procurement' }, { name: 'PR/PO Creation' }, { name: 'Vendor Coordination' }, { name: 'P2P' }, { name: 'L1 Support' }],
      experience: [{ title: 'Technology Support Specialist - Procurement', company: 'Infosys BPM', duration: '3 years' }]
    },
    expectedDomain: 'Procurement & Supply Chain'
  },
  {
    name: 'SAP MM / Ariba Consultant',
    candidate: {
      name: 'Sneha Rao',
      jobTitle: 'Technology Support Specialist', // Tricky title from JD!
      summary: 'SAP MM and Ariba consultant with 4 years experience in material management, purchase orders, vendor evaluation, P2P, master data, and ERP configuration.',
      skills: [{ name: 'SAP MM' }, { name: 'SAP Ariba' }, { name: 'Vendor Evaluation' }, { name: 'Purchase Orders' }],
      experience: [{ title: 'SAP Functional Specialist', company: 'Wipro', duration: '4 years' }]
    },
    expectedDomain: 'Enterprise Systems & ERP'
  },
  {
    name: '.NET Fullstack Developer (from Infosys TSO JD)',
    candidate: {
      name: 'Amit Sharma',
      jobTitle: 'Technology Support Specialist', // Tricky title from JD!
      summary: 'Proficient in .NET Core, ASP.NET Core MVC, C#, Angular, Web API, SQL Server, Entity Framework. Strong microservices and RESTful API development.',
      skills: [{ name: '.NET Core' }, { name: 'C#' }, { name: 'Angular' }, { name: 'SQL Server' }, { name: 'Web API' }],
      experience: [{ title: 'Technology Support Specialist - .Net', company: 'Infosys BPM', duration: '3 years' }]
    },
    expectedDomain: 'IT & Software Development'
  },
  {
    name: 'AWS Cloud & Redshift DBA (from Infosys TSO JD)',
    candidate: {
      name: 'Karthik Raja',
      jobTitle: 'Technology Support Specialist', // Tricky title from JD!
      summary: 'AWS Cloud Engineer & Redshift DBA. Experience with EC2, S3, RDS, ECS, EKS, Terraform, Database migration, replication, high availability and disaster recovery.',
      skills: [{ name: 'AWS' }, { name: 'AWS Redshift' }, { name: 'Terraform' }, { name: 'Database Administration' }],
      experience: [{ title: 'Cloud Data Specialist', company: 'Cognizant', duration: '4 years' }]
    },
    expectedDomain: 'IT & Software Development'
  },
  {
    name: 'ITIL Change Manager (from Infosys TSO JD)',
    candidate: {
      name: 'Deepak Joshi',
      jobTitle: 'Technology Support Specialist', // Tricky title from JD!
      summary: 'Overall responsible for full E2E life cycle of Change Management processes. Day to day coordination of Change Requests, CAB meetings, approvals and ITSM reporting.',
      skills: [{ name: 'Change Management' }, { name: 'ITIL' }, { name: 'CAB' }, { name: 'ITSM' }],
      experience: [{ title: 'Change Manager', company: 'Infosys BPM', duration: '4 years' }]
    },
    expectedDomain: 'IT & Software Development'
  },
  {
    name: 'Genuine International Voice Executive',
    candidate: {
      name: 'Pooja Nair',
      jobTitle: 'Customer Support Executive (Voice)',
      summary: 'Experienced international voice process specialist with 3 years handling inbound calling, US telecom customer service and call handling at Concentrix.',
      skills: [{ name: 'Customer Service' }, { name: 'Voice Calling' }, { name: 'Inbound Calling' }, { name: 'Call Handling' }],
      experience: [{ title: 'Customer Support Associate (Voice)', company: 'Concentrix', duration: '3 years' }]
    },
    expectedDomain: 'BPO / Customer Operations'
  }
];

console.log('Testing Universal Classification across all client JD personas...\n');
let allPassed = true;

testCases.forEach((tc, idx) => {
  const profile = classifyUniversalRole(tc.candidate, []);
  const match = profile.primaryDomain === tc.expectedDomain;
  console.log(`[Test ${idx + 1}] ${tc.name}`);
  console.log(`  -> Best Fit Role: ${profile.bestFitRole}`);
  console.log(`  -> Domain: ${profile.primaryDomain} (Confidence: ${profile.confidenceScore}%)`);
  console.log(`  -> Status: ${match ? '✅ PASS' : '❌ FAIL (Expected: ' + tc.expectedDomain + ')'}\n`);
  if (!match) allPassed = false;
});

if (allPassed) {
  console.log('🎉 ALL 6 COMPREHENSIVE CLIENT PERSONA TESTS PASSED 100%!');
} else {
  console.error('❌ SOME TESTS FAILED');
  process.exit(1);
}
