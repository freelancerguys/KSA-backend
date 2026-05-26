const RUPEE = '\u20B9';

/**
 * Format amount as Indian Rupee (₹) with en-IN grouping.
 * @param {number|string|null|undefined} amount
 * @param {{ fallback?: string }} [options]
 * @returns {string}
 */
export const formatCurrency = (amount, options = {}) => {
  const { fallback = '—' } = options;
  if (amount === null || amount === undefined || amount === '') return fallback;
  const num = Number(amount);
  if (Number.isNaN(num)) return fallback;
  return `${RUPEE}${num.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`;
};

/** @deprecated Use formatCurrency */
export const rupee = formatCurrency;
