import { FastifyReply, FastifyRequest } from 'fastify';
import { bookingService } from './booking.service.js';
import {
  cancelBookingSchema,
  createBookingSchema,
  listBookingsQuerySchema,
} from './booking.schema.js';
import { sendCreated, sendSuccess } from '../../utils/apiResponse.js';
import { UnauthorizedError } from '../../utils/errors.js';

export class BookingController {
  async createBooking(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const validated = createBookingSchema.parse(request.body);
    const booking = await bookingService.createBooking(request.user.id, validated);
    return sendCreated(reply, booking, 'Booking created successfully');
  }

  async listMyBookings(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const query = listBookingsQuerySchema.parse(request.query);
    const result = await bookingService.listMyBookings(request.user.id, query);
    return sendSuccess(reply, result);
  }

  async getBookingById(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const { id } = request.params as { id: string };
    const booking = await bookingService.getBookingById(
      id,
      request.user.id,
      request.user.role
    );
    return sendSuccess(reply, booking);
  }

  async cancelBooking(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const { id } = request.params as { id: string };
    const validated = cancelBookingSchema.parse(request.body || {});
    const cancelled = await bookingService.cancelBooking(
      id,
      request.user.id,
      request.user.role,
      validated
    );
    return sendSuccess(reply, cancelled, 'Booking cancelled successfully');
  }

  async checkInBooking(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const { id } = request.params as { id: string };
    const updated = await bookingService.checkInBooking(id, request.user.id);
    return sendSuccess(reply, updated, 'Customer checked in');
  }

  async completeBooking(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const { id } = request.params as { id: string };
    const updated = await bookingService.completeBooking(id, request.user.id);
    return sendSuccess(reply, updated, 'Service completed');
  }

  async markNoShow(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const { id } = request.params as { id: string };
    const updated = await bookingService.markNoShow(id, request.user.id);
    return sendSuccess(reply, updated, 'Booking marked as no-show');
  }

  async listSaloonBookings(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const { saloonId } = request.params as { saloonId: string };
    const query = listBookingsQuerySchema.parse(request.query);
    const result = await bookingService.listSaloonBookings(
      saloonId,
      request.user.id,
      query
    );
    return sendSuccess(reply, result);
  }

  async getTodayBookings(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const { saloonId } = request.params as { saloonId: string };
    const result = await bookingService.getTodayBookings(saloonId, request.user.id);
    return sendSuccess(reply, result);
  }

  async getSaloonStats(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const { saloonId } = request.params as { saloonId: string };
    const result = await bookingService.getSaloonStats(saloonId, request.user.id);
    return sendSuccess(reply, result);
  }
}

export const bookingController = new BookingController();
