import { buildApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/database.js';
import { redis } from './config/redis.js';

async function bootstrap() {
  try {
    const app = await buildApp();

    const address = await app.listen({
      port: env.PORT,
      host: '0.0.0.0',
    });

    logger.info(`🚀 Saloon Backend API server listening at ${address}`);
    logger.info(`🩺 Health check ready at ${address}/health`);

    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
    for (const signal of signals) {
      process.on(signal, async () => {
        logger.info(`Received ${signal}. Shutting down gracefully...`);
        try {
          await app.close();
          await prisma.$disconnect();
          await redis.quit();
          logger.info('Graceful shutdown completed.');
          process.exit(0);
        } catch (err) {
          logger.error({ err }, 'Error during graceful shutdown');
          process.exit(1);
        }
      });
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to start application');
    process.exit(1);
  }
}

bootstrap();
