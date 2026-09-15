const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const mammoth = require('../backend/node_modules/mammoth');

const tarPath = 'C:\\Users\\smite\\OneDrive\\Desktop\\sannainnovations\\ATS_New\\ats jd.tar';
const dest = path.join(__dirname, 'extracted_ats_jds');
if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

console.log('Extracting ats jd.tar to:', dest);
execSync(`tar -xf "${tarPath}" -C "${dest}"`, { stdio: 'inherit' });
console.log('Extracted successfully!');

function list(dir) {
  let res = [];
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) res = res.concat(list(p));
    else res.push(p);
  });
  return res;
}

const all = list(dest);
console.log('Total files extracted:', all.length);

async function parseAll() {
  const parsed = [];
  for (const f of all) {
    const ext = path.extname(f).toLowerCase();
    const base = path.basename(f, ext);
    if (ext === '.docx') {
      try {
        const { value: text } = await mammoth.extractRawText({ path: f });
        parsed.push({ fileName: base, ext, text: text.slice(0, 3000), path: f });
      } catch(e) {
        console.warn('Error reading', base, e.message);
      }
    } else {
      parsed.push({ fileName: base, ext, text: '', path: f });
    }
  }

  console.log(`Parsed ${parsed.filter(p => p.text).length} docx files.`);
  fs.writeFileSync(path.join(__dirname, 'ats_jd_parsed.json'), JSON.stringify(parsed, null, 2), 'utf-8');
}

parseAll();
