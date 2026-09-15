const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const docxPath = path.join(__dirname, 'extracted_offer_letter', 'offer letter', 'Master Offer and appointment letter 2026.docx');
const tempDir = path.join(__dirname, 'temp_docx_master');
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
  
  console.log('=== MASTER OFFER LETTER FULL TEXT ===');
  console.log('Total Paragraphs:', textLines.length);
  // Find all placeholders like [ ... ]
  const fullText = textLines.join('\n');
  const placeholders = fullText.match(/\[[^\]]+\]/g) || [];
  console.log('\n--- Placeholders Found ---');
  console.log([...new Set(placeholders)]);
  
  // Print major headings and sections
  console.log('\n--- First 60 Paragraphs ---');
  console.log(textLines.slice(0, 60).join('\n'));
}
fs.rmSync(tempDir, { recursive: true, force: true });
