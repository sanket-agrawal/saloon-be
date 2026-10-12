import { FastifyReply, FastifyRequest } from 'fastify';
import { paymentService } from './payment.service.js';
import {
  createOrderSchema,
  refundPaymentSchema,
  verifyPaymentSchema,
} from './payment.schema.js';
import { sendCreated, sendSuccess } from '../../utils/apiResponse.js';
import { UnauthorizedError } from '../../utils/errors.js';

export class PaymentController {
  async createOrder(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const validated = createOrderSchema.parse(request.body);
    const order = await paymentService.createOrder(request.user.id, validated);
    return sendCreated(reply, order, 'Payment order created');
  }

  async verifyPayment(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const validated = verifyPaymentSchema.parse(request.body);
    const booking = await paymentService.verifyPayment(request.user.id, validated);
    return sendSuccess(reply, booking, 'Payment verified and booking confirmed');
  }

  async refundPayment(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const { id } = request.params as { id: string };
    const validated = refundPaymentSchema.parse(request.body || {});
    const refund = await paymentService.refundPayment(id, request.user.id, validated);
    return sendSuccess(reply, refund, 'Payment refunded successfully');
  }

  async webhook(request: FastifyRequest, reply: FastifyReply) {
    const signature = request.headers['x-razorpay-signature'] as string;
    const rawBody =
      typeof request.body === 'string'
        ? request.body
        : JSON.stringify(request.body);
    const result = await paymentService.handleWebhook(rawBody, signature);
    return sendSuccess(reply, result);
  }
}

export const paymentController = new PaymentController();
