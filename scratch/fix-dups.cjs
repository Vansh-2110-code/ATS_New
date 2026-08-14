const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../backend/src/controllers/dashboard.controller.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the duplicate declarations in divisionDashboard and define candQuery
const badCode = `    // 2. Candidates in each stage
    const screeningCount = await Candidate.countDocuments({ division, currentStage: 'Screening', status: { $ne: 'Rejected' } });
    const interviewCount = await Candidate.countDocuments({ division, currentStage: 'Interview', status: { $ne: 'Rejected' } });
    const offerCount = await Candidate.countDocuments({ division, currentStage: 'Offer', status: { $ne: 'Rejected' } });
    const joinedCount = await Candidate.countDocuments({ division, status: 'Joined' });
    const yetToJoinCount = await Candidate.countDocuments({ division, status: 'Yet To Join' });`;

const goodCode = `    // 2. Base Query
    const candQuery = { division };`;

content = content.replace(badCode, goodCode);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed divisionDashboard duplicate variables');
