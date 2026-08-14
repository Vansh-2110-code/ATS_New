const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/pages/manager/ReportsPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const endBad = `      </div>
    </div>
  );
}`;
const endGood = `      </div>
    </div>
  )}
  </div>
  );
}`;

content = content.replace(endBad, endGood);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed end of file');
