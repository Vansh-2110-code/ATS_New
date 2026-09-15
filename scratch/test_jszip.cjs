const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function testDocx() {
  const docxPath = path.join(__dirname, '..', 'backend', 'templates', 'offer_letters', 'Master Offer and appointment letter 2026.docx');
  const buffer = fs.readFileSync(docxPath);
  const zip = await JSZip.loadAsync(buffer);
  
  let docXml = await zip.file('word/document.xml').async('text');
  console.log('Original docXml length:', docXml.length);
  
  // Replace a placeholder
  docXml = docXml.replace(/\[FULL NAME\]/g, 'John Doe');
  docXml = docXml.replace(/\[DESIGNATION\]/g, 'Senior IT Recruiter');
  
  zip.file('word/document.xml', docXml);
  const outBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  
  const outPath = path.join(__dirname, 'test_output.docx');
  fs.writeFileSync(outPath, outBuffer);
  console.log('Successfully generated test_output.docx! Size:', outBuffer.length);
}

testDocx().catch(console.error);
