import { FastifyInstance } from 'fastify';
import { authController } from './auth.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { otpRateLimitConfig } from '../../middleware/rateLimiter.middleware.js';

export async function authRoutes(app: FastifyInstance) {
  app.post(
    '/request-otp',
    otpRateLimitConfig,
    authController.requestOtp.bind(authController)
  );

  app.post(
    '/verify-otp',
    otpRateLimitConfig,
    authController.verifyOtp.bind(authController)
  );

  app.post('/refresh', authController.refresh.bind(authController));

  app.post(
    '/logout',
    { preHandler: [authenticate] },
    authController.logout.bind(authController)
  );

  app.get(
    '/me',
    { preHandler: [authenticate] },
    authController.getMe.bind(authController)
  );

  app.patch(
    '/me',
    { preHandler: [authenticate] },
    authController.updateProfile.bind(authController)
  );
}
