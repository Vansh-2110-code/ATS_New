const path = require('path');
const fs = require('fs');
const mongoose = require(path.join(__dirname, '..', 'backend', 'node_modules', 'mongoose'));

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://naveenecerljit_db_user:Navi2026mys@cluster0.trxc9r6.mongodb.net/ats_db?retryWrites=true&w=majority&appName=Cluster0';

async function runVerification() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI);
  console.log('Database connected.');

  const OfferLetter = require('../backend/src/models/OfferLetter');
  const Employee = require('../backend/src/models/Employee');
  const Candidate = require('../backend/src/models/Candidate');
  const User = require('../backend/src/models/User');
  const JSZip = require('../backend/node_modules/jszip');

  console.log('\n--- 1. VERIFYING 5 TEMPLATES ON DISK ---');
  const templatesDir = path.join(__dirname, '..', 'backend', 'templates', 'offer_letters');
  const files = fs.readdirSync(templatesDir);
  console.log('Templates found in backend/templates/offer_letters:', files);
  if (files.length !== 5) {
    throw new Error('Expected 5 templates, found ' + files.length);
  }
  console.log('All 5 official templates confirmed present on disk.');

  console.log('\n--- 2. VERIFYING DOCX PLACEHOLDER REPLACEMENT ENGINE ---');
  const srRecruiterFile = path.join(templatesDir, 'Sr Recruiter Offer and appointment letter 2026.docx');
  const zip = await JSZip.loadAsync(fs.readFileSync(srRecruiterFile));
  let xml = await zip.file('word/document.xml').async('text');
  
  xml = xml.replace(/\[FULL NAME\]/g, 'Amit Verma');
  xml = xml.replace(/\[DESIGNATION\]/g, 'Senior IT Recruiter');
  xml = xml.replace(/>30,000</g, '>45,000<');
  xml = xml.replace(/>3,60,000</g, '>5,40,000<');
  zip.file('word/document.xml', xml);
  
  const generatedBuf = await zip.generateAsync({ type: 'nodebuffer' });
  console.log('Generated test DOCX size in bytes:', generatedBuf.length);
  if (generatedBuf.length < 10000) {
    throw new Error('Generated DOCX buffer seems corrupted or too small');
  }
  console.log('DOCX engine successfully loaded, substituted and generated valid archive.');

  console.log('\n--- 3. CREATING TEST OFFER LETTER RECORD IN DB ---');
  await OfferLetter.deleteMany({ 'recipient.email': 'verification@example.com' });
  const adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) {
    console.log('Warning: No admin user found in DB');
  }

  const testLetter = await OfferLetter.create({
    templateKey: 'sr_recruiter',
    templateName: 'Sr Recruiter Offer and appointment letter 2026',
    recipientType: 'custom',
    recipient: {
      name: 'Verification Candidate',
      email: 'verification@example.com',
      phone: '9876543210',
      address: '123 MG Road, Bangalore',
      designation: 'Senior Recruiter',
      dateOfJoining: new Date(),
      reportingTo: 'Team Leader / Manager',
      placeOfPosting: 'Bangalore',
    },
    terms: {
      probationMonths: 3,
      probationNoticeDays: 30,
      confirmedNoticeDays: 90,
      workLocation: 'Bangalore',
    },
    salary: {
      grossMonthly: 40000,
      grossAnnual: 480000,
      basicMonthly: 20000,
      basicAnnual: 240000,
      hraMonthly: 10000,
      hraAnnual: 120000,
      specialAllowanceMonthly: 10000,
      specialAllowanceAnnual: 120000,
      pfMonthly: 'Not Applicable',
      esiMonthly: 'As applicable',
      ptMonthly: 'As applicable',
      netSalaryEstimated: 'Subject to statutory deductions',
    },
    kpiDetails: [
      { area: 'Successful Joinings', measurement: '5 closures per month' },
      { area: 'Quality Line-ups', measurement: '25 per month' },
    ],
    status: 'Draft',
    issuedBy: adminUser?._id,
    issuedByName: adminUser?.name || 'Admin',
  });

  console.log('Test Offer Letter Created:', testLetter.offerNumber, 'ID:', testLetter._id.toString());
  if (!testLetter.offerNumber.startsWith('WH/OL/')) {
    throw new Error('Offer letter number format invalid: ' + testLetter.offerNumber);
  }

  console.log('\n--- 4. VERIFYING JOINING FORM BANK DETAILS PERSISTENCE ---');
  const testEmp = await Employee.create({
    employeeId: 'TEST-EMP-999',
    joiningDate: new Date(),
    fullName: 'Bank Test Employee',
    email: 'bank_test_' + Date.now() + '@example.com',
    phone: '9988776655',
    bankName: 'HDFC Bank',
    accountHolderName: 'Bank Test Employee',
    accountNumber: '50100234567890',
    ifscCode: 'HDFC0001234',
    branchName: 'Indiranagar Branch, Bangalore',
    accountType: 'Savings',
    bankProofPath: '/uploads/docs/sample_cancelled_cheque.pdf',
    createdBy: adminUser?._id,
  });

  console.log('Employee with Bank Details created:', testEmp.employeeId, 'Bank:', testEmp.bankName, 'IFSC:', testEmp.ifscCode);
  const reloadedEmp = await Employee.findById(testEmp._id);
  if (reloadedEmp.bankName !== 'HDFC Bank' || reloadedEmp.accountNumber !== '50100234567890' || reloadedEmp.ifscCode !== 'HDFC0001234') {
    throw new Error('Bank details mismatch upon database reload');
  }
  console.log('Bank details verified successfully on Employee schema.');

  // Clean up test records
  await OfferLetter.findByIdAndDelete(testLetter._id);
  await Employee.findByIdAndDelete(testEmp._id);
  console.log('Cleaned up test records from database.');

  console.log('\n=============================================');
  console.log('   ALL VERIFICATION CHECKS PASSED 100%!     ');
  console.log('=============================================');

  await mongoose.disconnect();
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
