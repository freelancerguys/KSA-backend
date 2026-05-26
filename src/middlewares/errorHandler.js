import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { logSecurityEvent } from '../services/securityService.js';

export const notFound = (req, res, next) => {
  next(new ApiError(404, env.nodeEnv === 'production' ? 'Resource not found' : `Route not found: ${req.originalUrl}`));
};

export const errorHandler = async (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  const errors = err.errors || [];

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }
  if (err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value entered';
  }
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Session expired. Please sign in again.';
  }

  if (statusCode >= 500) {
    await logSecurityEvent({
      type: 'suspicious_request',
      req,
      message: env.nodeEnv === 'production' ? 'Server error' : err.message,
    });
    if (env.nodeEnv === 'production') {
      message = 'Something went wrong. Please try again later.';
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(env.nodeEnv === 'development' && { stack: err.stack }),
  });
};
