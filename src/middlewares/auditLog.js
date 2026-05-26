import { logAdminAction } from '../services/securityService.js';

export const audit =
  (action, resource = '') =>
  (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode < 400 && req.user?.role === 'admin') {
        logAdminAction(req, action, resource, req.params?.id || req.params?.invoiceId || '', {
          method: req.method,
          path: req.originalUrl,
          bodyKeys: Object.keys(req.body || {}),
        });
      }
    });
    next();
  };
