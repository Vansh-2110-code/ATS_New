const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', 'website_redesign');
const indexPath = path.join(baseDir, 'index.html');
const cssPath = path.join(baseDir, 'css', 'style.css');

console.log('Reading files...');
let html = fs.readFileSync(indexPath, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');

console.log('1. Fixing Navbar HTML and Logo Display...');

// Replace the navbar block cleanly
const oldNavbarRegex = /<!-- ==========================================================================\s+2\. Floating Executive Navbar\s+========================================================================== -->[\s\S]*?<\/header>/;

const newNavbarHtml = `<!-- ==========================================================================
       2. Floating Executive Navbar
       ========================================================================== -->
  <header class="navbar">
    <div class="container nav-container">
      <a href="#home" class="brand-logo" aria-label="Nexora ATS">
        <img src="assets/images/logo.png" alt="Nexora ATS - Connecting Talent. Powering Growth." class="brand-logo-img">
      </a>

      <nav class="nav-wrapper">
        <ul class="nav-menu">
          <li><a href="#home" class="nav-link active">Home</a></li>
          <li><a href="#where-you-fit-in" class="nav-link">Where You Fit In</a></li>
          <li><a href="#associations" class="nav-link">Our Associations</a></li>
          <li><a href="#solutions" class="nav-link">Hiring Models</a></li>
          <li><a href="#careers" class="nav-link">Jobs</a></li>
          <li><a href="#about" class="nav-link">About</a></li>
          <li><a href="#contact" class="nav-link">Contact</a></li>
        </ul>
      </nav>

      <div class="nav-actions">
        <button onclick="openEmployerModal()" class="btn btn-gold-outline">Hire Talent</button>
        <a href="#careers" class="btn btn-emerald">Explore Jobs</a>
      </div>

      <button class="mobile-toggle" aria-label="Toggle navigation">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h16M4 6h16M4 18h16"/></svg>
      </button>
    </div>
  </header>`;

html = html.replace(oldNavbarRegex, newNavbarHtml);

console.log('2. Updating "Our Association with Leading Enterprises" Section...');

// 40 client companies
const clientCategories = {
  'IT & Technology': [
    'Accenture', 'Infosys', 'IBM', 'Cognizant', 'Tech Mahindra', 'Mindtree', 
    'CoForge', 'Flatworld', 'Genisys', 'Zayaan Technologies LLC', 'eXpleo', 'NextSquare'
  ],
  'BFSI & FinTech': [
    'HSBC', 'JPMC', 'American Express', 'Coin Switch', 'Transworld Systems', 'SavebySwitching'
  ],
  'BPM & Customer Ops': [
    'Concentrix', 'WNS Global', 'Hinduja Global', 'First Source', '247.ai', 'Alldigi', 
    'Capita', 'Aegis', 'Aeries', 'Intouch', 'Telligent', 'AltiSource'
  ],
  'Healthcare & RCM': [
    'Omega Healthcare', 'eClinicalWorks', 'Equilize RCM', 'Availity', 'NYX Medical'
  ],
  'Conglomerates & Energy': [
    'Kraft', 'Justenergy', 'NoBroker', 'AdvanEdge', 'Advantif Japan'
  ]
};

const renderClientBadges = () => {
  let output = '';
  for (const [cat, list] of Object.entries(clientCategories)) {
    output += `
        <div class="assoc-cat-group">
          <div class="assoc-cat-title">
            <span>${cat}</span>
          </div>
          <div class="assoc-badges-row">
            ${list.map(c => `
              <div class="assoc-badge">
                <span class="assoc-badge-dot"></span>
                <span class="assoc-badge-name">${c}</span>
              </div>`).join('')}
          </div>
        </div>`;
  }
  return output;
};

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

const oldAssociationsRegex = /<!-- ==========================================================================\s+4\. Our Association With[\s\S]*?<\/section>/;

const newAssociationsHtml = `<!-- ==========================================================================
       4. Our Association With Leading Enterprises (NEXORA ATS)
       ========================================================================== -->
  <section class="trust-ribbon" id="associations">
    <div class="container">
      <div class="section-header" style="margin-bottom: 32px;">
        <span class="section-tag gold">Enterprise Ecosystem</span>
        <h2 class="section-title">Our Association with 40+ Industry Leaders</h2>
        <p class="section-desc">
          Top-tier global corporations, Global Capability Centers (GCCs), and Fortune 500 enterprises partnering with <strong>NEXORA ATS</strong> and <strong>White Horse Manpower</strong> for specialized workforce delivery.
        </p>
      </div>
    </div>

    <!-- Infinite Dual Marquee Ticker -->
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

    <!-- Detailed 40-Company Grid & Trust Showcase -->
    <div class="container" style="margin-top: 48px;">
      <div class="assoc-showcase-grid">
        <!-- Left: Categorized 40 Client Badges -->
        <div class="assoc-left-col">
          <div class="assoc-badge-card">
            <div class="assoc-card-header">
              <div>
                <h3 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800; color: var(--slate-900);">
                  Verified Enterprise Client Roster
                </h3>
                <p style="font-size: 0.85rem; color: var(--slate-500); margin-top: 2px;">
                  Active candidate placements, lateral hiring & volume staffing across sectors.
                </p>
              </div>
              <span class="assoc-counter-badge">40+ Partners</span>
            </div>

            ${renderClientBadges()}
          </div>
        </div>

        <!-- Right: Official Association Flyer & Guarantee Card -->
        <div class="assoc-right-col">
          <div class="assoc-official-card">
            <div class="assoc-official-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Official Association
            </div>

            <div class="assoc-official-image-wrap">
              <img src="assets/images/client-associations-flyer.png" alt="Our Association with Accenture, HSBC, Infosys, JPMC and 40+ Clients" class="assoc-flyer-img">
            </div>

            <div class="assoc-official-summary">
              <h4>White Horse Manpower Consultancy Pvt. Ltd.</h4>
              <p>
                Authorised enterprise talent partner delivering <strong>Permanent, Contract, Bulk, Leadership, Executive, PAN India & Global Hiring</strong>.
              </p>
              <div class="assoc-free-pill">
                ✦ Free Recruitment — Zero Fees for Candidates
              </div>
              <div class="assoc-official-contacts">
                <span>Email: <a href="mailto:tarnakahrteamwhmc@gmail.com">tarnakahrteamwhmc@gmail.com</a></span>
                <span>Web: <a href="https://www.whitehorsemanpower.in" target="_blank">www.whitehorsemanpower.in</a></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>`;

html = html.replace(oldAssociationsRegex, newAssociationsHtml);

console.log('3. Updating Footer Brand Logo...');
const oldFooterBrandRegex = /<div class="footer-brand">[\s\S]*?<p>\s*White Horse Manpower Consultancy Private Limited[\s\S]*?<\/div>/;

const newFooterBrand = `<div class="footer-brand">
          <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 16px; background: rgba(255,255,255,0.06); padding: 12px 18px; border-radius: var(--radius-md); border: 1px solid rgba(255,255,255,0.12); width: fit-content;">
            <img src="assets/images/logo.png" alt="Nexora ATS" style="height: 52px; width: auto; object-fit: contain; background: #fff; padding: 4px 8px; border-radius: 4px;">
            <div>
              <strong style="color: #fff; font-size: 1.05rem; display: block; line-height: 1.2;">NEXORA ATS</strong>
              <span style="color: var(--gold-400); font-size: 0.72rem; font-weight: 600; text-transform: uppercase;">White Horse Manpower Consultancy</span>
            </div>
          </div>
          <p>
            White Horse Manpower Consultancy Private Limited is a specialized corporate staffing and executive search consultancy established in 2007, partnering with 40+ global enterprises.
          </p>
          <div style="display: flex; gap: 12px; margin-top: 14px;">
            <span style="font-size: 0.72rem; color: var(--gold-300); font-weight: 700; background: rgba(212,175,55,0.15); padding: 4px 10px; border-radius: var(--radius-sm);">CIN: U74140KA2007PTC</span>
            <span style="font-size: 0.72rem; color: var(--emerald-400); font-weight: 700; background: rgba(16,185,129,0.15); padding: 4px 10px; border-radius: var(--radius-sm);">100% Free Candidate Recruitment</span>
          </div>
        </div>`;

html = html.replace(oldFooterBrandRegex, newFooterBrand);

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Successfully written updated index.html!');

console.log('4. Updating style.css for Clean Navbar & Association Showcase...');

const navbarAndAssocStyles = `
/* ── Clean Navbar Alignment & Sizing ── */
.nav-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 80px;
  gap: 24px;
}

.brand-logo {
  display: flex;
  align-items: center;
  text-decoration: none;
  flex-shrink: 0;
  padding: 4px 0;
}

.brand-logo-img {
  height: 60px;
  width: auto;
  max-width: 170px;
  object-fit: contain;
  display: block;
  background: #ffffff;
  padding: 4px 8px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(6, 78, 59, 0.08);
  border: 1px solid rgba(6, 78, 59, 0.1);
  transition: var(--transition);
}

.brand-logo:hover .brand-logo-img {
  box-shadow: 0 4px 14px rgba(212, 175, 55, 0.25);
  border-color: var(--gold-400);
}

.nav-wrapper {
  display: flex;
  align-items: center;
}

.nav-menu {
  display: flex;
  align-items: center;
  gap: 4px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-link {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--slate-700);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  transition: var(--transition);
  white-space: nowrap;
}

.nav-link:hover {
  color: var(--emerald-800);
  background: var(--emerald-50);
}

.nav-link.active {
  color: var(--emerald-900);
  background: var(--emerald-50);
  font-weight: 700;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.nav-actions .btn {
  padding: 9px 18px;
  font-size: 0.85rem;
  white-space: nowrap;
}

/* ── Association Showcase Grid (Left: 40 Badges, Right: Flyer) ── */
.assoc-showcase-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 32px;
  align-items: start;
}

.assoc-badge-card {
  background: var(--white);
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-xl);
  padding: 32px;
  box-shadow: var(--shadow-sm);
}

.assoc-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--slate-100);
}

.assoc-counter-badge {
  background: var(--emerald-50);
  color: var(--emerald-800);
  border: 1px solid var(--emerald-200);
  font-size: 0.78rem;
  font-weight: 800;
  padding: 5px 12px;
  border-radius: var(--radius-full);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.assoc-cat-group {
  margin-bottom: 20px;
}

.assoc-cat-group:last-child {
  margin-bottom: 0;
}

.assoc-cat-title {
  font-size: 0.76rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--gold-700);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.assoc-cat-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--slate-200);
}

.assoc-badges-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.assoc-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: var(--slate-50);
  border: 1px solid var(--slate-200);
  padding: 6px 12px;
  border-radius: var(--radius-md);
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--slate-800);
  transition: var(--transition);
}

.assoc-badge:hover {
  background: var(--emerald-50);
  border-color: var(--emerald-300);
  color: var(--emerald-900);
  transform: translateY(-2px);
  box-shadow: var(--shadow-xs);
}

.assoc-badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--gold-500);
}

.assoc-official-card {
  background: linear-gradient(145deg, #064e3b 0%, #022c22 100%);
  border: 2px solid var(--gold-400);
  border-radius: var(--radius-xl);
  padding: 30px 26px;
  color: #fff;
  box-shadow: 0 20px 45px rgba(6, 78, 59, 0.25);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.assoc-official-badge {
  align-self: flex-start;
  background: rgba(212, 175, 55, 0.2);
  border: 1px solid var(--gold-400);
  color: var(--gold-300);
  font-size: 0.76rem;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-transform: uppercase;
}

.assoc-official-image-wrap {
  background: #ffffff;
  border-radius: var(--radius-lg);
  padding: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  max-height: 460px;
  overflow-y: auto;
  display: flex;
  justify-content: center;
}

.assoc-flyer-img {
  width: 100%;
  max-width: 320px;
  height: auto;
  object-fit: contain;
  display: block;
  border-radius: var(--radius-sm);
}

.assoc-official-summary h4 {
  font-family: var(--font-heading);
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--white);
  margin-bottom: 6px;
}

.assoc-official-summary p {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.45;
  margin-bottom: 12px;
}

.assoc-free-pill {
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid var(--emerald-400);
  color: var(--emerald-300);
  font-weight: 700;
  font-size: 0.82rem;
  padding: 6px 12px;
  border-radius: var(--radius-md);
  margin-bottom: 14px;
}

.assoc-official-contacts {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.8);
}

.assoc-official-contacts a {
  color: var(--gold-300);
  text-decoration: underline;
}

@media (max-width: 1120px) {
  .nav-menu {
    gap: 2px;
  }
  .nav-link {
    padding: 6px 9px;
    font-size: 0.82rem;
  }
  .assoc-showcase-grid {
    grid-template-columns: 1fr;
  }
}
`;

css += '\n' + navbarAndAssocStyles;
fs.writeFileSync(cssPath, css, 'utf8');
console.log('Successfully updated style.css!');
