import multer from 'multer';

const maxFileSizeMB = parseInt(process.env.MAX_JD_FILE_SIZE_MB, 10) || 15;

const uploadJd = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxFileSizeMB * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const allowedExts = ['.pdf', '.doc', '.docx'];
    const lowerName = file.originalname.toLowerCase();
    const hasValidExt = allowedExts.some((ext) => lowerName.endsWith(ext));

    if (allowedTypes.includes(file.mimetype) || hasValidExt) {
      cb(null, true);
    } else {
      const error = new Error('Invalid file format. Only PDF, DOC, and DOCX files are allowed.');
      error.statusCode = 400;
      error.code = 'INVALID_FILE_TYPE';
      cb(error);
    }
  },
});

export default uploadJd;
