import { prisma } from '../../config/database.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../utils/errors.js';
import { ReplyReviewInput, SubmitReviewInput } from './review.schema.js';
import { saloonService } from '../saloon/saloon.service.js';

export class ReviewService {
  async submitReview(userId: string, input: SubmitReviewInput) {
    const booking = await prisma.booking.findUnique({
      where: { id: input.bookingId },
      include: { review: true },
    });

    if (!booking) throw new NotFoundError('Booking not found');
    if (booking.userId !== userId) throw new ForbiddenError('Not your booking');

    if (booking.status !== 'COMPLETED') {
      throw new BadRequestError('Can only review completed bookings');
    }

    if (booking.review) {
      throw new ConflictError('Review already submitted for this booking');
    }

    return prisma.review.create({
      data: {
        bookingId: booking.id,
        userId,
        saloonId: booking.saloonId,
        rating: input.rating,
        comment: input.comment,
      },
    });
  }

  async replyToReview(reviewId: string, ownerId: string, input: ReplyReviewInput) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) throw new NotFoundError('Review not found');
    await saloonService.verifyOwnership(review.saloonId, ownerId);

    return prisma.review.update({
      where: { id: reviewId },
      data: {
        ownerReply: input.ownerReply,
      },
    });
  }

  async deleteReview(reviewId: string, userId: string) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) throw new NotFoundError('Review not found');
    if (review.userId !== userId) {
      throw new ForbiddenError('You can only delete your own reviews');
    }

    return prisma.review.delete({
      where: { id: reviewId },
    });
  }
}

export const reviewService = new ReviewService();
