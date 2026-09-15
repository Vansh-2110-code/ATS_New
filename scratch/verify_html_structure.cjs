const fs = require('fs');
const html = fs.readFileSync('website_redesign/index.html', 'utf8');

const count = (str, re) => (str.match(re) || []).length;
console.log('footer open:', count(html, /<footer\b/g), 'close:', count(html, /<\/footer>/g));
console.log('footer-grid occurrences:', count(html, /class="footer-grid"/g));
console.log('client-associations-flyer occurrences:', count(html, /client-associations-flyer/g));

const footerMatch = html.match(/<footer[\s\S]*?<\/footer>/);
if (footerMatch) {
  const fHtml = footerMatch[0];
  const openDivs = count(fHtml, /<div\b/g);
  const closeDivs = count(fHtml, /<\/div>/g);
  console.log('Footer div balance - open:', openDivs, 'close:', closeDivs);
}

const assocMatch = html.match(/<section[^>]*id="associations"[\s\S]*?<\/section>/);
if (assocMatch) {
  const aHtml = assocMatch[0];
  const openDivs = count(aHtml, /<div\b/g);
  const closeDivs = count(aHtml, /<\/div>/g);
  console.log('Associations section div balance - open:', openDivs, 'close:', closeDivs);
}
