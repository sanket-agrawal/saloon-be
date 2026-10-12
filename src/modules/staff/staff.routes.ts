import { FastifyInstance } from 'fastify';
import { staffController } from './staff.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import { UserRole } from '@prisma/client';

export async function staffRoutes(app: FastifyInstance) {
  app.get('/', staffController.listStaff.bind(staffController));

  app.post(
    '/',
    { preHandler: [authenticate, requireRole(UserRole.SALOON_OWNER, UserRole.ADMIN)] },
    staffController.addStaff.bind(staffController)
  );

  app.patch(
    '/:id',
    { preHandler: [authenticate, requireRole(UserRole.SALOON_OWNER, UserRole.ADMIN)] },
    staffController.updateStaff.bind(staffController)
  );

  app.delete(
    '/:id',
    { preHandler: [authenticate, requireRole(UserRole.SALOON_OWNER, UserRole.ADMIN)] },
    staffController.deactivateStaff.bind(staffController)
  );
}
