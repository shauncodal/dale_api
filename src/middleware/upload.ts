import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { config } from '../lib/config';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const avatarsDir = path.join(process.cwd(), config.uploadDir, 'avatars');

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

ensureDir(avatarsDir);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureDir(avatarsDir);
    cb(null, avatarsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const base = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    cb(null, `${base}${ext.toLowerCase()}`);
  },
});

export const avatarUploadMiddleware = multer({
  storage,
  limits: { fileSize: config.maxFileSize },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and WebP are allowed.'));
    }
  },
});

const CSV_MAX_SIZE = 1024 * 1024; // 1MB
export const csvUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: CSV_MAX_SIZE },
}).single('file');

/** Recording upload: video/webm, up to 500MB */
const RECORDING_MAX_SIZE = 500 * 1024 * 1024;
const RECORDING_MIMES = ['video/webm', 'video/mp4', 'video/quicktime'];
export const recordingUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: RECORDING_MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (RECORDING_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video/webm, video/mp4 are allowed.'));
    }
  },
}).single('file');
