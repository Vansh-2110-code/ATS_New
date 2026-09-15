const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, 'master_offer_full_text.txt'), 'utf8');
const lines = content.split('\n\n');

console.log('Total sections/lines:', lines.length);
lines.forEach((line, idx) => {
  if (
    line.includes('WHITE HORSE') ||
    line.includes('ANNEXURE') ||
    line.includes('APPOINTMENT') ||
    /^[0-9]+\.\s+[A-Z]/.test(line)
  ) {
    console.log(`[#${idx}] ${line.substring(0, 100)}`);
  }
});
