import { z } from 'zod';

export const verifySaloonSchema = z.object({
  isVerified: z.boolean(),
});

export const updateSaloonStatusSchema = z.object({
  isActive: z.boolean(),
});

export type VerifySaloonInput = z.infer<typeof verifySaloonSchema>;
export type UpdateSaloonStatusInput = z.infer<typeof updateSaloonStatusSchema>;
