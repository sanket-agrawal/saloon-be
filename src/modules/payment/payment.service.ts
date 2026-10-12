import crypto from 'crypto';
import axios from 'axios';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../utils/errors.js';
import {
  CreateOrderInput,
  RefundPaymentInput,
  VerifyPaymentInput,
} from './payment.schema.js';
import {
  confirmationQueue,
  ivrQueue,
  reminderQueue,
} from '../../jobs/queue.js';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { saloonService } from '../saloon/saloon.service.js';

export class PaymentService {
  async createOrder(userId: string, input: CreateOrderInput) {
    const booking = await prisma.booking.findUnique({
      where: { id: input.bookingId },
      include: { saloon: true },
    });

    if (!booking) throw new NotFoundError('Booking not found');
    if (booking.userId !== userId) throw new ForbiddenError('Not your booking');

    if (booking.status === BookingStatus.CONFIRMED) {
      throw new BadRequestError('Booking is already confirmed');
    }

    const advanceAmount =
      booking.saloon.requireAdvance && booking.saloon.advanceAmount
        ? booking.saloon.advanceAmount
        : booking.totalAmount;

    const amountInPaise = Math.round(advanceAmount * 100);

    let orderId = `order_mock_${Date.now()}`;

    if (env.RAZORPAY_KEY_ID && !env.RAZORPAY_KEY_ID.startsWith('rzp_test_mock')) {
      try {
        const auth = Buffer.from(
          `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`
        ).toString('base64');
        const res = await axios.post(
          'https://api.razorpay.com/v1/orders',
          {
            amount: amountInPaise,
            currency: 'INR',
            receipt: booking.bookingNumber,
            notes: {
              bookingId: booking.id,
              userId: booking.userId,
            },
          },
          {
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/json',
            },
          }
        );
        orderId = res.data.id;
      } catch (err) {
        logger.error({ err }, 'Razorpay create order failed');
        throw new BadRequestError('Failed to initialize payment gateway order');
      }
    }

    // Upsert Payment record
    const payment = await prisma.payment.upsert({
      where: { bookingId: booking.id },
      update: {
        amount: advanceAmount,
        currency: 'INR',
        razorpayOrderId: orderId,
        status: PaymentStatus.PENDING,
      },
      create: {
        bookingId: booking.id,
        amount: advanceAmount,
        currency: 'INR',
        razorpayOrderId: orderId,
        status: PaymentStatus.PENDING,
      },
    });

    return {
      orderId,
      amount: advanceAmount,
      amountInPaise,
      currency: 'INR',
      keyId: env.RAZORPAY_KEY_ID,
      paymentId: payment.id,
    };
  }

  async verifyPayment(userId: string, input: VerifyPaymentInput) {
    const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature, method } =
      input;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) throw new NotFoundError('Booking not found');
    if (booking.userId !== userId) throw new ForbiddenError('Not your booking');

    // Verify HMAC SHA256 signature
    const isMock =
      env.RAZORPAY_KEY_ID.startsWith('rzp_test_mock') || env.isDevelopment;

    if (!isMock) {
      const generatedSignature = crypto
        .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      if (generatedSignature !== razorpaySignature) {
        throw new BadRequestError('Invalid payment signature verification failed');
      }
    }

    // Update payment record
    await prisma.payment.update({
      where: { bookingId },
      data: {
        status: PaymentStatus.CAPTURED,
        razorpayPaymentId,
        method: method || 'online',
      },
    });

    // Update booking status to CONFIRMED
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CONFIRMED },
    });

    // Enqueue background confirmation and reminders
    try {
      await confirmationQueue.add('booking-confirmation', { bookingId: booking.id });
      await ivrQueue.add('ivr-call', { bookingId: booking.id }, { delay: 30 * 1000 });

      const [hours, minutes] = booking.slotStartTime.split(':').map(Number);
      const slotDateTime = new Date(booking.slotDate);
      slotDateTime.setHours(hours, minutes, 0, 0);
      const reminderTime = slotDateTime.getTime() - 10 * 60 * 1000;
      const delay = Math.max(0, reminderTime - Date.now());

      await reminderQueue.add('booking-reminder', { bookingId: booking.id }, { delay });
    } catch (err) {
      logger.error({ err }, 'Failed to enqueue confirmation jobs after payment');
    }

    return updatedBooking;
  }

  async refundPayment(
    paymentId: string,
    ownerId: string,
    input: RefundPaymentInput
  ) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: { include: { saloon: true } } },
    });

    if (!payment) throw new NotFoundError('Payment record not found');
    await saloonService.verifyOwnership(payment.booking.saloonId, ownerId);

    if (payment.status !== PaymentStatus.CAPTURED) {
      throw new BadRequestError('Can only refund captured payments');
    }

    const refundAmount = input.amount || payment.amount;

    // Call Razorpay refund API if not mock
    if (payment.razorpayPaymentId && !payment.razorpayPaymentId.startsWith('mock')) {
      try {
        const auth = Buffer.from(
          `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`
        ).toString('base64');
        await axios.post(
          `https://api.razorpay.com/v1/payments/${payment.razorpayPaymentId}/refund`,
          { amount: Math.round(refundAmount * 100) },
          { headers: { Authorization: `Basic ${auth}` } }
        );
      } catch (err) {
        logger.error({ err }, 'Razorpay refund failed');
      }
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.REFUNDED,
        refundAmount,
        refundedAt: new Date(),
      },
    });

    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancelReason: input.reason || 'Refunded and cancelled by saloon',
      },
    });

    return updatedPayment;
  }

  async handleWebhook(rawBody: string, signature: string) {
    if (env.RAZORPAY_WEBHOOK_SECRET) {
      const expected = crypto
        .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      if (expected !== signature) {
        throw new BadRequestError('Invalid webhook signature');
      }
    }

    const event = JSON.parse(rawBody);
    logger.info({ event: event.event }, 'Razorpay webhook received');

    if (event.event === 'payment.captured') {
      const orderId = event.payload?.payment?.entity?.order_id;
      const paymentId = event.payload?.payment?.entity?.id;

      if (orderId) {
        const payment = await prisma.payment.findFirst({
          where: { razorpayOrderId: orderId },
        });

        if (payment && payment.status !== PaymentStatus.CAPTURED) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.CAPTURED,
              razorpayPaymentId: paymentId,
            },
          });
          await prisma.booking.update({
            where: { id: payment.bookingId },
            data: { status: BookingStatus.CONFIRMED },
          });
        }
      }
    }

    return { received: true };
  }
}

export const paymentService = new PaymentService();
