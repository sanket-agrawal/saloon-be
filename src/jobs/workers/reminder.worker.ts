import { Worker, Job } from 'bullmq';
import { redis } from '../../config/redis.js';
import { notificationService } from '../../modules/notification/notification.service.js';
import { logger } from '../../config/logger.js';

export interface ReminderJobData {
  bookingId: string;
}

export function createReminderWorker() {
  return new Worker<ReminderJobData>(
    'booking-reminder',
    async (job: Job<ReminderJobData>) => {
      logger.info({ jobId: job.id, data: job.data }, 'Processing booking reminder job');
      await notificationService.sendBookingReminder(job.data.bookingId);
      return { success: true };
    },
    { connection: redis, concurrency: 5 }
  );
}
