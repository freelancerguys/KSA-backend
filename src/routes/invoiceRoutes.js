import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import * as invoiceController from '../controllers/invoiceController.js';
import * as paymentController from '../controllers/paymentController.js';

const router = Router();

router.use(protect);

router.get('/download/:invoiceId', authorize('student', 'admin'), invoiceController.downloadInvoiceById);
router.get('/', authorize('student'), paymentController.getMyInvoices);

export default router;
