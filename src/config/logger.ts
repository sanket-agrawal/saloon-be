import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.isProduction ? 'info' : 'debug',
  transport: !env.isProduction
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});
