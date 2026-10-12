import { FastifyInstance } from 'fastify';
import { saloonController } from './saloon.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import { UserRole } from '@prisma/client';

export async function saloonRoutes(app: FastifyInstance) {
  // Public routes
  app.get('/', saloonController.listSaloons.bind(saloonController));
  app.get('/:slug', saloonController.getSaloonBySlug.bind(saloonController));
  app.get('/:slug/available-slots', saloonController.getAvailableSlots.bind(saloonController));
  app.get('/:slug/reviews', saloonController.getSaloonReviews.bind(saloonController));
  app.get('/:slug/gallery', saloonController.getSaloonGallery.bind(saloonController));

  // Owner / Registered User routes
  app.post(
    '/',
    { preHandler: [authenticate] },
    saloonController.createSaloon.bind(saloonController)
  );

  app.get(
    '/my/saloon',
    { preHandler: [authenticate, requireRole(UserRole.SALOON_OWNER, UserRole.ADMIN)] },
    saloonController.getMySaloons.bind(saloonController)
  );

  app.patch(
    '/my/saloon/:id',
    { preHandler: [authenticate, requireRole(UserRole.SALOON_OWNER, UserRole.ADMIN)] },
    saloonController.updateSaloon.bind(saloonController)
  );

  app.put(
    '/my/saloon/:id/schedule',
    { preHandler: [authenticate, requireRole(UserRole.SALOON_OWNER, UserRole.ADMIN)] },
    saloonController.updateSchedule.bind(saloonController)
  );

  app.post(
    '/my/saloon/:id/holidays',
    { preHandler: [authenticate, requireRole(UserRole.SALOON_OWNER, UserRole.ADMIN)] },
    saloonController.addHoliday.bind(saloonController)
  );

  app.delete(
    '/my/saloon/:id/holidays/:holidayId',
    { preHandler: [authenticate, requireRole(UserRole.SALOON_OWNER, UserRole.ADMIN)] },
    saloonController.removeHoliday.bind(saloonController)
  );

  app.post(
    '/my/saloon/:id/gallery',
    { preHandler: [authenticate, requireRole(UserRole.SALOON_OWNER, UserRole.ADMIN)] },
    saloonController.addGalleryImage.bind(saloonController)
  );

  app.delete(
    '/my/saloon/:id/gallery/:imageId',
    { preHandler: [authenticate, requireRole(UserRole.SALOON_OWNER, UserRole.ADMIN)] },
    saloonController.removeGalleryImage.bind(saloonController)
  );
}
