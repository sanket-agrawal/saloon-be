import { z } from 'zod';

export const submitReviewSchema = z.object({
  bookingId: z.string().cuid('Valid booking ID required'),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export const replyReviewSchema = z.object({
  ownerReply: z.string().min(1).max(1000),
});

export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;
export type ReplyReviewInput = z.infer<typeof replyReviewSchema>;
