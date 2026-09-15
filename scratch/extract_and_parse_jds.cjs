const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const mammoth = require('../backend/node_modules/mammoth');

const rarPath = 'C:\\Users\\smite\\OneDrive\\Desktop\\sannainnovations\\ATS_New\\TSO JDs.rar';
const extractDir = path.join(__dirname, 'extracted_jds');

if (!fs.existsSync(extractDir)) {
  fs.mkdirSync(extractDir, { recursive: true });
}

console.log('1. Extracting RAR archive to:', extractDir);
try {
  execSync(`tar -xf "${rarPath}" -C "${extractDir}"`, { stdio: 'inherit' });
  console.log('Extraction complete!');
} catch (err) {
  console.error('Extraction error:', err.message);
}

// Check for nested zips
function findFiles(dir, ext) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findFiles(fullPath, ext));
    } else if (file.toLowerCase().endsWith(ext)) {
      results.push(fullPath);
    }
  });
  return results;
}

const nestedZips = findFiles(extractDir, '.zip');
console.log(`Found ${nestedZips.length} nested zip files.`);
nestedZips.forEach(zipPath => {
  const targetSubDir = zipPath.replace(/\.zip$/i, '');
  if (!fs.existsSync(targetSubDir)) fs.mkdirSync(targetSubDir, { recursive: true });
  try {
    execSync(`tar -xf "${zipPath}" -C "${targetSubDir}"`, { stdio: 'ignore' });
    console.log(`Extracted nested zip: ${path.basename(zipPath)}`);
  } catch (e) {
    console.warn(`Could not extract ${zipPath}: ${e.message}`);
  }
});

const docxFiles = findFiles(extractDir, '.docx');
console.log(`\n2. Found total ${docxFiles.length} Word (.docx) JD files to parse.`);

async function parseAll() {
  const parsedJds = [];

  for (let i = 0; i < docxFiles.length; i++) {
    const filePath = docxFiles[i];
    const fileName = path.basename(filePath, '.docx');
    try {
      const { value: text } = await mammoth.extractRawText({ path: filePath });
      
      // Clean up text
      const cleanText = text.replace(/\r\n/g, '\n').replace(/\t/g, ' ').trim();

      // Extract metadata heuristics
      let title = '';
      let domain = '';
      let experience = '';

      const domainMatch = cleanText.match(/Domain\s*[:\t]?\s*([^\n\r]+)/i);
      if (domainMatch) {
        domain = domainMatch[1].trim();
      }

      const titleMatch = cleanText.match(/Title\s*[:\t]?\s*([^\n\r]+)/i);
      if (titleMatch) {
        title = titleMatch[1].trim();
      }

      const expMatch = cleanText.match(/Experience Type[^\n\r]*\s*([^\n\r]+)/i);
      if (expMatch) {
        experience = expMatch[1].trim();
      }

      parsedJds.push({
        fileName,
        extractedDomain: domain,
        extractedTitle: title,
        experience,
        rawText: cleanText.substring(0, 2000), // Preview 2000 chars
        filePath
      });

      if ((i + 1) % 25 === 0 || i === docxFiles.length - 1) {
        console.log(`Parsed ${i + 1}/${docxFiles.length} JDs...`);
      }
    } catch (err) {
      console.warn(`Failed to parse ${fileName}: ${err.message}`);
    }
  }

  const outPath = path.join(__dirname, 'parsed_jds_summary.json');
  fs.writeFileSync(outPath, JSON.stringify(parsedJds, null, 2), 'utf-8');
  console.log(`\n3. Successfully saved parsed JDs summary to ${outPath}`);
  console.log(`Total parsed: ${parsedJds.length}`);
}

parseAll();
