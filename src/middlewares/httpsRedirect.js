import { env } from '../config/env.js';

export const httpsRedirect = (req, res, next) => {
  if (!env.forceHttps) return next();
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') return next();
  return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
};
