import { FastifyReply } from 'fastify';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: unknown;
}

export function sendSuccess<T>(
  reply: FastifyReply,
  data?: T,
  message?: string,
  statusCode = 200,
  meta?: unknown
) {
  return reply.status(statusCode).send({
    success: true,
    message,
    data,
    meta,
  });
}

export function sendCreated<T>(reply: FastifyReply, data?: T, message = 'Created successfully') {
  return sendSuccess(reply, data, message, 201);
}

export function sendError(
  reply: FastifyReply,
  message: string,
  statusCode = 500,
  details?: unknown
) {
  return reply.status(statusCode).send({
    success: false,
    message,
    details,
  });
}
