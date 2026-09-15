const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function verify() {
  await ssh.connect({
    host: 'ats.whitehorsemanpower.in',
    username: 'whitehorsemanpower',
    password: 'Whitehorse@2026blr',
    port: 22
  });

  console.log('Connected to production. Testing live Universal Classifier directly on server...\n');

  const remoteTestCode = `
const { classifyUniversalRole } = require('./backend/src/utils/universalRoleClassifier');

const candidates = [
  {
    name: 'Procurement Candidate',
    summary: 'Senior Procurement Specialist with 5 years in vendor management, purchase orders (PO), PR/PO creation, sourcing, contract negotiation, RFQ, RFP and P2P.',
    skills: [{ name: 'Procurement' }, { name: 'Purchase Orders' }, { name: 'Vendor Management' }, { name: 'P2P' }],
    experience: [{ title: 'Procurement Specialist', duration: '5 years' }]
  },
  {
    name: 'SAP Candidate',
    summary: 'SAP MM / Ariba Consultant with 6 years experience in materials management, purchase requisition, vendor evaluation, P2P, master data, and ERP configuration.',
    skills: [{ name: 'SAP MM' }, { name: 'SAP Ariba' }, { name: 'ERP' }, { name: 'Materials Management' }],
    experience: [{ title: 'SAP Functional Consultant', duration: '6 years' }]
  },
  {
    name: '.NET Fullstack Candidate',
    summary: 'Proficient in .NET Core, ASP.NET Core MVC, C#, Angular, Web API, SQL Server, Entity Framework, RESTful microservices.',
    skills: [{ name: '.NET Core' }, { name: 'C#' }, { name: 'Angular' }, { name: 'SQL Server' }],
    experience: [{ title: '.NET Developer', duration: '3 years' }]
  },
  {
    name: 'Voice BPO Candidate',
    summary: 'International Voice Process Associate with 3 years handling inbound and outbound calling, US customer service at Concentrix.',
    skills: [{ name: 'Customer Service' }, { name: 'Voice Calling' }, { name: 'Inbound Calling' }],
    experience: [{ title: 'Customer Support Executive (Voice)', duration: '3 years' }]
  }
];

candidates.forEach(c => {
  const res = classifyUniversalRole(c, []);
  console.log(c.name + ' => ' + res.bestFitRole + ' | ' + res.primaryDomain + ' (' + res.confidenceScore + '%)');
});
  `;

  const setupEnv = 'export PATH=$PATH:/home/whitehorsemanpower/.nvm/versions/node/v22.23.1/bin:~/.npm-global/bin';
  const res = await ssh.execCommand(`${setupEnv} && node -e "${remoteTestCode.replace(/\n/g, ' ')}"`, { cwd: '/home/whitehorsemanpower/htdocs/ats.whitehorsemanpower.in' });
  console.log(res.stdout);
  if (res.stderr) console.warn(res.stderr);

  ssh.dispose();
}

verify();
