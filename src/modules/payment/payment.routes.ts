import { FastifyInstance } from 'fastify';
import { paymentController } from './payment.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import { UserRole } from '@prisma/client';

export async function paymentRoutes(app: FastifyInstance) {
  app.post(
    '/create-order',
    { preHandler: [authenticate] },
    paymentController.createOrder.bind(paymentController)
  );

  app.post(
    '/verify',
    { preHandler: [authenticate] },
    paymentController.verifyPayment.bind(paymentController)
  );

  app.post(
    '/:id/refund',
    { preHandler: [authenticate, requireRole(UserRole.SALOON_OWNER, UserRole.ADMIN)] },
    paymentController.refundPayment.bind(paymentController)
  );

  app.post('/webhook', paymentController.webhook.bind(paymentController));
}
