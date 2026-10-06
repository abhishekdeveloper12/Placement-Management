import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import companyImportController from '../controllers/companyImport.controller.js';

const router = Router();

const maxFileSizeMB = parseInt(process.env.MAX_IMPORT_FILE_SIZE_MB, 10) || 10;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileSizeMB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/csv',
      'text/x-csv',
      'application/x-csv',
      'text/comma-separated-values',
      'text/anytext',
      'application/octet-stream',
    ];
    const allowedExts = ['.csv', '.xls', '.xlsx'];
    const lowerName = file.originalname.toLowerCase();
    const hasValidExt = allowedExts.some((ext) => lowerName.endsWith(ext));

    if (allowedTypes.includes(file.mimetype) || hasValidExt) {
      cb(null, true);
    } else {
      const error = new Error('Invalid file format. Only CSV, XLS, and XLSX spreadsheets are supported.');
      error.statusCode = 400;
      error.code = 'INVALID_FILE_TYPE';
      cb(error);
    }
  },
});

// Protect all import routes with auth and roles (SUPER_ADMIN, PMO)
router.use(requireAuth);
router.use(requireRole('SUPER_ADMIN', 'PMO'));

// Download import template
router.get('/template', companyImportController.getTemplate);

// Upload and validate spreadsheet file
router.post('/upload', upload.single('file'), companyImportController.uploadAndValidate);

// Execute actual batch import
router.post('/execute', companyImportController.executeImport);

// List import history
router.get('/history', companyImportController.getImportHistory);

// Get single import details
router.get('/history/:id', companyImportController.getImportDetail);

// Download error report CSV
router.get('/history/:id/error-report', companyImportController.downloadErrorReport);

export default router;
