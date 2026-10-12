import { Worker, Job } from 'bullmq';
import { redis } from '../../config/redis.js';
import { notificationService } from '../../modules/notification/notification.service.js';
import { logger } from '../../config/logger.js';

export interface IVRJobData {
  bookingId: string;
}

export function createIVRWorker() {
  return new Worker<IVRJobData>(
    'ivr-call',
    async (job: Job<IVRJobData>) => {
      logger.info({ jobId: job.id, data: job.data }, 'Processing IVR call job');
      await notificationService.triggerIvrCall(job.data.bookingId);
      return { success: true };
    },
    { connection: redis, concurrency: 3 }
  );
}
