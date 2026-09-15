const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Job = require('../models/Job');
const Candidate = require('../models/Candidate');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

async function seedDemoAccount() {
  const isStandalone = require.main === module;
  try {
    if (mongoose.connection.readyState !== 1) {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ats_db';
      await mongoose.connect(mongoUri);
      console.log('Connected to MongoDB for Demo Account seeding...');
    }

    // 1. Create or Update Corporate Demo Admin Account
    const hashedPassword = await bcrypt.hash('DemoAdmin@2026', 12);
    const demoAdmin = await User.findOneAndUpdate(
      { email: 'demo@whitehorsemanpower.in' },
      {
        $set: {
          name: 'Corporate Demo Admin',
          email: 'demo@whitehorsemanpower.in',
          password: hashedPassword,
          role: 'admin',
          roles: ['admin'],
          status: 'Active',
          isDemoAccount: true,
          isDemoData: true,
          employeeId: 'DEMO001',
          allowHomeLogin: true,
          disableBiometric: true
        }
      },
      { upsert: true, new: true, runValidators: false }
    );

    console.log('✅ Demo Admin User created/updated:', demoAdmin.email);

    // 2. Create Sample Demo Recruiters & TL
    const demoRecruiter1 = await User.findOneAndUpdate(
      { email: 'alex.recruiter@demowhitehorse.com' },
      {
        $set: {
          name: 'Alex Morgan',
          email: 'alex.recruiter@demowhitehorse.com',
          password: hashedPassword,
          role: 'recruiter',
          status: 'Active',
          isDemoData: true,
          employeeId: 'DEMO002'
        }
      },
      { upsert: true, new: true }
    );

    const demoRecruiter2 = await User.findOneAndUpdate(
      { email: 'sarah.recruiter@demowhitehorse.com' },
      {
        $set: {
          name: 'Sarah Chen',
          email: 'sarah.recruiter@demowhitehorse.com',
          password: hashedPassword,
          role: 'recruiter',
          status: 'Active',
          isDemoData: true,
          employeeId: 'DEMO003'
        }
      },
      { upsert: true, new: true }
    );

    const demoTL = await User.findOneAndUpdate(
      { email: 'michael.tl@demowhitehorse.com' },
      {
        $set: {
          name: 'Michael Reed',
          email: 'michael.tl@demowhitehorse.com',
          password: hashedPassword,
          role: 'tl',
          status: 'Active',
          isDemoData: true,
          employeeId: 'DEMO004'
        }
      },
      { upsert: true, new: true }
    );

    // 3. Clear existing demo jobs & candidates
    await Job.deleteMany({ $or: [{ isDemoData: true }, { jrNumber: { $regex: '^DEMO-' } }] });
    await Candidate.deleteMany({ $or: [{ isDemoData: true }, { candidateId: { $regex: '^DEMO-' } }] });

    // 4. Create Sample Demo Jobs
    const sampleJobs = [
      {
        jrNumber: 'DEMO-JR101',
        companyName: 'TechCorp Enterprise Solutions',
        client: 'TechCorp Enterprise Solutions',
        jobTitle: 'Senior Full Stack Developer',
        division: 'IT',
        experience: '4-7 Years',
        location: 'Bangalore / Remote',
        positions: 5,
        skills: ['React', 'Node.js', 'TypeScript', 'MongoDB', 'AWS'],
        status: 'Open',
        priority: 'High',
        createdBy: demoAdmin._id,
        recruiterName: demoRecruiter1.name,
        recruiterEmail: demoRecruiter1.email,
        isDemoData: true
      },
      {
        jrNumber: 'DEMO-JR102',
        companyName: 'Global Talent Logistics',
        client: 'Global Talent Logistics',
        jobTitle: 'HR Operations Manager',
        division: 'BPO',
        experience: '3-5 Years',
        location: 'Bangalore (Indiranagar)',
        positions: 3,
        skills: ['HR Operations', 'Payroll', 'Employee Relations', 'ATS'],
        status: 'Open',
        priority: 'Urgent',
        createdBy: demoAdmin._id,
        recruiterName: demoRecruiter2.name,
        recruiterEmail: demoRecruiter2.email,
        isDemoData: true
      },
      {
        jrNumber: 'DEMO-JR103',
        companyName: 'Nexus Financial Systems',
        client: 'Nexus Financial Systems',
        jobTitle: 'Senior Financial Analyst',
        division: 'Lateral',
        experience: '5-8 Years',
        location: 'Bangalore (MG Road)',
        positions: 2,
        skills: ['Financial Modeling', 'Excel', 'FP&A', 'SAP'],
        status: 'Open',
        priority: 'Medium',
        createdBy: demoAdmin._id,
        recruiterName: demoRecruiter1.name,
        recruiterEmail: demoRecruiter1.email,
        isDemoData: true
      }
    ];

    const insertedJobs = await Job.insertMany(sampleJobs);
    console.log(`✅ Inserted ${insertedJobs.length} sample demo jobs.`);

    // 5. Create Sample Demo Candidates
    const sampleCandidates = [
      {
        candidateId: 'DEMO-CAN001',
        name: 'Rohan Verma',
        email: 'rohan.demo@samplemail.com',
        phone: '9876543210',
        positionApplied: 'Senior Full Stack Developer',
        jrNumber: 'DEMO-JR101',
        clientName: 'TechCorp Enterprise Solutions',
        division: 'IT',
        skills: ['React', 'Node.js', 'MongoDB'],
        experience: '5 Years',
        currentCTC: '14,000,000',
        expectedCTC: '18,000,000',
        noticePeriod: '30 Days',
        status: 'Interview Scheduled',
        firstCallStatus: 'Interview Scheduled',
        interviewStatus: 'Interview Scheduled',
        currentStage: 'Interview',
        assignedRecruiter: demoRecruiter1._id,
        assignedRecruiterName: demoRecruiter1.name,
        ownershipStatus: 'Assigned',
        isDemoData: true,
        assignedAt: new Date()
      },
      {
        candidateId: 'DEMO-CAN002',
        name: 'Ananya Sharma',
        email: 'ananya.demo@samplemail.com',
        phone: '9876543211',
        positionApplied: 'HR Operations Manager',
        jrNumber: 'DEMO-JR102',
        clientName: 'Global Talent Logistics',
        division: 'BPO',
        skills: ['HR Operations', 'Payroll'],
        experience: '4 Years',
        currentCTC: '800,000',
        expectedCTC: '1,100,000',
        noticePeriod: '15 Days',
        status: 'Offer Accept',
        firstCallStatus: 'Eligible',
        interviewStatus: 'Shortlisted',
        candidateStatusPostOffer: 'Offer Accepted',
        currentStage: 'Offer',
        assignedRecruiter: demoRecruiter2._id,
        assignedRecruiterName: demoRecruiter2.name,
        ownershipStatus: 'Assigned',
        isDemoData: true,
        assignedAt: new Date()
      },
      {
        candidateId: 'DEMO-CAN003',
        name: 'Karthik Raja',
        email: 'karthik.demo@samplemail.com',
        phone: '9876543212',
        positionApplied: 'Senior Financial Analyst',
        jrNumber: 'DEMO-JR103',
        clientName: 'Nexus Financial Systems',
        division: 'Lateral',
        skills: ['FP&A', 'Excel', 'Financial Modeling'],
        experience: '6 Years',
        currentCTC: '1,200,000',
        expectedCTC: '1,600,000',
        noticePeriod: 'Immediate',
        status: 'Eligible',
        firstCallStatus: 'Eligible',
        currentStage: 'Screening',
        assignedRecruiter: demoRecruiter1._id,
        assignedRecruiterName: demoRecruiter1.name,
        ownershipStatus: 'Assigned',
        isDemoData: true,
        assignedAt: new Date()
      },
      {
        candidateId: 'DEMO-CAN004',
        name: 'Pooja Hegde',
        email: 'pooja.demo@samplemail.com',
        phone: '9876543213',
        positionApplied: 'Senior Full Stack Developer',
        jrNumber: 'DEMO-JR101',
        clientName: 'TechCorp Enterprise Solutions',
        division: 'IT',
        skills: ['React', 'TypeScript'],
        experience: '4 Years',
        status: 'Joined',
        firstCallStatus: 'Eligible',
        currentStage: 'Joining',
        assignedRecruiter: demoAdmin._id,
        assignedRecruiterName: demoAdmin.name,
        ownershipStatus: 'Assigned',
        isDemoData: true,
        assignedAt: new Date()
      }
    ];

    const insertedCandidates = await Candidate.insertMany(sampleCandidates);
    console.log(`✅ Inserted ${insertedCandidates.length} sample demo candidates.`);

    console.log('\n===========================================');
    console.log('  DEMO ACCOUNT SEEDING COMPLETE SUCCESSFULLY!');
    console.log('  Email: demo@whitehorsemanpower.in');
    console.log('  Password: DemoAdmin@2026');
    console.log('===========================================\n');

    if (isStandalone) {
      await mongoose.disconnect();
    }
    return { success: true };
  } catch (err) {
    console.error('Failed to seed demo account:', err);
    if (isStandalone) {
      process.exit(1);
    }
    throw err;
  }
}

if (require.main === module) {
  seedDemoAccount();
}

module.exports = seedDemoAccount;
