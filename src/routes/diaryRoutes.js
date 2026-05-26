import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import * as diaryController from '../controllers/diaryController.js';

const router = Router();
router.use(protect, authorize('student'));
router.get('/', diaryController.getDiaries);
router.post('/', diaryController.createDiary);
router.put('/:id', diaryController.updateDiary);
router.delete('/:id', diaryController.deleteDiary);

export default router;
