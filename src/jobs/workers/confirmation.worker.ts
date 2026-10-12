import { Worker, Job } from 'bullmq';
import { redis } from '../../config/redis.js';
import { notificationService } from '../../modules/notification/notification.service.js';
import { logger } from '../../config/logger.js';

export interface ConfirmationJobData {
  bookingId: string;
}

export function createConfirmationWorker() {
  return new Worker<ConfirmationJobData>(
    'booking-confirmation',
    async (job: Job<ConfirmationJobData>) => {
      logger.info({ jobId: job.id, data: job.data }, 'Processing booking confirmation job');
      await notificationService.sendBookingConfirmation(job.data.bookingId);
      return { success: true };
    },
    { connection: redis, concurrency: 5 }
  );
}
