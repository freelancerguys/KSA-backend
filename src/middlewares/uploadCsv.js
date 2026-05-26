import multer from 'multer';

export const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const name = file.originalname?.toLowerCase() || '';
    const ok =
      name.endsWith('.csv')
      || file.mimetype === 'text/csv'
      || file.mimetype === 'application/vnd.ms-excel';
    if (!ok) return cb(new Error('Only CSV files are allowed'), false);
    cb(null, true);
  },
});
