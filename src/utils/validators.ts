import { z } from 'zod';

export const phoneRegex = /^[6-9]\d{9}$/;

export const phoneSchema = z
  .string()
  .transform((val) => val.trim().replace(/^(\+91|0)/, ''))
  .refine((val) => phoneRegex.test(val), {
    message: 'Invalid Indian phone number. Expected 10 digits starting with 6-9.',
  });

export const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const timeStringSchema = z.string().regex(timeRegex, {
  message: 'Time must be in 24hr HH:mm format (e.g., 09:30, 18:00)',
});

export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: 'Date must be in YYYY-MM-DD format',
});
