import { asyncHandler } from '../utils/asyncHandler.js';
import * as authService from '../services/authService.js';
import { User } from '../models/User.js';
import {
  setAuthCookies,
  clearAuthCookies,
  setCsrfCookie,
  normalizePortal,
  extractRefreshTokenFromCookies,
} from '../utils/cookieAuth.js';
import { generateCsrfToken } from '../services/securityService.js';
import { validatePassword } from '../utils/passwordPolicy.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyRefreshToken } from '../utils/generateTokens.js';

const authPayload = (result) => ({
  user: result.user,
  profile: result.profile,
});

export const getCsrfToken = asyncHandler(async (req, res) => {
  const token = generateCsrfToken();
  setCsrfCookie(res, token);
  res.json({ success: true, data: { csrfToken: token } });
});

export const login = asyncHandler(async (req, res) => {
  const { identifier, password, portal: portalBody } = req.body;
  const portal = normalizePortal(portalBody || req.headers['x-portal']);
  const result = await authService.loginUser({ identifier, password }, req);

  if (portal === 'admin' && result.user.role !== 'admin') {
    throw new ApiError(403, 'Admin credentials required');
  }
  if (portal === 'student' && result.user.role !== 'student') {
    throw new ApiError(403, 'Please use the admin panel for admin login.');
  }

  setAuthCookies(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  }, portal);
  res.json({
    success: true,
    message: 'Login successful',
    data: authPayload(result),
  });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const headerPortal = normalizePortal(req.headers['x-portal']);
  const token =
    extractRefreshTokenFromCookies(req, headerPortal)
    || req.body?.refreshToken;
  if (!token) throw new ApiError(401, 'Refresh token missing');

  const result = await authService.refreshAccessToken(token);
  const sessionPortal = result.user.role === 'admin' ? 'admin' : 'student';

  setAuthCookies(res, {
    accessToken: result.accessToken,
    refreshToken: token,
  }, sessionPortal);
  res.json({ success: true, data: { accessToken: result.accessToken } });
});

export const logout = asyncHandler(async (req, res) => {
  const portal = normalizePortal(req.headers['x-portal']);
  const refresh = extractRefreshTokenFromCookies(req, portal);
  if (refresh) {
    try {
      const decoded = verifyRefreshToken(refresh);
      await User.findByIdAndUpdate(decoded.id, { refreshToken: null });
    } catch {
      // ignore invalid refresh on logout
    }
  }
  clearAuthCookies(res, portal);
  res.json({ success: true, message: 'Logged out successfully' });
});

export const changePassword = asyncHandler(async (req, res) => {
  const check = validatePassword(req.body.newPassword);
  if (!check.valid) throw new ApiError(400, check.errors[0]);
  await authService.changePassword(req.user._id, req.body);
  clearAuthCookies(res);
  res.json({ success: true, message: 'Password updated successfully. Please sign in again.' });
});

export const getMe = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: { user: req.user, student: req.student || null },
  });
});
