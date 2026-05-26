import { Settings } from '../models/Settings.js';
import { env } from '../config/env.js';

export const PAYMENT_SETTING_KEYS = [
  'academyName',
  'globalUPI',
  'defaultMonthlyFee',
  'paymentDueDate',
  'whatsappNumber',
  'invoicePrefix',
  'paymentInstructions',
  'paymentQrName',
  'currency',
];

const DEFAULTS = {
  academyName: env.academyName,
  globalUPI: env.defaultUpiId,
  defaultMonthlyFee: 1500,
  paymentDueDate: 5,
  whatsappNumber: '',
  invoicePrefix: 'KSA',
  paymentInstructions: 'Pay via UPI and upload payment screenshot for approval.',
  paymentQrName: env.academyName,
  currency: 'INR',
};

export const getPaymentSettings = async () => {
  const rows = await Settings.find({ key: { $in: PAYMENT_SETTING_KEYS } });
  const map = { ...DEFAULTS };
  rows.forEach((r) => {
    map[r.key] = r.value;
  });
  // Support legacy `monthlyFee` key from older CMS settings
  map.defaultMonthlyFee =
    Number(map.defaultMonthlyFee) || Number(map.monthlyFee) || DEFAULTS.defaultMonthlyFee;
  map.monthlyFee = map.defaultMonthlyFee;
  map.paymentDueDate = Number(map.paymentDueDate) || DEFAULTS.paymentDueDate;
  return map;
};

export const updatePaymentSettings = async (payload) => {
  const updates = [];
  const data = { ...payload };
  if (data.defaultMonthlyFee !== undefined) {
    data.monthlyFee = data.defaultMonthlyFee;
  }
  for (const key of PAYMENT_SETTING_KEYS) {
    if (data[key] !== undefined) {
      updates.push(
        Settings.findOneAndUpdate({ key }, { value: data[key] }, { upsert: true, new: true })
      );
    }
  }
  if (data.monthlyFee !== undefined) {
    updates.push(
      Settings.findOneAndUpdate({ key: 'monthlyFee' }, { value: data.monthlyFee }, { upsert: true, new: true })
    );
  }
  await Promise.all(updates);
  return getPaymentSettings();
};

export const getSettingsMap = async () => {
  const settings = await Settings.find();
  return settings.reduce((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {});
};
