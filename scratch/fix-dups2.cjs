const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../backend/src/controllers/dashboard.controller.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the duplicate block using regex to ignore line ending issues
const duplicateRegex = /const screeningCount = await Candidate\.countDocuments\({ division, currentStage: 'Screening', status: { \$ne: 'Rejected' } }\);\s*const interviewCount = await Candidate\.countDocuments\({ division, currentStage: 'Interview', status: { \$ne: 'Rejected' } }\);\s*const offerCount = await Candidate\.countDocuments\({ division, currentStage: 'Offer', status: { \$ne: 'Rejected' } }\);\s*const joinedCount = await Candidate\.countDocuments\({ division, status: 'Joined' }\);\s*const yetToJoinCount = await Candidate\.countDocuments\({ division, status: 'Yet To Join' }\);/g;

content = content.replace(duplicateRegex, `const candQuery = { division };
    const screeningStatuses = [
      'Screening', 'Contacted', 'Interested', 'Selected for Call', 
      'Sourced', 'Not Interested', 'Call Back', 'No Response'
    ];`);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Regex replace done');
