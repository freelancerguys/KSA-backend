import { asyncHandler } from '../utils/asyncHandler.js';
import * as authService from '../services/authService.js';
import { User } from '../models/User.js';
import { normalizePortal } from '../utils/cookieAuth.js';
import { validatePassword } from '../utils/passwordPolicy.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyRefreshToken } from '../utils/generateTokens.js';
import { verifyCaptcha, createCaptcha } from '../services/captchaService.js';

const authPayload = (result) => ({
  user: result.user,
  profile: result.profile,
  accessToken: result.accessToken,
  refreshToken: result.refreshToken,
});

export const getCaptcha = asyncHandler(async (req, res) => {
  res.json({ success: true, data: createCaptcha() });
});

export const login = asyncHandler(async (req, res) => {
  const { identifier, password, portal: portalBody, captchaId, captchaAnswer } = req.body;
  const portal = normalizePortal(portalBody || req.headers['x-portal']);

  if (portal === 'admin') {
    await verifyCaptcha(captchaId, captchaAnswer, req);
  }

  const result = await authService.loginUser({ identifier, password }, req);

  if (portal === 'admin' && result.user.role !== 'admin') {
    throw new ApiError(403, 'Admin credentials required');
  }
  if (portal === 'student' && result.user.role !== 'student') {
    throw new ApiError(403, 'Please use the admin panel for admin login.');
  }

  res.json({
    success: true,
    message: 'Login successful',
    data: authPayload(result),
  });
});

export const googleLogin = asyncHandler(async (req, res) => {
  const { idToken, portal: portalBody } = req.body;
  const portal = normalizePortal(portalBody || req.headers['x-portal']);

  if (portal !== 'student') {
    throw new ApiError(403, 'Google sign-in is only available for students');
  }

  const result = await authService.loginWithGoogle(idToken, req);
  res.json({
    success: true,
    message: 'Login successful',
    data: authPayload(result),
  });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.body?.refreshToken;
  if (!token) throw new ApiError(401, 'Refresh token missing');

  const result = await authService.refreshAccessToken(token);
  res.json({
    success: true,
    data: {
      accessToken: result.accessToken,
      refreshToken: token,
    },
  });
});

export const logout = asyncHandler(async (req, res) => {
  const refresh = req.body?.refreshToken;
  if (refresh) {
    try {
      const decoded = verifyRefreshToken(refresh);
      await User.findByIdAndUpdate(decoded.id, { refreshToken: null });
    } catch {
      // ignore invalid refresh on logout
    }
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

export const changePassword = asyncHandler(async (req, res) => {
  const check = validatePassword(req.body.newPassword);
  if (!check.valid) throw new ApiError(400, check.errors[0]);
  await authService.changePassword(req.user._id, req.body);
  res.json({ success: true, message: 'Password updated successfully. Please sign in again.' });
});

export const getMe = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: { user: req.user, student: req.student || null },
  });
});
