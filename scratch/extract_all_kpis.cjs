const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const docxDir = path.join(__dirname, '..', 'backend', 'templates', 'offer_letters');
const files = fs.readdirSync(docxDir).filter(f => f.endsWith('.docx'));

const kpiTemplates = {};

files.forEach(f => {
  const docxPath = path.join(docxDir, f);
  const tempDir = path.join(__dirname, 'temp_kpi_' + Math.random().toString(36).substring(7));
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });
  execSync(`tar -xf "${docxPath}" -C "${tempDir}"`);
  
  const xmlPath = path.join(tempDir, 'word', 'document.xml');
  if (fs.existsSync(xmlPath)) {
    const xml = fs.readFileSync(xmlPath, 'utf8');
    const tableXmls = xml.match(/<w:tbl\b[^>]*>.*?<\/w:tbl>/g) || [];
    
    // Usually Table 2 is the Role & KPI table
    if (tableXmls.length >= 2) {
      const kpiTbl = tableXmls[1];
      const rows = kpiTbl.match(/<w:tr\b[^>]*>.*?<\/w:tr>/g) || [];
      const kpis = [];
      rows.forEach((r, idx) => {
        if (idx === 0) return; // skip header
        const cells = r.match(/<w:tc\b[^>]*>.*?<\/w:tc>/g) || [];
        const cellTexts = cells.map(c => {
          const texts = c.match(/<w:t\b[^>]*>(.*?)<\/w:t>/g) || [];
          return texts.map(t => t.replace(/<[^>]+>/g, '')).join('').trim();
        });
        if (cellTexts.length >= 2 && cellTexts[0]) {
          kpis.push({ area: cellTexts[0], measurement: cellTexts[1] || '' });
        }
      });
      kpiTemplates[f] = kpis;
    }
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
});

console.log(JSON.stringify(kpiTemplates, null, 2));
fs.writeFileSync(path.join(__dirname, 'extracted_kpis.json'), JSON.stringify(kpiTemplates, null, 2));
