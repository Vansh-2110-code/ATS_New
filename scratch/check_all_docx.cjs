const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const docxDir = path.join(__dirname, 'extracted_offer_letter', 'offer letter');
const files = fs.readdirSync(docxDir).filter(f => f.endsWith('.docx'));

for (const file of files) {
  console.log('\n======================================================');
  console.log('FILE: ' + file);
  const docxPath = path.join(docxDir, file);
  const tempDir = path.join(__dirname, 'temp_docx_check');
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });
  execSync(`tar -xf "${docxPath}" -C "${tempDir}"`);
  const xml = fs.readFileSync(path.join(tempDir, 'word', 'document.xml'), 'utf8');
  
  // Find tables
  const tables = xml.match(/<w:tbl\b[^>]*>.*?<\/w:tbl>/g) || [];
  tables.forEach((tbl, idx) => {
    console.log(`-- Table ${idx+1} --`);
    const rows = tbl.match(/<w:tr\b[^>]*>.*?<\/w:tr>/g) || [];
    rows.slice(0, 5).forEach(r => {
      const cells = r.match(/<w:tc\b[^>]*>.*?<\/w:tc>/g) || [];
      const cellTexts = cells.map(c => {
        const texts = c.match(/<w:t\b[^>]*>(.*?)<\/w:t>/g) || [];
        return texts.map(t => t.replace(/<[^>]+>/g, '')).join('');
      });
      console.log('  ' + cellTexts.join(' | '));
    });
  });

  // Find Role Annexure title / headers
  const paras = xml.match(/<w:p\b[^>]*>.*?<\/w:p>/g) || [];
  const titles = paras.map(p => {
    const t = (p.match(/<w:t\b[^>]*>(.*?)<\/w:t>/g) || []).map(x => x.replace(/<[^>]+>/g, '')).join('').trim();
    return t;
  }).filter(t => t.includes('ANNEXURE') || t.includes('Annexure') || t.includes('KPI') || t.includes('Designation:'));
  console.log('Key Section Markers:', titles);

  fs.rmSync(tempDir, { recursive: true, force: true });
}
