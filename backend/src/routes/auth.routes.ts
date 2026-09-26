import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { RateLimiter } from '../middlewares/rateLimit.middleware';
import {
  registerCustomerSchema,
  registerRestaurantOwnerSchema,
  registerDriverSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../validators/auth.validator';

const router = Router();
router.use(RateLimiter.authLimiter);

// Registration endpoints
router.post('/register/customer', validate(registerCustomerSchema), AuthController.registerCustomer);
router.post('/register/owner', validate(registerRestaurantOwnerSchema), AuthController.registerRestaurantOwner);
router.post('/register/driver', validate(registerDriverSchema), AuthController.registerDriver);

// Email verification
router.get('/verify-email', AuthController.verifyEmail);
router.post('/resend-verification', AuthController.resendVerification);

// Password Management
router.post('/forgot-password', validate(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), AuthController.resetPassword);

// Login and Logout
router.post('/login', RateLimiter.loginLimiter, validate(loginSchema), AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/logout', authenticate, AuthController.logout);

// Protected user routes
router.get('/me', authenticate, AuthController.getCurrentUser);

export default router;
