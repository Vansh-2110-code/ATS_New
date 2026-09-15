const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const docxDir = path.join(__dirname, 'extracted_offer_letter', 'offer letter');
const files = fs.readdirSync(docxDir).filter(f => f.endsWith('.docx'));

for (const file of files) {
  console.log('\n======================================================');
  console.log('DOCUMENT: ' + file);
  console.log('======================================================');
  const docxPath = path.join(docxDir, file);
  const tempDir = path.join(__dirname, 'temp_docx');
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });
  
  // tar can extract zip/docx archives on Windows
  execSync(`tar -xf "${docxPath}" -C "${tempDir}"`);
  const xmlPath = path.join(tempDir, 'word', 'document.xml');
  if (fs.existsSync(xmlPath)) {
    const xml = fs.readFileSync(xmlPath, 'utf8');
    // Extract paragraphs cleanly
    const paragraphs = xml.match(/<w:p\b[^>]*>.*?<\/w:p>/g) || [];
    const textLines = paragraphs.map(p => {
      const texts = p.match(/<w:t\b[^>]*>(.*?)<\/w:t>/g) || [];
      return texts.map(t => t.replace(/<[^>]+>/g, '')).join('');
    }).filter(t => t.trim().length > 0);
    
    console.log(textLines.slice(0, 30).join('\n'));
    console.log('\n... [Total Paragraphs: ' + textLines.length + '] ...');
    console.log('Sample Tail:');
    console.log(textLines.slice(-15).join('\n'));
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
}
