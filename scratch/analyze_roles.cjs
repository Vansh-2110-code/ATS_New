const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const templatesDir = path.join(__dirname, '..', 'backend', 'templates', 'offer_letters');
const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.docx'));

const results = {};

files.forEach(file => {
  const tempDir = path.join(__dirname, 'temp_' + file.replace(/[^a-zA-Z0-9]/g, '_'));
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });

  execSync(`tar -xf "${path.join(templatesDir, file)}" -C "${tempDir}"`);
  const xml = fs.readFileSync(path.join(tempDir, 'word', 'document.xml'), 'utf8');

  const paras = xml.match(/<w:p\b[^>]*>.*?<\/w:p>/g) || [];
  const textLines = paras.map(p => {
    const texts = p.match(/<w:t\b[^>]*>(.*?)<\/w:t>/g) || [];
    return texts.map(t => t.replace(/<[^>]+>/g, '')).join('').trim();
  }).filter(t => t.length > 0);

  // Find Annexure 2
  const a2Index = textLines.findIndex(t => t.includes('ANNEXURE – 2') || t.includes('ANNEXURE - 2'));
  const a2Lines = a2Index !== -1 ? textLines.slice(a2Index) : [];

  results[file] = {
    title: textLines[1] || textLines[0],
    totalLines: textLines.length,
    a2Sample: a2Lines.slice(0, 40)
  };

  fs.rmSync(tempDir, { recursive: true, force: true });
});

fs.writeFileSync(path.join(__dirname, 'role_annexure2_analysis.json'), JSON.stringify(results, null, 2), 'utf8');
console.log('Analysis saved to role_annexure2_analysis.json');
