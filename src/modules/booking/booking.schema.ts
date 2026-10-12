import { z } from 'zod';
import { dateStringSchema, timeStringSchema } from '../../utils/validators.js';
import { BookingStatus } from '@prisma/client';

export const createBookingSchema = z.object({
  saloonId: z.string().cuid('Valid saloon ID required'),
  serviceIds: z.array(z.string().cuid()).min(1, 'At least one service is required'),
  staffId: z.string().cuid().optional(),
  slotDate: dateStringSchema,
  slotStartTime: timeStringSchema,
});

export const cancelBookingSchema = z.object({
  reason: z.string().max(255).optional(),
});

export const listBookingsQuerySchema = z.object({
  status: z.nativeEnum(BookingStatus).optional(),
  date: dateStringSchema.optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 10)),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;
