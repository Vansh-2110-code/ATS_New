// Full test of enhanced classification
const testCandidates = [
  {
    name: 'Procurement Resume',
    data: {
      name: 'Rajesh Kumar',
      summary: 'Procurement specialist with 5 years experience in vendor management, purchase orders, sourcing, contract negotiation, RFQ/RFP and supply chain operations.',
      skills: [{ name: 'Procurement' }, { name: 'Vendor Management' }, { name: 'Purchase Orders' }, { name: 'Sourcing' }, { name: 'Supply Chain' }, { name: 'Negotiation' }],
      experience: [{ title: 'Senior Procurement Specialist', company: 'L&T', duration: '5 years' }],
      education: [{ degree: 'B.Tech Mechanical', institution: 'NIT' }]
    },
    expectedRoleSubstring: 'Procurement',
    expectedDomain: 'Procurement & Supply Chain'
  },
  {
    name: 'SAP MM / S4 HANA Resume',
    data: {
      name: 'Vikas Gupta',
      summary: 'SAP MM / S4 HANA Functional Consultant with 6 years implementing ERP modules, master data, procure to pay (P2P), configuration, and integration with FICO and SD.',
      skills: [{ name: 'SAP MM' }, { name: 'SAP S/4 HANA' }, { name: 'ERP' }, { name: 'Procure to Pay (P2P)' }, { name: 'SAP Configuration' }, { name: 'Master Data' }],
      experience: [{ title: 'SAP Functional Consultant', company: 'TCS', duration: '6 years' }],
      education: [{ degree: 'B.E Computer Science', institution: 'Anna University' }]
    },
    expectedRoleSubstring: 'SAP',
    expectedDomain: 'Enterprise Systems & ERP'
  },
  {
    name: 'Supply Chain & Logistics Resume',
    data: {
      name: 'Suresh Menon',
      summary: 'Supply chain executive with 4 years managing logistics, warehouse inventory, order fulfillment, freight dispatch and 3PL coordination.',
      skills: [{ name: 'Supply Chain Management' }, { name: 'Logistics' }, { name: 'Inventory Management' }, { name: 'Warehousing' }],
      experience: [{ title: 'Logistics and SCM Executive', company: 'DHL Supply Chain', duration: '4 years' }],
      education: [{ degree: 'B.Com', institution: 'Bangalore University' }]
    },
    expectedRoleSubstring: 'Supply Chain',
    expectedDomain: 'Procurement & Supply Chain'
  },
  {
    name: 'International Voice BPO Resume',
    data: {
      name: 'Rohan Sharma',
      summary: 'Experienced customer service executive with 3 years handling international voice calling, customer support, inbound queries, and resolving technical queries for US process clients in a call center.',
      skills: [{ name: 'Customer Service' }, { name: 'Voice Calling' }, { name: 'Communication' }, { name: 'Inbound Calling' }],
      experience: [{ title: 'Customer Support Executive', company: 'Teleperformance', duration: '3 years' }],
      education: [{ degree: 'B.Com', institution: 'Delhi University' }]
    },
    expectedRoleSubstring: 'Customer Support Executive',
    expectedDomain: 'BPO / Customer Operations'
  },
  {
    name: 'React Frontend Developer Resume',
    data: {
      name: 'Priya Ramesh',
      summary: 'Senior Frontend Engineer with 4.5 years building scalable web applications in React, TypeScript, Redux Toolkit, Tailwind CSS, and Git.',
      skills: [{ name: 'React.js' }, { name: 'TypeScript' }, { name: 'Tailwind CSS' }, { name: 'Git' }],
      experience: [{ title: 'Senior Frontend Developer', company: 'Infosys', duration: '4.5 years' }],
      education: [{ degree: 'B.Tech Computer Science', institution: 'VTU' }]
    },
    expectedRoleSubstring: 'Frontend',
    expectedDomain: 'IT & Software Development'
  }
];

// Test logic will be executed after we update universalRoleClassifier
