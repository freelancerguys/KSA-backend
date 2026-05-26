import dotenv from 'dotenv';
dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kalyani_shooting_academy',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me',
  jwtExpire: process.env.JWT_EXPIRE || (isProd ? '15m' : '24h'),
  jwtRefreshExpire: process.env.JWT_REFRESH_EXPIRE || '7d',
  accessTokenMaxAgeMs: isProd ? 15 * 60 * 1000 : 24 * 60 * 60 * 1000,
  refreshTokenMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  adminUrl: process.env.ADMIN_URL || 'http://localhost:5174',
  cookieSecure: isProd || process.env.COOKIE_SECURE === 'true',
  cookieSameSite: process.env.COOKIE_SAME_SITE || (isProd ? 'strict' : 'lax'),
  forceHttps: isProd || process.env.FORCE_HTTPS === 'true',
  rateLimitWindowMs: 15 * 60 * 1000,
  rateLimitMax:
    Number(process.env.RATE_LIMIT_MAX)
    || (isProd ? 100 : 1000),
  loginRateWindowMs: 15 * 60 * 1000,
  loginRateMax:
    Number(process.env.LOGIN_RATE_MAX)
    || (isProd ? 15 : 50),
  adminRateLimitMax: Number(process.env.ADMIN_RATE_LIMIT_MAX) || 200,
  maxLoginAttempts: Number(process.env.MAX_LOGIN_ATTEMPTS) || 5,
  lockMinutes: Number(process.env.LOCK_MINUTES) || 15,
  ipBlockMinutes: Number(process.env.IP_BLOCK_MINUTES) || 30,
  autoBlockOnRateLimit: process.env.AUTO_BLOCK_RATE_LIMIT === 'true',
  turnstileSecret: process.env.TURNSTILE_SECRET_KEY || '',
  uploadMode: process.env.UPLOAD_MODE || 'local',
  uploadPath: process.env.UPLOAD_PATH || 'uploads',
  maxUploadBytes: 5 * 1024 * 1024,
  academyName: process.env.ACADEMY_NAME || 'Kalyani Shooting Academy',
  defaultUpiId: process.env.DEFAULT_UPI_ID || 'academy@upi',
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'Kalyani Shooting Academy <noreply@kalyaniacademy.com>',
  },
};
