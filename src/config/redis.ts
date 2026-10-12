import { Redis } from 'ioredis';
import RedisMock from 'ioredis-mock';
import { env } from './env.js';
import { logger } from './logger.js';

let redisInstance: Redis;

if (
  env.USE_MOCK_REDIS === 'true' ||
  env.REDIS_URL.startsWith('mock') ||
  env.REDIS_URL.startsWith('memory')
) {
  logger.info('Using in-memory Mock Redis for zero-dependency local development');
  redisInstance = new (RedisMock as unknown as typeof Redis)();
} else {
  redisInstance = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      if (times > 5 && !env.isProduction) {
        logger.warn(
          'Local Redis server unreachable. Set USE_MOCK_REDIS=true in .env to use in-memory Redis without Docker.'
        );
        return null;
      }
      return Math.min(times * 100, 2000);
    },
  });

  redisInstance.on('connect', () => {
    logger.info('Connected to Redis');
  });

  redisInstance.on('error', (err) => {
    logger.warn({ err: err.message }, 'Redis connection warning');
  });
}

export const redis = redisInstance;
