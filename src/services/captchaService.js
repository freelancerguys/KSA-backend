import crypto from 'crypto';
import { ApiError } from '../utils/ApiError.js';
import { logSecurityEvent } from './securityService.js';

const store = new Map();
const TTL_MS = 5 * 60 * 1000;
const CHARSET = '23456789abcdefghjkmnpqrstuvwxyz';
const COLORS = ['#555555', '#008080', '#c47222', '#1a237e', '#ff9800', '#d32f2f'];

const rand = (min, max) => crypto.randomInt(min, max + 1);

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const buildCaptchaSvg = (text) => {
  const width = 200;
  const height = 56;
  const chars = text.split('');

  let noise = '';
  for (let i = 0; i < 5; i += 1) {
    noise += `<line x1="${rand(0, width)}" y1="${rand(0, height)}" x2="${rand(0, width)}" y2="${rand(0, height)}" stroke="#e91e8c" stroke-width="1.4" opacity="0.75"/>`;
  }

  let glyphs = '';
  chars.forEach((ch, i) => {
    const x = 16 + i * 30;
    const y = 38 + rand(-4, 4);
    const rotate = rand(-14, 14);
    glyphs += `<text x="${x}" y="${y}" fill="${COLORS[i % COLORS.length]}" font-family="Arial,sans-serif" font-size="30" font-weight="700" transform="rotate(${rotate} ${x} ${y})">${escapeXml(ch)}</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#efefef" rx="4"/>
  ${noise}
  ${glyphs}
</svg>`;
};

const cleanup = () => {
  const now = Date.now();
  for (const [id, entry] of store.entries()) {
    if (entry.expiresAt <= now) store.delete(id);
  }
  if (store.size > 500) {
    const oldest = [...store.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    oldest.slice(0, store.size - 500).forEach(([id]) => store.delete(id));
  }
};

const generateAnswer = () => {
  let answer = '';
  for (let i = 0; i < 6; i += 1) {
    answer += CHARSET[crypto.randomInt(0, CHARSET.length)];
  }
  return answer;
};

export const createCaptcha = () => {
  cleanup();
  const captchaId = crypto.randomBytes(16).toString('hex');
  const answer = generateAnswer();
  const svg = buildCaptchaSvg(answer);

  store.set(captchaId, {
    answer: answer.toLowerCase(),
    expiresAt: Date.now() + TTL_MS,
  });

  return {
    captchaId,
    image: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
  };
};

export const verifyCaptcha = async (captchaId, captchaAnswer, req) => {
  if (!captchaId || !String(captchaAnswer || '').trim()) {
    await logSecurityEvent({
      type: 'captcha_failed',
      req,
      message: 'Missing captcha on admin login',
    });
    throw new ApiError(400, 'Please enter the captcha');
  }

  const entry = store.get(captchaId);
  store.delete(captchaId);

  if (!entry || Date.now() > entry.expiresAt) {
    await logSecurityEvent({
      type: 'captcha_failed',
      req,
      message: 'Expired or unknown captcha',
    });
    throw new ApiError(400, 'Captcha expired. Please refresh and try again.');
  }

  if (entry.answer !== String(captchaAnswer).trim().toLowerCase()) {
    await logSecurityEvent({
      type: 'captcha_failed',
      req,
      message: 'Incorrect captcha answer',
    });
    throw new ApiError(400, 'Incorrect captcha. Please try again.');
  }
};

/** @internal test helper */
export const clearCaptchaStore = () => store.clear();
