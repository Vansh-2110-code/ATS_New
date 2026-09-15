const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const docxDir = path.join(__dirname, 'offer_letters', 'offer letter');
const files = fs.readdirSync(docxDir).filter(f => f.endsWith('.docx'));

const results = {};

files.forEach(f => {
  const docxPath = path.join(docxDir, f);
  const tempDir = path.join(__dirname, 'temp_inspect_' + Math.random().toString(36).substring(7));
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });
  
  execSync(`tar -xf "${docxPath}" -C "${tempDir}"`);
  const xmlPath = path.join(tempDir, 'word', 'document.xml');
  if (fs.existsSync(xmlPath)) {
    const xml = fs.readFileSync(xmlPath, 'utf8');
    const paragraphs = xml.match(/<w:p\b[^>]*>.*?<\/w:p>/g) || [];
    const textLines = paragraphs.map(p => {
      const texts = p.match(/<w:t\b[^>]*>(.*?)<\/w:t>/g) || [];
      return texts.map(t => t.replace(/<[^>]+>/g, '')).join('');
    }).filter(t => t.trim().length > 0);

    // Also extract tables if any
    const tables = xml.match(/<w:tbl\b[^>]*>.*?<\/w:tbl>/g) || [];

    results[f] = {
      lineCount: textLines.length,
      tableCount: tables.length,
      sampleHead: textLines.slice(0, 25),
      sampleTail: textLines.slice(-15),
      annexures: textLines.filter(l => /annexure/i.test(l)),
      fullText: textLines.join('\n')
    };
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
});

fs.writeFileSync(path.join(__dirname, 'templates_summary.json'), JSON.stringify(results, null, 2));
console.log('Processed ' + Object.keys(results).length + ' templates successfully.');
for (const [k, v] of Object.entries(results)) {
  console.log(`\n================== ${k} ==================`);
  console.log(`Lines: ${v.lineCount}, Tables: ${v.tableCount}`);
  console.log('Annexures:', v.annexures);
  console.log('Start lines:\n' + v.sampleHead.slice(0, 10).join('\n'));
}
