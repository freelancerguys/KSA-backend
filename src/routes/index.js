import { Router } from 'express';
import authRoutes from './authRoutes.js';
import studentRoutes from './studentRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import invoiceRoutes from './invoiceRoutes.js';
import cmsRoutes from './cmsRoutes.js';
import diaryRoutes from './diaryRoutes.js';
import scoreRoutes from './scoreRoutes.js';
import settingsRoutes from './settingsRoutes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Kalyani Shooting Academy API is running' });
});

router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/payments', paymentRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/cms', cmsRoutes);
router.use('/diaries', diaryRoutes);
router.use('/scores', scoreRoutes);
router.use('/settings', settingsRoutes);

export default router;
