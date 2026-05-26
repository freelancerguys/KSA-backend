/** API path segments when mounted under /api (see routes/index.js). */
const API_ROOTS = new Set([
  'auth',
  'health',
  'students',
  'payments',
  'invoices',
  'cms',
  'diaries',
  'scores',
  'settings',
  'admin',
]);

/**
 * Normalize API paths to /api/* so one mount works whether Nginx keeps or strips the prefix.
 * e.g. /auth/csrf-token -> /api/auth/csrf-token
 */
export const apiPathRewrite = (req, res, next) => {
  const raw = req.url || '/';
  const qIndex = raw.indexOf('?');
  const pathname = qIndex === -1 ? raw : raw.slice(0, qIndex);
  const query = qIndex === -1 ? '' : raw.slice(qIndex);

  if (pathname === '/api' || pathname.startsWith('/api/')) {
    return next();
  }

  const first = pathname.replace(/^\//, '').split('/')[0];
  if (first && API_ROOTS.has(first)) {
    req.url = `/api${pathname}${query}`;
  }

  next();
};
