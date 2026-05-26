import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middlewares/validate.js';
import { protect } from '../middlewares/auth.js';
import { loginLimiter } from '../middlewares/rateLimiters.js';
import { validatePassword } from '../utils/passwordPolicy.js';
import { ApiError } from '../utils/ApiError.js';
import * as authController from '../controllers/authController.js';

const router = Router();

router.get('/csrf-token', authController.getCsrfToken);

router.post(
  '/login',
  loginLimiter,
  [
    body('identifier').trim().notEmpty().withMessage('Email or phone required'),
    body('password').notEmpty().withMessage('Password required'),
    validate,
  ],
  authController.login
);

router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

router.get('/me', protect, authController.getMe);

router.put(
  '/change-password',
  protect,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').custom((value) => {
      const result = validatePassword(value);
      if (!result.valid) throw new Error(result.errors[0]);
      return true;
    }),
    validate,
  ],
  authController.changePassword
);

export default router;
