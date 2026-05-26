import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '../../', env.uploadPath);

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXT.has(ext) ? ext : '.bin';
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${safeExt}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype?.toLowerCase();

  if (!ALLOWED_EXT.has(ext) || !ALLOWED_MIME.has(mime)) {
    return cb(new Error('Only JPG, JPEG, PNG, WEBP, and PDF files are allowed'), false);
  }

  const dangerous = /\.(exe|js|php|bat|sh|cmd|msi|dll|svg|html)$/i;
  if (dangerous.test(file.originalname)) {
    return cb(new Error('File type not permitted'), false);
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  limits: { fileSize: env.maxUploadBytes, files: 10 },
  fileFilter,
});

export const getFileUrl = (filename, req) => {
  if (!filename) return '';
  if (filename.startsWith('http')) return filename;
  const base = `${req.protocol}://${req.get('host')}`;
  return `${base}/uploads/${filename}`;
};
