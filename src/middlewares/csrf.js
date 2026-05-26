import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logSecurityEvent } from '../services/securityService.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const SKIP_PATHS = ['/api/health', '/api/auth/login', '/api/auth/refresh', '/api/auth/csrf-token'];

export const csrfProtection = asyncHandler(async (req, res, next) => {
  const url = req.originalUrl || req.path;
  if (SAFE_METHODS.has(req.method) || SKIP_PATHS.some((p) => url.startsWith(p))) {
    return next();
  }

  const cookieToken = req.cookies?.csrfToken;
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    await logSecurityEvent({
      type: 'csrf_failed',
      req,
      message: 'CSRF token mismatch',
    });
    throw new ApiError(403, 'Invalid CSRF token');
  }
  next();
});
