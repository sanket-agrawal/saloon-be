import { cleanupQueue } from '../queue.js';
import { logger } from '../../config/logger.js';

export async function setupCleanupSchedulers() {
  try {
    // Run no-show checker every 5 minutes
    await cleanupQueue.upsertJobScheduler(
      'schedule-no-show-checker',
      { every: 5 * 60 * 1000 },
      {
        name: 'no-show-checker',
        data: {},
      }
    );

    // Run slot cleanup every 15 minutes
    await cleanupQueue.upsertJobScheduler(
      'schedule-slot-cleanup',
      { every: 15 * 60 * 1000 },
      {
        name: 'slot-cleanup',
        data: {},
      }
    );

    // Run subscription checker daily
    await cleanupQueue.upsertJobScheduler(
      'schedule-subscription-checker',
      { pattern: '0 0 * * *' },
      {
        name: 'subscription-checker',
        data: {},
      }
    );

    logger.info('BullMQ cleanup & maintenance schedulers configured successfully');
  } catch (error) {
    logger.error({ err: error }, 'Failed to configure BullMQ schedulers');
  }
}
