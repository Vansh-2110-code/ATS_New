const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const docxDir = path.join(__dirname, 'offer_letters', 'offer letter');
const files = fs.readdirSync(docxDir).filter(f => f.endsWith('.docx'));

files.forEach(f => {
  const docxPath = path.join(docxDir, f);
  const tempDir = path.join(__dirname, 'temp_t_' + Math.random().toString(36).substring(7));
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });
  execSync(`tar -xf "${docxPath}" -C "${tempDir}"`);
  const xmlPath = path.join(tempDir, 'word', 'document.xml');
  if (fs.existsSync(xmlPath)) {
    const xml = fs.readFileSync(xmlPath, 'utf8');
    
    // Find placeholders like [...]
    const matches = xml.match(/\[[A-Za-z0-9\s\/\-\,\.]+\]/g) || [];
    const uniquePlaceholders = [...new Set(matches)];
    
    // Find tables
    const tableXmls = xml.match(/<w:tbl\b[^>]*>.*?<\/w:tbl>/g) || [];
    console.log(`\n=== ${f} ===`);
    console.log('Placeholders found:', uniquePlaceholders);
    console.log(`Tables count: ${tableXmls.length}`);
    
    tableXmls.forEach((tbl, idx) => {
      const rows = tbl.match(/<w:tr\b[^>]*>.*?<\/w:tr>/g) || [];
      console.log(`  Table ${idx + 1} (${rows.length} rows):`);
      rows.slice(0, 10).forEach(r => {
        const cells = r.match(/<w:tc\b[^>]*>.*?<\/w:tc>/g) || [];
        const cellTexts = cells.map(c => {
          const texts = c.match(/<w:t\b[^>]*>(.*?)<\/w:t>/g) || [];
          return texts.map(t => t.replace(/<[^>]+>/g, '')).join('').trim();
        });
        console.log('    | ' + cellTexts.join(' | ') + ' |');
      });
      if (rows.length > 10) console.log(`    ... and ${rows.length - 10} more rows`);
    });
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
});
