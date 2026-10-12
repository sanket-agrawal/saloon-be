import fastify from 'fastify';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';
import {
  confirmationQueue,
  ivrQueue,
  reminderQueue,
  reviewQueue,
  cleanupQueue,
} from './queue.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

async function startBoard() {
  const server = fastify({ logger: true });

  const serverAdapter = new FastifyAdapter();

  createBullBoard({
    queues: [
      new BullMQAdapter(confirmationQueue),
      new BullMQAdapter(ivrQueue),
      new BullMQAdapter(reminderQueue),
      new BullMQAdapter(reviewQueue),
      new BullMQAdapter(cleanupQueue),
    ],
    serverAdapter,
  });

  serverAdapter.setBasePath('/admin/queues');
  await server.register(serverAdapter.registerPlugin(), {
    prefix: '/admin/queues',
  });

  try {
    await server.listen({ port: env.BULL_BOARD_PORT, host: '0.0.0.0' });
    logger.info(`Bull Board running on http://localhost:${env.BULL_BOARD_PORT}/admin/queues`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

startBoard();
