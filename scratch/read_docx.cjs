const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const docxPath = 'C:\\Users\\smite\\OneDrive\\Desktop\\sannainnovations\\ATS_New\\Correction Oct 2026 10.docx';
const extractDir = path.join(__dirname, 'docx_extracted');

if (fs.existsSync(extractDir)) {
  fs.rmSync(extractDir, { recursive: true, force: true });
}
fs.mkdirSync(extractDir);

// Unzip docx using tar or powershell
execSync(`tar -xf "${docxPath}" -C "${extractDir}"`);

const docXmlPath = path.join(extractDir, 'word', 'document.xml');
if (fs.existsSync(docXmlPath)) {
  const content = fs.readFileSync(docXmlPath, 'utf8');
  // Simple regex to extract <w:t> tags and paragraph breaks
  const paragraphs = content.split(/<\/w:p>/);
  const textLines = [];
  
  for (const p of paragraphs) {
    const textMatches = p.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
    if (textMatches) {
      const line = textMatches.map(m => m.replace(/<[^>]+>/g, '')).join('');
      if (line.trim()) textLines.push(line.trim());
    }
  }
  
  console.log('=== DOCUMENT CONTENT ===\n');
  console.log(textLines.join('\n'));
} else {
  console.log('document.xml not found');
}

// Clean up
fs.rmSync(extractDir, { recursive: true, force: true });
