const multer = require('multer');
const path = require('path');
const fs = require('fs');
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
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max per document
}).any();

// ── Internal Chat File Attachments (Images, PDFs, Word, Excel, CSV, etc.) ──
const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/chat');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const sanitizedBase = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
      .slice(0, 50);
    cb(null, `chat-${Date.now()}-${uuidv4().slice(0, 8)}-${sanitizedBase}${ext}`);
  },
});

const chatFileFilter = (req, file, cb) => {
  // Disallow hazardous executables/scripts for security
  const blockedExts = ['.exe', '.bat', '.sh', '.bin', '.cmd', '.msi', '.vbs', '.js', '.jar', '.com'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (blockedExts.includes(ext)) {
    return cb(new Error('Executable file extensions are not permitted for security reasons'), false);
  }
  cb(null, true);
};

const uploadChatAttachment = multer({
  storage: chatStorage,
  fileFilter: chatFileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max size
});

// ── Bulk Resumes / ZIP Archive Upload (Max 100MB) ──
const bulkZipStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/bulk_zip');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `bulk-${Date.now()}-${uuidv4().slice(0, 8)}${ext}`);
  },
});

const bulkZipFilter = (req, file, cb) => {
  const allowed = ['.zip', '.rar', '.pdf', '.doc', '.docx', '.txt', '.xlsx', '.xls', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext) || file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed' || file.mimetype === 'application/octet-stream' || file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.mimetype === 'application/vnd.ms-excel' || file.mimetype === 'text/csv') {
    cb(null, true);
  } else {
    cb(new Error('Only ZIP archives, document files (PDF, DOCX, DOC), or Excel/CSV sheets are allowed'), false);
  }
};

const uploadBulkZip = multer({
  storage: bulkZipStorage,
  fileFilter: bulkZipFilter,
  limits: { fileSize: 250 * 1024 * 1024 }, // 250MB limit
});

module.exports = {
  uploadResume,
  uploadJD,
  uploadDoc,
  uploadImport,
  uploadJoining,
  uploadChatAttachment,
  uploadBulkZip,
};


