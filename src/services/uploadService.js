import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cloudinary, initCloudinary } from '../config/cloudinary.js';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const saveUploadedFile = async (file) => {
  if (!file) return '';
  if (env.uploadMode === 'cloudinary' && initCloudinary()) {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'kalyani-academy',
    });
    fs.unlinkSync(file.path);
    return result.secure_url;
  }
  return file.filename;
};
