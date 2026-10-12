import { z } from 'zod';
import { phoneSchema } from '../../utils/validators.js';

export const createStaffSchema = z.object({
  name: z.string().min(2).max(100),
  phone: phoneSchema.optional(),
  avatarUrl: z.string().url().optional(),
});

export const updateStaffSchema = createStaffSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
