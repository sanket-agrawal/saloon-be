import { FastifyReply, FastifyRequest } from 'fastify';
import { reviewService } from './review.service.js';
import { replyReviewSchema, submitReviewSchema } from './review.schema.js';
import { sendCreated, sendSuccess } from '../../utils/apiResponse.js';
import { UnauthorizedError } from '../../utils/errors.js';

export class ReviewController {
  async submitReview(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const validated = submitReviewSchema.parse(request.body);
    const review = await reviewService.submitReview(request.user.id, validated);
    return sendCreated(reply, review, 'Review submitted successfully');
  }

  async replyToReview(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const { id } = request.params as { id: string };
    const validated = replyReviewSchema.parse(request.body);
    const updated = await reviewService.replyToReview(id, request.user.id, validated);
    return sendSuccess(reply, updated, 'Reply added to review');
  }

  async deleteReview(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const { id } = request.params as { id: string };
    await reviewService.deleteReview(id, request.user.id);
    return sendSuccess(reply, null, 'Review deleted successfully');
  }
}

export const reviewController = new ReviewController();
