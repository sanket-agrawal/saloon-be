import { z } from 'zod';
import { dateStringSchema, phoneSchema, timeStringSchema } from '../../utils/validators.js';
import { DayOfWeek } from '@prisma/client';

export const createSaloonSchema = z.object({
  name: z.string().min(2).max(100),
  phone: phoneSchema,
  email: z.string().email().optional(),
  description: z.string().max(1000).optional(),
  address: z.string().min(5).max(255),
  city: z.string().min(2).max(100),
  state: z.string().default('Maharashtra'),
  pincode: z.string().length(6, 'Pincode must be 6 digits'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  coverImageUrl: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  slotDurationMin: z.number().int().min(10).max(180).default(30),
  maxAdvanceDays: z.number().int().min(1).max(30).default(7),
  requireAdvance: z.boolean().default(false),
  advanceAmount: z.number().positive().optional(),
  cancellationMin: z.number().int().min(0).default(60),
  walkInBuffer: z.number().int().min(0).default(2),
  autoConfirm: z.boolean().default(true),
});

export const updateSaloonSchema = createSaloonSchema.partial();

export const dayScheduleSchema = z.object({
  dayOfWeek: z.nativeEnum(DayOfWeek),
  openTime: timeStringSchema,
  closeTime: timeStringSchema,
  breakStart: timeStringSchema.nullable().optional(),
  breakEnd: timeStringSchema.nullable().optional(),
  isOpen: z.boolean().default(true),
});

export const updateScheduleSchema = z.object({
  schedules: z.array(dayScheduleSchema).min(1).max(7),
});

export const addHolidaySchema = z.object({
  date: dateStringSchema,
  reason: z.string().max(255).optional(),
});

export const addGalleryImageSchema = z.object({
  imageUrl: z.string().url(),
  caption: z.string().max(255).optional(),
  sortOrder: z.number().int().default(0),
});

export const getAvailableSlotsQuerySchema = z.object({
  date: dateStringSchema,
  serviceIds: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',').filter(Boolean) : [])),
  staffId: z.string().optional(),
});

export const listSaloonsQuerySchema = z.object({
  city: z.string().optional(),
  search: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().positive().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export type CreateSaloonInput = z.infer<typeof createSaloonSchema>;
export type UpdateSaloonInput = z.infer<typeof updateSaloonSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
export type AddHolidayInput = z.infer<typeof addHolidaySchema>;
export type AddGalleryImageInput = z.infer<typeof addGalleryImageSchema>;
export type GetAvailableSlotsQuery = z.infer<typeof getAvailableSlotsQuerySchema>;
export type ListSaloonsQuery = z.infer<typeof listSaloonsQuerySchema>;
