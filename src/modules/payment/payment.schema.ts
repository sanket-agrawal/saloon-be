import { z } from 'zod';

export const createOrderSchema = z.object({
  bookingId: z.string().cuid('Valid booking ID required'),
});

export const verifyPaymentSchema = z.object({
  bookingId: z.string().cuid('Valid booking ID required'),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
  method: z.string().optional(),
});

export const refundPaymentSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().max(255).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;
