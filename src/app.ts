import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { globalRateLimitConfig } from './middleware/rateLimiter.middleware.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { saloonRoutes } from './modules/saloon/saloon.routes.js';
import { serviceRoutes } from './modules/service/service.routes.js';
import { staffRoutes } from './modules/staff/staff.routes.js';
import { bookingRoutes } from './modules/booking/booking.routes.js';
import { paymentRoutes } from './modules/payment/payment.routes.js';
import { reviewRoutes } from './modules/review/review.routes.js';
import { qrCodeRoutes } from './modules/qrcode/qrcode.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';

export async function buildApp() {
  const app = fastify({
    logger: env.isProduction
      ? true
      : {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          },
        },
    trustProxy: true,
  });

  // 1. Security & Core Plugins
  await app.register(cors, {
    origin: (origin, cb) => {
      // In dev allow all, or allow frontend url
      if (!origin || !env.isProduction || origin === env.FRONTEND_URL) {
        cb(null, true);
        return;
      }
      cb(null, false);
    },
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: env.isProduction,
  });

  await app.register(compress, { global: true });

  await app.register(rateLimit, globalRateLimitConfig);

  // Error Handler
  app.setErrorHandler(errorHandler);

  // Health check endpoint
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
  }));

  // API v1 Route Registration
  await app.register(
    async (v1) => {
      await v1.register(authRoutes, { prefix: '/auth' });
      await v1.register(saloonRoutes, { prefix: '/saloons' });
      await v1.register(serviceRoutes, { prefix: '/saloons/:saloonId/services' });
      await v1.register(staffRoutes, { prefix: '/saloons/:saloonId/staff' });
      await v1.register(bookingRoutes, { prefix: '/bookings' });
      await v1.register(paymentRoutes, { prefix: '/payments' });
      await v1.register(reviewRoutes, { prefix: '/reviews' });
      await v1.register(qrCodeRoutes, { prefix: '/qr' });
      await v1.register(adminRoutes, { prefix: '/admin' });
    },
    { prefix: '/api/v1' }
  );

  return app;
}
