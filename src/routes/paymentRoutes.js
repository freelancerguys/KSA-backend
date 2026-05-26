import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';
import * as paymentController from '../controllers/paymentController.js';
import { adminLimiter } from '../middlewares/rateLimiters.js';
import { audit } from '../middlewares/auditLog.js';

const router = Router();

router.use(protect);

router.get('/qr', authorize('student'), paymentController.generateQr);
router.post('/submit', authorize('student'), upload.single('proof'), paymentController.submitPayment);
router.get('/my', authorize('student'), paymentController.getMyPayments);
router.get('/invoices', authorize('student'), paymentController.getMyInvoices);
router.get('/invoices/:id/download', authorize('student', 'admin'), paymentController.downloadInvoice);

router.get('/', authorize('admin'), adminLimiter, paymentController.getAllPayments);
router.patch('/:id/approve', authorize('admin'), adminLimiter, audit('payment_approve', 'payment'), paymentController.approvePayment);
router.patch('/:id/reject', authorize('admin'), adminLimiter, audit('payment_reject', 'payment'), paymentController.rejectPayment);

export default router;
