const fs = require('fs');
const readline = require('readline');

const p = 'C:\\Users\\smite\\.gemini\\antigravity-ide\\brain\\7357fd1f-3866-4b78-8daa-3c1eb7ce0c57\\.system_generated\\logs\\transcript.jsonl';
if (!fs.existsSync(p)) {
  console.log('No transcript file found at', p);
  process.exit(0);
}

const fileStream = fs.createReadStream(p);
const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

let matches = [];
rl.on('line', (line) => {
  if (line.includes('"USER_INPUT"')) {
    const lLower = line.toLowerCase();
    if (lLower.includes('website') || lLower.includes('main') || lLower.includes('whitehorsemanpower') || lLower.includes('wordpress') || lLower.includes('career') || lLower.includes('job opening') || lLower.includes('portal')) {
      try {
        const parsed = JSON.parse(line);
        matches.push(parsed.content);
      } catch(e) {}
    }
  }
});

rl.on('close', () => {
  console.log('Matches count:', matches.length);
  matches.forEach((m, idx) => {
    console.log('[Match ' + (idx + 1) + ']:');
    console.log(m.slice(0, 400));
    console.log('----------------------------------------');
  });
});
