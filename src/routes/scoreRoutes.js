import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import * as scoreController from '../controllers/scoreController.js';

const router = Router();
router.use(protect, authorize('student'));
router.get('/', scoreController.getSessions);
router.get('/analytics', scoreController.getAnalytics);
router.post('/', scoreController.createSession);
router.put('/:id', scoreController.updateSession);
router.delete('/:id', scoreController.deleteSession);

export default router;
