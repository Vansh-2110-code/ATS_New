const https = require('https');

https.get('https://ats.whitehorsemanpower.in/preview/index.html', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Length:', data.length);
    console.log('Has client-associations-flyer:', data.includes('client-associations-flyer'));
    console.log('Has associations-minimal:', data.includes('associations-minimal'));
    console.log('Has assoc-showcase-grid:', data.includes('assoc-showcase-grid'));
    const footerIdx = data.indexOf('<footer');
    if (footerIdx !== -1) {
      console.log('Footer snippet:\n', data.substring(footerIdx, footerIdx + 400));
    }
  });
}).on('error', err => console.error(err));
