import { Queue } from 'bullmq';
import { redis } from '../config/redis.js';

export const confirmationQueue = new Queue('booking-confirmation', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const ivrQueue = new Queue('ivr-call', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const reminderQueue = new Queue('booking-reminder', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const reviewQueue = new Queue('review-request', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const cleanupQueue = new Queue('cleanup-queue', {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: 50,
  },
});
