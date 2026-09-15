const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', 'website_redesign');

console.log('Reading existing files...');
const indexPath = path.join(baseDir, 'index.html');
const cssPath = path.join(baseDir, 'css', 'style.css');
const jsPath = path.join(baseDir, 'js', 'main.js');

let indexHtml = fs.readFileSync(indexPath, 'utf8');
let styleCss = fs.readFileSync(cssPath, 'utf8');
let mainJs = fs.readFileSync(jsPath, 'utf8');

console.log('1. Updating metadata, topbar, and navbar in index.html...');
// Title
indexHtml = indexHtml.replace(
  /<title>.*?<\/title>/,
  '<title>White Horse Manpower Consultancy — Powered by NEXORA ATS | Executive Search & Global Staffing</title>'
);

// Topbar emails and free recruitment badge
const oldTopbar = `<a href="mailto:whitehorsemanpower@gmail.com" style="color: rgba(255,255,255,0.85); font-weight: 500;">
            whitehorsemanpower@gmail.com
          </a>`;

const newTopbar = `<a href="mailto:hrteamwhmc@gmail.com" style="color: rgba(255,255,255,0.9); font-weight: 600; display: flex; align-items: center; gap: 4px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            hrteamwhmc@gmail.com
          </a>
          <span style="color: rgba(212,175,55,0.8);">&bull;</span>
          <a href="mailto:tarnakahrteamwhmc@gmail.com" style="color: rgba(255,255,255,0.8); font-weight: 500; font-size: 0.75rem;">
            tarnakahrteamwhmc@gmail.com
          </a>
          <span class="topbar-free-badge">100% Free Recruitment</span>`;

indexHtml = indexHtml.replace(oldTopbar, newTopbar);

// Brand logo in Navbar
const oldBrandLogo = `<a href="#home" class="brand-logo">
        <img src="assets/images/logo.png" alt="White Horse Manpower Logo">
      </a>`;

const newBrandLogo = `<a href="#home" class="brand-logo">
        <img src="assets/images/logo.png" alt="Nexora ATS - White Horse Manpower" class="brand-logo-img">
        <div class="brand-logo-text">
          <span class="brand-title">WHITE HORSE <span class="gold-text">MANPOWER</span></span>
          <span class="brand-subtitle">Powered by NEXORA ATS</span>
        </div>
      </a>`;

indexHtml = indexHtml.replace(oldBrandLogo, newBrandLogo);

// Nav menu links: update Sectors to Where You Fit In & add Clients
indexHtml = indexHtml.replace(
  `<li><a href="#practices" class="nav-link">Sectors</a></li>`,
  `<li><a href="#where-you-fit-in" class="nav-link">Where You Fit In</a></li>
          <li><a href="#clients" class="nav-link">Our Associations</a></li>`
);

console.log('2. Upgrading Client Trust Ribbon to 40+ Enterprise Associations...');
const oldTrustRibbon = `  <!-- ==========================================================================
       4. Client Trust Ribbon
       ========================================================================== -->
  <section class="trust-ribbon">
    <div class="container">
      <div class="ribbon-header">
        <span>Trusted By Tier-1 Global Enterprises, Tech Giants & Shared Service Centers</span>
      </div>
      <div class="client-marquee">
        <div class="client-badge-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          Fortune 500 Tech MNCs
        </div>
        <div class="client-badge-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          Global In-House Centers (GCC)
        </div>
        <div class="client-badge-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
          Tier-1 BPM & IT Conglomerates
        </div>
        <div class="client-badge-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Fintech & Banking Leaders
        </div>
        <div class="client-badge-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          Healthcare & Life Sciences
        </div>
      </div>
    </div>
  </section>`;

const clientsRow1 = [
  'Accenture', 'HSBC', 'Infosys', 'JPMC', 'Intouch', '247.ai', 'AdvanEdge', 'Advantif Japan',
  'Aegis', 'Aeries', 'Alldigi', 'AltiSource', 'American Express', 'Availity', 'Capita',
  'Cognizant', 'Coin Switch', 'Concentrix', 'eClinicalWorks', 'Equilize RCM'
];

const clientsRow2 = [
  'eXpleo', 'First Source', 'Flatworld', 'Genisys', 'Hinduja Global', 'IBM', 'Justenergy',
  'Kraft', 'Mindtree', 'NextSquare', 'NoBroker', 'NYX Medical', 'Omega Healthcare',
  'SavebySwitching', 'CoForge', 'Tech Mahindra', 'Telligent', 'Transworld Systems',
  'WNS Global', 'Zayaan Technologies LLC'
];

const renderMarqueeRow = (items) => {
  return items.map(c => `
          <div class="marquee-client-chip">
            <span class="chip-star">✦</span>
            <span class="chip-name">${c}</span>
          </div>`).join('');
};

const newAssociationsSection = `  <!-- ==========================================================================
       4. Our Association With (40+ Global Industry Leaders)
       ========================================================================== -->
  <section class="trust-ribbon" id="clients">
    <div class="container">
      <div class="ribbon-header">
        <span class="section-tag gold" style="margin-bottom: 8px;">Industry Footprint</span>
        <h2 style="font-family: var(--font-heading); font-size: 1.65rem; font-weight: 800; color: var(--slate-900); margin-bottom: 6px;">
          Our Association with 40+ Industry Giants
        </h2>
        <p style="font-size: 0.92rem; color: var(--slate-600); max-width: 680px; margin: 0 auto;">
          Trusted recruitment partner for Fortune 500 corporations, Global In-House Centers (GCCs), and leading BPM conglomerates.
        </p>
      </div>
    </div>

    <!-- Infinite Dual Marquee -->
    <div class="marquee-wrapper">
      <div class="marquee-track marquee-track-left">
        ${renderMarqueeRow(clientsRow1)}
        ${renderMarqueeRow(clientsRow1)}
      </div>
    </div>

    <div class="marquee-wrapper" style="margin-top: 14px;">
      <div class="marquee-track marquee-track-right">
        ${renderMarqueeRow(clientsRow2)}
        ${renderMarqueeRow(clientsRow2)}
      </div>
    </div>

    <!-- Client Quick Stats & Badges Grid Toggle -->
    <div class="container" style="margin-top: 24px;">
      <div class="client-association-meta">
        <div class="assoc-stat">
          <strong>40+</strong>
          <span>Enterprise Clients</span>
        </div>
        <div class="assoc-stat">
          <strong>17+ Yrs</strong>
          <span>Recruitment Legacy</span>
        </div>
        <div class="assoc-stat">
          <strong>PAN India & Global</strong>
          <span>Hiring Reach (India & Dubai)</span>
        </div>
        <div class="assoc-stat">
          <strong style="color: var(--emerald-600);">100% FREE</strong>
          <span>Candidate Placement</span>
        </div>
      </div>
    </div>
  </section>`;

indexHtml = indexHtml.replace(oldTrustRibbon, newAssociationsSection);

console.log('3. Upgrading Practices to "Where Do You Fit In" (15 Sectors)...');
// Sector definitions
const SECTORS_15 = [
  {
    id: 'it',
    category: 'tech',
    tag: 'Tech & Cloud',
    title: 'Information Technology (IT)',
    desc: 'Full lifecycle software development, cloud infrastructure, AI/ML engineering, QA automation, and cybersecurity solutions.',
    skills: [
      'Software Development (Java, Python, .NET)',
      'Web Development (Frontend / Backend / Full Stack)',
      'Cloud & DevOps (AWS, Azure, GCP)',
      'Cyber Security & Networking',
      'Data Analytics & Data Science',
      'Testing & QA Automation'
    ]
  },
  {
    id: 'bfsi',
    category: 'bfsi',
    tag: 'BFSI & Fintech',
    title: 'Banking & Financial Services (BFSI)',
    desc: 'Retail, corporate, and investment banking operations, wealth management, risk governance, and regulatory KYC/AML analysis.',
    skills: [
      'Retail & Corporate Banking',
      'Investment Banking & Wealth Management',
      'Risk, Compliance & KYC/AML',
      'Loan Processing & Credit Analysis',
      'Treasury & Trade Finance'
    ]
  },
  {
    id: 'accounting',
    category: 'bfsi',
    tag: 'Finance & Accounting',
    title: 'Accounting & Finance',
    desc: 'Corporate accounting, Procure-to-Pay (P2P), Record-to-Report (R2R), statutory taxation, internal audit, and FP&A budgeting.',
    skills: [
      'Accounts Payable / Receivable',
      'General Ledger & R2R',
      'Taxation & Audit',
      'Financial Planning & Analysis (FP&A)',
      'Payroll & Compliance'
    ]
  },
  {
    id: 'bpo',
    category: 'ops',
    tag: 'Operations & BPM',
    title: 'BPO / KPO / Customer Support',
    desc: 'High-velocity 24x7 customer support operations, international voice, non-voice email/chat, and technical helpdesk services.',
    skills: [
      'Voice / Non-Voice Process',
      'International & Domestic Support',
      'Email / Chat Support',
      'Technical Helpdesk',
      'Back Office Operations'
    ]
  },
  {
    id: 'hr',
    category: 'ops',
    tag: 'People & Culture',
    title: 'Human Resources (HR)',
    desc: 'Strategic talent acquisition, employee lifecycle management, HR business partnering (HRBP), payroll, and organizational L&D.',
    skills: [
      'Talent Acquisition & Recruitment',
      'HR Operations & Payroll',
      'Learning & Development (L&D)',
      'Employee Engagement',
      'HR Business Partnering'
    ]
  },
  {
    id: 'sales',
    category: 'ops',
    tag: 'Revenue & Growth',
    title: 'Sales & Marketing',
    desc: 'Omnichannel revenue generation, enterprise inside/field sales, full-funnel digital marketing, SEO, SEM, and brand development.',
    skills: [
      'Inside Sales / Field Sales',
      'Digital Marketing (SEO, SEM, Social Media)',
      'Business Development',
      'Brand Management',
      'Market Research'
    ]
  },
  {
    id: 'healthcare',
    category: 'healthcare',
    tag: 'Healthcare & Life Sciences',
    title: 'Healthcare & Pharma',
    desc: 'HIPAA-compliant medical coding, revenue cycle management (RCM), clinical research trials, and hospital operations.',
    skills: [
      'Medical Coding & Billing',
      'Clinical Research',
      'Pharmacy & Hospital Administration',
      'Healthcare BPO',
      'Lab & Diagnostics'
    ]
  },
  {
    id: 'engineering',
    category: 'eng',
    tag: 'Engineering & Industry 4.0',
    title: 'Engineering & Manufacturing',
    desc: 'Mechanical, electrical, and civil engineering, shop-floor production, quality assurance, CAD design, and industrial maintenance.',
    skills: [
      'Mechanical / Electrical / Civil',
      'Production & Quality Control',
      'Maintenance & Operations',
      'Design (AutoCAD, SolidWorks)',
      'Industrial Engineering'
    ]
  },
  {
    id: 'logistics',
    category: 'eng',
    tag: 'Supply Chain & Logistics',
    title: 'Logistics & Supply Chain',
    desc: 'End-to-end strategic procurement, warehouse and inventory management, global freight logistics, and supply chain planning.',
    skills: [
      'Procurement & Vendor Management',
      'Inventory & Warehouse Management',
      'Transportation & Distribution',
      'Import & Export Operations',
      'Supply Chain Planning'
    ]
  },
  {
    id: 'retail',
    category: 'eng',
    tag: 'Retail & E-commerce',
    title: 'Retail & E-commerce',
    desc: 'Omnichannel retail store management, e-commerce marketplace operations, category merchandising, and customer journey optimization.',
    skills: [
      'Store Operations',
      'Merchandising',
      'Online Marketplace Operations',
      'Customer Experience',
      'Inventory Management'
    ]
  },
  {
    id: 'telecom',
    category: 'tech',
    tag: 'Telecom & Infrastructure',
    title: 'Telecom & Networking',
    desc: 'Core telecommunications infrastructure, long-haul fiber builds, 24x7 NOC operations, and broadband network engineering.',
    skills: [
      'Network Engineering',
      'Telecom Operations',
      'Field Support & Installation',
      'NOC (Network Operations Center)',
      'Wireless & Broadband Services'
    ]
  },
  {
    id: 'insurance',
    category: 'bfsi',
    tag: 'Insurance & Actuarial',
    title: 'Insurance',
    desc: 'Life, health, and general insurance underwriting, policy issuance, claims processing and adjudication, and agency distribution.',
    skills: [
      'Life & General Insurance',
      'Claims Processing',
      'Underwriting',
      'Policy Servicing',
      'Insurance Sales'
    ]
  },
  {
    id: 'education',
    category: 'corp',
    tag: 'Education & EdTech',
    title: 'Education & Training',
    desc: 'Academic leadership, corporate training, EdTech operational management, content development, and faculty hiring.',
    skills: [
      'Teaching & Faculty Roles',
      'Corporate Training',
      'EdTech Operations',
      'Content Development',
      'Academic Coordination'
    ]
  },
  {
    id: 'hospitality',
    category: 'corp',
    tag: 'Hospitality & Tourism',
    title: 'Hospitality & Travel',
    desc: 'Luxury hotel management, guest relations, travel and international ticketing, corporate events, and F&B operations.',
    skills: [
      'Hotel Management',
      'Front Office & Guest Relations',
      'Travel & Ticketing',
      'Event Management',
      'Food & Beverage Services'
    ]
  },
  {
    id: 'legal',
    category: 'corp',
    tag: 'Legal, Risk & Governance',
    title: 'Legal & Compliance',
    desc: 'Corporate legal advisory, contract management (CLM), regulatory compliance governance, documentation, and risk mitigation.',
    skills: [
      'Corporate Law',
      'Contract Management',
      'Legal Advisory',
      'Compliance & Governance',
      'Documentation & Risk'
    ]
  }
];

const renderPracticeCards = () => {
  return SECTORS_15.map((s, idx) => `
        <div class="practice-card" data-sector="${s.id}" data-category="${s.category}">
          <div>
            <div class="practice-card-top">
              <span class="practice-sector-tag">${s.tag}</span>
              <span class="practice-number">0${idx + 1 > 9 ? idx + 1 : '0' + (idx + 1)}</span>
            </div>
            <h3 class="practice-title">${s.title}</h3>
            <p class="practice-desc">${s.desc}</p>
          </div>
          <div class="practice-skills-wrap">
            <div class="practice-roles">
              ${s.skills.map(sk => `<span class="practice-pill">${sk}</span>`).join('\n              ')}
            </div>
            <div class="practice-card-footer">
              <button onclick="filterCareersBySector('${s.id}')" class="practice-action-link">
                View Openings in Sector &rarr;
              </button>
            </div>
          </div>
        </div>`).join('\n');
};

const oldPracticesRegex = /<!-- ==========================================================================\s+5\. Specialized Industry Practices\s+========================================================================== -->[\s\S]*?<\/section>/;

const newPracticesSection = `<!-- ==========================================================================
       5. Where Do You Fit In? (15 Specialized Industry Practice Areas)
       ========================================================================== -->
  <section class="section" id="where-you-fit-in">
    <div class="container">
      <div class="section-header">
        <span class="section-tag">Practice Matrix</span>
        <h2 class="section-title">Where Do You Fit In?</h2>
        <p class="section-desc">
          Explore our 15 specialized industry sectors and functional disciplines. Whether you are an entry-level professional or an executive leader, White Horse Manpower connects you to premier career opportunities with Fortune 500 enterprises.
        </p>

        <!-- Live Sector Search -->
        <div class="sector-search-bar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" id="sectorFilterInput" placeholder="Type any skill or discipline (e.g. Java, Accounts Payable, KYC, Medical Coding, NOC, AutoCAD, Claims)...">
        </div>

        <!-- Category Filter Tabs -->
        <div class="sector-tabs-nav">
          <button class="sector-tab-btn active" data-filter="all">All Sectors (15)</button>
          <button class="sector-tab-btn" data-filter="tech">Tech & Telecom</button>
          <button class="sector-tab-btn" data-filter="bfsi">BFSI & Finance</button>
          <button class="sector-tab-btn" data-filter="ops">BPO, Sales & HR</button>
          <button class="sector-tab-btn" data-filter="healthcare">Healthcare & Pharma</button>
          <button class="sector-tab-btn" data-filter="eng">Engineering & Supply Chain</button>
          <button class="sector-tab-btn" data-filter="corp">Legal, Education & Hospitality</button>
        </div>
      </div>

      <div class="practices-grid" id="practicesGrid">
        ${renderPracticeCards()}
      </div>

      <!-- Free Candidate Recruitment Callout Banner -->
      <div class="candidate-trust-card" style="margin-top: 56px;">
        <div class="trust-card-badge">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Candidate Assurance
        </div>
        <div class="trust-card-content">
          <h3>100% Free Recruitment for Job Seekers</h3>
          <p>
            White Horse Manpower Consultancy Private Limited is committed to ethical recruitment. We <strong>NEVER charge candidates</strong> any registration fees, processing charges, or placement deductions. All services for job seekers are completely free.
          </p>
        </div>
        <div class="trust-card-cta">
          <a href="#careers" class="btn btn-emerald">Search 100+ Live Jobs</a>
        </div>
      </div>
    </div>
  </section>`;

indexHtml = indexHtml.replace(oldPracticesRegex, newPracticesSection);

console.log('4. Upgrading Solutions Section with 7 Core Hiring Models...');
const oldSolutionsRegex = /<!-- ==========================================================================\s+6\. Talent Solutions \(Interactive Tabs\)[\s\S]*?<\/section>/;

const newSolutionsSection = `<!-- ==========================================================================
       6. Core Hiring Models & Workforce Solutions
       ========================================================================== -->
  <section class="section section-alt" id="solutions">
    <div class="container">
      <div class="section-header">
        <span class="section-tag gold">Engagement Models</span>
        <h2 class="section-title">End-to-End Workforce Solutions</h2>
        <p class="section-desc">
          From high-volume project staffing to confidential leadership appointments, our bespoke models deliver speed, rigor, and compliance across PAN India and Global markets.
        </p>
      </div>

      <div class="hiring-models-grid">
        <!-- Model 1 -->
        <div class="hiring-model-card">
          <div class="model-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <h4>Permanent Hiring</h4>
          <p>Full-time lateral recruitment for critical technical, functional, and operational roles with a 90-day replacement warranty.</p>
          <span class="model-tag">Lateral & Specialized</span>
        </div>

        <!-- Model 2 -->
        <div class="hiring-model-card">
          <div class="model-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
          </div>
          <h4>Contract Staffing</h4>
          <p>Agile, compliant workforce deployment for time-sensitive projects, shift requirements, and operational ramp-ups.</p>
          <span class="model-tag">Statutory & Flexible</span>
        </div>

        <!-- Model 3 -->
        <div class="hiring-model-card">
          <div class="model-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <h4>Bulk Hiring</h4>
          <p>High-velocity volume hiring pods capable of deploying 50 to 500+ pre-vetted candidates within 7–14 calendar days.</p>
          <span class="model-tag">High Velocity RPO</span>
        </div>

        <!-- Model 4 -->
        <div class="hiring-model-card">
          <div class="model-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <h4>Leadership Hiring</h4>
          <p>Practice heads, solution architects, delivery directors, and engineering managers with verified industry track records.</p>
          <span class="model-tag">Mid-to-Senior Tier</span>
        </div>

        <!-- Model 5 -->
        <div class="hiring-model-card">
          <div class="model-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </div>
          <h4>Executive Hiring</h4>
          <p>Discreet retained search for VP, Senior VP, CXO, and Managing Director positions across India and UAE.</p>
          <span class="model-tag">Confidential Search</span>
        </div>

        <!-- Model 6 -->
        <div class="hiring-model-card">
          <div class="model-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
          </div>
          <h4>PAN India Hiring</h4>
          <p>Sourcing coverage across Tier 1 & Tier 2 hubs including Bangalore, Pune, Hyderabad, Mumbai, NCR, and Chennai.</p>
          <span class="model-tag">All Indian Metros</span>
        </div>

        <!-- Model 7 -->
        <div class="hiring-model-card" style="grid-column: span 3;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 20px;">
            <div style="display: flex; align-items: center; gap: 18px;">
              <div class="model-icon" style="margin-bottom: 0;">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/></svg>
              </div>
              <div>
                <h4 style="margin-bottom: 4px;">Global Hiring (Dubai HQ & GCC Markets)</h4>
                <p style="margin-bottom: 0; color: var(--slate-600);">Direct cross-border executive placements and international workforce solutions connecting India and Middle East enterprises.</p>
              </div>
            </div>
            <button onclick="openEmployerModal()" class="btn btn-emerald">Initiate Global Mandate</button>
          </div>
        </div>
      </div>
    </div>
  </section>`;

indexHtml = indexHtml.replace(oldSolutionsRegex, newSolutionsSection);

console.log('5. Updating Corporate Credentials and Contacts in Footer...');
// Update footer
const oldFooterBrand = `<div class="footer-brand">
          <img src="assets/images/logo.png" alt="White Horse Manpower" style="height: 46px; filter: brightness(0) invert(1);">
          <p>
            White Horse Manpower Private Limited is an executive staffing and talent acquisition firm established in 2007, serving enterprise leaders across India and UAE.
          </p>`;

const newFooterBrand = `<div class="footer-brand">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
            <img src="assets/images/logo.png" alt="Nexora ATS - White Horse Manpower" style="height: 48px; object-fit: contain;">
            <div>
              <strong style="color: #fff; font-size: 1.1rem; display: block; line-height: 1.2;">WHITE HORSE MANPOWER</strong>
              <span style="color: var(--gold-400); font-size: 0.72rem; font-weight: 600; text-transform: uppercase;">Powered by NEXORA ATS</span>
            </div>
          </div>
          <p>
            White Horse Manpower Consultancy Private Limited is an executive search and workforce solutions consultancy incorporated in 2007. Trusted by 40+ global enterprise partners.
          </p>`;

indexHtml = indexHtml.replace(oldFooterBrand, newFooterBrand);

// Footer contact items
const oldFooterContact = `<div class="footer-contact-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <div>
              <strong style="color: #fff;">Corporate Desk:</strong><br>
              whitehorsemanpower@gmail.com
            </div>
          </div>`;

const newFooterContact = `<div class="footer-contact-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <div>
              <strong style="color: #fff;">Official Email Desks:</strong><br>
              <a href="mailto:hrteamwhmc@gmail.com" style="color: var(--gold-300);">hrteamwhmc@gmail.com</a><br>
              <a href="mailto:tarnakahrteamwhmc@gmail.com" style="color: rgba(255,255,255,0.85); font-size: 0.8rem;">tarnakahrteamwhmc@gmail.com</a>
            </div>
          </div>
          <div class="footer-contact-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/></svg>
            <div>
              <strong style="color: #fff;">Official Web Portal:</strong><br>
              <a href="https://www.whitehorsemanpower.in" target="_blank" style="color: var(--emerald-400); font-weight: 600;">www.whitehorsemanpower.in</a>
            </div>
          </div>`;

indexHtml = indexHtml.replace(oldFooterContact, newFooterContact);

fs.writeFileSync(indexPath, indexHtml, 'utf8');
console.log('Successfully updated website_redesign/index.html');

console.log('\n6. Appending upgraded styles to website_redesign/css/style.css...');
const additionalCss = `
/* ── Upgraded Brand Logo & Subtitle ── */
.brand-logo-text {
  display: flex;
  flex-direction: column;
}
.brand-title {
  font-family: var(--font-heading);
  font-size: 1.12rem;
  font-weight: 800;
  color: var(--emerald-950);
  line-height: 1.15;
  letter-spacing: -0.2px;
}
.brand-subtitle {
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--gold-600);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.topbar-free-badge {
  background: var(--emerald-500);
  color: #fff;
  font-weight: 700;
  font-size: 0.68rem;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

/* ── 40+ Clients Marquee Ribbon ── */
.marquee-wrapper {
  overflow: hidden;
  user-select: none;
  display: flex;
  position: relative;
  width: 100%;
}
.marquee-wrapper::before,
.marquee-wrapper::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 100px;
  z-index: 2;
  pointer-events: none;
}
.marquee-wrapper::before {
  left: 0;
  background: linear-gradient(to right, var(--slate-50), transparent);
}
.marquee-wrapper::after {
  right: 0;
  background: linear-gradient(to left, var(--slate-50), transparent);
}
.marquee-track {
  display: flex;
  align-items: center;
  gap: 16px;
  width: max-content;
  white-space: nowrap;
}
.marquee-track-left {
  animation: marqueeScrollLeft 48s linear infinite;
}
.marquee-track-right {
  animation: marqueeScrollRight 48s linear infinite;
}
.marquee-track:hover {
  animation-play-state: paused;
}
@keyframes marqueeScrollLeft {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes marqueeScrollRight {
  0% { transform: translateX(-50%); }
  100% { transform: translateX(0); }
}
.marquee-client-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--white);
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-full);
  padding: 8px 18px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  transition: var(--transition);
  cursor: default;
}
.marquee-client-chip:hover {
  border-color: var(--gold-400);
  box-shadow: 0 6px 16px rgba(212, 175, 55, 0.2);
  transform: translateY(-2px);
}
.chip-star {
  color: var(--gold-500);
  font-size: 0.75rem;
}
.chip-name {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--slate-800);
}
.client-association-meta {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  padding-top: 20px;
  border-top: 1px solid var(--slate-200);
  text-align: center;
}
.assoc-stat strong {
  display: block;
  font-family: var(--font-heading);
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--emerald-950);
}
.assoc-stat span {
  font-size: 0.78rem;
  color: var(--slate-500);
  font-weight: 500;
}

/* ── "Where Do You Fit In" Sector Search & Filters ── */
.sector-search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 680px;
  margin: 0 auto 24px;
  background: var(--white);
  border: 2px solid var(--emerald-200);
  border-radius: var(--radius-full);
  padding: 8px 22px;
  box-shadow: 0 8px 24px rgba(6, 78, 59, 0.06);
  transition: var(--transition);
}
.sector-search-bar:focus-within {
  border-color: var(--gold-500);
  box-shadow: 0 10px 28px rgba(212, 175, 55, 0.15);
}
.sector-search-bar svg {
  color: var(--emerald-600);
  flex-shrink: 0;
}
.sector-search-bar input {
  width: 100%;
  border: none;
  outline: none;
  font-size: 0.95rem;
  color: var(--slate-800);
  background: transparent;
  font-family: inherit;
}
.sector-tabs-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 38px;
}
.sector-tab-btn {
  background: var(--white);
  border: 1px solid var(--slate-200);
  color: var(--slate-600);
  padding: 8px 18px;
  border-radius: var(--radius-full);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
}
.sector-tab-btn:hover {
  background: var(--emerald-50);
  color: var(--emerald-800);
  border-color: var(--emerald-300);
}
.sector-tab-btn.active {
  background: var(--emerald-900);
  color: var(--gold-300);
  border-color: var(--emerald-950);
  box-shadow: 0 4px 12px rgba(6, 78, 59, 0.2);
}

/* ── Practice Card Sub-Elements ── */
.practice-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.practice-sector-tag {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--emerald-800);
  background: var(--emerald-50);
  border: 1px solid var(--emerald-200);
  padding: 3px 10px;
  border-radius: var(--radius-full);
}
.practice-number {
  font-family: var(--font-heading);
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--slate-300);
}
.practice-skills-wrap {
  margin-top: 18px;
}
.practice-card-footer {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px dashed var(--slate-200);
}
.practice-action-link {
  background: none;
  border: none;
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--emerald-700);
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: var(--transition);
}
.practice-action-link:hover {
  color: var(--gold-600);
  transform: translateX(3px);
}

/* ── Candidate Trust Banner ── */
.candidate-trust-card {
  background: linear-gradient(135deg, var(--emerald-950) 0%, #064e3b 100%);
  border: 2px solid var(--gold-400);
  border-radius: var(--radius-xl);
  padding: 36px 42px;
  box-shadow: 0 20px 45px rgba(6, 78, 59, 0.25);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 24px;
  color: #fff;
}
.trust-card-badge {
  background: rgba(212, 175, 55, 0.2);
  border: 1px solid var(--gold-400);
  color: var(--gold-300);
  font-weight: 700;
  font-size: 0.82rem;
  padding: 6px 14px;
  border-radius: var(--radius-full);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-transform: uppercase;
}
.trust-card-content {
  max-width: 620px;
}
.trust-card-content h3 {
  font-family: var(--font-heading);
  font-size: 1.45rem;
  font-weight: 800;
  color: var(--white);
  margin-top: 8px;
  margin-bottom: 6px;
}
.trust-card-content p {
  font-size: 0.92rem;
  color: rgba(255, 255, 255, 0.88);
  line-height: 1.5;
  margin-bottom: 0;
}

/* ── 7 Core Hiring Models Grid ── */
.hiring-models-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}
.hiring-model-card {
  background: var(--white);
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-lg);
  padding: 28px 24px;
  box-shadow: var(--shadow-sm);
  transition: var(--transition);
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.hiring-model-card:hover {
  border-color: var(--gold-400);
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}
.model-icon {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
  background: var(--emerald-50);
  color: var(--emerald-700);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
  transition: var(--transition);
}
.hiring-model-card:hover .model-icon {
  background: var(--grad-gold);
  color: var(--slate-950);
}
.hiring-model-card h4 {
  font-family: var(--font-heading);
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--slate-900);
  margin-bottom: 8px;
}
.hiring-model-card p {
  font-size: 0.88rem;
  color: var(--slate-600);
  line-height: 1.5;
  margin-bottom: 16px;
}
.model-tag {
  align-self: flex-start;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  background: var(--slate-100);
  color: var(--slate-700);
  padding: 3px 9px;
  border-radius: var(--radius-sm);
}

@media (max-width: 992px) {
  .practices-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .hiring-models-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .hiring-model-card[style*="grid-column: span 3"] {
    grid-column: span 2 !important;
  }
  .client-association-meta {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .practices-grid {
    grid-template-columns: 1fr;
  }
  .hiring-models-grid {
    grid-template-columns: 1fr;
  }
  .hiring-model-card[style*="grid-column: span 3"] {
    grid-column: span 1 !important;
  }
  .client-association-meta {
    grid-template-columns: 1fr 1fr;
  }
  .candidate-trust-card {
    padding: 24px 20px;
  }
}
`;

if (!styleCss.includes('marquee-wrapper')) {
  styleCss += additionalCss;
  fs.writeFileSync(cssPath, styleCss, 'utf8');
  console.log('Successfully appended styles to website_redesign/css/style.css');
}

console.log('\n7. Updating website_redesign/js/main.js with search and filter logic...');
const additionalJs = `
  // ── 7. Sector Matrix Filtering & Live Search ──
  const sectorInput = document.getElementById('sectorFilterInput');
  const sectorTabBtns = document.querySelectorAll('.sector-tab-btn');
  const practiceCards = document.querySelectorAll('.practice-card');

  function filterPracticeCards() {
    const query = (sectorInput?.value || '').toLowerCase().trim();
    const activeTab = document.querySelector('.sector-tab-btn.active');
    const selectedCategory = activeTab?.getAttribute('data-filter') || 'all';

    practiceCards.forEach(card => {
      const cardCategory = card.getAttribute('data-category');
      const cardText = card.textContent.toLowerCase();

      const matchesCategory = (selectedCategory === 'all') || (cardCategory === selectedCategory);
      const matchesQuery = !query || cardText.includes(query);

      if (matchesCategory && matchesQuery) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  }

  if (sectorInput) {
    sectorInput.addEventListener('input', filterPracticeCards);
  }

  sectorTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sectorTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterPracticeCards();
    });
  });

  window.filterCareersBySector = function(sectorId) {
    const careersSection = document.getElementById('careers');
    if (careersSection) {
      careersSection.scrollIntoView({ behavior: 'smooth' });
    }
  };
`;

if (!mainJs.includes('sectorFilterInput')) {
  // insert before ending listener
  mainJs = mainJs.replace(/}\);\s*$/, additionalJs + '\n});');
  fs.writeFileSync(jsPath, mainJs, 'utf8');
  console.log('Successfully updated website_redesign/js/main.js');
}

console.log('\nALL WEBSITE FILES UPGRADED SUCCESSFULLY! ✨');
