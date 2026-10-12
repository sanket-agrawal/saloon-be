import { Worker, Job } from 'bullmq';
import { redis } from '../../config/redis.js';
import { notificationService } from '../../modules/notification/notification.service.js';
import { logger } from '../../config/logger.js';

export interface ReviewJobData {
  bookingId: string;
}

export function createReviewWorker() {
  return new Worker<ReviewJobData>(
    'review-request',
    async (job: Job<ReviewJobData>) => {
      logger.info({ jobId: job.id, data: job.data }, 'Processing review request job');
      await notificationService.sendReviewRequest(job.data.bookingId);
      return { success: true };
    },
    { connection: redis, concurrency: 5 }
  );
}
