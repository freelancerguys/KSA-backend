import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middlewares/validate.js';
import { protect, authorize } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';
import * as studentController from '../controllers/studentController.js';
import { adminLimiter } from '../middlewares/rateLimiters.js';
import { audit } from '../middlewares/auditLog.js';

const router = Router();

router.use(protect);

router.get('/dashboard', authorize('student'), studentController.getStudentDashboard);
router.get('/profile', authorize('student'), studentController.getProfile);
router.put('/profile', authorize('student'), upload.single('photo'), studentController.updateProfile);

router.get('/admin/stats', authorize('admin'), studentController.getDashboardStats);
router.get('/', authorize('admin'), studentController.getStudents);
router.get('/:id', authorize('admin'), studentController.getStudent);
router.post(
  '/',
  authorize('admin'),
  upload.single('photo'),
  [
    body('fullName').notEmpty(),
    body('email').isEmail(),
    body('phone').notEmpty(),
    body('studentId').notEmpty(),
    validate,
  ],
  studentController.createStudent
);
router.put('/:id', authorize('admin'), adminLimiter, audit('student_update', 'student'), upload.single('photo'), studentController.updateStudent);
router.patch('/:id/suspend', authorize('admin'), studentController.suspendStudent);
router.delete('/:id', authorize('admin'), studentController.deleteStudent);
router.post('/:id/reset-password', authorize('admin'), studentController.resetPassword);
router.post('/:id/documents', authorize('admin'), upload.array('documents', 10), studentController.uploadDocuments);
router.delete('/:id/documents/:docId', authorize('admin'), studentController.deleteDocument);

export default router;
