import { FastifyInstance } from 'fastify';
import { qrCodeController } from './qrcode.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import { UserRole } from '@prisma/client';

export async function qrCodeRoutes(app: FastifyInstance) {
  app.get(
    '/saloon/:saloonId',
    { preHandler: [authenticate, requireRole(UserRole.SALOON_OWNER, UserRole.ADMIN)] },
    qrCodeController.getSaloonQr.bind(qrCodeController)
  );

  app.get(
    '/saloon/:saloonId/download',
    { preHandler: [authenticate, requireRole(UserRole.SALOON_OWNER, UserRole.ADMIN)] },
    qrCodeController.downloadSaloonQr.bind(qrCodeController)
  );
}
