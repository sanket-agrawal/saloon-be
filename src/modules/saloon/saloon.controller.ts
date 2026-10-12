import { FastifyReply, FastifyRequest } from 'fastify';
import { saloonService } from './saloon.service.js';
import {
  addGalleryImageSchema,
  addHolidaySchema,
  createSaloonSchema,
  getAvailableSlotsQuerySchema,
  listSaloonsQuerySchema,
  updateSaloonSchema,
  updateScheduleSchema,
} from './saloon.schema.js';
import { sendCreated, sendSuccess } from '../../utils/apiResponse.js';
import { UnauthorizedError } from '../../utils/errors.js';

export class SaloonController {
  async listSaloons(request: FastifyRequest, reply: FastifyReply) {
    const query = listSaloonsQuerySchema.parse(request.query);
    const result = await saloonService.listSaloons(query);
    return sendSuccess(reply, result);
  }

  async getSaloonBySlug(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = request.params as { slug: string };
    const saloon = await saloonService.getSaloonBySlug(slug);
    return sendSuccess(reply, saloon);
  }

  async createSaloon(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const validated = createSaloonSchema.parse(request.body);
    const saloon = await saloonService.createSaloon(request.user.id, validated);
    return sendCreated(reply, saloon, 'Saloon registered successfully');
  }

  async getMySaloons(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const saloons = await saloonService.getMySaloons(request.user.id);
    return sendSuccess(reply, saloons);
  }

  async updateSaloon(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const { id } = request.params as { id: string };
    const validated = updateSaloonSchema.parse(request.body);
    const updated = await saloonService.updateSaloon(id, request.user.id, validated);
    return sendSuccess(reply, updated, 'Saloon updated successfully');
  }

  async updateSchedule(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const { id } = request.params as { id: string };
    const validated = updateScheduleSchema.parse(request.body);
    const result = await saloonService.updateSchedule(id, request.user.id, validated);
    return sendSuccess(reply, result, 'Schedule updated successfully');
  }

  async addHoliday(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const { id } = request.params as { id: string };
    const validated = addHolidaySchema.parse(request.body);
    const holiday = await saloonService.addHoliday(id, request.user.id, validated);
    return sendCreated(reply, holiday, 'Holiday added');
  }

  async removeHoliday(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const { id, holidayId } = request.params as { id: string; holidayId: string };
    await saloonService.removeHoliday(id, holidayId, request.user.id);
    return sendSuccess(reply, null, 'Holiday removed successfully');
  }

  async addGalleryImage(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const { id } = request.params as { id: string };
    const validated = addGalleryImageSchema.parse(request.body);
    const image = await saloonService.addGalleryImage(id, request.user.id, validated);
    return sendCreated(reply, image, 'Image added to gallery');
  }

  async removeGalleryImage(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const { id, imageId } = request.params as { id: string; imageId: string };
    await saloonService.removeGalleryImage(id, imageId, request.user.id);
    return sendSuccess(reply, null, 'Gallery image removed');
  }

  async getAvailableSlots(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = request.params as { slug: string };
    const query = getAvailableSlotsQuerySchema.parse(request.query);
    const slots = await saloonService.getAvailableSlots(slug, query);
    return sendSuccess(reply, slots);
  }

  async getSaloonReviews(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = request.params as { slug: string };
    const query = request.query as { page?: string; limit?: string };
    const reviews = await saloonService.getSaloonReviews(
      slug,
      query.page ? Number(query.page) : 1,
      query.limit ? Number(query.limit) : 10
    );
    return sendSuccess(reply, reviews);
  }

  async getSaloonGallery(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = request.params as { slug: string };
    const gallery = await saloonService.getSaloonGallery(slug);
    return sendSuccess(reply, gallery);
  }
}

export const saloonController = new SaloonController();
