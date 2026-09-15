const https = require('https');

const assets = [
  'index.html',
  'css/style.css',
  'js/main.js',
  'assets/images/logo.png',
  'assets/images/client-associations-flyer.png'
];

async function check() {
  console.log('Testing live HTTPS assets on ats.whitehorsemanpower.in/preview/ ...\n');
  for (const a of assets) {
    await new Promise(resolve => {
      https.get('https://ats.whitehorsemanpower.in/preview/' + a, res => {
        console.log(`[${res.statusCode === 200 ? '✅ 200 OK' : '❌ ' + res.statusCode}] ${a} (${res.headers['content-type']}, ${res.headers['content-length']} bytes)`);
        resolve();
      }).on('error', err => {
        console.log(`[❌ ERR] ${a}: ${err.message}`);
        resolve();
      });
    });
  }
}

check();
