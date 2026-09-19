/**
 * Universal Job Role Classifier & Profiler
 * Analyzes candidate skills, past job titles, summaries, and experience to detect
 * the candidate's Universal Job Role Persona, Domain, and Top Best-Fit Roles.
 */

const UNIVERSAL_ROLES = [
  // ── 1. Procurement, Sourcing & Supply Chain ───────────────────
  {
    roleName: 'Procurement, Sourcing & Purchase Specialist',
    domain: 'Procurement & Supply Chain',
    keywords: [
      'procurement', 'sourcing', 'purchase order', 'po processing', 'vendor management',
      'vendor selection', 'rfq', 'rfp', 'rfi', 'p2p', 'procure to pay', 'contract negotiation',
      'supplier management', 'buyer', 'purchasing executive', 'procurement specialist',
      'category management', 'spend analysis', 'cost reduction', 'purchase requisition',
      'pr to po', 'vendor onboarding', 'supplier evaluation', 'vendor development', 'purchase officer'
    ],
    skills: ['Procurement', 'Strategic Sourcing', 'Vendor Management', 'Purchase Orders (PO)', 'Contract Negotiation', 'RFQ / RFP', 'Procure-to-Pay (P2P)', 'Supplier Evaluation', 'Spend Analysis']
  },
  {
    roleName: 'Procurement Operations & L1 Support Specialist',
    domain: 'Procurement & Supply Chain',
    keywords: [
      'procurement', 'l1 support procurement', 'pr/po creation', 'purchase order', 'vendor coordination',
      'grn', 'tracking', 'procurement queries', 'invoice validation', 'procure to pay', 'p2p',
      'vendor management', 'ariba', 'sap mm', 'reconciliation', 'procurement documentation', 'pr creation', 'po tracking'
    ],
    skills: ['Procurement Operations', 'PR / PO Creation', 'Vendor Coordination', 'L1 Procurement Support', 'GRN & Invoicing', 'P2P', 'ERP Tracking']
  },
  {
    roleName: 'P2P / Accounts Payable & Invoice Processing Specialist',
    domain: 'Procurement & Supply Chain',
    keywords: [
      'p2p', 'procure to pay', 'accounts payable', 'ap', 'invoice processing', 'invoice management',
      'po invoice', 'non po invoice', 'payment processing', 'payment management', 'vendor payments',
      'vendor management', 'vendor master data', 'master data management', 'invoice verification',
      'invoice matching', 'invoice reconciliation', 'payment reconciliation', 'account reconciliation',
      'p2p operations', 'ap operations', 'vendor query management', 'dispute resolution', 'transaction processing'
    ],
    skills: ['Procure-to-Pay (P2P)', 'Accounts Payable (AP)', 'PO & Non-PO Invoicing', 'Invoice Matching & Verification', 'Vendor Payments', 'Payment Reconciliation', 'Vendor Master Data']
  },
  {
    roleName: 'Supply Chain & Logistics Executive',
    domain: 'Procurement & Supply Chain',
    keywords: [
      'supply chain', 'scm', 'logistics', 'inventory management', 'warehousing', 'freight',
      'material management', 'dispatch', 'order fulfillment', 'distribution', 'supply planning',
      'demand forecasting', '3pl', 'customs clearance', 'transportation', 'supply chain analyst', 'warehouse'
    ],
    skills: ['Supply Chain Management (SCM)', 'Logistics Operations', 'Inventory Management', 'Warehouse Management', 'Demand Planning', 'Order Fulfillment', 'Material Handling']
  },

  // ── 2. Enterprise Systems & SAP / ERP ─────────────────────────
  {
    roleName: 'SAP MM & WM Consultant',
    domain: 'Enterprise Systems & ERP',
    keywords: [
      'sap mm', 'sap wm', 'materials management', 'warehouse management', 'procure to pay',
      'inventory management', 'migo', 'miro', 'pricing procedure', 'movement types', 'purchasing', 'material master'
    ],
    skills: ['SAP MM', 'SAP WM', 'P2P Cycle', 'Inventory Management', 'Material Master', 'Vendor Evaluation']
  },
  {
    roleName: 'SAP FICO Functional Consultant',
    domain: 'Enterprise Systems & ERP',
    keywords: [
      'sap fico', 'sap fi', 'sap co', 'general ledger', 'accounts payable', 'accounts receivable',
      'asset accounting', 'cost center accounting', 'profit center', 'financial reporting', 'bank accounting',
      'co-pa', 'cca', 'pca'
    ],
    skills: ['SAP FICO', 'General Ledger (GL)', 'Accounts Payable (AP)', 'Accounts Receivable (AR)', 'Cost Center Accounting', 'Asset Accounting']
  },
  {
    roleName: 'SAP SD & Order-to-Cash (OTC) Consultant',
    domain: 'Enterprise Systems & ERP',
    keywords: [
      'sap sd', 'sap sd consultant', 'order to cash', 'otc', 'pricing', 'sales order', 'delivery',
      'shipping', 'billing', 'customer master', 'material master', 'pos integration', 'wricef', 'edi', 'idoc'
    ],
    skills: ['SAP SD', 'Order-to-Cash (OTC)', 'Pricing & Billing', 'Delivery & Shipping', 'EDI / IDocs', 'WRICEF']
  },
  {
    roleName: 'SAP PP & QM Consultant',
    domain: 'Enterprise Systems & ERP',
    keywords: [
      'sap pp', 'sap qm', 'production planning', 'quality management', 'quality inspection',
      'sap mm integration', 'sap wm integration', 'manufacturing processes', 'bom', 'routing'
    ],
    skills: ['SAP PP', 'SAP QM', 'Production Planning', 'Quality Inspection', 'BOM & Routing', 'MM / WM Integration']
  },
  {
    roleName: 'SAP EWM Consultant',
    domain: 'Enterprise Systems & ERP',
    keywords: [
      'sap ewm', 'extended warehouse management', 'posc', 'losc', 'wocr', 'ppf', 'handling units',
      'hu', 'ewm master data', 'replenishment', 'repacking', 'inbound outbound warehouse'
    ],
    skills: ['SAP EWM', 'POSC / LOSC', 'WOCR / PPF', 'Warehouse Replenishment', 'Handling Units (HU)', 'Inbound & Outbound Logistics']
  },
  {
    roleName: 'SAP EHS Consultant',
    domain: 'Enterprise Systems & ERP',
    keywords: [
      'sap ehs', 'sap ehs consultant', 'environment health safety', 'risk assessment',
      'environmental compliance', 'incident management', 'sap mm integration', 'sap pp integration'
    ],
    skills: ['SAP EHS', 'Incident Management', 'Risk Assessment', 'Environmental Compliance', 'MM / PP Integration']
  },
  {
    roleName: 'SAP BPC / BW Consultant',
    domain: 'Enterprise Systems & ERP',
    keywords: [
      'sap bpc', 'bpc consultant', 'sap business planning and consolidation', 'sap bw', 'sap ecc',
      'sap bpc support', 'month end closing', 'financial consolidation', 'job monitoring', 'interface monitoring'
    ],
    skills: ['SAP BPC', 'SAP BW', 'SAP ECC', 'Financial Planning & Consolidation', 'Month-End Closing', 'Application Support (L1/L2)']
  },
  {
    roleName: 'SAP Ariba & E-Procurement Specialist',
    domain: 'Enterprise Systems & ERP',
    keywords: [
      'sap ariba', 'ariba', 'sourcing', 'upstream', 'downstream', 'slp', 'procurement configuration',
      'contract management', 'procure to pay', 'cpi integration', 'buyer ariba'
    ],
    skills: ['SAP Ariba', 'Upstream / Downstream', 'Supplier Lifecycle Management (SLP)', 'Strategic Sourcing', 'E-Procurement']
  },
  {
    roleName: 'SAP ABAP & HANA Developer',
    domain: 'Enterprise Systems & ERP',
    keywords: [
      'sap abap', 'abap on hana', 'cds views', 'amdp', 'bapi', 'idoc', 'badi', 'odata',
      'alv reports', 'smartforms', 'adobe forms', 'sap enhancement', 'abap developer'
    ],
    skills: ['SAP ABAP', 'ABAP on HANA', 'CDS Views', 'BAPI / IDoc', 'OData Services', 'Enhancements & Exits']
  },
  {
    roleName: 'SAP / ERP Functional & Technical Consultant',
    domain: 'Enterprise Systems & ERP',
    keywords: [
      'sap', 'sap mm', 'sap fico', 'sap sd', 'sap abap', 'sap s4 hana', 's/4 hana', 's4 hana',
      'sap hana', 'erp consultant', 'sap functional', 'sap technical', 'bapi', 'idoc', 'badi',
      'sap configuration', 'p2p cycle', 'o2c cycle', 'sap implementation', 'master data',
      'sap basis', 'sap bw', 'sap pp', 'sap qm', 'sap hcm', 'sap bi', 'sap consultant', 'erp implementation',
      'sap cpi', 'sap ewm', 'sap mdg', 'sap security', 'sap successfactors'
    ],
    skills: ['SAP ERP', 'SAP S/4 HANA', 'SAP MM', 'SAP FICO', 'SAP SD', 'SAP ABAP', 'ERP Implementation', 'Business Blueprint', 'Master Data Management', 'SAP Configuration']
  },
  {
    roleName: 'Oracle EBS Consultant (SCM / Finance / HCM)',
    domain: 'Enterprise Systems & ERP',
    keywords: [
      'oracle ebs', 'oracle apps', 'oracle scm', 'oracle finance', 'oracle hcm',
      'order management', 'purchasing', 'inventory', 'plsql', 'oracle dba', 'oracle applications'
    ],
    skills: ['Oracle EBS', 'Oracle SCM', 'Oracle Financials', 'PL/SQL', 'Order Management', 'Procurement']
  },

  // ── 3. BPO & Customer Operations ──────────────────────────────
  {
    roleName: 'Customer Support Executive (International Voice)',
    domain: 'BPO / Customer Operations',
    keywords: [
      'international voice', 'voice process', 'customer support', 'customer service',
      'inbound call', 'outbound call', 'call center', 'bpo', 'voice calling', 'call handling',
      'active listening', 'accent neutral', 'night shift', 'teleperformance',
      'concentrix', '247', 'firstsource', 'wipro bpo', 'infosys bpm', 'us process', 'uk process', 'voice executive'
    ],
    skills: ['Customer Service', 'Voice Calling', 'Communication', 'Inbound Calling', 'Problem Solving', 'Call Handling', 'Client Support']
  },
  {
    roleName: 'Domestic Voice / Telecalling Executive',
    domain: 'BPO / Customer Operations',
    keywords: [
      'domestic voice', 'telecaller', 'telecalling', 'outbound calling', 'telesales',
      'hindi voice', 'kannada voice', 'tamil voice', 'telugu voice', 'marathi voice', 'customer care',
      'lead generation', 'cold calling', 'bpo domestic'
    ],
    skills: ['Telecalling', 'Customer Handling', 'Cold Calling', 'Communication', 'Regional Language', 'Outbound Sales']
  },
  {
    roleName: 'Non-Voice / Chat & Email Support Specialist',
    domain: 'BPO / Customer Operations',
    keywords: [
      'non voice', 'non-voice', 'chat support', 'email support', 'zendesk', 'freshdesk',
      'ticketing', 'ticket resolution', 'typing speed', 'written communication',
      'live chat', 'back office bpo', 'customer satisfaction'
    ],
    skills: ['Email Support', 'Chat Support', 'Zendesk', 'Ticketing', 'Written Communication', 'Typing Speed', 'Customer Service']
  },
  {
    roleName: 'Technical Support Associate (L1 / L2)',
    domain: 'BPO / Customer Operations',
    keywords: [
      'technical support', 'tech support', 'desktop support', 'l1 support', 'l2 support',
      'service desk', 'troubleshooting', 'active directory', 'windows os', 'hardware support',
      'networking support', 'it helpdesk', 'remote support', 'itil', 'sla management'
    ],
    skills: ['Technical Support', 'Troubleshooting', 'Active Directory', 'Networking', 'Hardware Support', 'Remote Desktop', 'ITIL']
  },
  {
    roleName: 'Voice & Accent Trainer / Quality Coach',
    domain: 'BPO / Customer Operations',
    keywords: [
      'voice trainer', 'voice and accent', 'soft skills trainer', 'communication trainer',
      'v&a trainer', 'quality coach', 'call monitoring', 'accent neutralization', 'bpo trainer',
      'training delivery', 'call audit', 'customer interaction training'
    ],
    skills: ['Voice & Accent Training', 'Soft Skills Coaching', 'Call Quality Monitoring', 'Accent Neutralization', 'BPO Training Delivery']
  },

  // ── 4. IT & Software Engineering ──────────────────────────────
  {
    roleName: 'ServiceNow Developer & ITSM Administrator',
    domain: 'IT & Software Development',
    keywords: [
      'servicenow', 'service now', 'servicenow developer', 'servicenow testing', 'servicenow itsm',
      'servicenow consultant', 'servicenow administrator', 'incident management', 'problem management',
      'change management', 'service catalog', 'business rules', 'client scripts', 'ui policies',
      'ui actions', 'glidescript', 'rest api', 'soap', 'uat', 'system testing'
    ],
    skills: ['ServiceNow Development', 'ServiceNow ITSM', 'Business Rules', 'Client Scripts', 'UI Policies & Actions', 'REST / SOAP Integrations', 'ServiceNow Testing']
  },
  {
    roleName: 'NOC & Infrastructure Monitoring Specialist (24x7)',
    domain: 'IT & Software Development',
    keywords: [
      'monitoring operations', 'monitoring specialist', 'infrastructure monitoring', 'application monitoring',
      'server monitoring', 'database monitoring', 'network monitoring', 'noc', 'event management',
      'alert management', 'p1 incident', 'p2 incident', 'major incident management', 'service availability',
      'system performance', '24x7 support'
    ],
    skills: ['NOC Operations', 'Infrastructure Monitoring', 'Application Monitoring', 'P1 / P2 Major Incidents', 'Event & Alert Management', 'Server & Network Health', '24x7 Shift Operations']
  },
  {
    roleName: '.NET / C# Full Stack & MVC Developer',
    domain: 'IT & Software Development',
    keywords: [
      '.net', 'c#', 'asp.net', 'asp.net mvc', 'wpf', 'wcf', '.net core', 'web api',
      'entity framework', 'linq', 'sql server', 'threading', 'parallel programming', 'c# developer', 'dotnet'
    ],
    skills: ['.NET Core', 'C#', 'ASP.NET MVC', 'Web API', 'SQL Server', 'Entity Framework', 'RESTful APIs']
  },
  {
    roleName: 'Java, Spring Boot & Microservices Developer',
    domain: 'IT & Software Development',
    keywords: [
      'java', 'core java', 'spring boot', 'microservices', 'spring cloud', 'kafka',
      'camel', 'hibernate', 'rest api', 'jwt', 'maven', 'docker', 'java developer'
    ],
    skills: ['Java', 'Spring Boot', 'Microservices', 'RESTful APIs', 'Kafka', 'Hibernate / JPA', 'SQL']
  },
  {
    roleName: 'Frontend / Web Developer',
    domain: 'IT & Software Development',
    keywords: [
      'frontend', 'front-end', 'react', 'react.js', 'reactjs', 'javascript', 'typescript',
      'html', 'css', 'tailwind', 'redux', 'next.js', 'nextjs', 'vue', 'vue.js',
      'angular', 'web developer', 'ui developer', 'responsive design'
    ],
    skills: ['React.js', 'JavaScript', 'TypeScript', 'HTML/CSS', 'Tailwind CSS', 'Redux', 'REST APIs', 'Git']
  },
  {
    roleName: 'Backend Developer',
    domain: 'IT & Software Development',
    keywords: [
      'backend', 'back-end', 'node.js', 'nodejs', 'express', 'express.js', 'python',
      'django', 'fastapi', 'rest api', 'graphql', 'microservices', 'sql', 'mysql', 'postgresql', 'mongodb', 'redis'
    ],
    skills: ['Node.js', 'Express.js', 'Python', 'Java', 'SQL', 'MongoDB', 'REST APIs', 'Microservices']
  },
  {
    roleName: 'Full Stack Developer',
    domain: 'IT & Software Development',
    keywords: [
      'full stack', 'fullstack', 'mern', 'mean', 'react and node', 'frontend and backend',
      'web application', 'software engineer', 'full-stack developer'
    ],
    skills: ['React.js', 'Node.js', 'JavaScript', 'TypeScript', 'MongoDB', 'SQL', 'REST APIs', 'Git']
  },
  {
    roleName: 'QA Automation & API Test Engineer (Selenium / Rest Assured / TOSCA)',
    domain: 'IT & Software Development',
    keywords: [
      'qa', 'quality assurance', 'software tester', 'manual testing', 'automation testing',
      'selenium', 'rest assured', 'api automation', 'tosca', 'playwright', 'testng', 'junit',
      'cucumber', 'bdd', 'api testing', 'schema validation', 'postman', 'etl testing', 'test cases', 'jira'
    ],
    skills: ['API Automation', 'Rest Assured', 'Selenium WebDriver', 'TOSCA Automation', 'TestNG / JUnit', 'Postman']
  },
  {
    roleName: 'AWS Cloud & DevOps Engineer',
    domain: 'IT & Software Development',
    keywords: [
      'aws', 'amazon web services', 'ec2', 's3', 'rds', 'ecs', 'eks', 'lambda',
      'cloudformation', 'terraform', 'vpc', 'cloudfront', 'route 53', 'iam', 'dynamodb',
      'devops', 'docker', 'kubernetes', 'ci/cd', 'jenkins'
    ],
    skills: ['AWS Services', 'Docker / Kubernetes', 'Terraform / IaC', 'CI/CD Pipelines', 'ECS / EKS', 'AWS Networking']
  },
  {
    roleName: 'Azure Cloud Solutions & Infrastructure Engineer',
    domain: 'IT & Software Development',
    keywords: [
      'azure', 'azure vms', 'vnet', 'snet', 'azure devops', 'aks', 'azure portal',
      'arm templates', 'azure storage', 'azure key vault', 'recovery services vault', 'cloud infrastructure'
    ],
    skills: ['Microsoft Azure', 'Azure VMs', 'VNET / Networking', 'Azure DevOps', 'Kubernetes (AKS)', 'Azure Backup']
  },
  {
    roleName: 'Database Administrator (DBA) - Redshift / Oracle / PostgreSQL',
    domain: 'IT & Software Development',
    keywords: [
      'dba', 'database administrator', 'aws redshift', 'oracle dba', 'postgres', 'mariadb',
      'database replication', 'data migration', 'high availability', 'performance tuning', 'plsql', 'database management'
    ],
    skills: ['Database Administration', 'AWS Redshift', 'Oracle / Postgres', 'Performance Tuning', 'Replication & HA', 'SQL / PLSQL']
  },
  {
    roleName: 'ITIL Change, Incident & Service Delivery Manager',
    domain: 'IT & Software Development',
    keywords: [
      'change manager', 'incident management', 'major incident manager', 'mim', 'problem management',
      'itil', 'cab', 'change advisory board', 'change requests', 'service delivery', 'itsm', 'change enablement'
    ],
    skills: ['ITIL Framework', 'Change Management (CAB)', 'Incident Management', 'Problem Management', 'Service Delivery', 'ITSM Processes']
  },
  {
    roleName: 'Data Analyst / Business Intelligence',
    domain: 'IT & Software Development',
    keywords: [
      'data analyst', 'business intelligence', 'power bi', 'tableau', 'sql queries',
      'excel modeling', 'pivot tables', 'data visualization', 'dashboards',
      'pandas', 'numpy', 'python data', 'reporting analyst', 'etl'
    ],
    skills: ['SQL', 'Power BI', 'Advanced Excel', 'Tableau', 'Data Analysis', 'Python', 'Reporting']
  },
  {
    roleName: 'Networking & SD-WAN Engineer (Cisco / Juniper / CCNA)',
    domain: 'IT & Software Development',
    keywords: [
      'network engineer', 'routing and switching', 'cisco', 'juniper', 'sdwan', 'sd-wan',
      'ccna', 'ccnp', 'bgp', 'ospf', 'firewall', 'infoblox', 'netops', 'network security'
    ],
    skills: ['Routing & Switching', 'Cisco / Juniper', 'SD-WAN', 'CCNA / CCNP', 'Network Security', 'Firewalls']
  },
  {
    roleName: 'IT System Administrator & Network Engineer',
    domain: 'IT & Software Development',
    keywords: [
      'system administrator', 'sysadmin', 'network engineer', 'cisco', 'ccna', 'firewall',
      'lan wan', 'active directory', 'windows server', 'linux administration', 'vpn',
      'dns dhcp', 'vmware', 'backup recovery', 'server maintenance'
    ],
    skills: ['Network Configuration', 'Active Directory', 'Windows Server', 'Linux Administration', 'Firewalls / VPN', 'VMware / Virtualization', 'CCNA / Cisco']
  },
  {
    roleName: 'Enterprise Platforms Specialist (Salesforce / Workday / MuleSoft / Mainframe)',
    domain: 'IT & Software Development',
    keywords: [
      'salesforce', 'workday', 'mulesoft', 'mainframe', 'cobol', 'jcl', 'db2', 'cics',
      'tibco', 'maximo', 'facets', 'walkme'
    ],
    skills: ['Salesforce / Workday', 'MuleSoft / TIBCO', 'Mainframe (COBOL/DB2)', 'Enterprise Integration', 'CRM / ERP Platforms']
  },

  // ── 5. Core Engineering & Infrastructure ──────────────────────
  {
    roleName: 'Mechanical & Production Engineer',
    domain: 'Engineering & Manufacturing',
    keywords: [
      'mechanical engineer', 'autocad', 'solidworks', 'catia', 'production engineer',
      'quality control', 'manufacturing', 'cnc', 'machining', 'hvac', 'maintenance engineer',
      'plant engineering', 'bom', 'gd&t', 'tooling', 'sheet metal'
    ],
    skills: ['AutoCAD', 'SolidWorks', 'Mechanical Design', 'Production Planning', 'Quality Inspection', 'Manufacturing Processes']
  },
  {
    roleName: 'Civil & Construction Site Engineer',
    domain: 'Engineering & Construction',
    keywords: [
      'civil engineer', 'site engineer', 'construction management', 'structural engineering',
      'billing engineer', 'estimation', 'surveying', 'site supervision', 'staad pro', 'concrete',
      'project execution', 'quantity surveying'
    ],
    skills: ['Site Supervision', 'Construction Management', 'AutoCAD Civil', 'Estimation & Costing', 'Structural Design', 'Quality Assurance']
  },
  {
    roleName: 'Electrical & Instrumentation Engineer',
    domain: 'Engineering & Manufacturing',
    keywords: [
      'electrical engineer', 'plc', 'scada', 'instrumentation', 'power systems',
      'circuit design', 'switchgear', 'panel wiring', 'automation', 'substation',
      'drives', 'relays', 'sensors'
    ],
    skills: ['PLC / SCADA', 'Electrical Wiring', 'Control Systems', 'Circuit Design', 'Power Distribution', 'Instrumentation']
  },

  // ── 6. Sales & Business Development ───────────────────────────
  {
    roleName: 'Inside Sales / Business Development Executive (BDE)',
    domain: 'Sales & Business Development',
    keywords: [
      'inside sales', 'business development', 'bde', 'lead generation', 'b2b sales',
      'b2c sales', 'sales pipeline', 'crm', 'salesforce', 'hubspot', 'cold outreach',
      'deal closing', 'client pitch', 'revenue targets', 'sales presentation'
    ],
    skills: ['Lead Generation', 'Inside Sales', 'B2B Sales', 'CRM', 'Client Pitching', 'Negotiation', 'Closing Deals']
  },
  {
    roleName: 'Field Sales / Direct Marketing Executive',
    domain: 'Sales & Business Development',
    keywords: [
      'field sales', 'direct sales', 'fmcg sales', 'territory sales', 'retail sales',
      'client visits', 'merchant onboarding', 'channel sales', 'area sales manager'
    ],
    skills: ['Field Sales', 'Direct Marketing', 'Client Relationship', 'Territory Management', 'Negotiation']
  },

  // ── 7. Human Resources & Talent Acquisition ───────────────────
  {
    roleName: 'HR Recruiter / Talent Acquisition Specialist',
    domain: 'Human Resources',
    keywords: [
      'recruiter', 'talent acquisition', 'sourcing candidates', 'screening resumes', 'naukri', 'linkedin recruiter',
      'interview scheduling', 'headhunting', 'salary negotiation', 'candidate engagement',
      'onboarding', 'technical recruiting', 'volume hiring', 'staffing recruiter',
      'it recruiter', 'non-it recruiter', 'technical recruiter', 'recruitment executive', 'end-to-end recruitment',
      'candidate sourcing', 'resume screening', 'shine', 'bulk hiring', 'staffing', 'recruitment consultant'
    ],
    skills: ['Candidate Sourcing', 'Resume Screening', 'Naukri/LinkedIn/Shine', 'Interview Scheduling', 'Salary Negotiation', 'ATS Tracking', 'End-to-End Recruitment', 'IT & Non-IT Recruitment']
  },
  {
    roleName: 'HR Executive / Generalist',
    domain: 'Human Resources',
    keywords: [
      'hr executive', 'hr generalist', 'payroll coordination', 'employee engagement',
      'attendance management', 'statutory compliance', 'pf esic', 'leave management',
      'joining formalities', 'exit interviews', 'hrms'
    ],
    skills: ['HR Operations', 'Employee Engagement', 'Onboarding', 'Payroll Basics', 'Statutory Compliance', 'HRMS']
  },

  // ── 8. Finance, Accounts & Banking ────────────────────────────
  {
    roleName: 'O2C / Accounts Receivable & Revenue Management Specialist',
    domain: 'Finance & Accounts',
    keywords: [
      'o2c', 'order to cash', 'order-to-cash', 'accounts receivable', 'ar', 'billing',
      'billing management', 'revenue management', 'billing and revenue management',
      'cash application', 'cash allocation', 'collections', 'collection management',
      'dispute management', 'deduction management', 'invoicing', 'invoice processing',
      'customer accounting', 'ar operations', 'o2c operations', 'account reconciliation',
      'payment reconciliation', 'customer reconciliation', 'revenue accounting',
      'receivables management', 'collections management', 'dispute resolution',
      'deduction resolution', 'transaction processing', 'finance operations', 'process improvement', 'sla management'
    ],
    skills: ['Order-to-Cash (O2C)', 'Accounts Receivable (AR)', 'Billing & Revenue Management', 'Cash Application / Allocation', 'Collections & Disputes', 'Deduction Management', 'Account Reconciliation']
  },
  {
    roleName: 'Accountant / Accounts Executive',
    domain: 'Finance & Accounts',
    keywords: [
      'accountant', 'accounts executive', 'tally', 'tally prime', 'gst', 'tds',
      'bookkeeping', 'accounts payable', 'accounts receivable', 'bank reconciliation',
      'ledger', 'invoicing', 'balance sheet', 'tax filing', 'vouchers'
    ],
    skills: ['Tally / Tally Prime', 'GST & TDS', 'Accounts Payable/Receivable', 'Bank Reconciliation', 'Bookkeeping', 'Invoicing']
  },
  {
    roleName: 'Financial Analyst / Audit Associate',
    domain: 'Finance & Accounts',
    keywords: [
      'financial analyst', 'financial modeling', 'audit', 'variance analysis',
      'budgeting', 'forecasting', 'mis reporting', 'profit and loss', 'corporate finance'
    ],
    skills: ['Financial Modeling', 'MIS Reporting', 'Variance Analysis', 'Advanced Excel', 'Auditing', 'Forecasting']
  },
  {
    roleName: 'Banking, KYC & AML Operations Associate',
    domain: 'Banking & Financial Services',
    keywords: [
      'kyc', 'aml', 'anti money laundering', 'customer due diligence', 'cdd', 'edd',
      'transaction monitoring', 'banking compliance', 'banking operations', 'retail banking',
      'loan processing', 'credit appraisal', 'sanction screening'
    ],
    skills: ['KYC Compliance', 'AML Monitoring', 'Due Diligence', 'Banking Operations', 'Transaction Analysis', 'Risk Assessment']
  },

  // ── 9. Healthcare & Medical BPO ───────────────────────────────
  {
    roleName: 'US Healthcare / AR Caller',
    domain: 'Healthcare & Medical BPO',
    keywords: [
      'ar caller', 'medical billing', 'denial management', 'revenue cycle management',
      'rcm', 'claim follow up', 'hipaa', 'us healthcare', 'payer follow up',
      'insurance verification', 'eob', 'cms 1500'
    ],
    skills: ['AR Calling', 'Medical Billing', 'Denial Management', 'HIPAA', 'Claim Follow-up', 'US Healthcare Process']
  },
  {
    roleName: 'Medical Coder',
    domain: 'Healthcare & Medical BPO',
    keywords: [
      'medical coder', 'icd-10', 'cpt coding', 'hcpcs', 'cpc certified', 'medical coding',
      'patient chart audit', 'medical terminology'
    ],
    skills: ['ICD-10 Coding', 'CPT Coding', 'Medical Terminology', 'CPC Certified', 'Chart Auditing']
  },

  // ── 10. Design & Creative ─────────────────────────────────────
  {
    roleName: 'UI/UX & Graphic Designer',
    domain: 'Design & Creative',
    keywords: [
      'ui designer', 'ux designer', 'graphic designer', 'figma', 'adobe photoshop',
      'illustrator', 'wireframing', 'prototyping', 'user research', 'design system',
      'visual design', 'adobe xd', 'indesign'
    ],
    skills: ['Figma', 'Adobe Photoshop', 'Adobe Illustrator', 'UI/UX Design', 'Wireframing', 'Prototyping', 'Design Systems']
  },

  // ── 11. Content & Communications ──────────────────────────────
  {
    roleName: 'Content Writer & Copywriter',
    domain: 'Content & Communications',
    keywords: [
      'content writer', 'copywriter', 'technical writer', 'blog writing', 'seo writing',
      'content strategy', 'proofreading', 'creative writing', 'social media copywriting',
      'editing', 'articles', 'press releases'
    ],
    skills: ['Content Writing', 'Copywriting', 'SEO Content', 'Proofreading', 'Technical Writing', 'Creative Writing']
  },

  // ── 12. Digital Marketing ─────────────────────────────────────
  {
    roleName: 'Digital Marketing & SEO Executive',
    domain: 'Digital Marketing',
    keywords: [
      'digital marketing', 'seo', 'sem', 'google ads', 'meta ads', 'facebook ads',
      'social media marketing', 'content marketing', 'google analytics', 'email marketing',
      'keyword research', 'on page seo', 'off page seo'
    ],
    skills: ['SEO', 'Google Ads', 'Social Media Marketing', 'Google Analytics', 'Content Marketing', 'Meta Ads']
  },
  {
    roleName: 'DMO Solutions Architect & Presales AdOps Lead',
    domain: 'Digital Marketing & Presales',
    keywords: [
      'dmo', 'solutions architect', 'adops', 'ad operations', 'presales', 'solution consulting',
      'performance marketing', 'campaign architecture', 'google ads', 'meta ads', 'dv360',
      'the trade desk', 'programmatic', 'trafficking', 'conversion api', 'attribution',
      'rfp', 'deal shaping', 'roas', 'cac', 'cpa', 'genai in adops', 'media planning',
      'ga4', 'adobe analytics', 'tag manager', 'utms', 'creative testing'
    ],
    skills: ['Ad Operations (AdOps)', 'Presales & Deal Shaping', 'Performance Marketing', 'Google Ads & Meta Ads', 'Programmatic (DV360 / TTD)', 'Campaign Architecture & Trafficking', 'Tracking (UTMs, Pixels, CAPI)', 'Attribution & Analytics (GA4)', 'GenAI in Marketing']
  },

  // ── 13. Operations & Administrative ───────────────────────────
  {
    roleName: 'Back Office / Operations Executive',
    domain: 'General Operations & Admin',
    keywords: [
      'back office', 'data entry', 'operations executive', 'documentation',
      'ms office', 'excel reporting', 'typing', 'administrative support',
      'office coordination', 'file management', 'data processing'
    ],
    skills: ['MS Excel', 'Data Entry', 'Documentation', 'Operations Coordination', 'Typing', 'Back Office Support']
  },

  // ── 14. Telecom & Infrastructure Programs (JL4A / JL5B) ────────
  {
    roleName: 'Telecom Transition Project Manager (Service Transition & Day 2 Readiness)',
    domain: 'Telecom & Infrastructure Operations',
    keywords: [
      'transition project manager', 'service transition', 'day 2 readiness', 'operational readiness',
      'sla governance', 'incident management', 'ticketing workflows', 'noc', 'gre noc',
      'raci matrix', 'ses door lock', 'rma', 'repair/rma', 'telecom infrastructure', 'service assurance',
      'handover to operations', 'steady-state operations', 'jl4a', 'jl5b', 'production handoff'
    ],
    skills: ['Service Transition', 'Day 2 Operational Readiness', 'SLA Governance', 'Incident & Escalation Management', 'NOC & GRE NOC Coordination', 'RACI Matrix & Support Models', 'Security & Access Control (SES)', 'Operational Handover', 'Advanced Excel']
  },
  {
    roleName: 'Telecom Transformation Project Manager (Fiber Build & Infrastructure)',
    domain: 'Telecom & Infrastructure Operations',
    keywords: [
      'transformation project manager', 'long-haul fiber', 'fiber build', 'hut deployment',
      'lateral builds', 'telecom infrastructure', 'construction & engineering', 'c&e',
      'telemetry', 'building management systems', 'bms', 'operational turn-up', 'iru build charges',
      'o&m charges', 'network deployment', 'customer governance', 'jl4a', 'jl5b', 'contractual milestones'
    ],
    skills: ['Long-Haul Fiber Deployment', 'Hut Deployments & Lateral Builds', 'Telecom Infrastructure Transformation', 'Construction & Engineering (C&E)', 'BMS & Telemetry Systems', 'Operational Turn-Up & Handover', 'Commercial Readiness & IRU/O&M', 'Customer Governance & Executive Reporting']
  },

  // ── 15. IT Infrastructure, Core Networking & Operations ────────
  {
    roleName: 'Genesys PureCloud Voice Engineer',
    domain: 'Telecom & Voice Engineering',
    keywords: [
      'genesys', 'purecloud', 'genesys purecloud', 'tig voice', 'call flow', 'gcv',
      'byoc', 'sip trunk', 'webrtc', 'genesys api', 'contact center voice', 'telecom sla',
      'ivr', 'acd', 'dialer', 'telecom engineer', 'voice infrastructure', 'sip byoc'
    ],
    skills: ['Genesys PureCloud', 'Contact Center Voice', 'Call Flow Architecture', 'GCV & SIP BYOC', 'Genesys APIs', 'WebRTC Troubleshooting', 'Voice Quality & SIP Trunks', 'Telecom Incident Management']
  },
  {
    roleName: 'Core Network Lead & Cisco Administrator',
    domain: 'IT Infrastructure & Networking',
    keywords: [
      'core network', 'cisco', 'ccna', 'ccnp', 'routing and switching', 'cisco router',
      'cisco switch', 'cisco asa', 'firepower', 'cisco ips', 'anyconnect', 'checkpoint firewall',
      'bgp', 'ospf', 'proxy', 'zscaler', 'network engineer', 'network lead', 'network administrator',
      'network security audit', 'visio network diagram', 'disaster recovery network', 'ftd 2100'
    ],
    skills: ['Cisco Routing & Switching', 'Cisco ASA & Firepower', 'Cisco AnyConnect', 'Checkpoint Firewall', 'BGP & OSPF', 'CCNA / CCNP', 'Zscaler Proxy', 'Network Security Audits', 'Disaster Recovery']
  },
  {
    roleName: 'IT Operations & Server Systems Administrator',
    domain: 'IT Infrastructure & Networking',
    keywords: [
      'it operations', 'server administrator', 'systems administrator', 'active directory',
      'ad', 'dhcp', 'dns', 'vmware', 'virtual machines', 'cloud servers', 'endpoints management',
      'sccm', 'wsus', 'patch management', 'vulnerability fixing', 'itil', 'sla', 'amc renewal',
      'cisco switches', 'qualys guard', 'rca', 'it ops', 'jl3b', 'jl4a'
    ],
    skills: ['IT Operations', 'Windows & Linux Server Admin', 'Active Directory (AD/DNS/DHCP)', 'VMware & Cloud Servers', 'Patch Management & WSUS', 'Network Device Support', 'ITIL SLA & RCA', 'Asset Management']
  },
  {
    roleName: 'L2 Service Desk & Remote Tech Support Specialist',
    domain: 'IT Service Desk & Operations',
    keywords: [
      'l2 service desk', 'service desk', 'technical support', 'tech support', 'remote support',
      'desktop support', 'laptop support', 'office 365', 'o365', 'active directory', 'antivirus',
      'imaging', 'patch management', 'mdm', 'mobile device management', 'ios', 'android',
      'itil framework', 'ticketing tools', 'servicenow', 'remedy'
    ],
    skills: ['L2 Service Desk', 'Remote Tech Support', 'Desktop & Laptop Troubleshooting', 'Microsoft O365', 'Active Directory & Permissions', 'Patch Management & Imaging', 'Mobile Device Configuration', 'ITIL Ticketing']
  },
  {
    roleName: 'IT Infrastructure Operations Manager',
    domain: 'IT Infrastructure & Management',
    keywords: [
      'it infrastructure manager', 'technology specialist', 'infrastructure lead', 'it operations manager',
      'team leadership', 'disaster recovery', 'bcp', 'dr planning', 'pam', 'privileged access management',
      'iso 20k', 'iso 27k', 'servicenow', 'snow', 'vmware', 'hyper-v', 'aws', 'azure',
      'itil', 'pmp', 'asset lifecycle', 'jl5b', 'jl5'
    ],
    skills: ['IT Infrastructure Management', 'Operations Oversight', 'Team Leadership (10+)', 'Disaster Recovery & BCP', 'PAM & Security Compliance', 'Virtualization (VMware/Hyper-V)', 'Cloud (AWS/Azure)', 'ServiceNow (SNOW)', 'ISO 20K/27K Audits']
  }
];

/**
 * Determine seniority level from total experience duration or years
 */
function calculateSeniority(parsed) {
  let years = 0;

  // Try extracting number from totalExperience string first, then fallback to experience duration
  const expStr = parsed.totalExperience || parsed.experience?.[0]?.duration || '';
  const match = expStr.match(/(\d+(?:\.\d+)?)\s*(?:yr|year)/i);
  if (match) {
    years = parseFloat(match[1]);
  } else if (parsed.experience && Array.isArray(parsed.experience)) {
    // Count entries roughly
    years = parsed.experience.length * 1.5;
  }

  if (years <= 1) {
    return { level: 'Fresher / Entry Level', years: parseFloat(years.toFixed(1)), label: 'Fresher / Entry Level (0–1 Yr)', badgeColor: 'bg-blue-100 text-blue-800' };
  } else if (years <= 3) {
    return { level: 'Junior / Associate', years: parseFloat(years.toFixed(1)), label: `Junior / Associate (${years.toFixed(1)} Yrs)`, badgeColor: 'bg-emerald-100 text-emerald-800' };
  } else if (years <= 6) {
    return { level: 'Mid-Senior Executive', years: parseFloat(years.toFixed(1)), label: `Mid-Senior Executive (${years.toFixed(1)} Yrs)`, badgeColor: 'bg-purple-100 text-purple-800' };
  } else if (years <= 12) {
    return { level: 'Lead / Managerial', years: parseFloat(years.toFixed(1)), label: `Lead / Managerial (${years.toFixed(1)} Yrs)`, badgeColor: 'bg-amber-100 text-amber-800' };
  } else {
    return { level: 'Director / Practice Head (JL4/JL5)', years: parseFloat(years.toFixed(1)), label: `Director / Practice Head (${years.toFixed(1)} Yrs)`, badgeColor: 'bg-indigo-100 text-indigo-800' };
  }
}

/**
 * Main Profiler function: scores the parsed resume against all Universal Roles
 */
function classifyUniversalRole(parsed, openJobs = []) {
  if (!parsed) return null;

  // Prepare combined candidate text
  const resumeSkills = (parsed.skills || []).map(s => (typeof s === 'string' ? s : s.name || '')).filter(Boolean);
  const candidateSkillsLower = resumeSkills.map(s => s.toLowerCase());

  const experienceTitles = (parsed.experience || []).map(e => (e.title || '') + ' ' + (e.company || '')).join(' ').toLowerCase();
  const primaryTitle = (parsed.experience?.[0]?.title || parsed.jobTitle || '').toLowerCase();
  const summaryText = (parsed.summary || '').toLowerCase();
  const candidateAllText = `${summaryText} ${candidateSkillsLower.join(' ')} ${experienceTitles} ${(parsed.certifications || []).join(' ')}`.toLowerCase();

  // ── Voice / Call Center Presence Detection ──
  const VOICE_REGEX = /\b(voice process|voice calling|international voice|domestic voice|call center|inbound calling|outbound calling|telecaller|telecalling|telesales|bpo voice|voice agent|customer support executive|customer care executive|accent neutral|inbound process|outbound process)\b/i;
  
  // Specific check for BPO CSR (exclude Corporate Social Responsibility)
  const isCorporateCSR = /\b(corporate social responsibility|csr activities|csr activity|csr committee|csr initiative|csr project)\b/i.test(candidateAllText);
  const isBpoCSR = /\b(csr\s*(?:voice|calling|inbound|outbound|process|agent|rep|bpo)|customer service representative)\b/i.test(candidateAllText);

  let hasVoiceSignal = VOICE_REGEX.test(candidateAllText) || (isBpoCSR && !isCorporateCSR);

  // ── Explicit Specialized Domain Signals ──
  const hasSapSignal = /\b(sap|s\/4\s*hana|s4\s*hana|abap|fico|sap\s*mm|sap\s*sd|sap\s*basis|bapi|idoc|sap\s*cpi|sap\s*ewm|sap\s*mdg|sap\s*bpc|sap\s*ehs|sap\s*pp|sap\s*qm|sap\s*btp|sap\s*grc)\b/i.test(candidateAllText) ||
                       /\b(sap|s\/4\s*hana|s4\s*hana|abap|fico|sap\s*mm|sap\s*sd|sap\s*pp|sap\s*qm)\b/i.test(primaryTitle);

  const hasAribaSignal = /\b(ariba|sap\s*ariba|upstream|downstream|slp)\b/i.test(candidateAllText);

  const hasP2pSignal = /\b(p2p|procure\s*to\s*pay|invoice\s*processing|po\s*invoice|non\s*po\s*invoice|vendor\s*payments|accounts\s*payable|ap\s*operations|invoice\s*verification|invoice\s*matching|payment\s*processing|payment\s*reconciliation|vendor\s*master\s*data)\b/i.test(candidateAllText) ||
                       /\b(p2p|accounts\s*payable|ap|invoice\s*processing|vendor\s*payments)\b/i.test(primaryTitle);

  const hasO2cSignal = /\b(o2c|order\s*to\s*cash|accounts\s*receivable|ar\s*operations|billing|cash\s*application|cash\s*allocation|collections|dispute\s*management|deduction\s*management|revenue\s*management)\b/i.test(candidateAllText) ||
                       /\b(o2c|accounts\s*receivable|billing|cash\s*application|revenue\s*management)\b/i.test(primaryTitle);

  const hasProcurementSignal = /\b(procurement|sourcing|purchase\s*order|purchasing|buyer|vendor\s*management|rfq|rfp|p2p|procure\s*to\s*pay|grn|pr\s*to\s*po|pr\/po)\b/i.test(candidateAllText) ||
                               /\b(procurement|sourcing|purchase|purchasing|buyer|vendor)\b/i.test(primaryTitle);

  const hasSupplyChainSignal = /\b(supply\s*chain|scm|logistics|warehousing|freight|inventory\s*management)\b/i.test(candidateAllText) ||
                               /\b(supply\s*chain|scm|logistics|warehouse)\b/i.test(primaryTitle);

  const hasOracleSignal = /\b(oracle\s*ebs|oracle\s*apps|oracle\s*scm|oracle\s*finance|oracle\s*hcm|oracle\s*dba|plsql|pl\/sql)\b/i.test(candidateAllText);

  const hasServiceNowSignal = /\b(servicenow|service\s*now|servicenow\s*developer|glidescript|business\s*rules|client\s*scripts|ui\s*policies|ui\s*actions|service\s*catalog|itsm)\b/i.test(candidateAllText) ||
                              /\b(servicenow)\b/i.test(primaryTitle);

  const hasNocSignal = /\b(noc|monitoring\s*operations|infrastructure\s*monitoring|application\s*monitoring|server\s*monitoring|alert\s*management|p1\s*incident|p2\s*incident|major\s*incident|event\s*management)\b/i.test(candidateAllText) ||
                       /\b(noc|monitoring|service\s*desk\s*agent)\b/i.test(primaryTitle);

  const hasVoiceTrainerSignal = /\b(voice\s*(?:and|&)?\s*accent|v&a\s*trainer|soft\s*skills\s*trainer|communication\s*trainer|call\s*monitoring|call\s*audit|accent\s*neutralization|voice\s*coach)\b/i.test(candidateAllText) ||
                                /\b(voice\s*trainer|v&a|accent\s*trainer|soft\s*skills\s*trainer)\b/i.test(primaryTitle);

  const hasHrRecruiterSignal = /\b(recruiter|talent\s*acquisition|candidate\s*sourcing|resume\s*screening|technical\s*recruiter|it\s*recruiter|non-it\s*recruiter|end-to-end\s*recruitment)\b/i.test(candidateAllText) ||
                               /\b(recruiter|talent\s*acquisition|sourcer)\b/i.test(primaryTitle);

  const hasDotNetSignal = /\b(\.net|c#|asp\.net|asp\.net\s*mvc|wpf|wcf|\.net\s*core|dotnet)\b/i.test(candidateAllText) ||
                          /\b(\.net|c#|asp\.net)\b/i.test(primaryTitle);

  const hasJavaSignal = /\b(core\s*java|spring\s*boot|microservices|hibernate|kafka|camel)\b/i.test(candidateAllText) ||
                        /\b(java|spring)\b/i.test(primaryTitle);

  const hasAwsSignal = /\b(aws|amazon\s*web\s*services|ec2|s3|rds|ecs|eks|lambda|cloudformation)\b/i.test(candidateAllText);

  const hasAzureSignal = /\b(azure|vnet|snet|azure\s*vms|azure\s*devops|aks|azure\s*portal)\b/i.test(candidateAllText);

  const hasQaSignal = /\b(selenium|rest\s*assured|api\s*automation|tosca|playwright|etl\s*testing|test\s*cases)\b/i.test(candidateAllText) ||
                      /\b(qa|tester|automation|testing)\b/i.test(primaryTitle);

  const hasDbaSignal = /\b(dba|database\s*administrator|redshift\s*dba|oracle\s*dba|postgres|mariadb)\b/i.test(candidateAllText);

  const hasItilSignal = /\b(change\s*manager|change\s*management|major\s*incident|incident\s*management|itsm|cab\s*meeting|service\s*delivery|change\s*requests)\b/i.test(candidateAllText) ||
                        /\b(change\s*manager|incident\s*manager|itsm)\b/i.test(primaryTitle);

  const hasNetworkSignal = /\b(routing\s*and\s*switching|cisco|juniper|sdwan|sd-wan|ccna|infoblox|netops)\b/i.test(candidateAllText);

  const hasEngineeringSignal = /\b(mechanical|civil|electrical|instrumentation|autocad|solidworks|catia|site engineer|hvac|piping)\b/i.test(candidateAllText) ||
                               /\b(engineer|draftsman|site engineer)\b/i.test(primaryTitle);

  const hasSoftwareSignal = /\b(frontend|backend|full\s*stack|developer|software engineer|react|angular|node\.js|python|flutter)\b/i.test(candidateAllText);

  const hasFinanceSignal = /\b(chartered accountant|tally|gst|tds|balance sheet|statutory audit|bookkeeping|mis reporting|general ledger|accounts executive)\b/i.test(candidateAllText);

  const hasDmoAdOpsSignal = /\b(adops|ad\s*operations|solutions\s*architect|presales\s*consulting|performance\s*marketing|dv360|the\s*trade\s*desk|programmatic|trafficking|campaign\s*architecture|conversion\s*api|deal\s*shaping|roas|cac)\b/i.test(candidateAllText);

  const hasTelecomTransitionSignal = /\b(transition\s*project\s*manager|service\s*transition|day\s*2\s*readiness|day\s*2\s*operational|gre\s*noc|ses\s*door\s*lock|operational\s*readiness|steady-state\s*operations)\b/i.test(candidateAllText) ||
                                     (/\b(transition\s*manager|project\s*manager)\b/i.test(primaryTitle) && /\b(telecom|noc|sla\s*governance|service\s*assurance)\b/i.test(candidateAllText));

  const hasTelecomTransformationSignal = /\b(transformation\s*project\s*manager|long-haul\s*fiber|fiber\s*build|hut\s*deployment|lateral\s*builds|c&e|telemetry\s*systems|building\s*management\s*systems|iru\s*charges|operational\s*turn-up)\b/i.test(candidateAllText) ||
                                         (/\b(transformation\s*manager|project\s*manager)\b/i.test(primaryTitle) && /\b(fiber|telecom|infrastructure\s*deployment)\b/i.test(candidateAllText));

  const hasGenesysSignal = /\b(genesys|purecloud|pure\s*cloud|tig\s*voice|byoc|sip\s*trunk|webrtc|gcv|call\s*flow)\b/i.test(candidateAllText) ||
                           /\b(genesys|purecloud|voice\s*engineer)\b/i.test(primaryTitle);

  const hasCiscoCoreNetworkSignal = /\b(cisco\s*asa|firepower|cisco\s*ips|anyconnect|checkpoint\s*firewall|bgp|ospf|ccna|ccnp|cisco\s*router|cisco\s*switch)\b/i.test(candidateAllText) ||
                                    /\b(network\s*lead|network\s*administrator|cisco|ccnp)\b/i.test(primaryTitle);

  const hasL2ServiceDeskSignal = /\b(l2\s*service\s*desk|service\s*desk|remote\s*desktop\s*support|desktop\s*support|laptop\s*support|office\s*365|o365|active\s*directory|patch\s*management|imaging)\b/i.test(candidateAllText) ||
                                 /\b(service\s*desk|desktop\s*support|tech\s*support|l2)\b/i.test(primaryTitle);

  const hasItOpsInfrastructureSignal = /\b(it\s*operations|infrastructure\s*support|server\s*admin|vmware|cloud\s*servers|qualys|sccm|wsus|amc\s*renewal|iso\s*20k|iso\s*27k|jl3b|jl4a|jl5b)\b/i.test(candidateAllText) ||
                                       /\b(it\s*operations|infrastructure\s*manager|systems\s*admin|it\s*infra)\b/i.test(primaryTitle);

  // If candidate is clearly in a specialized domain and NOT explicitly a voice caller, suppress voice signals
  const isSpecializedProfessional = hasSapSignal || hasAribaSignal || hasProcurementSignal || hasP2pSignal || hasO2cSignal ||
                                    hasSupplyChainSignal || hasOracleSignal || hasServiceNowSignal || hasNocSignal ||
                                    hasVoiceTrainerSignal || hasHrRecruiterSignal || hasDotNetSignal || hasJavaSignal ||
                                    hasAwsSignal || hasAzureSignal || hasQaSignal || hasDbaSignal || hasItilSignal ||
                                    hasNetworkSignal || hasEngineeringSignal || hasSoftwareSignal || hasFinanceSignal ||
                                    hasDmoAdOpsSignal || hasTelecomTransitionSignal || hasTelecomTransformationSignal ||
                                    hasGenesysSignal || hasCiscoCoreNetworkSignal || hasL2ServiceDeskSignal || hasItOpsInfrastructureSignal;

  const isExplicitVoiceTitle = /\b(voice\s*executive|voice\s*agent|telecaller|telecalling|telesales|bpo caller|call center)\b/i.test(primaryTitle);

  if (isSpecializedProfessional && !isExplicitVoiceTitle) {
    hasVoiceSignal = false;
  }

  const scoredRoles = UNIVERSAL_ROLES.map(role => {
    let matchedKeywords = 0;
    let matchedSkills = [];
    let missingSkills = [];

    // 1. Check Keywords in full resume text
    role.keywords.forEach(kw => {
      if (candidateAllText.includes(kw.toLowerCase())) {
        matchedKeywords++;
      }
    });

    // 2. Check Role Skills vs Candidate Skills
    role.skills.forEach(rs => {
      const rsLower = rs.toLowerCase();
      const hasSkill = candidateSkillsLower.some(cs => cs.includes(rsLower) || rsLower.includes(cs)) ||
                       candidateAllText.includes(rsLower);
      if (hasSkill) {
        matchedSkills.push(rs);
      } else {
        missingSkills.push(rs);
      }
    });

    // Calculate base ratios
    const skillRatio = role.skills.length > 0 ? (matchedSkills.length / role.skills.length) : 0;
    const kwRatio = role.keywords.length > 0 ? Math.min(1, matchedKeywords / Math.min(5, role.keywords.length)) : 0;

    let baseScore = Math.round((skillRatio * 48) + (kwRatio * 32));

    // ── Direct Title Hit Bonus ──
    const roleTitleLower = role.roleName.toLowerCase();
    const roleTitleTokens = roleTitleLower
      .replace(/[()\/]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !['executive', 'associate', 'specialist', 'officer', 'lead', 'senior', 'junior', 'engineer', 'developer', 'consultant'].includes(w));

    let titleHit = false;
    for (const token of roleTitleTokens) {
      if (primaryTitle.includes(token) || experienceTitles.includes(token)) {
        titleHit = true;
        break;
      }
    }
    if (titleHit) {
      baseScore += 30;
    }

    // ── Domain Specific Direct Boosts ──
    if (role.roleName.includes('SAP') && hasSapSignal) {
      baseScore += 45;
    }
    if (role.roleName.includes('Ariba') && hasAribaSignal) {
      baseScore += 50;
    }
    if (role.roleName.includes('Procurement') && hasProcurementSignal) {
      baseScore += 45;
    }
    if (role.roleName.includes('Supply Chain') && hasSupplyChainSignal) {
      baseScore += 40;
    }
    if (role.roleName.includes('Oracle') && hasOracleSignal) {
      baseScore += 45;
    }
    if (role.roleName.includes('.NET') && hasDotNetSignal) {
      baseScore += 50;
    }
    if (role.roleName.includes('Java') && hasJavaSignal) {
      baseScore += 45;
    }
    if (role.roleName.includes('AWS') && hasAwsSignal) {
      baseScore += 45;
    }
    if (role.roleName.includes('Azure') && hasAzureSignal) {
      baseScore += 45;
    }
    if (role.roleName.includes('QA') && hasQaSignal) {
      baseScore += 45;
    }
    if (role.roleName.includes('Database') && hasDbaSignal) {
      baseScore += 45;
    }
    if (role.roleName.includes('Change') && hasItilSignal) {
      baseScore += 55;
    }
    if (role.roleName.includes('Networking') && hasNetworkSignal) {
      baseScore += 45;
    }
    if (role.roleName.includes('P2P') && hasP2pSignal) {
      baseScore += 55;
    }
    if (role.roleName.includes('O2C') && hasO2cSignal) {
      baseScore += 55;
    }
    if (role.roleName.includes('ServiceNow') && hasServiceNowSignal) {
      baseScore += 55;
    }
    if (role.roleName.includes('NOC') && hasNocSignal) {
      baseScore += 55;
    }
    if (role.roleName.includes('Voice & Accent') && hasVoiceTrainerSignal) {
      baseScore += 55;
    }
    if (role.roleName.includes('HR Recruiter') && hasHrRecruiterSignal) {
      baseScore += 50;
    }
    if (role.roleName.includes('DMO Solutions Architect') && hasDmoAdOpsSignal) {
      baseScore += 55;
    }
    if (role.roleName.includes('Telecom Transition') && hasTelecomTransitionSignal) {
      baseScore += 55;
    }
    if (role.roleName.includes('Telecom Transformation') && hasTelecomTransformationSignal) {
      baseScore += 55;
    }

    // ── ANTI-FALSE-POSITIVE GUARD FOR BPO VOICE & CSR ──
    // If the candidate has NO positive voice markers or is a specialized professional, penalize BPO Voice/CSR roles!
    if (role.domain === 'BPO / Customer Operations' && role.roleName.includes('Voice')) {
      if (!hasVoiceSignal) {
        baseScore = Math.min(15, Math.max(5, baseScore - 50));
      }
    }
    if (isSpecializedProfessional && !isExplicitVoiceTitle && role.domain === 'BPO / Customer Operations') {
      baseScore = Math.min(20, Math.max(5, baseScore - 45));
    }

    const matchScore = Math.min(98, Math.max(10, baseScore));

    let tier = 'Potential Fit';
    if (matchScore >= 75) tier = 'Top Match';
    else if (matchScore >= 52) tier = 'Good Fit';

    return {
      roleName: role.roleName,
      domain: role.domain,
      matchScore,
      tier,
      matchedSkills,
      missingSkills,
      recommendationReason: matchedSkills.length > 0
        ? `Strong capability in ${matchedSkills.slice(0, 3).join(', ')}`
        : `Background compatible with ${role.domain}`
    };
  });

  // Sort roles by match score descending, breaking ties with primary title and matched skills
  scoredRoles.sort((a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    const aTitleHit = primaryTitle && a.roleName.toLowerCase().includes(primaryTitle.toLowerCase());
    const bTitleHit = primaryTitle && b.roleName.toLowerCase().includes(primaryTitle.toLowerCase());
    if (aTitleHit && !bTitleHit) return -1;
    if (!aTitleHit && bTitleHit) return 1;

    return b.matchedSkills.length - a.matchedSkills.length;
  });

  let bestRole = scoredRoles[0];

  // ── DYNAMIC DOMAIN INFERENCE FALLBACK ──
  if ((!bestRole || bestRole.matchScore < 50) && primaryTitle) {
    if (hasP2pSignal) {
      const p2pRole = scoredRoles.find(r => r.roleName.includes('P2P'));
      if (p2pRole) {
        p2pRole.matchScore = 85;
        p2pRole.tier = 'Top Match';
        scoredRoles.sort((a, b) => b.matchScore - a.matchScore);
        bestRole = p2pRole;
      }
    } else if (hasO2cSignal) {
      const o2cRole = scoredRoles.find(r => r.roleName.includes('O2C'));
      if (o2cRole) {
        o2cRole.matchScore = 85;
        o2cRole.tier = 'Top Match';
        scoredRoles.sort((a, b) => b.matchScore - a.matchScore);
        bestRole = o2cRole;
      }
    } else if (hasServiceNowSignal) {
      const snRole = scoredRoles.find(r => r.roleName.includes('ServiceNow'));
      if (snRole) {
        snRole.matchScore = 85;
        snRole.tier = 'Top Match';
        scoredRoles.sort((a, b) => b.matchScore - a.matchScore);
        bestRole = snRole;
      }
    } else if (hasNocSignal) {
      const nocRole = scoredRoles.find(r => r.roleName.includes('NOC'));
      if (nocRole) {
        nocRole.matchScore = 85;
        nocRole.tier = 'Top Match';
        scoredRoles.sort((a, b) => b.matchScore - a.matchScore);
        bestRole = nocRole;
      }
    } else if (hasProcurementSignal) {
      const procRole = scoredRoles.find(r => r.roleName.includes('Procurement'));
      if (procRole) {
        procRole.matchScore = 80;
        procRole.tier = 'Top Match';
        scoredRoles.sort((a, b) => b.matchScore - a.matchScore);
        bestRole = procRole;
      }
    } else if (hasSapSignal) {
      const sapRole = scoredRoles.find(r => r.roleName.includes('SAP'));
      if (sapRole) {
        sapRole.matchScore = 82;
        sapRole.tier = 'Top Match';
        scoredRoles.sort((a, b) => b.matchScore - a.matchScore);
        bestRole = sapRole;
      }
    } else if (hasSupplyChainSignal) {
      const scmRole = scoredRoles.find(r => r.roleName.includes('Supply Chain'));
      if (scmRole) {
        scmRole.matchScore = 78;
        scmRole.tier = 'Top Match';
        scoredRoles.sort((a, b) => b.matchScore - a.matchScore);
        bestRole = scmRole;
      }
    } else if (hasVoiceTrainerSignal) {
      const vtRole = scoredRoles.find(r => r.roleName.includes('Voice & Accent'));
      if (vtRole) {
        vtRole.matchScore = 82;
        vtRole.tier = 'Top Match';
        scoredRoles.sort((a, b) => b.matchScore - a.matchScore);
        bestRole = vtRole;
      }
    } else if (hasHrRecruiterSignal) {
      const hrRole = scoredRoles.find(r => r.roleName.includes('HR Recruiter'));
      if (hrRole) {
        hrRole.matchScore = 82;
        hrRole.tier = 'Top Match';
        scoredRoles.sort((a, b) => b.matchScore - a.matchScore);
        bestRole = hrRole;
      }
    } else if (hasDmoAdOpsSignal) {
      const dmoRole = scoredRoles.find(r => r.roleName.includes('DMO Solutions Architect'));
      if (dmoRole) {
        dmoRole.matchScore = 88;
        dmoRole.tier = 'Top Match';
        scoredRoles.sort((a, b) => b.matchScore - a.matchScore);
        bestRole = dmoRole;
      }
    } else if (hasTelecomTransitionSignal) {
      const transRole = scoredRoles.find(r => r.roleName.includes('Telecom Transition'));
      if (transRole) {
        transRole.matchScore = 88;
        transRole.tier = 'Top Match';
        scoredRoles.sort((a, b) => b.matchScore - a.matchScore);
        bestRole = transRole;
      }
    } else if (hasTelecomTransformationSignal) {
      const tfRole = scoredRoles.find(r => r.roleName.includes('Telecom Transformation'));
      if (tfRole) {
        tfRole.matchScore = 88;
        tfRole.tier = 'Top Match';
        scoredRoles.sort((a, b) => b.matchScore - a.matchScore);
        bestRole = tfRole;
      }
    } else if (hasGenesysSignal) {
      const genRole = scoredRoles.find(r => r.roleName.includes('Genesys PureCloud'));
      if (genRole) {
        genRole.matchScore = 88;
        genRole.tier = 'Top Match';
        scoredRoles.sort((a, b) => b.matchScore - a.matchScore);
        bestRole = genRole;
      }
    } else if (hasCiscoCoreNetworkSignal) {
      const netRole = scoredRoles.find(r => r.roleName.includes('Core Network Lead'));
      if (netRole) {
        netRole.matchScore = 88;
        netRole.tier = 'Top Match';
        scoredRoles.sort((a, b) => b.matchScore - a.matchScore);
        bestRole = netRole;
      }
    } else if (hasL2ServiceDeskSignal) {
      const sdRole = scoredRoles.find(r => r.roleName.includes('L2 Service Desk'));
      if (sdRole) {
        sdRole.matchScore = 85;
        sdRole.tier = 'Top Match';
        scoredRoles.sort((a, b) => b.matchScore - a.matchScore);
        bestRole = sdRole;
      }
    } else if (hasItOpsInfrastructureSignal) {
      const opsRole = scoredRoles.find(r => r.roleName.includes('IT Operations') || r.roleName.includes('IT Infrastructure Operations'));
      if (opsRole) {
        opsRole.matchScore = 85;
        opsRole.tier = 'Top Match';
        scoredRoles.sort((a, b) => b.matchScore - a.matchScore);
        bestRole = opsRole;
      }
    }
  }

  // Safety fallback if still no bestRole
  if (!bestRole) {
    bestRole = {
      roleName: 'Back Office / Operations Executive',
      domain: 'General Operations & Admin',
      matchScore: 60,
      tier: 'Good Fit'
    };
  }

  const seniority = calculateSeniority(parsed);

  // ── Match against White Horse Open JRs in Database ──
  const matchedActiveJobs = [];
  if (Array.isArray(openJobs) && openJobs.length > 0) {
    openJobs.forEach(job => {
      const status = job.status || 'Open';
      const statusLower = status.toLowerCase();

      const jobTitle = job.jobTitle || '';
      const jobTitleLower = jobTitle.toLowerCase();
      const jobDomain = (job.division || job.portfolioDepartment || '').toLowerCase();
      
      // Collect all skills from job.skills plus key tokens from title and requirements
      let rawSkills = Array.isArray(job.skills) ? [...job.skills] : [];
      if (rawSkills.length === 0 && (job.requirements || job.description)) {
        const textSample = `${job.requirements || ''} ${job.description || ''}`;
        const extracted = textSample.match(/\b([A-Za-z0-9+#\.\/]{2,20})\b/g) || [];
        rawSkills = extracted.slice(0, 15);
      }
      if (rawSkills.length === 0 && jobTitle) {
        // Extract meaningful tokens from job title e.g. "Credit risk Analyst" -> "Credit Risk", "Analyst"
        const tokens = jobTitle.split(/[\/\\,\-\|]+/).map(t => t.trim()).filter(t => t.length > 2 && !['and', 'the', 'for', 'with', 'from'].includes(t.toLowerCase()));
        rawSkills.push(...tokens);
      }
      const jobSkills = rawSkills.map(s => String(s).trim()).filter(Boolean);

      let jobScore = 20;

      // Title & Role Match
      const titleWords = jobTitleLower.split(/[\s,–\-\/()]+/).filter(w => w.length > 2 && !['and', 'the', 'for', 'with', 'from'].includes(w));
      const matchedTitleWords = titleWords.filter(w => candidateAllText.includes(w) || bestRole.roleName.toLowerCase().includes(w));
      
      if (candidateAllText.includes(jobTitleLower) || jobTitleLower.includes(bestRole.roleName.toLowerCase())) {
        jobScore += 35;
      } else if (titleWords.length > 0 && matchedTitleWords.length > 0) {
        jobScore += Math.round((matchedTitleWords.length / titleWords.length) * 32);
      }

      // Domain Match
      if (bestRole.domain.toLowerCase().includes(jobDomain) || jobDomain.includes(bestRole.domain.toLowerCase())) {
        jobScore += 18;
      }

      // Skills Match
      let jobMatchedSkills = [];
      let jobMissingSkills = [];
      jobSkills.forEach(rawSkill => {
        const js = rawSkill.toLowerCase();
        if (candidateSkillsLower.some(cs => cs.includes(js) || js.includes(cs)) || candidateAllText.includes(js)) {
          jobMatchedSkills.push(rawSkill);
        } else {
          jobMissingSkills.push(rawSkill);
        }
      });

      if (jobSkills.length > 0) {
        const skillRatio = jobMatchedSkills.length / jobSkills.length;
        jobScore += Math.round(skillRatio * 28);
      } else if (matchedTitleWords.length > 0) {
        jobScore += 15;
      }

      // Location match bonus
      const jobLoc = (job.location || '').toLowerCase();
      const candLoc = (parsed.location || '').toLowerCase();
      if (jobLoc && candLoc && (jobLoc.includes(candLoc) || candLoc.includes(jobLoc))) {
        jobScore += 5;
      }

      const finalJobScore = Math.min(98, Math.max(20, jobScore));

      matchedActiveJobs.push({
        _id: job._id,
        jrNumber: job.jrNumber || 'JR-N/A',
        jobTitle: job.jobTitle || 'Role Not Specified',
        companyName: job.companyName || job.client || 'White Horse Client',
        location: job.location || 'Bangalore',
        experience: job.experience || 'Any',
        positions: job.positions || 1,
        status: status,
        matchScore: finalJobScore,
        tier: finalJobScore >= 75 ? 'Top Match' : (finalJobScore >= 55 ? 'Good Fit' : (finalJobScore >= 40 ? 'Potential Fit' : 'Low Fit')),
        matchedSkills: jobMatchedSkills.slice(0, 10),
        missingSkills: jobMissingSkills.slice(0, 8)
      });
    });

    // Prioritize higher score, then active status over closed
    matchedActiveJobs.sort((a, b) => {
      if (a.status === 'Closed' && b.status !== 'Closed') return 1;
      if (b.status === 'Closed' && a.status !== 'Closed') return -1;
      return b.matchScore - a.matchScore;
    });
  }

  return {
    bestFitRole: bestRole.roleName,
    primaryDomain: bestRole.domain,
    confidenceScore: bestRole.matchScore,
    seniority,
    topRecommendations: scoredRoles.slice(0, 4),
    matchedActiveJobs
  };
}

module.exports = {
  UNIVERSAL_ROLES,
  classifyUniversalRole,
  calculateSeniority
};
