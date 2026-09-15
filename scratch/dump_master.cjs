const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const docxPath = path.join(__dirname, 'extracted_offer_letter', 'offer letter', 'Master Offer and appointment letter 2026.docx');
const tempDir = path.join(__dirname, 'temp_docx_full');
if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
fs.mkdirSync(tempDir, { recursive: true });

execSync(`tar -xf "${docxPath}" -C "${tempDir}"`);
const xml = fs.readFileSync(path.join(tempDir, 'word', 'document.xml'), 'utf8');

// Get all paragraphs
const paras = xml.match(/<w:p\b[^>]*>.*?<\/w:p>/g) || [];
const textLines = paras.map(p => {
  const texts = p.match(/<w:t\b[^>]*>(.*?)<\/w:t>/g) || [];
  return texts.map(t => t.replace(/<[^>]+>/g, '')).join('');
}).filter(t => t.trim().length > 0);

fs.writeFileSync(path.join(__dirname, 'master_offer_full_text.txt'), textLines.join('\n\n'), 'utf8');
console.log('Saved master offer letter full text. Total lines:', textLines.length);

fs.rmSync(tempDir, { recursive: true, force: true });
