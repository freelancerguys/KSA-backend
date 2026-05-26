const RULES = [
  { test: (p) => p.length >= 8, message: 'Password must be at least 8 characters' },
  { test: (p) => /[A-Z]/.test(p), message: 'Password must include an uppercase letter' },
  { test: (p) => /[a-z]/.test(p), message: 'Password must include a lowercase letter' },
  { test: (p) => /\d/.test(p), message: 'Password must include a number' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), message: 'Password must include a special character' },
];

export const validatePassword = (password) => {
  const p = String(password || '');
  const errors = RULES.filter((r) => !r.test(p)).map((r) => r.message);
  return { valid: errors.length === 0, errors };
};
