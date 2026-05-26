import crypto from 'crypto';
import { SecurityLog } from '../models/SecurityLog.js';
import { AuditLog } from '../models/AuditLog.js';
import { env } from '../config/env.js';

const blockedIPs = new Map();

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || 'unknown';
};

export const isIpBlocked = (ip) => {
  const entry = blockedIPs.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.until) {
    blockedIPs.delete(ip);
    return false;
  }
  return true;
};

export const clearBlockedIps = () => {
  blockedIPs.clear();
};

export const blockIp = async (ip, minutes = env.ipBlockMinutes, reason = 'Suspicious activity') => {
  const until = Date.now() + minutes * 60 * 1000;
  blockedIPs.set(ip, { until, reason });
  await SecurityLog.create({
    type: 'ip_blocked',
    ip,
    message: reason,
    meta: { until: new Date(until) },
  });
};

export const logSecurityEvent = async ({
  type,
  req,
  identifier = '',
  userId = null,
  message = '',
  meta = {},
}) => {
  try {
    await SecurityLog.create({
      type,
      ip: req ? getClientIp(req) : '',
      userAgent: req?.headers?.['user-agent'] || '',
      identifier,
      userId,
      path: req?.originalUrl || '',
      message,
      meta,
    });
  } catch {
    // avoid breaking request flow
  }
};

export const logAdminAction = async (req, action, resource = '', resourceId = '', details = {}) => {
  if (!req?.user || req.user.role !== 'admin') return;
  try {
    await AuditLog.create({
      adminId: req.user._id,
      action,
      resource,
      resourceId: String(resourceId || ''),
      ip: getClientIp(req),
      details,
    });
  } catch {
    // non-blocking
  }
};

export const generateCsrfToken = () => crypto.randomBytes(32).toString('hex');

export { getClientIp };
