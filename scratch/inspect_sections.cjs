const fs = require('fs');
const html = fs.readFileSync('website_redesign/index.html', 'utf8');

const regex = /<section[^>]*id="([^"]+)"[^>]*>/g;
let match;
console.log('--- SECTIONS FOUND ---');
while ((match = regex.exec(html)) !== null) {
  console.log(match[1]);
}
