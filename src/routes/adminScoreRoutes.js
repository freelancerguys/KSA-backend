import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import * as adminScoreController from '../controllers/adminScoreController.js';

const router = Router();

router.use(protect, authorize('admin'));

router.get('/students', adminScoreController.listStudentsWithScores);
router.get('/students/:studentId', adminScoreController.getStudentScores);

export default router;
