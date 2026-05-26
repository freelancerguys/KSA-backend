import { getPaymentSettings } from './settingsService.js';

export const getGlobalDefaultFee = (settings) =>
  Number(settings.defaultMonthlyFee) || Number(settings.monthlyFee) || 1500;

export const getEffectiveMonthlyFee = (student, settings) => {
  const discount = Number(student.feeDiscount) || 0;
  let base;

  if (student.isCustomFeeEnabled && student.customMonthlyFee != null && student.customMonthlyFee !== '') {
    base = Number(student.customMonthlyFee);
  } else {
    // All non-custom students use global default from admin Payment Settings
    base = getGlobalDefaultFee(settings);
  }

  return Math.max(0, base - discount);
};

export const getFeeMeta = async (student) => {
  const settings = await getPaymentSettings();
  const amount = getEffectiveMonthlyFee(student, settings);
  const feeType =
    student.isCustomFeeEnabled && student.customMonthlyFee != null && student.customMonthlyFee !== ''
      ? 'custom'
      : 'default';

  return {
    amount,
    feeType,
    discount: student.feeDiscount || 0,
    dueDay: student.feeDueDay || settings.paymentDueDate || 5,
    globalUPI: settings.globalUPI,
    academyName: settings.academyName,
    paymentQrName: settings.paymentQrName || settings.academyName,
    currency: settings.currency || 'INR',
    paymentInstructions: settings.paymentInstructions,
    settings,
  };
};
