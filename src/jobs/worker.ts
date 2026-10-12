import { createConfirmationWorker } from './workers/confirmation.worker.js';
import { createIVRWorker } from './workers/ivr.worker.js';
import { createReminderWorker } from './workers/reminder.worker.js';
import { createReviewWorker } from './workers/review.worker.js';
import { createCleanupWorker } from './workers/cleanup.worker.js';
import { setupCleanupSchedulers } from './schedulers/cleanup.scheduler.js';
import { logger } from '../config/logger.js';

logger.info('Starting BullMQ background workers...');

const confirmationWorker = createConfirmationWorker();
const ivrWorker = createIVRWorker();
const reminderWorker = createReminderWorker();
const reviewWorker = createReviewWorker();
const cleanupWorker = createCleanupWorker();

setupCleanupSchedulers();

const shutdown = async () => {
  logger.info('Shutting down background workers gracefully...');
  await Promise.all([
    confirmationWorker.close(),
    ivrWorker.close(),
    reminderWorker.close(),
    reviewWorker.close(),
    cleanupWorker.close(),
  ]);
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

logger.info('All BullMQ workers are running.');
