const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../website_redesign/index.html');
let html = fs.readFileSync(filePath, 'utf8');

const regex = /<button onclick="filterCareersBySector\('([^']+)'\)" class="practice-action-link">\s*View Openings in Sector &rarr;\s*<\/button>/g;

let count = 0;
html = html.replace(regex, (match, sectorKey) => {
  count++;
  return `<button onclick="openSectorBenchmark('${sectorKey}')" class="btn-benchmark-insights">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                <span>Career Benchmarks</span>
              </button>
              <button onclick="filterCareersBySector('${sectorKey}')" class="practice-action-link">
                Openings &rarr;
              </button>`;
});

console.log('Replaced', count, 'card footers with benchmark button');
fs.writeFileSync(filePath, html, 'utf8');
