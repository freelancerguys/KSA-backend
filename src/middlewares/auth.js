import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';
import { Student } from '../models/Student.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { PORTALS, extractAccessTokenFromCookies } from '../utils/cookieAuth.js';

const getPortal = (req) => {
  const header = String(req.headers['x-portal'] || '').toLowerCase();
  return PORTALS.includes(header) ? header : null;
};

const extractToken = (req) => {
  const portal = getPortal(req);
  const cookieToken = extractAccessTokenFromCookies(req, portal);
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.split(' ')[1];

  return null;
};

export const protect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw new ApiError(401, 'Not authorized. Please sign in again.');

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) throw new ApiError(401, 'User not found or inactive');

    req.user = user;
    if (user.role === 'student') {
      req.student = await Student.findOne({ user: user._id });
    }
    next();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Session expired. Please sign in again.');
    }
    throw new ApiError(401, 'Invalid token');
  }
});

export const authorize = (...roles) =>
  asyncHandler(async (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, 'You do not have permission for this action');
    }
    next();
  });
