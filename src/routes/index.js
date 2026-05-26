import { Router } from 'express';
import authRoutes from './authRoutes.js';
import studentRoutes from './studentRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import invoiceRoutes from './invoiceRoutes.js';
import cmsRoutes from './cmsRoutes.js';
import diaryRoutes from './diaryRoutes.js';
import scoreRoutes from './scoreRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import adminScoreRoutes from './adminScoreRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/payments', paymentRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/cms', cmsRoutes);
router.use('/diaries', diaryRoutes);
router.use('/scores', scoreRoutes);
router.use('/settings', settingsRoutes);
router.use('/admin/dashboard', dashboardRoutes);
router.use('/admin/scores', adminScoreRoutes);

export default router;
