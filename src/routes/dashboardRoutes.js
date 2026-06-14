import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import * as dashboardController from '../controllers/dashboardController.js';

const router = Router();

router.use(protect, authorize('admin'));

router.get('/stats', dashboardController.stats);
router.get('/revenue', dashboardController.revenue);
router.get('/payments', dashboardController.payments);
router.get('/activities', dashboardController.activities);
router.patch('/notifications/:id/read', dashboardController.markNotificationRead);
router.delete('/notifications/:id', dashboardController.dismissNotification);

export default router;
