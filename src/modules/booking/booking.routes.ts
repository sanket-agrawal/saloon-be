import { FastifyInstance } from 'fastify';
import { bookingController } from './booking.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import { UserRole } from '@prisma/client';

export async function bookingRoutes(app: FastifyInstance) {
  // Customer & Common booking routes
  app.post(
    '/',
    { preHandler: [authenticate] },
    bookingController.createBooking.bind(bookingController)
  );

  app.get(
    '/my',
    { preHandler: [authenticate] },
    bookingController.listMyBookings.bind(bookingController)
  );

  app.get(
    '/:id',
    { preHandler: [authenticate] },
    bookingController.getBookingById.bind(bookingController)
  );

  app.post(
    '/:id/cancel',
    { preHandler: [authenticate] },
    bookingController.cancelBooking.bind(bookingController)
  );

  // Saloon Owner operations
  app.patch(
    '/:id/check-in',
    { preHandler: [authenticate, requireRole(UserRole.SALOON_OWNER, UserRole.ADMIN)] },
    bookingController.checkInBooking.bind(bookingController)
  );

  app.patch(
    '/:id/complete',
    { preHandler: [authenticate, requireRole(UserRole.SALOON_OWNER, UserRole.ADMIN)] },
    bookingController.completeBooking.bind(bookingController)
  );

  app.patch(
    '/:id/no-show',
    { preHandler: [authenticate, requireRole(UserRole.SALOON_OWNER, UserRole.ADMIN)] },
    bookingController.markNoShow.bind(bookingController)
  );

  app.get(
    '/saloon/:saloonId',
    { preHandler: [authenticate, requireRole(UserRole.SALOON_OWNER, UserRole.ADMIN)] },
    bookingController.listSaloonBookings.bind(bookingController)
  );

  app.get(
    '/saloon/:saloonId/today',
    { preHandler: [authenticate, requireRole(UserRole.SALOON_OWNER, UserRole.ADMIN)] },
    bookingController.getTodayBookings.bind(bookingController)
  );

  app.get(
    '/saloon/:saloonId/stats',
    { preHandler: [authenticate, requireRole(UserRole.SALOON_OWNER, UserRole.ADMIN)] },
    bookingController.getSaloonStats.bind(bookingController)
  );
}
