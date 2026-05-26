import { asyncHandler } from '../utils/asyncHandler.js';
import { getPaymentSettings, updatePaymentSettings } from '../services/settingsService.js';

export const getPayment = asyncHandler(async (req, res) => {
  const data = await getPaymentSettings();
  res.json({ success: true, data });
});

export const updatePayment = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  // Keep legacy monthlyFee in sync so older reads stay consistent
  if (payload.defaultMonthlyFee !== undefined) {
    payload.monthlyFee = payload.defaultMonthlyFee;
  }
  const data = await updatePaymentSettings(payload);
  res.json({ success: true, data, message: 'Payment settings updated globally' });
});
