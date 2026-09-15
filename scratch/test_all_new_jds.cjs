const { classifyUniversalRole } = require('../backend/src/utils/universalRoleClassifier');

const testCases = [
  {
    name: 'P2P Specialist',
    parsed: {
      experience: [{ title: 'P2P Senior Analyst', company: 'Global Services' }],
      skills: ['P2P', 'Procure to Pay', 'Accounts Payable', 'Invoice Processing', 'Vendor Payments', 'PO & Non-PO Invoices', 'Reconciliation'],
      summary: 'Experienced P2P / Accounts Payable professional managing end-to-end Procure-to-Pay operations, invoice matching, payment processing and vendor reconciliation.'
    },
    expectedRole: 'P2P / Accounts Payable & Invoice Processing Specialist'
  },
  {
    name: 'O2C Specialist',
    parsed: {
      experience: [{ title: 'O2C Senior Analyst', company: 'Finance Corp' }],
      skills: ['Order to Cash', 'O2C', 'Accounts Receivable', 'Billing', 'Revenue Management', 'Cash Application', 'Collections', 'Dispute Management'],
      summary: 'Senior Analyst handling end-to-end Order-to-Cash activities, billing transactions, cash application, dispute and deduction management.'
    },
    expectedRole: 'O2C / Accounts Receivable & Revenue Management Specialist'
  },
  {
    name: 'HR Recruiter',
    parsed: {
      experience: [{ title: 'HR Recruiter', company: 'Staffing Solutions' }],
      skills: ['Recruitment', 'Talent Acquisition', 'Naukri', 'LinkedIn Recruiter', 'Candidate Sourcing', 'Resume Screening', 'Interview Coordination'],
      summary: 'HR Recruiter handling end-to-end IT & Non-IT recruitment, sourcing via Naukri, screening resumes and interview coordination.'
    },
    expectedRole: 'HR Recruiter / Talent Acquisition Specialist'
  },
  {
    name: 'ServiceNow Developer',
    parsed: {
      experience: [{ title: 'ServiceNow Developer with Testing', company: 'IT Services' }],
      skills: ['ServiceNow', 'ITSM', 'GlideScript', 'Business Rules', 'Client Scripts', 'UI Policies', 'ServiceNow Testing', 'UAT'],
      summary: 'ServiceNow Developer with testing experience configuring ServiceNow applications, workflows, incident and change management.'
    },
    expectedRole: 'ServiceNow Developer & ITSM Administrator'
  },
  {
    name: 'Oracle EBS SCM/Finance Consultant',
    parsed: {
      experience: [{ title: 'Oracle EBS Finance/SCM Consultant', company: 'Enterprise Consulting' }],
      skills: ['Oracle EBS', 'Oracle SCM', 'Oracle Finance', 'Purchasing', 'Inventory Management', 'Order Management', 'PL/SQL'],
      summary: 'Oracle EBS Consultant working on purchasing, inventory control, order management and SCM functional production support.'
    },
    expectedRole: 'Oracle EBS Consultant (SCM / Finance / HCM)'
  },
  {
    name: 'SAP ABAP Consultant',
    parsed: {
      experience: [{ title: 'SAP ABAP Consultant with S/4HANA', company: 'Tech Mahindra' }],
      skills: ['SAP ABAP', 'S/4HANA', 'CDS Views', 'OData', 'RAP', 'SAP BTP', 'BAPI', 'IDoc'],
      summary: 'SAP ABAP Developer with S/4HANA expertise working on CDS Views, RAP, OData and integrations with MM, SD and FICO.'
    },
    expectedRole: 'SAP ABAP & HANA Developer'
  },
  {
    name: 'Monitoring Operations Specialist',
    parsed: {
      experience: [{ title: 'Monitoring Operations Specialist', company: 'Enterprise NOC' }],
      skills: ['Infrastructure Monitoring', 'Application Monitoring', 'NOC', 'P1 Incident', 'P2 Incident', 'Event Management', 'Alert Management', '24x7 Support'],
      summary: 'Monitoring operations specialist monitoring enterprise infrastructure, server health, databases and handling P1/P2 major incidents.'
    },
    expectedRole: 'NOC & Infrastructure Monitoring Specialist (24x7)'
  },
  {
    name: 'SAP BPC Consultant',
    parsed: {
      experience: [{ title: 'SAP BPC Consultant', company: 'Accenture' }],
      skills: ['SAP BPC', 'SAP BW', 'SAP ECC', 'Financial Consolidation', 'Month End Closing', 'Production Support'],
      summary: 'SAP BPC Consultant providing application support for SAP ECC, BW and BPC, supporting month-end and financial consolidation.'
    },
    expectedRole: 'SAP BPC / BW Consultant'
  },
  {
    name: 'SAP EHS Consultant',
    parsed: {
      experience: [{ title: 'SAP EHS Consultant', company: 'Wipro' }],
      skills: ['SAP EHS', 'Environment Health Safety', 'Incident Management', 'Risk Assessment', 'SAP MM Integration', 'SAP PP Integration'],
      summary: 'SAP EHS functional consultant configuring environment health and safety, risk assessment and compliance with MM/PP integration.'
    },
    expectedRole: 'SAP EHS Consultant'
  },
  {
    name: 'SAP EWM Consultant',
    parsed: {
      experience: [{ title: 'SAP EWM Consultant', company: 'Infosys' }],
      skills: ['SAP EWM', 'S/4HANA EWM', 'Inbound', 'Outbound', 'POSC', 'LOSC', 'Handling Units', 'Replenishment'],
      summary: 'SAP EWM Consultant handling inbound, outbound, POSC, LOSC, warehouse replenishment and handling units in S/4HANA.'
    },
    expectedRole: 'SAP EWM Consultant'
  },
  {
    name: 'SAP FICO Consultant',
    parsed: {
      experience: [{ title: 'SAP FICO Consultant', company: 'Capgemini' }],
      skills: ['SAP FICO', 'General Ledger', 'Accounts Payable', 'Accounts Receivable', 'Asset Accounting', 'Cost Center Accounting', 'CO-PA'],
      summary: 'SAP FICO consultant configuring GL, AP, AR, Asset Accounting and cost center accounting with MM/SD integration.'
    },
    expectedRole: 'SAP FICO Functional Consultant'
  },
  {
    name: 'SAP SD Consultant',
    parsed: {
      experience: [{ title: 'SAP SD Consultant', company: 'TCS' }],
      skills: ['SAP SD', 'S/4HANA', 'Order to Cash', 'OTC', 'Pricing', 'Billing', 'EDI', 'IDoc', 'Sales Order'],
      summary: 'SAP SD consultant configuring sales order processing, pricing, shipping, delivery and OTC with FICO integration.'
    },
    expectedRole: 'SAP SD & Order-to-Cash (OTC) Consultant'
  },
  {
    name: 'SAP PP / QM Consultant',
    parsed: {
      experience: [{ title: 'SAP PP / QM Consultant', company: 'L&T Infotech' }],
      skills: ['SAP PP', 'SAP QM', 'Production Planning', 'Quality Management', 'BOM', 'Routing', 'MM Integration'],
      summary: 'SAP PP and QM consultant optimizing production planning and quality management processes with MM and WM integration.'
    },
    expectedRole: 'SAP PP & QM Consultant'
  },
  {
    name: 'Procurement Specialist with CSR in Profile',
    parsed: {
      experience: [{ title: 'Procurement Specialist', company: 'Infosys BPM' }],
      skills: ['Procurement', 'Vendor Management', 'Purchase Orders', 'Strategic Sourcing', 'P2P', 'Corporate Social Responsibility'],
      summary: 'Procurement professional managing vendor negotiations, PR to PO cycle, and active member of company CSR committee.'
    },
    expectedRole: 'Procurement, Sourcing & Purchase Specialist'
  }
];

let allPassed = true;
testCases.forEach((tc, idx) => {
  const res = classifyUniversalRole(tc.parsed);
  const passed = res.bestFitRole === tc.expectedRole;
  console.log(`[Test ${idx + 1}] ${tc.name}:`);
  console.log(`  -> Best Fit Role: "${res.bestFitRole}" (${res.confidenceScore}% / ${res.topRecommendations[0]?.tier})`);
  console.log(`  -> Expected:      "${tc.expectedRole}"`);
  console.log(`  -> Result:        ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
  if (!passed) {
    allPassed = false;
    console.log(`  -> Top Recs:`, res.topRecommendations.map(r => `${r.roleName} (${r.matchScore}%)`));
  }
});

console.log(`\n=============================`);
console.log(`OVERALL RESULT: ${allPassed ? 'ALL TESTS PASSED PERFECTLY! 🚀' : 'SOME TESTS FAILED! ❌'}`);
console.log(`=============================`);
