import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import * as settingsController from '../controllers/settingsController.js';

const router = Router();

router.get('/payment', protect, authorize('admin'), settingsController.getPayment);
router.put('/payment', protect, authorize('admin'), settingsController.updatePayment);

export default router;
