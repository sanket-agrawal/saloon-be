import { FastifyInstance } from 'fastify';
import { serviceController } from './service.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import { UserRole } from '@prisma/client';

export async function serviceRoutes(app: FastifyInstance) {
  app.get('/', serviceController.listServices.bind(serviceController));

  app.post(
    '/',
    { preHandler: [authenticate, requireRole(UserRole.SALOON_OWNER, UserRole.ADMIN)] },
    serviceController.addService.bind(serviceController)
  );

  app.patch(
    '/:id',
    { preHandler: [authenticate, requireRole(UserRole.SALOON_OWNER, UserRole.ADMIN)] },
    serviceController.updateService.bind(serviceController)
  );

  app.delete(
    '/:id',
    { preHandler: [authenticate, requireRole(UserRole.SALOON_OWNER, UserRole.ADMIN)] },
    serviceController.deactivateService.bind(serviceController)
  );
}
