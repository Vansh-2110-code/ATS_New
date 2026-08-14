const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/pages/manager/ReportsPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix the type of activeView
content = content.replace(
  /const \[activeView, setActiveView\] = useState<'recruiter' \| 'customer' \| 'division' \| 'aging' \| 'conversion'>\('recruiter'\);/g,
  "const [activeView, setActiveView] = useState<string>('activeJRs');"
);

// 2. Add the view switcher and wrap the activeJRs view
const tableStartRegex = /(<div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">\s*<div className="overflow-x-auto">\s*<table className="w-full text-xs">)/;

const viewSwitcher = `
      {/* Report View Switcher */}
      <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1.5 rounded-xl w-fit mb-6 mt-4">
        {[
          { id: 'activeJRs', label: 'Active JRs' },
          { id: 'recruiter', label: 'Recruiter Wise' },
          { id: 'customer', label: 'Customer Wise' },
          { id: 'division', label: 'Division Wise' },
          { id: 'aging', label: 'Aging Reports' },
          { id: 'conversion', label: 'Conversion Ratio' }
        ].map(v => (
          <button
            key={v.id}
            onClick={() => setActiveView(v.id)}
            className={\`px-4 py-2 text-sm rounded-lg transition-colors \${activeView === v.id ? 'bg-white text-green-700 shadow-sm font-bold' : 'text-slate-500 hover:bg-slate-200 font-medium'}\`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {activeView === 'activeJRs' && (
        <div className="space-y-6">
`;

content = content.replace(tableStartRegex, viewSwitcher + '\n          $1');

// 3. Remove the premature component closing
const prematureClosing = `        </div>
      )}
    </div>
  )
}

{/* ────────────────────────────────────────────────────────── */ }
{
  activeView === 'recruiter' && (`;

const correctedClosing = `        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */ }
      {activeView === 'recruiter' && (`;

content = content.replace(prematureClosing, correctedClosing);

// 4. Fix the end of the conversion view if needed
const endOfFileBad = `      </div>
    </div>
  );
}`;

const endOfFileGood = `      </div>
    </div>
  )}
    </div>
  );
}`;

// Make sure the last part is replaced properly
content = content.replace(endOfFileBad, endOfFileGood);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed ReportsPage.tsx');
