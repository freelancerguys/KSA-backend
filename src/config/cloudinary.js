import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';

export const initCloudinary = () => {
  if (env.uploadMode !== 'cloudinary') return false;
  if (!process.env.CLOUDINARY_CLOUD_NAME) return false;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return true;
};

export { cloudinary };
