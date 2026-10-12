import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { logger } from '../config/logger.js';
import { Prisma } from '@prisma/client';

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  logger.error(
    {
      err: error,
      url: request.raw.url,
      method: request.raw.method,
      ip: request.ip,
    },
    'Request error caught'
  );

  if (error instanceof ZodError) {
    const issues = error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return reply.status(400).send({
      success: false,
      message: 'Validation failed',
      errors: issues,
    });
  }

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      message: error.message,
      details: error.details,
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = (error.meta?.target as string[])?.join(', ') || 'field';
      return reply.status(409).send({
        success: false,
        message: `Unique constraint violation: ${target} already exists`,
      });
    }

    if (error.code === 'P2025') {
      return reply.status(404).send({
        success: false,
        message: 'Record not found in database',
      });
    }
  }

  // Fastify validation errors (if any)
  if ('statusCode' in error && typeof error.statusCode === 'number') {
    return reply.status(error.statusCode).send({
      success: false,
      message: error.message,
    });
  }

  // Default internal server error
  return reply.status(500).send({
    success: false,
    message: 'Internal server error',
  });
}
