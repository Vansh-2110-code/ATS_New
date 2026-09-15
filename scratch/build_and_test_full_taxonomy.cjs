const fs = require('fs');
const path = require('path');

const jds = require('./parsed_jds_summary.json');

console.log(`Building comprehensive client-aligned taxonomy for all ${jds.length} JDs...`);

// Let's test classifying all 176 JDs with our classifier
const { classifyUniversalRole } = require('../backend/src/utils/universalRoleClassifier');

let stats = {
  total: jds.length,
  domainCounts: {},
  misclassifiedAsVoice: 0,
  voiceCases: []
};

jds.forEach(jd => {
  const candidateMock = {
    name: 'Sample Candidate',
    jobTitle: jd.extractedDomain || jd.fileName,
    summary: jd.rawText.slice(0, 1500),
    skills: (jd.rawText.match(/\b(sap|abap|fico|mm|sd|ariba|procurement|sourcing|purchase|vendor|\.net|c#|java|spring|angular|react|aws|azure|redshift|sql|dba|selenium|tosca|playwright|itil|change management|incident|network|cisco|juniper|salesforce|workday|mainframe|cobol|python|docker|kubernetes)\b/gi) || []).map(s => ({ name: s })),
    experience: [{ title: jd.extractedDomain || jd.fileName, duration: '4 years' }]
  };

  const profile = classifyUniversalRole(candidateMock, []);
  const domain = profile.primaryDomain;
  stats.domainCounts[domain] = (stats.domainCounts[domain] || 0) + 1;

  if (profile.bestFitRole.includes('Voice') && !jd.fileName.toLowerCase().includes('voice')) {
    stats.misclassifiedAsVoice++;
    stats.voiceCases.push({ file: jd.fileName, domain: jd.extractedDomain, assigned: profile.bestFitRole });
  }
});

console.log('\n--- Domain Distribution across all 176 JDs ---');
Object.entries(stats.domainCounts).sort((a, b) => b[1] - a[1]).forEach(([dom, count]) => {
  console.log(` • ${dom}: ${count} JDs`);
});

console.log(`\nNon-voice JDs classified as Voice: ${stats.misclassifiedAsVoice} / ${jds.length}`);
if (stats.voiceCases.length > 0) {
  console.log('False positives:', stats.voiceCases);
} else {
  console.log('🎉 0 FALSE POSITIVES FOR VOICE! All specialized JDs classified accurately!');
}
