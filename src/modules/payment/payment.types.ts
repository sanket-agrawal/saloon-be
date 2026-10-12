import { PaymentStatus } from '@prisma/client';

export interface RazorpayOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface PaymentDetails {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
}
