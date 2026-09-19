const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth.routes');
const candidateRoutes = require('./routes/candidate.routes');
const callRoutes = require('./routes/call.routes');
const interviewRoutes = require('./routes/interview.routes');
const walkinRoutes = require('./routes/walkin.routes');
const jobRoutes = require('./routes/job.routes');
const userRoutes = require('./routes/user.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const permissionRoutes = require('./routes/permission.routes');
const logRoutes = require('./routes/log.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const financeRoutes = require('./routes/finance.routes');
const publicRoutes = require('./routes/public.routes');
const resumeScanRoutes = require('./routes/resumeScan.routes');
const atsRecordRoutes  = require('./routes/atsRecord.routes');
const taskRoutes = require('./routes/task.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const messageRoutes = require('./routes/message.routes');
const emailRoutes = require('./routes/email.routes');
const companyRoutes = require('./routes/company.routes');
const teamRoutes = require('./routes/team.routes');
const fieldConfigRoutes = require('./routes/fieldConfig.routes');
const searchRoutes = require('./routes/search.routes');
const notificationRoutes = require('./routes/notification.routes');
const recruiterPortalRoutes = require('./routes/recruiterPortal.routes');
const reviewRoutes = require('./routes/reviewRoutes');
const supportRoutes = require('./routes/support.routes');
const businessDevelopmentRoutes = require('./routes/businessDevelopment.routes');
const leaveRoutes = require('./routes/leave.routes');
const payrollRoutes = require('./routes/payroll.routes');
const internalChatRoutes = require('./routes/chat.routes');
const offerLetterRoutes = require('./routes/offerLetter.routes');
const misRoutes = require('./routes/mis.routes');
const customJdRoutes = require('./routes/customJd.routes');
const { seedDefaultChannels } = require('./controllers/chat.controller');

const { errorHandler } = require('./middleware/error.middleware');

const app = express();

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
const resumeDir = path.join(uploadDir, 'resumes');
const jdDir = path.join(uploadDir, 'jd');
const docsDir = path.join(uploadDir, 'docs');
const chatDir = path.join(uploadDir, 'chat');
[uploadDir, resumeDir, jdDir, docsDir, chatDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const defaultAllowedOrigins = [
  'https://whitehorsemanpower.in',
  'https://www.whitehorsemanpower.in',
  'http://whitehorsemanpower.in',
  'http://www.whitehorsemanpower.in',
  'https://ats.whitehorsemanpower.in',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:7899',
  'http://localhost:5001',
];

const envOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const allowedOriginsSet = new Set([...defaultAllowedOrigins, ...envOrigins]);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    try {
      const hostname = new URL(origin).hostname;
      if (
        allowedOriginsSet.has(origin) ||
        hostname === 'whitehorsemanpower.in' ||
        hostname.endsWith('.whitehorsemanpower.in') ||
        hostname === 'localhost' ||
        hostname === '127.0.0.1'
      ) {
        return callback(null, true);
      }
    } catch (e) {}
    return callback(null, true);
  },
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { message: 'Too many login attempts, try again in 15 minutes' } });
const publicLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { message: 'Too many requests, try again later' } });

// Static files for uploads
app.use('/uploads', express.static(uploadDir));

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/walkin', walkinRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/public', publicLimiter, publicRoutes);
app.use('/api/resumes',      resumeScanRoutes);
app.use('/api/ats-records',  atsRecordRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/admin/field-config', fieldConfigRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/recruiter-portals', recruiterPortalRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/business-development', businessDevelopmentRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/internal-chat', internalChatRoutes);
app.use('/api/offer-letters', offerLetterRoutes);
app.use('/api/mis', misRoutes);
app.use('/api/jd-presets', customJdRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Database connection & server start
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://naveenecerljit_db_user:Navi2026mys@cluster0.trxc9r6.mongodb.net/ats_db?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected successfully');

    // Seed default internal chat channels
    seedDefaultChannels().catch(e => console.error('Chat seeding error:', e));
    
    // Seed recruiter portals if empty
    try {
      const RecruiterPortal = require('./models/RecruiterPortal');
      const count = await RecruiterPortal.countDocuments();
      if (count === 0) {
        console.log('Seeding initial recruiter portals...');
        await RecruiterPortal.create([
          { name: '247.ai', url: 'https://springboard-in.247-inc.com/Springboard/welcome.htm', description: '247.ai Springboard portal' },
          { name: 'Aeries', url: 'https://aeriestechnology.talentrecruit.com/Account/Login.aspx', description: 'Aeries Technology portal' },
          { name: 'Availity', url: 'https://www.myworkday.com/wday/authgwy/availity/login.htmld?returnTo=%2favaility%2fd%2fhome.htmld', description: 'Availity Workday portal' },
          { name: 'HGS easy pay', url: 'https://vmt.teamhgs.com/SSO/VendorPortal/VendorLogin', description: 'HGS Easy Pay Vendor portal' },
          { name: 'HSBC', url: 'https://hsbc.taleo.net/careersection/iam/accessmanagement/login.jsf', description: 'HSBC Taleo recruitment portal' },
          { name: 'Infosys', url: 'https://infysso.infosysapps.com/auth/realms/PartnerHub/protocol/openid-connect/auth?client_id=UGFydG5lckh1Yg%3D%3D&redirect_uri=https%3A%2F%2Fpartnerhub.infosysapps.com%2Fapp-wall&state=4f5c41ee-8705-4c0e-8092-8e9cd5dc92b8&response_mode=fragment&response_type=code&scope=openid&nonce=1f57d513-537c-42b7-a5b1-25578f02933e&code_challenge=fhs0iDC50ZuKcHmXIOcK1GeeN441z-IuicY7H16ivyg&code_challenge_method=S256', description: 'Infosys PartnerHub portal' },
          { name: 'JPMC', url: 'https://authe-ent.jpmorgan.com/idp/startSSO.ping?PartnerSpId=https://jpmc.login.oraclecloud.com:443/oam/fed&usertype=agent', description: 'JPMC Oracle Cloud agent portal' },
          { name: 'Kraft', url: 'https://kraftbpowebapp.azurewebsites.net/login', description: 'Kraft BPO portal' },
          { name: 'Mphasis', url: 'https://mphasisapp.ripplehire.com/auth/login', description: 'Mphasis Ripplehire portal' },
          { name: 'Omega', url: 'https://omegarecruit.peoplestrong.com/', description: 'Omega Peoplestrong recruitment portal' },
          { name: 'Startek', url: 'https://www.oracle.com/applications/cloud/', description: 'Startek (Oracle Applications Cloud)' },
          { name: 'Linkdin', url: 'https://www.linkedin.com/home', description: 'Linkedin home portal' },
          { name: 'Shine', url: 'https://recruiter.shine.com/', description: 'Shine recruiter portal' }
        ]);
        console.log('Recruiter portals seeded successfully.');
      }
    } catch (seedErr) {
      console.error('Error seeding recruiter portals:', seedErr);
    }

    // One-time division migration logic
    try {
      const Job = require('./models/Job');
      const Candidate = require('./models/Candidate');
      
      // Migrate Jobs
      const jobsToMigrate = await Job.find({ division: { $exists: false } });
      if (jobsToMigrate.length > 0) {
        console.log(`Migrating ${jobsToMigrate.length} jobs to include division...`);
        for (const job of jobsToMigrate) {
          const dept = (job.portfolioDepartment || '').toUpperCase();
          if (dept === 'IT') {
            job.division = 'IT';
          } else if (dept === 'NON-IT' || dept === 'LATERAL') {
            job.division = 'Lateral';
          } else {
            job.division = 'BPO';
          }
          await job.save();
        }
        console.log('Jobs division migration completed.');
      }
      
      // Migrate Candidates
      const candidatesToMigrate = await Candidate.find({ division: { $exists: false } });
      if (candidatesToMigrate.length > 0) {
        console.log(`Migrating ${candidatesToMigrate.length} candidates to include division...`);
        for (const cand of candidatesToMigrate) {
          if (cand.jrNumber) {
            const job = await Job.findOne({ jrNumber: cand.jrNumber });
            if (job) {
              cand.division = job.division || 'BPO';
            } else {
              cand.division = 'BPO';
            }
          } else {
            cand.division = 'BPO';
          }
          await cand.save();
        }
        console.log('Candidates division migration completed.');
      }
    } catch (migErr) {
      console.error('Error during startup division migration:', migErr);
    }

    // Start candidate archiving scheduler (prunes records > 1 year)
    try {
      const { startArchiveScheduler } = require('./utils/archiveScheduler');
      startArchiveScheduler();
    } catch (archiveErr) {
      console.error('Error starting archive scheduler:', archiveErr);
    }

    app.listen(PORT, () => {
      console.log(`ATS Backend running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = app;
