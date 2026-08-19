const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function check() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ats';
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);

  const Candidate = mongoose.model('Candidate', new mongoose.Schema({}, { strict: false }));

  const names = ['Rushabh J Sheth', 'PRATIK KIRAN KUSHARE', 'Sunay Kumar', 'ABHISHEK J H'];
  
  for (const name of names) {
    const candidates = await Candidate.find({
      name: { $regex: new RegExp(name.trim().replace(/\s+/g, '\\s*'), 'i') }
    }).lean();

    console.log(`\n=== Search for: "${name}" (Found: ${candidates.length}) ===`);
    candidates.forEach(c => {
      console.log({
        id: c._id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        status: c.status,
        companyName: c.companyName,
        clientName: c.clientName,
        joiningSalary: c.joiningSalary,
        offerDetails: c.offerDetails,
        dateOfJoining: c.dateOfJoining,
        expectedDateOfJoining: c.expectedDateOfJoining,
        assignedRecruiterName: c.assignedRecruiterName,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      });
    });
  }

  console.log('\n--- Partial search for Rushabh, Kushare, Sunay, Abhishek ---');
  const partial = await Candidate.find({
    name: { $regex: /rushabh|kushare|sunay|abhishek/i }
  }).select('name status phone email clientName companyName joiningSalary dateOfJoining createdAt updatedAt').lean();
  console.log('Partial found:', partial);

  await mongoose.disconnect();
}

check().catch(console.error);
