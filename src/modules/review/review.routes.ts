import { FastifyInstance } from 'fastify';
import { reviewController } from './review.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import { UserRole } from '@prisma/client';

export async function reviewRoutes(app: FastifyInstance) {
  app.post(
    '/',
    { preHandler: [authenticate] },
    reviewController.submitReview.bind(reviewController)
  );

  app.patch(
    '/:id/reply',
    { preHandler: [authenticate, requireRole(UserRole.SALOON_OWNER, UserRole.ADMIN)] },
    reviewController.replyToReview.bind(reviewController)
  );

  app.delete(
    '/:id',
    { preHandler: [authenticate] },
    reviewController.deleteReview.bind(reviewController)
  );
}
