export const PORTALS = ['admin', 'student'];

export const normalizePortal = (value) => {
  const p = String(value || '').toLowerCase();
  return PORTALS.includes(p) ? p : 'student';
};
