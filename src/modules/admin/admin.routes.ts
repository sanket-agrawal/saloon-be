import { FastifyInstance } from 'fastify';
import { adminController } from './admin.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import { UserRole } from '@prisma/client';

export async function adminRoutes(app: FastifyInstance) {
  // All admin routes require ADMIN role
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireRole(UserRole.ADMIN));

  app.get('/saloons', adminController.listAllSaloons.bind(adminController));
  app.patch('/saloons/:id/verify', adminController.verifySaloon.bind(adminController));
  app.patch('/saloons/:id/status', adminController.setSaloonStatus.bind(adminController));
  app.get('/stats', adminController.getPlatformStats.bind(adminController));
  app.get('/revenue', adminController.getRevenueReport.bind(adminController));
}
