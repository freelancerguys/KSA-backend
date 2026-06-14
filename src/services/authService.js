import { User } from '../models/User.js';
import { Student } from '../models/Student.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/generateTokens.js';
import {
  logSecurityEvent,
  blockIp,
  getClientIp,
} from './securityService.js';
import { verifyGoogleIdToken } from './googleAuthService.js';

const isLocked = (user) => user.lockUntil && user.lockUntil > new Date();

export const loginUser = async ({ identifier, password }, req) => {
  const id = String(identifier || '').trim().toLowerCase();
  const pwd = String(password || '');
  if (!id || !pwd) throw new ApiError(401, 'Invalid credentials');

  const ip = req ? getClientIp(req) : '';

  let user;
  if (id.includes('@')) {
    user = await User.findOne({ email: id }).select('+password +refreshToken +loginAttempts +lockUntil');
  } else {
    user = await User.findOne({
      $or: [{ phone: id }, { email: id }],
    }).select('+password +refreshToken +loginAttempts +lockUntil');
    if (!user) {
      const student = await Student.findOne({ phone: id });
      if (student) {
        user = await User.findById(student.user).select('+password +refreshToken +loginAttempts +lockUntil');
      }
    }
  }

  if (!user) {
    await logSecurityEvent({ type: 'login_failed', req, identifier: id, message: 'Unknown user' });
    throw new ApiError(401, 'Invalid credentials');
  }

  if (isLocked(user)) {
    await logSecurityEvent({
      type: 'account_locked',
      req,
      identifier: id,
      userId: user._id,
      message: 'Login attempt on locked account',
    });
    throw new ApiError(403, 'Account temporarily locked. Try again later.');
  }

  const valid = await user.comparePassword(pwd);
  if (!valid) {
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    if (user.loginAttempts >= env.maxLoginAttempts) {
      user.lockUntil = new Date(Date.now() + env.lockMinutes * 60 * 1000);
      await logSecurityEvent({
        type: 'account_locked',
        req,
        identifier: id,
        userId: user._id,
        message: 'Too many failed login attempts',
      });
      if (ip && env.nodeEnv === 'production') {
        await blockIp(ip, env.ipBlockMinutes, 'Repeated failed logins');
      }
    }
    await user.save({ validateBeforeSave: false });
    await logSecurityEvent({ type: 'login_failed', req, identifier: id, userId: user._id });
    throw new ApiError(401, 'Invalid credentials');
  }

  if (!user.isActive) throw new ApiError(403, 'Account suspended. Contact academy admin.');

  user.loginAttempts = 0;
  user.lockUntil = undefined;
  user.lastLogin = new Date();

  const payload = { id: user._id, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  await logSecurityEvent({
    type: 'login_success',
    req,
    identifier: id,
    userId: user._id,
  });

  let profile = null;
  if (user.role === 'student') {
    profile = await Student.findOne({ user: user._id });
  }

  return {
    user: {
      id: user._id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    profile,
    accessToken,
    refreshToken,
  };
};

export const loginWithGoogle = async (idToken, req) => {
  const googleProfile = await verifyGoogleIdToken(idToken);
  const email = String(googleProfile.email || '').trim().toLowerCase();

  if (!email) throw new ApiError(401, 'Google account email unavailable');
  if (!googleProfile.email_verified) {
    throw new ApiError(401, 'Your Google email is not verified');
  }

  const user = await User.findOne({ email }).select('+refreshToken +loginAttempts +lockUntil');
  if (!user) {
    await logSecurityEvent({
      type: 'login_failed',
      req,
      identifier: email,
      message: 'Google login - email not registered',
    });
    throw new ApiError(
      403,
      'No registered account found for this email. Contact the academy admin to get access.'
    );
  }

  if (user.role !== 'student') {
    throw new ApiError(403, 'Please use the admin panel for admin login.');
  }

  if (isLocked(user)) {
    await logSecurityEvent({
      type: 'account_locked',
      req,
      identifier: email,
      userId: user._id,
      message: 'Google login attempt on locked account',
    });
    throw new ApiError(403, 'Account temporarily locked. Try again later.');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Account suspended. Contact academy admin.');
  }

  const profile = await Student.findOne({ user: user._id });
  if (!profile) {
    await logSecurityEvent({
      type: 'login_failed',
      req,
      identifier: email,
      userId: user._id,
      message: 'Google login - student profile missing',
    });
    throw new ApiError(
      403,
      'No registered account found for this email. Contact the academy admin to get access.'
    );
  }

  user.loginAttempts = 0;
  user.lockUntil = undefined;
  user.lastLogin = new Date();

  const payload = { id: user._id, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  await logSecurityEvent({
    type: 'login_success',
    req,
    identifier: email,
    userId: user._id,
    message: 'Google sign-in',
  });

  return {
    user: {
      id: user._id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    profile,
    accessToken,
    refreshToken,
  };
};

export const refreshAccessToken = async (token) => {
  const decoded = verifyRefreshToken(token);
  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== token) {
    throw new ApiError(401, 'Invalid refresh token');
  }
  if (!user.isActive) throw new ApiError(403, 'Account inactive');
  const accessToken = generateAccessToken({ id: user._id, role: user.role });
  return {
    accessToken,
    user: {
      id: user._id,
      role: user.role,
    },
  };
};

export const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findById(userId).select('+password');
  if (!user) throw new ApiError(404, 'User not found');
  const valid = await user.comparePassword(currentPassword);
  if (!valid) throw new ApiError(400, 'Current password is incorrect');
  user.password = newPassword;
  user.refreshToken = null;
  await user.save();
  return true;
};
