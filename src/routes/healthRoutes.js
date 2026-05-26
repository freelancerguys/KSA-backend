import { Router } from 'express';
import * as healthController from '../controllers/healthController.js';

const router = Router();

/** GET /api/health */
router.get('/', healthController.getLive);

/** GET /api/health/live */
router.get('/live', healthController.getLive);

/** GET /api/health/ready */
router.get('/ready', healthController.getReady);

export default router;
