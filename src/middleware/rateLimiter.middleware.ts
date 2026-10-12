import { RateLimitOptions } from '@fastify/rate-limit';

export const globalRateLimitConfig: RateLimitOptions = {
  max: 100,
  timeWindow: '1 minute',
  errorResponseBuilder: () => ({
    success: false,
    message: 'Too many requests, please try again later.',
  }),
};

export const otpRateLimitConfig = {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: '1 minute',
    },
  },
};
