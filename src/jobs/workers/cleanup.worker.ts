import { Worker, Job } from 'bullmq';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';

export function createCleanupWorker() {
  return new Worker(
    'cleanup-queue',
    async (job: Job) => {
      logger.info({ jobName: job.name }, 'Processing cleanup job');

      if (job.name === 'no-show-checker') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Current time minus 15 minutes
        const now = new Date();
        const currentHours = now.getHours().toString().padStart(2, '0');
        const currentMinutes = now.getMinutes().toString().padStart(2, '0');
        const currentTimeStr = `${currentHours}:${currentMinutes}`;

        // Find confirmed bookings for today that haven't checked in and are past slotEndTime
        const overdueBookings = await prisma.booking.findMany({
          where: {
            slotDate: today,
            status: 'CONFIRMED',
            checkedInAt: null,
            slotEndTime: { lt: currentTimeStr },
          },
        });

        if (overdueBookings.length > 0) {
          await prisma.booking.updateMany({
            where: {
              id: { in: overdueBookings.map((b) => b.id) },
            },
            data: {
              status: 'NO_SHOW',
            },
          });
          logger.info(`Marked ${overdueBookings.length} bookings as NO_SHOW`);
        }
      }

      if (job.name === 'slot-cleanup') {
        // Pending bookings older than 15 minutes cancelled
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        const expiredPending = await prisma.booking.updateMany({
          where: {
            status: 'PENDING',
            createdAt: { lt: fifteenMinutesAgo },
          },
          data: {
            status: 'CANCELLED',
            cancelReason: 'Payment/confirmation timeout expired',
          },
        });
        logger.info(`Cancelled ${expiredPending.count} expired pending bookings`);
      }

      if (job.name === 'subscription-checker') {
        const now = new Date();
        const expiredSubs = await prisma.saloonSubscription.findMany({
          where: {
            isActive: true,
            endDate: { lt: now },
          },
          include: { saloon: true },
        });

        for (const sub of expiredSubs) {
          await prisma.saloonSubscription.update({
            where: { id: sub.id },
            data: { isActive: false },
          });
          await prisma.saloon.update({
            where: { id: sub.saloonId },
            data: { plan: 'BASIC', planExpiresAt: null },
          });
          logger.warn(`Saloon ${sub.saloon.name} subscription expired. Downgraded to BASIC.`);
        }
      }

      return { processed: true };
    },
    { connection: redis, concurrency: 2 }
  );
}
