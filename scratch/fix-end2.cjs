const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/pages/manager/ReportsPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the end of the file using a robust regex that ignores \r and \n differences
content = content.replace(/\s*<\/div>\s*<\/div>\s*\);\s*}\s*$/, `
      </div>
    </div>
  )}
  </div>
  );
}
`);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed end of file');
