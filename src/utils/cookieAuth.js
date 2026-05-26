import { env } from '../config/env.js';

export const PORTALS = ['admin', 'student'];

export const normalizePortal = (value) => {
  const p = String(value || '').toLowerCase();
  return PORTALS.includes(p) ? p : 'student';
};

const baseCookie = () => ({
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  path: '/',
  ...(env.cookieDomain ? { domain: env.cookieDomain } : {}),
});

const accessCookieName = (portal) => `accessToken_${portal}`;
const refreshCookieName = (portal) => `refreshToken_${portal}`;

export const setAuthCookies = (res, { accessToken, refreshToken }, portal = 'student') => {
  const p = normalizePortal(portal);
  res.cookie(accessCookieName(p), accessToken, {
    ...baseCookie(),
    maxAge: env.accessTokenMaxAgeMs,
  });
  res.cookie(refreshCookieName(p), refreshToken, {
    ...baseCookie(),
    maxAge: env.refreshTokenMaxAgeMs,
  });
  const clearOpts = { path: '/', ...(env.cookieDomain ? { domain: env.cookieDomain } : {}) };
  res.clearCookie('accessToken', clearOpts);
  res.clearCookie('refreshToken', clearOpts);
};

export const clearAuthCookies = (res, portal) => {
  if (portal) {
    const p = normalizePortal(portal);
    const clearOpts = { path: '/', ...(env.cookieDomain ? { domain: env.cookieDomain } : {}) };
    res.clearCookie(accessCookieName(p), clearOpts);
    res.clearCookie(refreshCookieName(p), clearOpts);
    return;
  }
  const clearOpts = { path: '/', ...(env.cookieDomain ? { domain: env.cookieDomain } : {}) };
  PORTALS.forEach((p) => {
    res.clearCookie(accessCookieName(p), clearOpts);
    res.clearCookie(refreshCookieName(p), clearOpts);
  });
  res.clearCookie('accessToken', clearOpts);
  res.clearCookie('refreshToken', clearOpts);
};

export const getAccessCookieName = (portal) => accessCookieName(normalizePortal(portal));
export const getRefreshCookieName = (portal) => refreshCookieName(normalizePortal(portal));

/** Access token for a portal (+ legacy shared cookie). Does not cross-use other portal cookies. */
export const extractAccessTokenFromCookies = (req, portal) => {
  if (portal) {
    const named = req.cookies?.[getAccessCookieName(portal)];
    if (named) return named;
  }
  if (req.cookies?.accessToken) return req.cookies.accessToken;
  if (!portal) {
    return req.cookies?.accessToken_student || req.cookies?.accessToken_admin || null;
  }
  return null;
};

/** Refresh token — prefers requested portal, then any valid portal/legacy cookie. */
export const extractRefreshTokenFromCookies = (req, preferredPortal) => {
  const names = [];
  if (preferredPortal) names.push(getRefreshCookieName(preferredPortal));
  names.push('refreshToken_student', 'refreshToken_admin', 'refreshToken');
  const seen = new Set();
  for (const name of names) {
    if (seen.has(name)) continue;
    seen.add(name);
    const value = req.cookies?.[name];
    if (value) return value;
  }
  return null;
};

export const setCsrfCookie = (res, token) => {
  res.cookie('csrfToken', token, {
    httpOnly: false,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
    ...(env.cookieDomain ? { domain: env.cookieDomain } : {}),
  });
};
