import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { logSecurityEvent, blockIp, getClientIp } from '../services/securityService.js';

const isExemptRoute = (req) => {
  const path = req.originalUrl || req.path || '';
  if (path.startsWith('/api/auth') || path.startsWith('/auth/')) return true;
  if (path === '/health' || path.startsWith('/health/')) return true;
  if (path === '/api/health' || path.startsWith('/api/health/')) return true;
  return false;
};

const limitHandler = (type, message) => async (req, res) => {
  await logSecurityEvent({
    type: 'rate_limit',
    req,
    message: type,
  });
  if (env.autoBlockOnRateLimit) {
    await blockIp(getClientIp(req), env.ipBlockMinutes, `Rate limit: ${type}`);
  }
  res.status(429).json({ success: false, message });
};

export const globalLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isExemptRoute(req),
  handler: limitHandler('global', 'Too many requests. Please try again later.'),
});

export const loginLimiter = rateLimit({
  windowMs: env.loginRateWindowMs,
  max: env.loginRateMax,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: limitHandler(
    'login',
    'Too many login attempts. Please wait a few minutes and try again.'
  ),
});

export const adminLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.adminRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler('admin', 'Too many admin requests. Please try again later.'),
});
