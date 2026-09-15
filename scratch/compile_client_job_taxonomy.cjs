const fs = require('fs');
const path = require('path');

const jds = require('./parsed_jds_summary.json');

console.log(`Analyzing all ${jds.length} client JDs for keyword extraction...`);

// Mapping keywords and role profiles
const taxonomy = {};

jds.forEach(jd => {
  const fileName = jd.fileName;
  const raw = jd.rawText;

  // Extract bullet points / requirements
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 5 && !l.startsWith('Title') && !l.startsWith('Please fill') && !l.startsWith('IWP Job') && !l.startsWith('Rating scale') && !l.startsWith('Organization'));

  // Clean title
  let roleTitle = fileName
    .replace(/^JD\s*-\s*/i, '')
    .replace(/\s*-\s*JD$/i, '')
    .replace(/\s*\(\d+\)$/, '')
    .trim();

  // Extract key technical words
  const words = raw.toLowerCase().match(/[a-z0-9+#./-]{2,}/g) || [];
  
  taxonomy[roleTitle] = {
    fileName,
    roleTitle,
    extractedDomain: jd.extractedDomain,
    sampleLines: lines.slice(0, 5),
    textLength: raw.length
  };
});

console.log(`Generated taxonomy for ${Object.keys(taxonomy).length} distinct roles.`);
fs.writeFileSync(path.join(__dirname, 'client_taxonomy_raw.json'), JSON.stringify(taxonomy, null, 2), 'utf-8');
console.log('Saved to scratch/client_taxonomy_raw.json');
