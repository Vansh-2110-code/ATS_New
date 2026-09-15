const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const docxPath = path.join(__dirname, 'extracted_offer_letter', 'offer letter', 'Master Offer and appointment letter 2026.docx');
const tempDir = path.join(__dirname, 'temp_docx_annexure');
if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
fs.mkdirSync(tempDir, { recursive: true });

execSync(`tar -xf "${docxPath}" -C "${tempDir}"`);
const xmlPath = path.join(tempDir, 'word', 'document.xml');
if (fs.existsSync(xmlPath)) {
  const xml = fs.readFileSync(xmlPath, 'utf8');
  // Also check tables in document.xml
  const tables = xml.match(/<w:tbl\b[^>]*>.*?<\/w:tbl>/g) || [];
  console.log('Tables found in document:', tables.length);
  tables.forEach((tbl, idx) => {
    console.log(`\n--- TABLE ${idx + 1} ---`);
    const rows = tbl.match(/<w:tr\b[^>]*>.*?<\/w:tr>/g) || [];
    rows.forEach(r => {
      const cells = r.match(/<w:tc\b[^>]*>.*?<\/w:tc>/g) || [];
      const cellTexts = cells.map(c => {
        const texts = c.match(/<w:t\b[^>]*>(.*?)<\/w:t>/g) || [];
        return texts.map(t => t.replace(/<[^>]+>/g, '')).join('');
      });
      console.log(cellTexts.join(' | '));
    });
  });
}
fs.rmSync(tempDir, { recursive: true, force: true });
