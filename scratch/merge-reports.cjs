const fs = require('fs');

const initial = fs.readFileSync('scratch/ReportsPage_initial.tsx', 'utf16le');
let current = fs.readFileSync('src/app/pages/manager/ReportsPage.tsx', 'utf8');

const getBlock = (id) => {
  const startRegex = new RegExp(`\\{\\s*activeView === '${id}' && \\(`);
  const match = initial.match(startRegex);
  if (!match) {
    console.log(`Could not find block ${id}`);
    return null;
  }
  
  let openBrackets = 0;
  let startIndex = match.index;
  let endIndex = -1;
  
  for (let i = startIndex; i < initial.length; i++) {
    if (initial[i] === '{') openBrackets++;
    if (initial[i] === '}') {
      openBrackets--;
      if (openBrackets === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }
  
  return initial.substring(startIndex, endIndex);
};

const recruiterBlock = getBlock('recruiter');
const customerBlock = getBlock('customer');
const divisionBlock = getBlock('division');
const agingBlock = getBlock('aging');
const conversionBlock = getBlock('conversion');

// Fix switcher to include all views
let newCurrent = current.replace(
  /\{\s*id:\s*'activeJRs',\s*label:\s*'Active JRs'\s*\}/,
  `{ id: 'activeJRs', label: 'Active JRs' },\n          { id: 'active-profiles', label: 'Active Profiles' },\n          { id: 'expected-revenue', label: 'Expected Revenue' },\n          { id: 'lead-performance', label: 'Lead Performance' }`
);

// Inject missing blocks before the closing tag of the component
const closingRegex = /\{\/\* ────────────────────────────────────────────────────────── \*\/\}\s*\{\/\* 2\. ACTIVE STATUS PROFILES REPORT VIEW \*\/\}/;
const match = newCurrent.match(closingRegex);

if (match) {
  let blocksToInject = `\n\n      {/* Restored Views */}\n`;
  if (recruiterBlock) blocksToInject += `      ${recruiterBlock}\n`;
  if (customerBlock) blocksToInject += `      ${customerBlock}\n`;
  if (divisionBlock) blocksToInject += `      ${divisionBlock}\n`;
  if (agingBlock) blocksToInject += `      ${agingBlock}\n`;
  if (conversionBlock) blocksToInject += `      ${conversionBlock}\n\n      `;
  
  newCurrent = newCurrent.substring(0, match.index) + blocksToInject + newCurrent.substring(match.index);
} else {
  // fallback if not found
  const fallbackIndex = newCurrent.lastIndexOf('</div>\n  );\n}');
  let blocksToInject = `\n\n      {/* Restored Views */}\n`;
  if (recruiterBlock) blocksToInject += `      ${recruiterBlock}\n`;
  if (customerBlock) blocksToInject += `      ${customerBlock}\n`;
  if (divisionBlock) blocksToInject += `      ${divisionBlock}\n`;
  if (agingBlock) blocksToInject += `      ${agingBlock}\n`;
  if (conversionBlock) blocksToInject += `      ${conversionBlock}\n\n`;
  newCurrent = newCurrent.substring(0, fallbackIndex) + blocksToInject + newCurrent.substring(fallbackIndex);
}

fs.writeFileSync('src/app/pages/manager/ReportsPage.tsx', newCurrent, 'utf8');
console.log("Merge completed!");
