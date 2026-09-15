const https = require('https');

function checkUrl(url, matchStr) {
  return new Promise((resolve) => {
    https.get(url + '?v=' + Date.now(), (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const found = data.includes(matchStr);
        console.log(url, '=> Status:', res.statusCode, '| Match:', found);
        resolve(found);
      });
    }).on('error', (err) => {
      console.log(url, '=> Error:', err.message);
      resolve(false);
    });
  });
}

async function run() {
  console.log('Testing live preview assets on Hostinger:');
  await checkUrl('https://ats.whitehorsemanpower.in/preview/index.html', 'associations-showcase');
  await checkUrl('https://ats.whitehorsemanpower.in/preview/css/style.css', 'associations-showcase');
  await checkUrl('https://ats.whitehorsemanpower.in/preview/css/responsive.css', 'assoc-trust-pillars');
  await checkUrl('https://ats.whitehorsemanpower.in/preview/js/main.js', 'filterAssocCompanies');
}

run();
