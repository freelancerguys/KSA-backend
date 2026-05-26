import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Payment } from '../models/Payment.js';
import { Invoice } from '../models/Invoice.js';
import { Student } from '../models/Student.js';
import { saveUploadedFile } from '../services/uploadService.js';
import { createInvoiceForPayment } from '../services/invoiceService.js';
import { generateUpiQrDataUrl } from '../utils/upiQr.js';
import { notifyPaymentStatus } from '../services/emailService.js';
import { getPaymentSettings } from '../services/settingsService.js';
import { getEffectiveMonthlyFee, getFeeMeta } from '../services/feeService.js';

const getCurrentMonthYear = () => {
  const now = new Date();
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return { month: months[now.getMonth()], year: now.getFullYear() };
};

export const generateQr = asyncHandler(async (req, res) => {
  const student = req.student;
  const feeMeta = await getFeeMeta(student);
  const amount = Number(req.query.amount) || feeMeta.amount;
  const settings = feeMeta.settings;
  const qr = await generateUpiQrDataUrl({
    upiId: settings.globalUPI,
    amount,
    payeeName: settings.paymentQrName || settings.academyName,
    note: `Fee - ${student.fullName}`,
  });
  res.json({
    success: true,
    data: {
      ...qr,
      upiId: settings.globalUPI,
      amount,
      feeType: feeMeta.feeType,
      dueDay: feeMeta.dueDay,
      currency: feeMeta.currency,
      paymentInstructions: settings.paymentInstructions,
      studentName: student.fullName,
      academyName: settings.academyName,
    },
  });
});

export const submitPayment = asyncHandler(async (req, res) => {
  const student = req.student;
  const { month, year, amount, transactionId } = req.body;
  const { month: defaultMonth, year: defaultYear } = getCurrentMonthYear();

  if (!req.file) {
    throw new ApiError(400, 'Payment proof screenshot is required');
  }

  const utr = String(transactionId || '').trim();
  if (!utr) {
    throw new ApiError(400, 'Transaction ID / UTR is required');
  }

  const duplicateUtr = await Payment.findOne({
    student: student._id,
    transactionId: utr,
    status: { $in: ['pending', 'approved'] },
  });
  if (duplicateUtr) {
    throw new ApiError(400, 'This transaction ID was already submitted');
  }

  const proofImage = await saveUploadedFile(req.file);
  const feeAmount = (await getFeeMeta(student)).amount;
  const payment = await Payment.create({
    student: student._id,
    amount: amount || feeAmount,
    month: month || defaultMonth,
    year: Number(year) || defaultYear,
    transactionId: utr,
    proofImage,
    status: 'pending',
  });

  res.status(201).json({ success: true, data: payment, message: 'Payment submitted for approval' });
});

export const getMyPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ student: req.student._id }).sort('-createdAt');
  res.json({ success: true, data: payments });
});

export const getAllPayments = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const payments = await Payment.find(filter)
    .populate({ path: 'student', select: 'fullName studentId phone' })
    .sort('-createdAt');
  res.json({ success: true, data: payments });
});

export const approvePayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id).populate('student');
  if (!payment) throw new ApiError(404, 'Payment not found');
  if (payment.status === 'approved') throw new ApiError(400, 'Already approved');

  payment.status = 'approved';
  payment.approvedAt = new Date();
  payment.approvedBy = req.user._id;
  await payment.save();

  const student = await Student.findById(payment.student._id || payment.student).populate('user');
  const { invoice } = await createInvoiceForPayment(payment, student);
  await notifyPaymentStatus(student, payment, 'approved');

  res.json({ success: true, data: { payment, invoice } });
});

export const rejectPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw new ApiError(404, 'Payment not found');
  payment.status = 'rejected';
  payment.rejectionReason = req.body.reason || 'Invalid proof';
  await payment.save();
  const student = await Student.findById(payment.student).populate('user');
  await notifyPaymentStatus(student, payment, 'rejected');
  res.json({ success: true, data: payment });
});

export const getMyInvoices = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find({ student: req.student._id }).sort('-createdAt');
  res.json({ success: true, data: invoices });
});

export { downloadInvoiceById as downloadInvoice } from './invoiceController.js';
