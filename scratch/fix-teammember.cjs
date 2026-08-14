const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../backend/src/controllers/dashboard.controller.js');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace("    const TeamMember = require('../models/TeamMember');\n", "");
content = content.replace("    const TeamMember = mongoose.models.TeamMember || require('../models/TeamMember');\n", "");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Removed duplicate TeamMember declarations');
