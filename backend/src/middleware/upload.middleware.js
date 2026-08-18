const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/resumes');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const jdStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/jd');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `jd-${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.doc', '.docx', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, DOCX, and TXT files are allowed'), false);
  }
};

const uploadResume = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
});

const uploadJD = multer({
  storage: jdStorage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
});

const docStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/docs');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `doc-${uuidv4()}${ext}`);
  },
});

const docFileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only PDF, DOC, DOCX, JPG, PNG files are allowed'), false);
};

const uploadDoc = multer({
  storage: docStorage,
  fileFilter: docFileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
});

// Import (Excel/CSV) — stored in memory for parsing, not disk
const importFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowed = ['.xlsx', '.xls', '.csv'];
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only Excel (.xlsx, .xls) or CSV (.csv) files are allowed'), false);
};

const uploadImport = multer({
  storage: multer.memoryStorage(),
  fileFilter: importFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

const uploadJoining = multer({
  storage: docStorage,
  fileFilter: docFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).fields([
  { name: 'photo', maxCount: 1 },
  { name: 'resume', maxCount: 1 },
  { name: 'panCard', maxCount: 1 },
  { name: 'aadhaarCard', maxCount: 1 },
  { name: 'highestDocument', maxCount: 1 },
  { name: 'marksheet', maxCount: 1 },
  { name: 'degreeCertificate', maxCount: 1 },
  { name: 'relievingLetter0', maxCount: 1 },
  { name: 'relievingLetter1', maxCount: 1 },
  { name: 'relievingLetter2', maxCount: 1 },
  { name: 'relievingLetter3', maxCount: 1 },
  { name: 'relievingLetter4', maxCount: 1 },
]);

module.exports = { uploadResume, uploadJD, uploadDoc, uploadImport, uploadJoining };
