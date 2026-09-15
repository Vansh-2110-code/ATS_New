const https = require('https');

https.get('https://ats.whitehorsemanpower.in/preview/', (res) => {
  let b = '';
  res.on('data', d => b += d);
  res.on('end', () => {
    const brandMatch = b.match(/whitehorse-official-logo\.png[^"']*/g);
    const cssMatch = b.match(/style\.css[^"']*/g);
    console.log('Brand logo found in live HTML:', brandMatch);
    console.log('CSS link found in live HTML:', cssMatch);
  });
});
